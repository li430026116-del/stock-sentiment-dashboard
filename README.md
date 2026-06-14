# TSLA Sentiment Lab — Frontend

> Interactive dashboard for the *Tesla Stock Movement Prediction with Market Sentiment* course project.  
> Built with React 19 + TypeScript + Vite. Connects to a FastAPI backend via REST.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Features & Pages](#3-features--pages)
4. [Getting Started](#4-getting-started)
5. [Environment Variables](#5-environment-variables)
6. [Project Structure](#6-project-structure)
7. [Data Visualization](#7-data-visualization)
8. [Backend API Contract](#8-backend-api-contract)
9. [Screenshots](#9-screenshots)

---

## 1. Project Overview

<!-- 
  Write 2–3 sentences:
  - What the system predicts (TSLA next-day price direction)
  - The role of sentiment (tweet sentiment + FinBERT scoring → XGBoost features)
  - What the frontend exposes (interactive demo, risk signals, backtest, Maotai EDA)
-->

## 2. Tech Stack

| Category | Choice | Version |
|---|---|---|
| Framework | React | 19.2.3 |
| Language | TypeScript | 5.9.3 |
| Build tool | Vite | 7.3.0 |
| Data viz | Recharts | 3.6.0 |
| Icons | lucide-react | 0.562.0 |
| Styling | Custom CSS (no library) | — |
| State management | React built-ins (useState / useMemo) | — |
| Routing | Tab-based SPA (no router library) | — |
| Backend communication | Native `fetch` (custom wrapper) | — |

## 3. Features & Pages

The app is a single-page application with 7 tab-based views:

| Tab | Description |
|---|---|
| **Overview** | Key metrics (Accuracy, F1, ROC-AUC) with a final-model grouped bar chart; switches between Demo and Strict modes |
| **Pipeline** | 6-step research pipeline visualization + two delivery-path cards (Demo vs Strict) |
| **Experiments** | Rolling-window line charts, strict tuning-version comparison, feature-importance bar list, full experiments table |
| **Sentiment Insights** | Sentiment benchmark bar chart; extreme-tweet-event vs non-event return cards |
| **Prediction Demo** | Date picker → live API call → UP/DOWN label with probability bars; supports Demo & Strict modes |
| **Risk & Backtest** | Risk signal card + configurable date-range backtest with per-trade return bar chart (green/red cells) |
| **Maotai Analysis** | Exploratory A-share price analysis — stacked yearly up/down bar chart + descriptive stats table |

## 4. Getting Started

```bash
# Install dependencies
npm install

# Start dev server (connects to backend on port 8000)
npm run dev

# Production build
npm run build
```

The backend must be running before the frontend loads data. See the root `README.md` for backend startup instructions.

## 5. Environment Variables

Copy `.env.example` to `.env` and edit as needed:

```env
# Override the backend base URL (default: same hostname, port 8000)
VITE_API_BASE=http://127.0.0.1:8000
```

Leave `VITE_API_BASE` unset in local development — the app auto-detects `window.location.hostname:8000`.

## 6. Project Structure

```
frontend/
├── src/
│   ├── App.tsx          # All 7 tab views, state, chart wiring (~1 000 lines)
│   ├── api.ts           # Typed fetch wrapper + all backend request functions (~300 lines)
│   ├── main.tsx         # React root mount
│   ├── styles.css       # Full custom design system (~740 lines)
│   └── vite-env.d.ts    # Vite type reference
├── index.html
├── vite.config.js
├── tsconfig.json
├── package.json
└── .env.example
```

## 7. Data Visualization

Five chart configurations built with Recharts:

| Chart | Tab | Purpose |
|---|---|---|
| Grouped `BarChart` | Overview, Sentiment | Final model Accuracy / F1 / ROC-AUC side-by-side |
| `LineChart` | Experiments | Rolling-window sweep & strict tuning-version trends |
| Custom HTML bar list | Experiments | Feature importance (top 15, normalized to max) |
| Stacked `BarChart` | Maotai | Yearly up-day / down-day ratio (100 % stacked) |
| `Cell`-colored `BarChart` | Risk & Backtest | Per-trade strategy return (green = positive, red = negative) |

All charts use `ResponsiveContainer` for fluid width.

## 8. Backend API Contract

<!-- 
  List the REST endpoints consumed, e.g.:
  - GET  /metadata
  - GET  /results/experiments
  - POST /predict/by-date
  - POST /signal/risk
  - POST /backtest/simple
  - GET  /explain/feature-importance
  - GET  /strict/performance
  - GET  /results/maotai-up-down
  (Full TypeScript types live in src/api.ts)
-->

## 9. Screenshots

<!-- Add screenshots after deploying or running locally -->
