"""Simple API for the trained water potability model."""

from pathlib import Path
import os

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# Resolve the model from the project root, regardless of the server's working directory.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_ROOT / "model" / "water_potability_model.joblib"

# Keep the API available for health checks even if the model file is missing or invalid.
try:
    model = joblib.load(MODEL_PATH)
except Exception:
    model = None


app = FastAPI(title="Water Potability API")

# Allow local development origins and an optional production frontend origin.
# FRONTEND_ORIGIN may contain one origin or a comma-separated list (for preview URLs).
configured_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGIN", "").split(",")
    if origin.strip()
]
development_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(development_origins + configured_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WaterQualityInput(BaseModel):
    """The exact feature set and names expected by the trained pipeline."""

    ph: float
    Hardness: float
    Solids: float
    Chloramines: float
    Sulfate: float
    Conductivity: float
    Organic_carbon: float
    Trihalomethanes: float
    Turbidity: float


FEATURE_COLUMNS = [
    "ph",
    "Hardness",
    "Solids",
    "Chloramines",
    "Sulfate",
    "Conductivity",
    "Organic_carbon",
    "Trihalomethanes",
    "Turbidity",
]


@app.get("/health")
def health():
    """Report API and model availability."""
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict")
def predict(input_data: WaterQualityInput):
    """Predict potability and return the probability of the predicted class."""
    if model is None:
        raise HTTPException(status_code=503, detail="Prediction model is unavailable")

    try:
        # Pydantic preserves the input values; explicitly order columns for sklearn.
        row = input_data.model_dump() if hasattr(input_data, "model_dump") else input_data.dict()
        features = pd.DataFrame([[row[name] for name in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)
        prediction = int(model.predict(features)[0])
        probabilities = model.predict_proba(features)[0]

        # Select the probability corresponding to the predicted class.
        classes = list(model.classes_)
        probability = float(probabilities[classes.index(prediction)])
    except HTTPException:
        raise
    except Exception as exc:
        # Avoid exposing internal model or runtime details to API clients.
        raise HTTPException(status_code=500, detail="Prediction failed") from exc

    if prediction not in (0, 1):
        raise HTTPException(status_code=500, detail="Model returned an unsupported class")

    return {
        "prediction": prediction,
        "label": "Potable" if prediction == 1 else "Non-Potable",
        "probability": probability,
    }
