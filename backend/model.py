import pandas as pd
import numpy as np
import yfinance as yf
import requests
import joblib
from xgboost import XGBClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import ta
from datetime import datetime

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

    df["Date"] = pd.to_datetime(df["Date"]).dt.normalize()
    df[series_id] = pd.to_numeric(df[series_id], errors="coerce")

    return df


start_date = "2011-01-01"
end_date = datetime.today().strftime('%Y-%m-%d')

nifty = safe_download("^NSEI")
vix = safe_download("^INDIAVIX")

if nifty is None or vix is None:
    raise Exception("Market data fetch failed")

nifty = nifty[['Date','Open','High','Low','Close']]
vix = vix[['Date','Close']].rename(columns={'Close':'VIX'})

df = pd.merge(nifty, vix, on='Date')

df['Close'] = pd.Series(df['Close'].values.ravel(), index=df.index)

FRED_API_KEY = "c158c58c7762962cee7d876b6c5ecba3"

try:
    cpi = fetch_fred_series("INDCPIALLMINMEI", start_date, end_date, FRED_API_KEY)
    iip = fetch_fred_series("INDPRO", start_date, end_date, FRED_API_KEY)
    usd = fetch_fred_series("DEXINUS", start_date, end_date, FRED_API_KEY)

    df = df.sort_values('Date')


    df['Date'] = pd.to_datetime(df['Date']).values.astype('datetime64[ns]')
    cpi['Date'] = pd.to_datetime(cpi['Date']).values.astype('datetime64[ns]')
    iip['Date'] = pd.to_datetime(iip['Date']).values.astype('datetime64[ns]')
    usd['Date'] = pd.to_datetime(usd['Date']).values.astype('datetime64[ns]')

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

df[['CPI','IIP','USD_INR']] = df[['CPI','IIP','USD_INR']].ffill().bfill()

print(df[['CPI','IIP','USD_INR']].isnull().sum())

df['Return'] = df['Close'].pct_change()
df['MA10'] = df['Close'].rolling(10).mean()
df['MA20'] = df['Close'].rolling(20).mean()
df['Trend'] = df['MA10'] - df['MA20']
df['Volatility'] = df['Return'].rolling(10).std()

# RSI FIX
df['RSI'] = ta.momentum.RSIIndicator(close=pd.Series(df['Close'].values.ravel())).rsi()

df['CPI_change'] = df['CPI'].pct_change()
df['USD_change'] = df['USD_INR'].pct_change()
df['Lag_Return'] = df['Return'].shift(1)
df['VIX_Change'] = df['VIX'].pct_change()

df = df.dropna()

if df.empty or len(df) < 50:
    raise Exception("Not enough data")

df['Future_Volatility'] = df['Volatility'].shift(-5)
thr = df['Future_Volatility'].quantile(0.75)
df['Risk'] = np.where(df['Future_Volatility'] > thr, 1, 0)
df = df.dropna()

features = ['Return','Trend','Volatility','RSI','VIX','CPI_change','USD_change','Lag_Return','VIX_Change']

X = df[features]
y = df['Risk']

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = XGBClassifier(
    scale_pos_weight=5,
    n_estimators=400,
    learning_rate=0.03,
    max_depth=4,
    random_state=42,
    subsample=0.9,
    colsample_bytree=0.9
)

tscv = TimeSeriesSplit(n_splits=8)

all_probs = []
all_true = []

for train, test in tscv.split(X_scaled):
    X_train, X_test = X_scaled[train], X_scaled[test]
    y_train, y_test = y.iloc[train], y.iloc[test]

    model.fit(X_train, y_train)
    probs = model.predict_proba(X_test)[:,1]

    all_probs.extend(probs)
    all_true.extend(y_test)

thresholds = np.arange(0.5, 0.9, 0.02)

best_t = 0.5
best_score = 0

for t in thresholds:
    preds = (np.array(all_probs) > t).astype(int)

    r = recall_score(all_true, preds)
    p = precision_score(all_true, preds)

    score = (0.7 * r) + (0.3 * p)

    if score > best_score:
        best_score = score
        best_t = t

threshold = best_t

final_probs = np.array(all_probs)
final_preds = (final_probs > threshold).astype(int)

acc = accuracy_score(all_true, final_preds)
prec = precision_score(all_true, final_preds)
rec = recall_score(all_true, final_preds)
f1 = f1_score(all_true, final_preds)
cm = confusion_matrix(all_true, final_preds)

print("\nMODEL PERFORMANCE")
print(f"Accuracy  : {acc:.4f}")
print(f"Precision : {prec:.4f}")
print(f"Recall    : {rec:.4f}")
print(f"F1 Score  : {f1:.4f}")
print("Confusion Matrix:")
print(cm.tolist())   

model.fit(X_scaled, y)

joblib.dump(model, "model.pkl")
joblib.dump(scaler, "scaler.pkl")

print("Model Saved Successfully")

def predict_market():
    latest = X_scaled[-1].reshape(1,-1)
    prob = model.predict_proba(latest)[0][1]
    return prob, "HIGH RISK" if prob > threshold else "LOW RISK"


def predict_direction():
    latest = df.iloc[-1]

    if latest['Trend'] > 0 and latest['RSI'] < 70:
        return "UP"
    elif latest['Trend'] < 0 and latest['RSI'] > 30:
        return "DOWN"
    elif latest['RSI'] >= 70:
        return "DOWN"
    elif latest['RSI'] <= 30:
        return "UP"
    else:
        return "UP" if latest['Trend'] > 0 else "DOWN"


def recommend(user_input):

    amount = user_input.get("amount", 10000)
    risk_pref = user_input.get("risk_preference", "medium").lower()
    horizon = user_input.get("time_horizon", "medium").lower()

    prob, risk = predict_market()
    direction = predict_direction()

    invest_ratio = max(0.1, 1 - prob)

    if risk_pref == "low":
        invest_ratio *= 0.7
    elif risk_pref == "high":
        invest_ratio *= 1.2

    invest_ratio = min(max(invest_ratio, 0.1), 0.9)

    invest_amount = int(amount * invest_ratio)
    hold_amount = amount - invest_amount

    if risk_pref == "low":
        portfolio = {"equity": 40, "debt": 40, "cash": 20}
    elif risk_pref == "high":
        portfolio = {"equity": 80, "debt": 10, "cash": 10}
    else:
        portfolio = {"equity": 60, "debt": 25, "cash": 15}

    if direction == "UP":
        sectors = ["IT", "Banking", "Auto"]
    else:
        sectors = ["FMCG", "Pharma", "Gold"]

    if horizon == "long":
        sip = int(amount * 0.2)
    elif horizon == "short":
        sip = int(amount * 0.1)
    else:
        sip = int(amount * 0.15)

    total = cm.sum()

    chart_df = df.tail(200)

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

        "sip_plan": {
            "monthly_investment": sip,
            "suggestion": f"Invest ₹{sip}/month for {horizon} term"
        },

        "sector_recommendation": sectors,

        "performance": {
            "accuracy": round(acc, 3),
            "correct_predictions_percent": round(((cm[0][0] + cm[1][1]) / total) * 100, 1)
        },

        "chart": {
            "dates": chart_df['Date'].astype(str).tolist(),
            "close": chart_df['Close'].tolist(),
            "ma10": chart_df['MA10'].tolist(),
            "ma20": chart_df['MA20'].tolist(),
            "rsi": chart_df['RSI'].tolist()
        },

        "explanation": {
            "risk_note": "Market risk is estimated from volatility patterns",
            "direction_note": f"Market is likely to move {direction} based on trend + RSI",
            "disclaimer": "This is a data-driven prediction, not financial advice"
        }
    }
