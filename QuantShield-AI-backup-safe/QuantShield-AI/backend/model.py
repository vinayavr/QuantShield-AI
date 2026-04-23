from datetime import datetime

import numpy as np
import pandas as pd
import shap
import xgboost as xgb
import yfinance as yf

TRADING_DAYS_PER_YEAR = 252


def _safe_float(value):
    return float(value) if np.isfinite(value) else 0.0


def _annualized_return(daily_returns):
    return _safe_float(daily_returns.mean() * TRADING_DAYS_PER_YEAR)


def _annualized_volatility(daily_returns):
    return _safe_float(daily_returns.std(ddof=1) * np.sqrt(TRADING_DAYS_PER_YEAR))


def _cagr_from_prices(price_series):
    clean = price_series.dropna()
    if len(clean) < 2:
        return 0.0

    start_price = clean.iloc[0]
    end_price = clean.iloc[-1]
    if start_price <= 0 or end_price <= 0:
        return 0.0

    years = len(clean) / TRADING_DAYS_PER_YEAR
    if years <= 0:
        return 0.0

    return _safe_float((end_price / start_price) ** (1 / years) - 1)


def _trailing_total_return(price_series, lookback=TRADING_DAYS_PER_YEAR):
    clean = price_series.dropna()
    if len(clean) < 2:
        return 0.0

    start_idx = max(0, len(clean) - lookback - 1)
    start_price = clean.iloc[start_idx]
    end_price = clean.iloc[-1]

    if start_price == 0:
        return 0.0

    return _safe_float((end_price / start_price) - 1)


def _beta(stock_returns, benchmark_returns):
    aligned = pd.concat(
        [stock_returns.rename("stock"), benchmark_returns.rename("benchmark")],
        axis=1,
        join="inner",
    ).dropna()

    if len(aligned) < 2:
        return 0.0

    benchmark_variance = aligned["benchmark"].var(ddof=1)
    if benchmark_variance == 0 or not np.isfinite(benchmark_variance):
        return 0.0

    covariance = aligned["stock"].cov(aligned["benchmark"])
    return _safe_float(covariance / benchmark_variance)


def _risk_band_from_percentile(percentile):
    if percentile <= (1 / 3):
        return "low"
    if percentile <= (2 / 3):
        return "medium"
    return "high"


def _portfolio_returns(returns, weights):
    return returns.mul(weights, axis=1).sum(axis=1)


def _portfolio_risk_contribution(weights, covariance, labels):
    portfolio_variance = float(np.dot(weights.T, np.dot(covariance, weights)))
    if portfolio_variance <= 0 or not np.isfinite(portfolio_variance):
        return {label.replace(".NS", ""): 0.0 for label in labels}

    marginal_contribution = np.dot(covariance, weights)
    contribution = weights * marginal_contribution / portfolio_variance
    return {
        label.replace(".NS", ""): round(_safe_float(value) * 100, 2)
        for label, value in zip(labels, contribution)
    }


def _effective_holdings(weights):
    denominator = _safe_float(np.sum(np.square(weights)))
    if denominator <= 0:
        return 0.0
    return round(1 / denominator, 2)


def _months_from_horizon(time_value, time_unit):
    if time_unit == "years":
        return max(1, int(time_value) * 12)
    return max(1, int(time_value))


def _allocate_exact_amount(total_amount, weights):
    raw_amounts = np.array(weights, dtype=float) * int(total_amount)
    floored = np.floor(raw_amounts).astype(int)
    remainder = int(total_amount) - int(floored.sum())

    if remainder > 0:
        fractional_order = np.argsort(-(raw_amounts - floored))
        for idx in fractional_order[:remainder]:
            floored[idx] += 1

    return floored.tolist()


def _rebalance_visible_allocation(allocation, total_amount, monthly_amount):
    visible = allocation[:5]
    if not visible:
        return []

    visible_weights = np.array([item["weight"] / 100 for item in visible], dtype=float)
    weight_sum = float(visible_weights.sum())
    if weight_sum <= 0:
        visible_weights = np.ones(len(visible), dtype=float) / len(visible)
    else:
        visible_weights = visible_weights / weight_sum

    exact_total_amounts = _allocate_exact_amount(total_amount, visible_weights)
    exact_monthly_amounts = _allocate_exact_amount(monthly_amount, visible_weights)

    rebalanced = []
    for idx, item in enumerate(visible):
        weight_pct = round(_safe_float(visible_weights[idx]) * 100, 2)
        total_alloc = exact_total_amounts[idx]
        monthly_alloc = exact_monthly_amounts[idx]
        updated = item.copy()
        updated.update(
            {
                "weight": weight_pct,
                "amount": total_alloc,
                "amount_display": f"Rs {total_alloc:,}",
                "monthly_amount": monthly_alloc,
                "monthly_amount_display": f"Rs {monthly_alloc:,}",
            }
        )
        rebalanced.append(updated)

    return rebalanced


# ---------------- FETCH NIFTY 50 ----------------
def get_nifty50():
    url = "https://archives.nseindia.com/content/indices/ind_nifty50list.csv"
    df = pd.read_csv(url)
    return [f"{symbol}.NS" for symbol in df["Symbol"].tolist()[:15]]


# ---------------- FETCH FRED ----------------
def fetch_fred(series):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}"
    df = pd.read_csv(url)
    df.columns = ["DATE", series]
    df["DATE"] = pd.to_datetime(df["DATE"])
    df.set_index("DATE", inplace=True)
    return df


# ---------------- FETCH DATA ----------------
def fetch_data():
    try:
        stocks = get_nifty50()
        if not stocks:
            raise ValueError("No NIFTY symbols were fetched")

        stock_prices = yf.download(stocks, period="5y", progress=False)["Close"]
        vix = yf.download("^INDIAVIX", period="5y", progress=False)["Close"]
        benchmark_prices = yf.download("^NSEI", period="5y", progress=False)["Close"]

        stock_prices = pd.DataFrame(stock_prices).dropna(axis=1, how="any")
        if stock_prices.empty:
            raise ValueError("No stock price history was available")

        vix = pd.DataFrame(vix)
        vix.columns = ["VIX"]
        if vix.empty:
            raise ValueError("No India VIX history was available")

        benchmark_prices = pd.DataFrame(benchmark_prices).squeeze("columns").dropna()
        benchmark_prices.name = "NIFTY50"
        if benchmark_prices.empty:
            raise ValueError("No NIFTY 50 benchmark history was available")

        fed = fetch_fred("FEDFUNDS")
        cpi = fetch_fred("CPIAUCSL")

        for df in [stock_prices, vix, fed, cpi]:
            df.index = pd.to_datetime(df.index)
            df.sort_index(inplace=True)

        benchmark_prices.index = pd.to_datetime(benchmark_prices.index)
        benchmark_prices.sort_index(inplace=True)

        fed = fed.resample("D").ffill()
        cpi = cpi.resample("D").ffill()
        macro = pd.concat([vix, fed, cpi], axis=1, join="inner").dropna()

        if macro.empty:
            raise ValueError("Macro data alignment produced no rows")

        return stock_prices, macro, benchmark_prices
    except Exception as exc:
        raise Exception(f"Data fetch failed: {exc}") from exc


# ---------------- RETURNS ----------------
def compute_returns(prices):
    return prices.pct_change().dropna()


# ---------------- FEATURES ----------------
def create_features(returns, macro):
    df = returns.copy()
    df = df.join(macro, how="inner")
    df["volatility"] = returns.mean(axis=1).rolling(10).std()
    df.dropna(inplace=True)
    return df


# ---------------- ML MODEL ----------------
def train_model(features):
    target = features.mean(axis=1).rolling(5).std().shift(-5)

    df = features.copy()
    df["target"] = target
    df.dropna(inplace=True)
    if df.empty:
        raise ValueError("Not enough feature rows to train the model")

    X = df.drop("target", axis=1)
    y = df["target"]

    model = xgb.XGBRegressor(n_estimators=50, max_depth=3)
    model.fit(X, y)

    return model, X


# ---------------- SHAP ----------------
def shap_explain(model, X):
    explainer = shap.Explainer(model)
    shap_values = explainer(X)

    importance = np.abs(shap_values.values).mean(axis=0)

    return dict(
        sorted(zip(X.columns, importance), key=lambda item: item[1], reverse=True)
    )


# ---------------- OPTIMIZATION ----------------
def optimize(returns, risk_pref):
    mean_returns = returns.mean()
    cov = returns.cov()

    n = len(mean_returns)
    if n == 0:
        raise ValueError("No assets available for optimization")

    best_w = None
    best_score = -999.0

    for _ in range(4000):
        w = np.random.random(n)
        w /= np.sum(w)

        ret = np.dot(w, mean_returns)
        vol = np.sqrt(np.dot(w.T, np.dot(cov, w)))

        if vol == 0:
            continue

        sharpe = ret / vol

        if risk_pref == "low":
            score = sharpe - vol
        elif risk_pref == "high":
            score = sharpe + ret
        else:
            score = sharpe

        if score > best_score:
            best_score = score
            best_w = w

    if best_w is None:
        raise ValueError("Portfolio optimization did not produce any weights")

    return best_w, mean_returns, cov


# ---------------- REGRET MODEL ----------------
def compute_regret(best_weights, returns):
    equal_weights = np.ones(len(best_weights)) / len(best_weights)

    best_return = np.dot(best_weights, returns.mean())
    equal_return = np.dot(equal_weights, returns.mean())

    regret = max(0, (best_return - equal_return) * 100)

    return round(regret, 2)


# ---------------- MAIN ----------------
def recommend(user_input):
    try:
        amount = int(user_input.get("amount", 10000))
        risk_pref = user_input.get("risk_preference", "medium")
        time_value = int(user_input.get("time_value", 1))
        time_unit = user_input.get("time_unit", "years")

        prices, macro, benchmark_prices = fetch_data()
        returns = compute_returns(prices)
        benchmark_returns = compute_returns(benchmark_prices)

        if returns.empty:
            raise ValueError("No return data was available")

        features = create_features(returns, macro)
        if features.empty:
            raise ValueError("Feature creation produced no rows")

        model, X = train_model(features)
        shap_values = shap_explain(model, X)

        weights, mean_returns, cov = optimize(returns, risk_pref)

        stocks = returns.columns.tolist()
        if not stocks:
            raise ValueError("No stocks available after data preparation")

        weight_series = pd.Series(weights, index=stocks)
        annualized_volatility = returns.std(ddof=1) * np.sqrt(TRADING_DAYS_PER_YEAR) * 100
        volatility_rank = annualized_volatility.rank(method="average", pct=True)
        selection_rank = weight_series.rank(method="average", pct=True) * 100
        horizon_months = _months_from_horizon(time_value, time_unit)
        monthly_budget = int(round(amount / horizon_months))
        allocated_amounts = _allocate_exact_amount(amount, weights)
        monthly_allocated_amounts = _allocate_exact_amount(monthly_budget, weights)

        allocation = []
        for i, symbol in enumerate(stocks):
            clean_symbol = symbol.replace(".NS", "")
            weight = _safe_float(weights[i])
            historical_mean_return = _safe_float(mean_returns.iloc[i] * TRADING_DAYS_PER_YEAR * 100)
            cagr_return = _cagr_from_prices(prices[symbol]) * 100
            invested_amount = allocated_amounts[i]
            monthly_amount = monthly_allocated_amounts[i]
            trailing_return = _trailing_total_return(prices[symbol]) * 100
            stock_volatility = _safe_float(annualized_volatility.loc[symbol])
            stock_beta = _beta(returns[symbol], benchmark_returns)
            volatility_percentile = _safe_float(volatility_rank.loc[symbol])
            selection_score = _safe_float(selection_rank.loc[symbol])

            allocation.append(
                {
                    "company": clean_symbol,
                    "weight": round(weight * 100, 2),
                    "amount": invested_amount,
                    "amount_display": f"Rs {invested_amount:,}",
                    "monthly_amount": monthly_amount,
                    "monthly_amount_display": f"Rs {monthly_amount:,}",
                    "expected_return": round(historical_mean_return, 2),
                    "historical_mean_return": round(historical_mean_return, 2),
                    "cagr_return": round(cagr_return, 2),
                    "trailing_one_year_return": round(trailing_return, 2),
                    "stock_risk_score": round(stock_volatility, 2),
                    "stock_risk_level": _risk_band_from_percentile(volatility_percentile),
                    "selection_score": round(selection_score, 2),
                    "market_beta": round(stock_beta, 2),
                }
            )

        allocation = sorted(allocation, key=lambda item: item["weight"], reverse=True)
        if not allocation:
            raise ValueError("No allocation entries were generated")

        portfolio_returns = _portfolio_returns(returns[stocks], weights)
        risk_free_rate = _safe_float(macro["FEDFUNDS"].dropna().iloc[-1] / 100) if "FEDFUNDS" in macro else 0.0
        expected_return_pct = round(_annualized_return(portfolio_returns) * 100, 2)
        weighted_cagr_pct = round(
            sum(
                _safe_float(weights[i]) * (_cagr_from_prices(prices[symbol]) * 100)
                for i, symbol in enumerate(stocks)
            ),
            2,
        )
        volatility_pct = round(_annualized_volatility(portfolio_returns) * 100, 2)
        sharpe_ratio = 0.0
        if volatility_pct > 0:
          sharpe_ratio = round((expected_return_pct / 100 - risk_free_rate) / (volatility_pct / 100), 2)

        portfolio_risk_contribution = _portfolio_risk_contribution(weights, cov.values, stocks)
        portfolio_split = {
            item["company"]: round(item["weight"], 2) for item in allocation
        }

        visible_allocation = _rebalance_visible_allocation(allocation, amount, monthly_budget)
        top_allocation = visible_allocation[0]
        risk_score = volatility_pct
        regret = compute_regret(weights, returns)

        return {
            "summary": {
                "headline": "Explainable AI Portfolio built from live market, macro, and benchmark data.",
                "market_condition": "LIVE",
                "confidence": "Live data + optimizer + benchmark risk metrics",
            },
            "investment_plan": {
                "total_invested": amount,
                "best_company": top_allocation["company"],
                "recommended_allocation": visible_allocation,
            },
            "risk_score": risk_score,
            "why_this_decision": [
                f"{top_allocation['company']} received the highest portfolio weight at {top_allocation['weight']}% from the optimizer.",
                f"Portfolio historical mean return is {expected_return_pct}% and weighted stock-level CAGR is {weighted_cagr_pct}%.",
                f"Portfolio annualized volatility is {volatility_pct}% using the weighted daily return series and sqrt(252) scaling.",
            ],
            "stock_analysis": [
                f"{item['company']}: 1Y return {item['trailing_one_year_return']}%, annualized volatility {item['stock_risk_score']}%, beta {item['market_beta']}."
                for item in visible_allocation
            ],
            "portfolio_risk_contribution": portfolio_risk_contribution,
            "portfolio_split": portfolio_split,
            "risk_score_basis": "Annualized portfolio volatility (%) from live daily weighted returns.",
            "regret_analysis": {
                "regret_score": regret,
                "message": "Regret compares optimized mean return with an equal-weight alternative over the same live return sample.",
            },
            "ml_insights": {
                "top_factors": list(shap_values.keys())[:5],
                "feature_importance": shap_values,
            },
            "what_to_do": {
                "recommended_action": "Use the allocation as a decision-support view, then review volatility, beta, and concentration before investing.",
            },
            "sip": {
                "monthly_investment": monthly_budget,
                "months": horizon_months,
            },
            "data_sources": {
                "market_data": "Yahoo Finance live closes for selected NIFTY stocks, India VIX, and ^NSEI benchmark",
                "macro_data": "FRED FEDFUNDS and CPIAUCSL",
                "model": "Mean-variance Monte Carlo search with XGBoost + SHAP explanations",
                "features": "Daily returns, historical annualized mean return, CAGR, annualized volatility, trailing return, beta vs benchmark, exact amount allocation, and risk contribution",
            },
            "evaluation": {
                "expected_return_pct": expected_return_pct,
                "cagr_return_pct": weighted_cagr_pct,
                "volatility_pct": volatility_pct,
                "sharpe_like_ratio": sharpe_ratio,
                "diversification_score": _effective_holdings(weights),
            },
            "generated_at": datetime.now().isoformat(),
            "metadata": {
                "live_data_used": True,
                "as_of_date": prices.index.max().date().isoformat(),
                "selected_stocks_count": len(visible_allocation),
                "considered_universe_size": len(stocks),
                "shortlisted_universe_size": len(allocation),
                "return_basis": "Historical mean return = average daily close-to-close return * 252; CAGR = (ending price / starting price)^(1/years) - 1; beta = cov(stock, ^NSEI) / var(^NSEI); user capital is distributed exactly across monthly and total allocations.",
                "market_snapshot": f"NIFTY 50 benchmark latest close: {round(_safe_float(benchmark_prices.iloc[-1]), 2)}.",
                "macro_snapshot": f"India VIX latest close: {round(_safe_float(macro['VIX'].dropna().iloc[-1]), 2)} | FEDFUNDS: {round(risk_free_rate * 100, 2)}%.",
            },
            "note": "Return and risk metrics are computed from live historical closes and benchmark data, and the invested capital is distributed exactly across the selected horizon.",
        }
    except Exception as exc:
        print("REAL ERROR:", repr(exc))
        return {"error": f"Portfolio generation failed: {exc}"}
