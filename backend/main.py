from datetime import date, datetime
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from model import recommend


app = FastAPI()


# ✅ CORS (SAFE + FLEXIBLE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ INPUT MODEL (ACCEPT BOTH FORMATS)
class UserInput(BaseModel):
    amount: int
    risk_preference: str

    time_horizon: Optional[str] = None
    time_value: Optional[int] = None
    time_unit: Optional[str] = None


# ✅ SAFE JSON CONVERTER
def make_json_safe(value):
    if isinstance(value, dict):
        return {str(k): make_json_safe(v) for k, v in value.items()}

    if isinstance(value, list):
        return [make_json_safe(v) for v in value]

    if isinstance(value, tuple):
        return [make_json_safe(v) for v in value]

    if isinstance(value, np.ndarray):
        return make_json_safe(value.tolist())

    if isinstance(value, np.integer):
        return int(value)

    if isinstance(value, np.floating):
        return float(value)

    if isinstance(value, np.bool_):
        return bool(value)

    if isinstance(value, pd.Timestamp):
        return value.isoformat()

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    return value


# ✅ ROOT CHECK
@app.get("/")
def home():
    return {"message": "QuantShield AI Running"}


# ✅ HEALTH CHECK
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "backend",
        "version": "2.0.0"
    }


# ✅ MAIN API
@app.post("/recommend")
def get_recommend(user: UserInput):
    try:
        data = user.model_dump()

        # 🔥 FIX: HANDLE BOTH FRONTEND FORMATS
        if not data.get("time_horizon"):
            if data.get("time_value") and data.get("time_unit"):
                value = data["time_value"]
                unit = data["time_unit"].lower()

                # convert → model expected format
                if unit.startswith("year"):
                    if value >= 5:
                        data["time_horizon"] = "long"
                    elif value >= 2:
                        data["time_horizon"] = "medium"
                    else:
                        data["time_horizon"] = "short"

                elif unit.startswith("month"):
                    if value <= 12:
                        data["time_horizon"] = "short"
                    elif value <= 36:
                        data["time_horizon"] = "medium"
                    else:
                        data["time_horizon"] = "long"

                else:
                    data["time_horizon"] = "medium"
            else:
                data["time_horizon"] = "medium"

        result = recommend(data)

        if isinstance(result, dict) and result.get("error"):
            raise HTTPException(status_code=502, detail=str(result["error"]))

        return make_json_safe(result)

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e

        raise HTTPException(
            status_code=500,
            detail=f"Recommendation failed: {str(e)}"
        )
