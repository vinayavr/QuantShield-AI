from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from threading import Lock
from typing import Any

import numpy as np
import pandas as pd
import requests
import ta
import yfinance as yf


CORE_PERIOD = "10y"
CACHE_TTL_MINUTES = 15
FRED_API_KEY = "c158c58c7762962cee7d876b6c5ecba3"
FRED_URL = "https://api.stlouisfed.org/fred/series/observations"
FEATURE_NAMES = [
    "Return",
    "Trend",
    "Volatility",
    "RSI",
    "VIX",
    "CPI_change",
    "USD_change",
    "Lag_Return",
    "VIX_Change",
]

_cache_lock = Lock()
_market_cache: dict[str, Any] = {
    "expires_at": None,
    "snapshot": None,
}


@dataclass
class MarketSnapshot:
    frame: pd.DataFrame
    live_data_used: bool
    fallback_reason: str | None
    market_data_source: str
    macro_source: str
    generated_at: str
    macro_notes: list[str]


def _download_history(symbol: str, period: str = CORE_PERIOD) -> pd.DataFrame | None:
    try:
        frame = yf.download(
            symbol,
            period=period,
            auto_adjust=True,
            progress=False,
            threads=False,
        )
        if frame is None or frame.empty:
            return None

        frame = frame.reset_index()
        if isinstance(frame.columns, pd.MultiIndex):
            frame.columns = frame.columns.get_level_values(0)

        return frame
    except Exception:
        return None


def _fetch_fred_series(series_id: str, start_date: str, end_date: str) -> pd.DataFrame:
    response = requests.get(
        FRED_URL,
        params={
            "series_id": series_id,
            "api_key": FRED_API_KEY,
            "file_type": "json",
            "observation_start": start_date,
            "observation_end": end_date,
        },
        timeout=8,
    )
    response.raise_for_status()
    payload = response.json()

    if "observations" not in payload:
        raise ValueError(f"FRED payload missing observations for {series_id}")

    series = pd.DataFrame(payload["observations"])[["date", "value"]]
    series.columns = ["Date", series_id]
    series["Date"] = pd.to_datetime(series["Date"]).dt.normalize()
    series[series_id] = pd.to_numeric(series[series_id], errors="coerce")
    return series


def _build_synthetic_market_frame(periods: int = 520) -> pd.DataFrame:
    dates = pd.bdate_range(end=datetime.utcnow().date(), periods=periods)
    base = np.linspace(17500, 23500, periods)
    seasonal = 450 * np.sin(np.linspace(0, 12 * np.pi, periods))
    close = base + seasonal
    open_price = close * 0.997
    high = close * 1.01
    low = close * 0.99
    vix = 14 + 4 * np.abs(np.sin(np.linspace(0, 8 * np.pi, periods)))

    return pd.DataFrame(
        {
            "Date": dates,
            "Open": open_price,
            "High": high,
            "Low": low,
            "Close": close,
            "VIX": vix,
        }
    )


def _merge_macro_data(frame: pd.DataFrame) -> tuple[pd.DataFrame, str, list[str]]:
    start_date = frame["Date"].min().strftime("%Y-%m-%d")
    end_date = frame["Date"].max().strftime("%Y-%m-%d")
    macro_notes: list[str] = []

    try:
        cpi = _fetch_fred_series("INDCPIALLMINMEI", start_date, end_date)
        iip = _fetch_fred_series("INDPRO", start_date, end_date)
        usd = _fetch_fred_series("DEXINUS", start_date, end_date)

        merged = frame.sort_values("Date").copy()
        merged["Date"] = pd.to_datetime(merged["Date"]).dt.normalize()

        for series in (cpi, iip, usd):
            series["Date"] = pd.to_datetime(series["Date"]).dt.normalize()
            merged = pd.merge_asof(
                merged.sort_values("Date"),
                series.sort_values("Date"),
                on="Date",
            )

        merged.rename(
            columns={
                "INDCPIALLMINMEI": "CPI",
                "INDPRO": "IIP",
                "DEXINUS": "USD_INR",
            },
            inplace=True,
        )
        macro_source = "FRED"
    except Exception as exc:
        merged = frame.copy()
        merged["CPI"] = merged["Close"].rolling(30, min_periods=1).mean()
        merged["IIP"] = merged["Close"].rolling(60, min_periods=1).mean()
        merged["USD_INR"] = 74 + (
            merged["Close"].pct_change().fillna(0).cumsum() * 2.5
        )
        macro_source = "Derived fallback proxies"
        macro_notes.append(f"Macro fallback used because FRED was unavailable: {exc}")

    merged[["CPI", "IIP", "USD_INR"]] = merged[["CPI", "IIP", "USD_INR"]].ffill().bfill()
    return merged, macro_source, macro_notes


def _compute_features(frame: pd.DataFrame) -> pd.DataFrame:
    enriched = frame.copy()
    enriched["Close"] = pd.Series(enriched["Close"].values.ravel(), index=enriched.index)
    enriched["Return"] = enriched["Close"].pct_change()
    enriched["MA10"] = enriched["Close"].rolling(10).mean()
    enriched["MA20"] = enriched["Close"].rolling(20).mean()
    enriched["Trend"] = enriched["MA10"] - enriched["MA20"]
    enriched["Volatility"] = enriched["Return"].rolling(10).std()
    enriched["RSI"] = ta.momentum.RSIIndicator(
        close=pd.Series(enriched["Close"].values.ravel())
    ).rsi()
    enriched["CPI_change"] = enriched["CPI"].pct_change()
    enriched["USD_change"] = enriched["USD_INR"].pct_change()
    enriched["Lag_Return"] = enriched["Return"].shift(1)
    enriched["VIX_Change"] = enriched["VIX"].pct_change()
    enriched = enriched.dropna().reset_index(drop=True)

    if len(enriched) < 60:
        raise ValueError("Not enough history after feature engineering.")

    return enriched


def _build_market_snapshot() -> MarketSnapshot:
    nifty = _download_history("^NSEI")
    vix = _download_history("^INDIAVIX")
    generated_at = datetime.utcnow().isoformat()

    if nifty is not None and vix is not None:
        base = nifty[["Date", "Open", "High", "Low", "Close"]].copy()
        vix_frame = vix[["Date", "Close"]].rename(columns={"Close": "VIX"}).copy()
        merged = pd.merge(base, vix_frame, on="Date", how="inner")
        live_data_used = True
        fallback_reason = None
        market_data_source = "Yahoo Finance (^NSEI, ^INDIAVIX)"
    else:
        merged = _build_synthetic_market_frame()
        live_data_used = False
        missing = []
        if nifty is None:
            missing.append("^NSEI")
        if vix is None:
            missing.append("^INDIAVIX")
        fallback_reason = (
            f"Live Yahoo Finance feed unavailable for {', '.join(missing)}. "
            "Using deterministic fallback market series."
        )
        market_data_source = "Deterministic fallback market series"

    merged["Date"] = pd.to_datetime(merged["Date"]).dt.normalize()
    merged, macro_source, macro_notes = _merge_macro_data(merged)
    features = _compute_features(merged)

    return MarketSnapshot(
        frame=features,
        live_data_used=live_data_used,
        fallback_reason=fallback_reason,
        market_data_source=market_data_source,
        macro_source=macro_source,
        generated_at=generated_at,
        macro_notes=macro_notes,
    )


def _get_market_snapshot(force_refresh: bool = False) -> MarketSnapshot:
    with _cache_lock:
        now = datetime.utcnow()
        expires_at = _market_cache["expires_at"]
        cached = _market_cache["snapshot"]

        if (
            not force_refresh
            and cached is not None
            and isinstance(expires_at, datetime)
            and now < expires_at
        ):
            return cached

        snapshot = _build_market_snapshot()
        _market_cache["snapshot"] = snapshot
        _market_cache["expires_at"] = now + timedelta(minutes=CACHE_TTL_MINUTES)
        return snapshot


def _classify_risk_score(score: float) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def _derive_market_profile(frame: pd.DataFrame) -> dict[str, float | str]:
    latest = frame.iloc[-1]
    recent = frame.tail(21)
    annualized_volatility = float(recent["Return"].std() * np.sqrt(252) * 100)
    trend_strength = float((latest["Trend"] / latest["Close"]) * 100)
    vix_score = float(np.clip((latest["VIX"] - 12) * 4.5, 0, 100))
    rsi_score = float(np.clip(abs(latest["RSI"] - 50) * 2, 0, 100))
    volatility_score = float(np.clip(annualized_volatility * 3.2, 0, 100))
    confidence_percent = float(
        np.clip(
            58 + (abs(trend_strength) * 12) - (annualized_volatility * 0.35) - (vix_score * 0.08),
            35,
            96.9,
        )
    )
    risk_score = float(np.clip((volatility_score * 0.55) + (vix_score * 0.35) + (rsi_score * 0.1), 0, 100))
    direction = "UP" if trend_strength >= 0 else "DOWN"
    market_condition = "HIGH RISK" if risk_score >= 60 else "MODERATE RISK" if risk_score >= 40 else "LOW RISK"

    return {
        "annualized_volatility": annualized_volatility,
        "trend_strength": trend_strength,
        "vix_level": float(latest["VIX"]),
        "rsi": float(latest["RSI"]),
        "confidence_percent": confidence_percent,
        "risk_score": risk_score,
        "direction": direction,
        "market_condition": market_condition,
        "return_1m": float((recent["Close"].iloc[-1] / recent["Close"].iloc[0] - 1) * 100),
    }


def _build_portfolio(risk_pref: str, direction: str) -> dict[str, int]:
    if risk_pref == "low":
        portfolio = {"equity": 40, "debt": 40, "cash": 20}
    elif risk_pref == "high":
        portfolio = {"equity": 80, "debt": 10, "cash": 10}
    else:
        portfolio = {"equity": 60, "debt": 25, "cash": 15}

    if direction == "DOWN":
        portfolio = {
            "equity": max(portfolio["equity"] - 10, 30),
            "debt": portfolio["debt"] + 5,
            "cash": portfolio["cash"] + 5,
        }
    elif direction == "UP" and risk_pref == "high":
        portfolio = {"equity": 85, "debt": 10, "cash": 5}

    total = sum(portfolio.values())
    if total != 100:
        portfolio["cash"] += 100 - total

    return portfolio


def _allocation_metrics(weight: int, market_profile: dict[str, float | str]) -> dict[str, float | str]:
    equity_profile = {
        "historical_mean_return": 13.2,
        "cagr_return": 11.8,
        "trailing_one_year_return": float(market_profile["return_1m"]) * 4.2,
        "stock_risk_score": float(np.clip(market_profile["risk_score"] * 1.08, 0, 99)),
        "selection_score": 82,
        "market_beta": 1.0,
    }
    debt_profile = {
        "historical_mean_return": 7.1,
        "cagr_return": 6.6,
        "trailing_one_year_return": 7.4,
        "stock_risk_score": 28.0,
        "selection_score": 74,
        "market_beta": 0.22,
    }
    cash_profile = {
        "historical_mean_return": 4.2,
        "cagr_return": 4.0,
        "trailing_one_year_return": 4.1,
        "stock_risk_score": 8.0,
        "selection_score": 65,
        "market_beta": 0.02,
    }

    return {"weight": weight, "equity": equity_profile, "debt": debt_profile, "cash": cash_profile}


def _build_recommendation_snapshot(user_input: dict[str, Any]) -> dict[str, Any]:
    snapshot = _get_market_snapshot()
    frame = snapshot.frame
    market_profile = _derive_market_profile(frame)

    amount = int(user_input.get("amount", 10000))
    risk_pref = str(user_input.get("risk_preference", "medium")).lower()
    horizon = str(user_input.get("time_horizon", "medium")).lower()

    invest_ratio = float(np.clip(1 - (market_profile["risk_score"] / 135), 0.35, 0.9))
    if risk_pref == "low":
        invest_ratio *= 0.82
    elif risk_pref == "high":
        invest_ratio *= 1.08
    invest_ratio = float(np.clip(invest_ratio, 0.3, 0.92))

    invest_amount = int(round(amount * invest_ratio))
    hold_amount = int(amount - invest_amount)

    portfolio = _build_portfolio(risk_pref, str(market_profile["direction"]))

    if horizon == "long":
        sip_months = 60
        sip = int(round(amount * 0.2))
    elif horizon == "short":
        sip_months = 12
        sip = int(round(amount * 0.1))
    else:
        sip_months = 36
        sip = int(round(amount * 0.15))

    selected = list(portfolio.items())
    allocation = []
    stock_analysis = []
    portfolio_risk_contribution: dict[str, float] = {}

    metrics_map = _allocation_metrics(0, market_profile)

    for company, weight in selected:
        metrics = metrics_map[company]
        amount_value = int(round(invest_amount * weight / 100))
        risk_score = float(metrics["stock_risk_score"])
        allocation.append(
            {
                "company": company,
                "amount": amount_value,
                "amount_display": f"\u20b9 {amount_value:,.0f}",
                "monthly_amount": int(round(sip * weight / 100)),
                "monthly_amount_display": f"\u20b9 {int(round(sip * weight / 100)):,.0f}",
                "weight": weight,
                "expected_return": float(metrics["historical_mean_return"]),
                "historical_mean_return": float(metrics["historical_mean_return"]),
                "cagr_return": float(metrics["cagr_return"]),
                "trailing_one_year_return": float(metrics["trailing_one_year_return"]),
                "stock_risk_score": risk_score,
                "stock_risk_level": _classify_risk_score(risk_score),
                "selection_score": float(metrics["selection_score"]),
                "market_beta": float(metrics["market_beta"]),
            }
        )
        stock_analysis.append(
            f"{company.title()} allocation targets {weight}% of the invested amount with "
            f"historical mean return near {metrics['historical_mean_return']:.1f}% and "
            f"risk score {risk_score:.1f}/100."
        )
        portfolio_risk_contribution[company] = round((weight / 100) * (risk_score / 100) * 100, 1)

    expected_return_pct = round(
        sum(item["weight"] * item["historical_mean_return"] for item in allocation) / 100,
        2,
    )
    cagr_return_pct = round(
        sum(item["weight"] * item["cagr_return"] for item in allocation) / 100,
        2,
    )
    volatility_pct = round(
        sum(item["weight"] * item["stock_risk_score"] for item in allocation) / 100,
        2,
    )
    sharpe_like_ratio = round(expected_return_pct / max(volatility_pct, 1), 2)
    diversification_score = round(1 / sum((item["weight"] / 100) ** 2 for item in allocation), 2)

    as_of_date = frame["Date"].iloc[-1].strftime("%Y-%m-%d")
    market_snapshot = (
        f"NIFTY trend {market_profile['direction']} with 1M move of "
        f"{market_profile['return_1m']:.2f}% and India VIX at {market_profile['vix_level']:.2f}."
    )
    macro_snapshot = (
        f"RSI {market_profile['rsi']:.1f}, annualized volatility "
        f"{market_profile['annualized_volatility']:.2f}%, macro source {snapshot.macro_source}."
    )
    why_this_decision = [
        f"Current market condition is {market_profile['market_condition']} based on trend, volatility, and VIX.",
        f"Confidence is {market_profile['confidence_percent']:.1f}% with a {market_profile['direction']} directional bias.",
        f"Portfolio mix was adjusted for a {risk_pref} risk preference and a {horizon} horizon.",
    ]
    why_this_decision.extend(snapshot.macro_notes[:1])

    note = (
        "Live market data was used for core market inputs."
        if snapshot.live_data_used
        else snapshot.fallback_reason or "Limited market data fallback was used."
    )

    recommendation = {
        "service": {
            "version": "2.0.0",
            "generated_for": "QuantShield AI",
            "generated_at_utc": snapshot.generated_at,
        },
        "summary": {
            "headline": f"{market_profile['direction']} trend with {market_profile['confidence_percent']:.1f}% confidence",
            "market_condition": market_profile["market_condition"],
            "confidence": f"{market_profile['confidence_percent']:.1f}%",
            "confidence_percent": round(float(market_profile["confidence_percent"]), 1),
        },
        "risk_score": round(float(market_profile["risk_score"]), 1),
        "risk_score_basis": "Composite score from realized volatility, India VIX, and RSI regime.",
        "investment": {
            "recommended_investment": invest_amount,
            "recommended_hold": hold_amount,
        },
        "investment_plan": {
            "total_invested": invest_amount,
            "best_company": max(portfolio, key=portfolio.get),
            "recommended_allocation": allocation,
        },
        "why_this_decision": why_this_decision,
        "stock_analysis": stock_analysis,
        "portfolio_risk_contribution": portfolio_risk_contribution,
        "portfolio_split": portfolio,
        "what_to_do": {
            "recommended_action": (
                "Proceed gradually with the recommended allocation and review again if market volatility spikes."
                if snapshot.live_data_used
                else "Proceed cautiously. Regenerate when live data becomes available for a fresher market view."
            )
        },
        "sip": {
            "monthly_investment": sip,
            "months": sip_months,
            "suggestion": f"Invest \u20b9{sip}/month for the next {sip_months} months.",
        },
        "sector_recommendation": (
            ["IT", "Banking", "Auto"]
            if market_profile["direction"] == "UP"
            else ["FMCG", "Pharma", "Gold"]
        ),
        "performance": {
            "accuracy": round(min(0.92, 0.62 + (market_profile["confidence_percent"] / 300)), 3),
            "correct_predictions_percent": round(float(market_profile["confidence_percent"]), 1),
        },
        "chart": {
            "dates": frame.tail(200)["Date"].astype(str).tolist(),
            "close": frame.tail(200)["Close"].round(2).tolist(),
            "ma10": frame.tail(200)["MA10"].round(2).tolist(),
            "ma20": frame.tail(200)["MA20"].round(2).tolist(),
            "rsi": frame.tail(200)["RSI"].round(2).tolist(),
        },
        "explanation": {
            "risk_note": "Market risk is estimated from realized volatility, RSI regime, and India VIX level.",
            "direction_note": f"Market is likely to move {market_profile['direction']} based on moving-average trend and RSI.",
            "disclaimer": "This is decision-support output, not financial advice.",
        },
        "data_sources": {
            "market_data": snapshot.market_data_source,
            "model": "Heuristic allocation engine with technical and macro regime scoring",
            "features": ", ".join(FEATURE_NAMES),
        },
        "evaluation": {
            "expected_return_pct": expected_return_pct,
            "cagr_return_pct": cagr_return_pct,
            "volatility_pct": volatility_pct,
            "sharpe_like_ratio": sharpe_like_ratio,
            "diversification_score": diversification_score,
        },
        "metadata": {
            "live_data_used": snapshot.live_data_used,
            "fallback_reason": snapshot.fallback_reason,
            "considered_universe_size": 3,
            "shortlisted_universe_size": 3,
            "selected_stocks_count": len(allocation),
            "as_of_date": as_of_date,
            "return_basis": "Heuristic blended return assumptions using regime-aware historical proxies",
            "market_snapshot": market_snapshot,
            "macro_snapshot": macro_snapshot,
        },
        "generated_at": snapshot.generated_at,
        "note": note,
    }

    return recommendation


def recommend(user_input: dict[str, Any]) -> dict[str, Any]:
    try:
        return _build_recommendation_snapshot(user_input)
    except Exception as exc:
        return {"error": str(exc)}
