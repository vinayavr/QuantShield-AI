QuantShield AI – Backend (ML + API)

QuantShield AI is a machine learning-based backend system that analyzes financial market data to:

- Predict market risk (HIGH / LOW)
- Predict market direction (UP / DOWN)
- Suggest investment vs holding amount
- Provide portfolio allocation
- Recommend sectors and SIP plans
- Generate chart-ready data for future frontend

---

CURRENT STATUS

Machine Learning Model Completed
FastAPI Backend Completed
Frontend (Next.js) – In Progress

---

PROJECT STRUCTURE

backend/
│
├── model.py        # ML model + feature engineering + recommendation logic
├── main.py         # FastAPI API layer
├── model.pkl       # Trained model (generated after running)
├── scaler.pkl      # Scaler (generated after running)

---

REQUIREMENTS

Install Python (recommended: 3.10 or above)

Install dependencies

Run in PowerShell / Terminal / Git Bash

pip install pandas numpy yfinance requests joblib xgboost scikit-learn ta fastapi uvicorn

---

HOW TO RUN (STEP-BY-STEP)

---

Step 1: Clone the Project

Run in Git Bash / Terminal / PowerShell

git clone https://github.com/your-username/QuantShield-AI.git
cd QuantShield-AI/backend

---

Step 2: Train the Model

Run in PowerShell / Terminal

python model.py

This will:

- Fetch real NIFTY 50 & India VIX data
- Fetch macroeconomic data (FRED API)
- Train the ML model
- Save:
  - "model.pkl"
  - "scaler.pkl"

---

Step 3: Start API Server

 Run in PowerShell / Terminal

uvicorn main:app --reload

---

Step 4: Test API

Open browser:

http://127.0.0.1:8000/docs

You will see Swagger UI
You can test "/recommend" directly

---

API DETAILS

Endpoint:

POST /recommend

---

Request Body:

{
  "amount": 10000,
  "time_horizon": "medium",
  "risk_preference": "low"
}

---

Response (Sample):

{
  "summary": {
    "market_condition": "LOW RISK",
    "market_direction": "UP",
    "confidence_percent": 60.5
  },
  "investment": {
    "recommended_investment": 6500,
    "recommended_hold": 3500
  },
  "portfolio_allocation": {
    "equity": 60,
    "debt": 25,
    "cash": 15
  },
  "sector_recommendation": ["IT", "Banking", "Auto"]
}

---

DATA SOURCES

Market Data (Real)

- NIFTY 50 → "^NSEI"
- India VIX → "^INDIAVIX"

Macroeconomic Data

- CPI (Inflation)
- IIP (Industrial Production)
- USD/INR Exchange Rate

---

MODEL FEATURES

- Returns & volatility
- Moving averages (MA10, MA20)
- RSI (momentum indicator)
- VIX (market fear indicator)
- Macroeconomic indicators

---

IMPORTANT NOTES

- Predictions are probabilistic (not guaranteed)
- Model is designed for decision support
- Not financial advice

---

TROUBLESHOOTING

---

FRED API Error

If you see:

FRED FAILED → USING FALLBACK

Cause:

- API issue / invalid key

Fix:

- Get API key: https://fred.stlouisfed.org/
- Replace in "model.py"

---

Model not saving

Check if these files are created:

model.pkl
scaler.pkl

---

API not running

Ensure:

uvicorn main:app --reload



RUN ORDER (IMPORTANT)

1. git clone
2. cd backend
3. python model.py
4. uvicorn main:app --reload
5. open /docs in browser

---

NEXT STEPS (PLANNED)

- Build Next.js frontend dashboard
- Add real-time predictions
- Add news sentiment analysis
- Deploy backend (Render / AWS)


AUTHORS

Vinaya V R
B.Tech CSE (FinTech)
Akshaya G
B.Tech CSE

Backend complete — frontend coming soon!