# Lumyina ESG Platform

Lumyina is a full-stack ESG emissions platform for collecting Scope 1/2 activity data, calculating emissions with location-specific factors, tracking progress on dashboards, and generating board-ready reports (including AI-assisted narratives, PDF, and CSV exports).

---

## Table of Contents

- [What This Project Includes](#what-this-project-includes)
- [Repository Structure](#repository-structure)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Backend API Overview](#backend-api-overview)
- [Data Model (Firestore)](#data-model-firestore)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Build and Deployment](#build-and-deployment)
- [Important Implementation Notes](#important-implementation-notes)
- [Troubleshooting](#troubleshooting)

---

## What This Project Includes

- **Frontend**: React (Create React App), Zustand state management, Recharts visualizations
- **Backend**: FastAPI, Firebase Admin SDK, Firestore persistence, OpenAI integration
- **Auth**: Firebase authentication with backend token verification
- **Reporting**:
  - AI-generated ESG report (`/api/reports/generate`)
  - Formal report endpoint (`/api/formal-report/generate-formal`)
  - CSV export (`/api/reports/export-csv`)
  - PDF export on frontend via DOM capture

---

## Repository Structure

```text
ESG/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── scripts/
│   ├── requirements.txt
│   └── runtime.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── firebase/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   └── utils/
│   ├── public/
│   └── package.json
└── render.yaml
```

---

## Architecture

## Frontend

- Route composition in `frontend/src/app/routes.jsx`
- Layouts:
  - `AppLayout` for authenticated pages
  - Auth/public pages for login/signup/legal content
- Global state:
  - `authStore.js`: auth/session/token refresh
  - `companyStore.js`: company setup and retrieval
  - `emissionStore.js`: Scope 1/2 submissions and summaries
  - `selectedLocationStore.js`: country-city selection persistence

## Backend

- App entry: `backend/app/main.py`
- Router modules:
  - `auth.py`, `companies.py`, `emissions.py`, `reports.py`, `formal_report.py`, `predictions.py`, `settings.py`, `admin.py`
- Firebase initialization and Firestore access:
  - `backend/app/utils/firebase.py`
- Calculations:
  - `backend/app/services/calculator.py`
- Prediction engine:
  - `backend/app/services/predictor.py`

---

## Key Features

## Company Setup

- Company profile with industry, employees, revenue, region, fiscal year
- Multi-location support (country-city pairs)
- Company logo upload and persistence

## Scope 1 Data Entry

- Mobile combustion
- Stationary combustion
- Refrigerants
- Fugitive emissions
- Location-aware factor application

## Scope 2 Data Entry

- Electricity (location-based + market-based)
- Heating/cooling
- Renewables
- Certificate-aware handling (RECs/PPAs)

## Dashboard Analytics

- KPI summaries and trends
- 12-month fiscal trend views
- Missing month banner
- What-if scenario modeling
- Seasonal pattern detection
- Carbon budget trajectory analysis
- Anomaly detection alerts

## Reporting

- AI report generation with market-standard sections
- Fiscal period filters (yearly/quarterly/monthly)
- PDF download (with company logo support)
- CSV export with row-level emissions data
- Methodology and factor disclosure section

---

## Backend API Overview

Base URL (local): `http://localhost:8001`

## Auth (`/api/auth`)

- `POST /register`
- `POST /login`
- `GET /me`
- `POST /logout`

## Companies (`/api/companies`)

- `POST /` Create company
- `GET /me` Fetch current company
- `PUT /me` Update company

## Emissions (`/api/emissions`)

- `GET /available-locations`
- `GET /factors/{country}/{city}`
- `GET /scope1`
- `GET /scope2`
- `POST /scope1`
- `POST /scope2`
- `DELETE /scope1`
- `DELETE /scope2`
- `GET /monthly-breakdown`
- `GET /monthly-category-breakdown`
- `GET /sparkline-data`
- `GET /month-status`
- `GET /summary`

## Reports (`/api/reports`)

- `POST /generate` AI report payload (`report_standard`, charts, recommendations, etc.)
- `GET /export-csv` Raw emissions CSV export
- `POST /source-recommendation` One-line source-specific recommendation

## Formal Report (`/api/formal-report`)

- `POST /generate-formal`

## Predictions (`/api`)

- `PUT /companies/targets`
- `GET /companies/targets`
- `GET /predictions`

## Admin (`/api/admin`)

- `GET /cities`
- `GET /factors`
- `POST /factors`
- `DELETE /factors/{factor_id}`

---

## Data Model (Firestore)

Primary collections used:

- `users/{uid}`
  - includes `companyId`
- `companies/{companyId}`
  - `basicInfo`, `locations`, setup metadata
- `emissionData/{companyId}/scope1/{doc}`
- `emissionData/{companyId}/scope2/{doc}`
  - monthly submitted activity + calculated results
- `settings/{companyId}`
- `emissionFactors/...`
  - regional/country/city scope factor docs

Notes:
- System supports factor documents in multiple legacy shapes.
- Location normalization is used across stores/routes to reduce lookup mismatches.

---

## Local Development Setup

## 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Backend health check:

```bash
curl http://localhost:8001/health
```

## 2) Frontend

```bash
cd frontend
npm install
npm start
```

Frontend default dev URL:

- `http://localhost:3000`

---

## Environment Variables

## Backend

- `FIREBASE_CREDENTIALS` (JSON string for Firebase service account)
- `OPENAI_API_KEY` (for AI report generation)

Backend also supports local key file fallback:

- `backend/keys/service-account-key.json` (or first JSON in `backend/keys/`)

## Frontend

- `REACT_APP_API_URL` (example: `http://localhost:8001`)
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID` (optional where used)

---

## Build and Deployment

Deployment config is provided in `render.yaml`:

- Frontend static service (`frontend`)
  - build: `npm install && npm run build`
- Backend web service (`backend`)
  - build: `pip install -r requirements.txt`
  - start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## Important Implementation Notes

- Fiscal year logic is June to May in reporting and analytics modules.
- Scope 2 supports both location-based and market-based representations.
- Report generation uses selected period/location filters and computes structured sections.
- The codebase includes ongoing refinements for:
  - methodology factor disclosure strictness
  - report page formatting and section pagination
  - legacy factor-shape compatibility

---

## Troubleshooting

## Backend fails to start due to Firebase credentials

Check one of:
- `FIREBASE_CREDENTIALS` is valid JSON string
- `backend/keys/*.json` exists and is a valid service account key

## Frontend API errors in dev

Ensure:
- backend running on `:8001`
- `REACT_APP_API_URL` set correctly (or CRA proxy path is valid)

## AI report fails

Ensure:
- `OPENAI_API_KEY` is set in backend environment
- outbound network access is available from backend runtime

---

## Notes for Contributors

- Keep calculations and factor lookup behavior aligned between:
  - `backend/app/services/calculator.py`
  - `backend/app/routes/reports.py` (methodology disclosure/factor references)
- Prefer fiscal-year-aware filters when adding analytics/reporting features.
- Avoid introducing hardcoded factors in frontend; rely on backend/db factor sources.

