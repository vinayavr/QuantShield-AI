import pandas as pd
import numpy as np
import yfinance as yf
import requests
import joblib
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler
import ta
from datetime import datetime


# ---------------- SAFE DOWNLOAD ----------------
def safe_download(symbol):
    try:
        df = yf.download(symbol, period="15y", auto_adjust=True, progress=False, threads=False)

        if df is None or df.empty:
            raise Exception("Empty data")

        df = df.reset_index()

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        return df

    except Exception as e:
        print(f"Failed to fetch {symbol}: {e}")
        return None


# ---------------- FRED API ----------------
def fetch_fred_series(series_id, start_date, end_date, api_key):
    url = "https://api.stlouisfed.org/fred/series/observations"

    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "observation_start": start_date,
        "observation_end": end_date
    }

    response = requests.get(url, params=params, timeout=10)
    data = response.json()

    if "observations" not in data:
        raise Exception(f"FRED API error: {data}")

    df = pd.DataFrame(data["observations"])[["date", "value"]]
    df.columns = ["Date", series_id]

    df["Date"] = pd.to_datetime(df["Date"])
    df[series_id] = pd.to_numeric(df[series_id], errors="coerce")

    return df


# ---------------- DATA FETCH ----------------
start_date = "2011-01-01"
end_date = datetime.today().strftime('%Y-%m-%d')

nifty = safe_download("^NSEI")
vix = safe_download("^INDIAVIX")

if nifty is None or vix is None:
    raise Exception("Market data fetch failed")

nifty = nifty[['Date', 'Open', 'High', 'Low', 'Close']]
vix = vix[['Date', 'Close']].rename(columns={'Close': 'VIX'})

df = pd.merge(nifty, vix, on='Date')

df['Close'] = pd.Series(df['Close'].values.ravel(), index=df.index)


# ---------------- FRED ----------------
FRED_API_KEY = "your_api_key_here"

try:
    cpi = fetch_fred_series("INDCPIALLMINMEI", start_date, end_date, FRED_API_KEY)
    iip = fetch_fred_series("INDPRO", start_date, end_date, FRED_API_KEY)
    usd = fetch_fred_series("DEXINUS", start_date, end_date, FRED_API_KEY)

    df = df.sort_values('Date')

    df['Date'] = pd.to_datetime(df['Date'])
    cpi['Date'] = pd.to_datetime(cpi['Date'])
    iip['Date'] = pd.to_datetime(iip['Date'])
    usd['Date'] = pd.to_datetime(usd['Date'])

    df = pd.merge_asof(df, cpi.sort_values('Date'), on='Date')
    df = pd.merge_asof(df, iip.sort_values('Date'), on='Date')
    df = pd.merge_asof(df, usd.sort_values('Date'), on='Date')

    df.rename(columns={
        "INDCPIALLMINMEI": "CPI",
        "INDPRO": "IIP",
        "DEXINUS": "USD_INR"
    }, inplace=True)

    print("REAL FRED DATA LOADED")

except Exception as e:
    print("FRED FAILED → USING FALLBACK:", e)

    df['CPI'] = df['Close'].rolling(30).mean()
    df['IIP'] = df['Close'].rolling(60).mean()
    df['USD_INR'] = df['Close'].rolling(15).mean()

df[['CPI', 'IIP', 'USD_INR']] = df[['CPI', 'IIP', 'USD_INR']].ffill().bfill()


# ---------------- FEATURES ----------------
df['Return'] = df['Close'].pct_change()
df['MA10'] = df['Close'].rolling(10).mean()
df['MA20'] = df['Close'].rolling(20).mean()
df['Trend'] = df['MA10'] - df['MA20']
df['Volatility'] = df['Return'].rolling(10).std()

df['RSI'] = ta.momentum.RSIIndicator(close=df['Close']).rsi()

df['CPI_change'] = df['CPI'].pct_change()
df['USD_change'] = df['USD_INR'].pct_change()
df['Lag_Return'] = df['Return'].shift(1)
df['VIX_Change'] = df['VIX'].pct_change()

df = df.dropna()


# ---------------- MODEL ----------------
features = ['Return', 'Trend', 'Volatility', 'RSI', 'VIX', 'CPI_change', 'USD_change', 'Lag_Return', 'VIX_Change']

X = df[features]

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = XGBClassifier(n_estimators=200, learning_rate=0.05, max_depth=4, random_state=42)
model.fit(X_scaled, (df['Volatility'] > df['Volatility'].median()).astype(int))

joblib.dump(model, "model.pkl")
joblib.dump(scaler, "scaler.pkl")

print("Model Saved Successfully")


# ---------------- PREDICTION ----------------
def predict_market():
    latest = X_scaled[-1].reshape(1, -1)
    prob = float(model.predict_proba(latest)[0][1])
    return prob, "HIGH RISK" if prob > 0.5 else "LOW RISK"


def predict_direction():
    latest = df.iloc[-1]
    return "UP" if latest['Trend'] > 0 else "DOWN"


# ---------------- RECOMMEND ----------------
def recommend(user_input):

    amount = int(user_input.get("amount", 10000))

    prob, risk = predict_market()
    direction = predict_direction()

    invest_ratio = max(0.1, 1 - prob)
    invest_amount = int(amount * invest_ratio)
    hold_amount = amount - invest_amount

    portfolio = {"equity": 60, "debt": 25, "cash": 15}

    chart_df = df.tail(100)

    # ✅ NORMALIZED FEATURE IMPORTANCE (FIXED)
    latest_features = {
        "Volatility": abs(float(df['Volatility'].iloc[-1])),
        "CPI_change": abs(float(df['CPI_change'].iloc[-1])),
        "VIX_Change": abs(float(df['VIX_Change'].iloc[-1])),
        "USD_change": abs(float(df['USD_change'].iloc[-1])),
        "Trend": abs(float(df['Trend'].iloc[-1]))
    }

    total = sum(latest_features.values())

    max_val = max(latest_features.values())

    if max_val == 0:
        normalized = {k: 0 for k in latest_features}
    else:
        normalized = {k: round(v / max_val, 3) for k, v in latest_features.items()}

    return {
        "summary": {
            "market_condition": risk,
            "market_direction": direction,
            "confidence_percent": round(prob * 100, 2)
        },

        "investment": {
            "recommended_investment": invest_amount,
            "recommended_hold": hold_amount
        },

        "portfolio_allocation": portfolio,

        "chart": {
            "dates": chart_df['Date'].astype(str).tolist(),
            "close": chart_df['Close'].tolist()
        },

        "explanation": {
            "direction_note": f"Market likely {direction}",
            "disclaimer": "Not financial advice"
        },

        "feature_importance": normalized
    }