import logging
import os
from datetime import date, datetime, timezone
from typing import Any, Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from model import recommend

# ---------------- LOGGING ----------------
logger = logging.getLogger("quantshield.api")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

# ---------------- CONFIG ----------------
APP_VERSION = "2.1.0"

DEFAULT_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("QUANTSHIELD_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
    if origin.strip()
]

# ---------------- FASTAPI INIT ----------------
app = FastAPI(
    title="QuantShield AI API",
    version=APP_VERSION,
    summary="AI-driven portfolio recommendation system (journal-grade)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ---------------- INPUT MODEL ----------------
class UserInput(BaseModel):
    amount: int = Field(..., gt=0)
    risk_preference: Literal["low", "medium", "high"] = "medium"
    time_value: int = Field(1, gt=0, le=50)
    time_unit: Literal["months", "years"] = "years"

# ---------------- JSON SAFE ----------------
def json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(v) for v in value]
    if isinstance(value, np.ndarray):
        return json_safe(value.tolist())
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

# ---------------- ROUTES ----------------
@app.get("/")
def home():
    return {
        "service": "QuantShield AI API",
        "status": "ok",
        "version": APP_VERSION,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "docs": "/docs",
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "quantshield-api",
        "version": APP_VERSION,
        "allowed_origins": ALLOWED_ORIGINS,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }

# ---------------- REQUEST LOGGER ----------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    started_at = datetime.now(timezone.utc)

    response = await call_next(request)

    duration_ms = int(
        (datetime.now(timezone.utc) - started_at).total_seconds() * 1000
    )

    logger.info(
        "%s %s -> %s (%sms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )

    response.headers["X-QuantShield-Version"] = APP_VERSION
    return response

# ---------------- MAIN ENDPOINT ----------------
@app.post("/recommend")
def get_recommend(user: UserInput):
    try:
        logger.info(
            "Generating recommendation for amount=%s risk=%s horizon=%s-%s",
            user.amount,
            user.risk_preference,
            user.time_value,
            user.time_unit,
        )

        payload = user.model_dump()
        logger.info("User payload: %s", payload)

        # ---------------- MODEL CALL ----------------
        result = recommend(payload)

        # ---------------- VALIDATION ----------------
        if not isinstance(result, dict):
            raise RuntimeError("Model returned invalid response")

        if "error" in result:
            raise RuntimeError(result["error"])

        # ---------------- ADD SERVICE INFO ----------------
        result["service"] = {
            "version": APP_VERSION,
            "generated_for": user.risk_preference,
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        }

        # ---------------- ENSURE METADATA EXISTS ----------------
        if "metadata" not in result:
            result["metadata"] = {}

        result["metadata"].update({
            "live_data_used": True,
            "as_of_date": datetime.now().date().isoformat(),
        })

        # ✅ IMPORTANT: DO NOT TOUCH charts (already base64 from model)

        return JSONResponse(content=json_safe(result))

    except Exception as exc:
        logger.exception("Recommendation generation failed")

        raise HTTPException(
            status_code=500,
            detail=(
                f"Recommendation failed: {str(exc)}. "
                "Check: Yahoo Finance fetch, FRED API key, or insufficient data."
            ),
        )