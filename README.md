# Stock Sentiment Dashboard — 股票情感预测可视化前端

> 北师港浸大课程项目 · 前端独立开发

An interactive single-page analytics dashboard for a **stock sentiment prediction system** (TSLA next-day up/down classification). Built with React 19 + TypeScript + Vite, featuring 5 chart types, a dual-mode toggle, and 7 analytical tabs.

The ML pipeline (FinBERT sentiment → XGBoost classifier) runs on the backend; this repo contains the **complete frontend** that visualizes model results, experiment comparisons, and backtest performance.

## ✨ Highlights

- **7 Tab modules** covering the full ML experiment lifecycle: overview → pipeline → experiments → sentiment → prediction → backtest → exploratory analysis
- **5 Recharts chart types**: grouped bar, line, stacked bar, feature-importance horizontal bar, Cell-colored return chart
- **Demo / Strict dual-mode toggle**: one switch synchronously drives prediction API, risk signals, and backtest across 3 views
- **~1,980 lines** of frontend code including a 740-line custom CSS design system (no UI library)
- **Type-safe API layer**: generic `fetch` wrapper in `api.ts` with full TypeScript typing for all 8 endpoints

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19.2.3 + TypeScript 5.9.3 |
| Build Tool | Vite 7.3.0 |
| State Management | React built-in (useState / useMemo / useEffect) |
| Routing | None — 7-tab SPA with conditional rendering |
| UI Components | Fully custom CSS (~740 lines design system) |
| Icons | lucide-react 0.562.0 |
| Data Visualization | Recharts 3.6.0 |
| Backend Communication | Native fetch (typed generic wrapper in api.ts) |
| Responsive | ResponsiveContainer for all charts; CSS Grid layout |

## 📋 Features & Pages

| Tab | Description |
|-----|-------------|
| **Overview** | Core metrics (Accuracy / F1 / ROC-AUC) with final model comparison bar chart; Demo/Strict mode switch |
| **Pipeline** | Visual 6-step research pipeline + Demo vs Strict delivery path explanation cards |
| **Experiments** | Rolling-window line chart, Strict tuning version comparison, Top-15 feature importance horizontal bar, full experiment data table |
| **Sentiment Insights** | Sentiment model benchmark comparison bar chart + extreme tweet event vs non-event 1/3-day return comparison |
| **Prediction Demo** | Date dropdown → API call → UP/DOWN label + probability progress bars |
| **Risk & Backtest** | Risk signal cards (stop-loss/take-profit) + custom date-range backtest + per-day strategy return chart with green/red coloring |
| **Maotai Analysis** | Kweichow Moutai (A-share) exploratory analysis: stacked bar chart (annual up/down ratio) + descriptive statistics table |

### Interaction Highlights

- **Global mode switch**: Demo/Strict toggle synchronously affects Overview metrics, Prediction, and Risk/Backtest data sources
- **Lazy loading**: Maotai data only fetched when user switches to that tab
- **Real-time API status**: top bar shows loading spinner / "Backend connected" indicator
- **Cell coloring**: backtest return bars auto-colored green (positive) / red (negative)

## 🔌 Backend API Contract

The frontend communicates with 8 backend REST endpoints:

| Method | Endpoint | Used In | Description |
|--------|----------|---------|-------------|
| GET | `/api/health` | App (top bar) | Backend health check; drives connection status indicator |
| GET | `/api/metrics?mode={demo\|strict}` | Overview | Returns Accuracy, F1, ROC-AUC and model comparison data |
| GET | `/api/experiments` | Experiments | Rolling-window results, tuning versions, feature importances |
| GET | `/api/sentiment` | Sentiment Insights | Sentiment model benchmarks and event-return analysis |
| POST | `/api/predict` | Prediction Demo | `{date, mode}` → `{direction, probability}` |
| GET | `/api/risk?mode={demo\|strict}` | Risk & Backtest | Risk signals (stop-loss, take-profit levels) |
| POST | `/api/backtest` | Risk & Backtest | `{start_date, end_date, mode}` → per-day returns array |
| GET | `/api/maotai` | Maotai Analysis | Moutai historical data, annual stats, descriptive statistics |

All API calls go through `api.ts`:

```typescript
// Typed generic fetch wrapper
async function request<T>(endpoint: string, options?: RequestInit): Promise<T>
```

Error handling: network errors, non-2xx responses, and JSON parse failures are all caught and surfaced to the UI via status indicators.

## 📸 Screenshots
 Overview tab with metrics cards and model comparison chart 

<img width="633" height="348" alt="WPS图片(1)" src="https://github.com/user-attachments/assets/33bfe9db-6a8e-4a71-b339-08e6003a5595" />

Or simply drag-and-drop images into the GitHub README editor.

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- Backend server running (see backend repo)

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/stock-sentiment-dashboard.git
cd stock-sentiment-dashboard

# Install dependencies
npm install

# Configure backend URL
cp .env.example .env
# Edit .env to set VITE_API_BASE_URL=http://localhost:8000

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
# Output in dist/
```

## 📁 Project Structure

```
stock-sentiment-dashboard/
├── src/
│   ├── App.tsx           # Main component (7 tabs + mode toggle)
│   ├── App.css           # Custom design system (~740 lines)
│   ├── api.ts            # Typed API wrapper (8 endpoints)
│   ├── components/
│   │   ├── MetricCard.tsx # Reusable metric display card
│   │   └── StatusPill.tsx # API status indicator
│   └── main.tsx          # Entry point
├── index.html
├── tsconfig.json
├── vite.config.ts
├── package.json
└── README.md
```

## 👤 Author

**Sophie Li** — Data Science, BNBU (Beijing Normal University - Hong Kong Baptist University United International College)

Frontend independently designed and developed as a course project.
