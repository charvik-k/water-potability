# Water Potability Prediction using PSO-Optimized Random Forest

## Overview

This project is an automated prediction and calibration framework for water potability using an environmental water-quality dataset. It combines a Particle Swarm Optimization (PSO) search with a Random Forest classifier and provides a small web interface for submitting sample measurements to the trained model.

## Problem

The framework predicts whether a water sample is potable from nine measured physicochemical parameters. The prediction is intended for research and demonstration; it is not a substitute for laboratory analysis or regulatory assessment.

## Methodology

The workflow is:

```text
Environmental dataset
→ preprocessing
→ baseline Random Forest
→ Particle Swarm Optimization
→ hyperparameter-optimized Random Forest
→ held-out test evaluation
→ serialized deployment model
→ FastAPI inference API
→ web frontend
```

PSO searches six Random Forest hyperparameters: `n_estimators`, `max_depth`, `min_samples_split`, `min_samples_leaf`, `max_features`, and `class_weight`. The configured optimization uses 20 particles, 25 iterations, and 5-fold `StratifiedKFold` cross-validation. Macro F1 is the optimization objective.

The deployed artifact is a scikit-learn `Pipeline` with a mean imputer followed by a Random Forest classifier. This keeps preprocessing with the fitted estimator at inference time.

## Results

The reported baseline and PSO Random Forest results are:

| Metric | Baseline RF | PSO RF | Improvement |
| --- | ---: | ---: | ---: |
| Accuracy | 65.85% | 67.22% | +1.37 percentage points |
| Balanced Accuracy | 59.34% | 61.36% | +2.02 percentage points |
| Weighted F1 | 62.16% | 64.10% | +1.94 percentage points |
| Macro F1 | 58.25% | 60.42% | +2.17 percentage points |

These are the supplied project results. No additional performance values are inferred here.

## PSO Configuration

The serialized deployment model reports the following final Random Forest values:

| Hyperparameter | Final value |
| --- | --- |
| `n_estimators` | `354` |
| `max_depth` | `None` |
| `min_samples_split` | `6` |
| `min_samples_leaf` | `2` |
| `max_features` | `0.2` |
| `class_weight` | `balanced_subsample` |

Search configuration: 20 particles, 25 iterations, 5-fold stratified cross-validation, and Macro F1 objective.

## Deployment

The application consists of a FastAPI inference backend, a joblib-serialized scikit-learn pipeline, and a static HTML/CSS/JavaScript frontend. A typical public deployment can host the API as a Render web service and the frontend as a Vercel static site. The frontend calls the backend directly; configure the backend's `FRONTEND_ORIGIN` with the actual deployed frontend origin, and set the frontend's `api-base-url` meta tag to the actual backend base URL. Neither deployment URL is assumed in the source.

For a Render Python web service, use:

- **Build command:** `pip install -r backend/requirements.txt`
- **Start command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Environment variable:** `FRONTEND_ORIGIN=https://<your-actual-frontend-origin>`

Set `FRONTEND_ORIGIN` to the origin only (scheme and hostname, without a path). Comma-separated origins are accepted for multiple frontend deployments. The backend also allows the local development origins `localhost` and `127.0.0.1` on ports 3000 and 5173.

Before deploying the static frontend, set the `api-base-url` meta tag in `frontend/index.html` to the deployed backend base URL, for example `https://<your-actual-backend-origin>`. Leave it empty for local development, where the frontend uses `http://127.0.0.1:8000` automatically. The production frontend does not fall back to a localhost API.

## Local Setup

Run these commands from the project root. For PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload
```

If PowerShell script activation is unavailable, activate from Command Prompt with `\.venv\Scripts\activate.bat` instead. To start the frontend, open another terminal in the project root and run:

```powershell
python -m http.server 5173 --directory frontend
```

Open `http://127.0.0.1:5173`. The API is available at `http://127.0.0.1:8000`. The production server command, run from the project root, is:

```sh
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

## API

### `GET /health`

Returns API status and whether the model loaded:

```json
{"status":"ok","model_loaded":true}
```

### `POST /predict`

Send one JSON object with these nine model features:

```json
{
  "ph": 7.2,
  "Hardness": 196.3,
  "Solids": 21450,
  "Chloramines": 7.1,
  "Sulfate": 333.2,
  "Conductivity": 426,
  "Organic_carbon": 14.2,
  "Trihalomethanes": 66.3,
  "Turbidity": 3.9
}
```

The response includes `prediction` (`0` for Non-Potable, `1` for Potable), `label`, and `probability` for the predicted class.

## Limitations

- This model is a research prototype.
- Potable-class recall is lower than non-potable-class recall in the reported evaluation.
- Predictions are estimates and should not be treated as laboratory certification.
- Real-world deployment would require broader validation and domain-specific water-quality standards.

## Project Structure

```text
Water-Potability-PSO/
├── .gitignore
├── README.md
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
└── model/
    └── water_potability_model.joblib
```

The model artifact is intentionally included in the project structure and is not excluded by `.gitignore`.

## Technologies

- Python
- scikit-learn and Random Forest
- Particle Swarm Optimization (PySwarms)
- FastAPI and Uvicorn
- HTML, CSS, and vanilla JavaScript
- joblib

## Author

Developed as an AI/ML research and engineering project.
