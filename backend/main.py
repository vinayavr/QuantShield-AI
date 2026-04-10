from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model import recommend

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserInput(BaseModel):
    amount: int
    time_horizon: str
    risk_preference: str


@app.get("/")
def home():
    return {"message": "QuantShield AI Running"}

@app.post("/recommend")
def get_recommend(user: UserInput):
    return recommend(user.dict())
