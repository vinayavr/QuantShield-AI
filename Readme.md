# QuantShield AI

QuantShield AI is a portfolio recommendation prototype that combines a Next.js investor-facing interface with a FastAPI analytics service. The project now presents itself more like a legitimate fintech analysis tool by surfacing methodology, data freshness, scenario views, and explicit limitations instead of behaving like a throwaway demo.

## What improved

- A proper landing page and onboarding flow replaced the automatic redirect into the app.
- The frontend now communicates trust markers, analysis scope, and suitability limits more clearly.
- Empty states across the dashboard, explainability, and scenario views now guide the user back into the correct workflow.
- The FastAPI service now exposes clearer health metadata, request logging, a stable version header, and configurable CORS.
- The README and scripts now reflect a real setup workflow rather than the default scaffold text.

## Stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS 4, Chart.js
- Backend: FastAPI, Pandas, NumPy, yfinance, pandas-datareader, scikit-learn
- Market inputs: Yahoo Finance and FRED

## Project structure

```text
app/        Next.js app router frontend
backend/    FastAPI API and portfolio logic
public/     Static assets
```

## Run locally

### 1. Frontend

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`.

Optional environment variable:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend runs on `http://127.0.0.1:8000`.

Optional backend environment variables:

```bash
QUANTSHIELD_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
LOG_LEVEL=INFO
```

## Quality checks

```bash
npm run lint
npm run typecheck
```

## Product positioning

QuantShield AI should be framed as a decision-support prototype. It provides portfolio screening, allocation logic, and explanatory outputs, but it does not:

- execute trades
- perform KYC or suitability checks
- replace licensed financial advice
- guarantee outcomes

That framing is important if you want the product to feel credible and industry-aware.
