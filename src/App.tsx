import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  GitBranch,
  LineChart,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BacktestResult,
  BenchmarkRecord,
  ExperimentRecord,
  ExtremeEventRecord,
  FeatureImportanceItem,
  MaotaiUpDownRow,
  MaotaiStatsRow,
  Metadata,
  getBenchmark,
  getExperiments,
  getExtremeEvents,
  getFeatureImportance,
  getMaotaiStats,
  getMaotaiUpDown,
  getMetadata,
  getRisk,
  getStrictAvailableDates,
  getStrictPerformance,
  getStrictTuningHistory,
  predictByDate,
  runBacktest,
  type DatePrediction,
  type PredictionMode,
  type RiskResult,
  type StrictPerformanceResult,
  type StrictTuningRecord,
} from "./api";

type TabId = "overview" | "pipeline" | "experiments" | "sentiment" | "prediction" | "risk" | "maotai";

const tabs: Array<{ id: TabId; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "pipeline", label: "Pipeline", icon: GitBranch },
  { id: "experiments", label: "Experiments", icon: BarChart3 },
  { id: "sentiment", label: "Sentiment Insights", icon: Brain },
  { id: "prediction", label: "Prediction Demo", icon: CalendarDays },
  { id: "risk", label: "Risk & Backtest", icon: ShieldCheck },
  { id: "maotai", label: "Maotai Analysis", icon: TrendingUp },
];

const modeCopy: Record<PredictionMode, { label: string; summary: string }> = {
  demo: {
    label: "Demo Mode",
    summary:
      "Uses the deployed full-data model for interactive historical-date-driven prediction and decision-support demonstration.",
  },
  strict: {
    label: "Strict Mode",
    summary:
      "Uses precomputed walk-forward out-of-sample predictions for stricter time-ordered evaluation.",
  },
};

const plannedHorizons = ["3-day planned", "5-day planned", "10-day planned"];

const pipelineSteps = [
  ["Raw Data", "TSLA daily price, stock tweets, and Financial PhraseBank benchmark data."],
  ["Cleaning", "Standardized dates, removed duplicates, and aligned daily market records."],
  ["Sentiment Scoring", "Built text sentiment labels and probability-based daily sentiment features."],
  ["Feature Fusion", "Combined price indicators with tweet volume and sentiment aggregates."],
  ["Modeling", "Compared benchmark, baseline, ablation, and rolling XGBoost experiments."],
  ["Frontend & Backend Delivery", "Connected API endpoints to the frontend dashboard for prediction, risk signal, explainability, backtest, and experiment results."],
];

const pipelineModes: Array<{
  mode: PredictionMode;
  title: string;
  summary: string;
  stages: string[];
}> = [
  {
    mode: "demo",
    title: "Demo Model Path",
    summary: "Uses the deployed full-data model for interactive historical-date prediction and presentation.",
    stages: [
      "Trains on the full prepared dataset after model selection.",
      "Serves live date-based prediction, risk signal, and explainability endpoints.",
      "Best fit for frontend demonstration and interactive walkthroughs.",
    ],
  },
  {
    mode: "strict",
    title: "Strict Model Path",
    summary: "Uses precomputed walk-forward out-of-sample predictions for stricter time-ordered evaluation.",
    stages: [
      "Keeps the same upstream data, sentiment, and feature pipeline as demo mode.",
      "Reads walk-forward outputs instead of rerunning a full-data live model at request time.",
      "Best fit for reporting realistic out-of-sample behaviour under temporal constraints.",
    ],
  },
];

const percent = (value?: number | null) => (typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "N/A");
const fmt2 = (v?: number | null) => (typeof v === "number" ? v.toFixed(2) : "N/A");

function MetricCard({
  title,
  value,
  note,
  tone = "blue",
}: {
  title: string;
  value: string;
  note: string;
  tone?: "blue" | "green" | "red" | "amber";
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  return <span className={`pill ${normalized}`}>{value}</span>;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [mode, setMode] = useState<PredictionMode>("demo");
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [benchmark, setBenchmark] = useState<BenchmarkRecord[]>([]);
  const [events, setEvents] = useState<ExtremeEventRecord[]>([]);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportanceItem[]>([]);
  const [strictPerformance, setStrictPerformance] = useState<StrictPerformanceResult | null>(null);
  const [strictTuning, setStrictTuning] = useState<StrictTuningRecord[]>([]);
  const [strictDates, setStrictDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState("2022-09-29");
  const [prediction, setPrediction] = useState<DatePrediction | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(false);

  const [riskDate, setRiskDate] = useState("2022-09-29");
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("2022-06-17");
  const [endDate, setEndDate] = useState("2022-09-29");
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [backtestError, setBacktestError] = useState<string | null>(null);
  const [runningBacktest, setRunningBacktest] = useState(false);

  const [maotaiUpDown, setMaotaiUpDown] = useState<MaotaiUpDownRow[]>([]);
  const [maotaiStats, setMaotaiStats] = useState<MaotaiStatsRow[]>([]);
  const [maotaiLoading, setMaotaiLoading] = useState(false);
  const [maotaiError, setMaotaiError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getMetadata(),
      getExperiments(),
      getBenchmark(),
      getExtremeEvents(),
      getFeatureImportance(),
      getStrictAvailableDates().catch(() => null),
      getStrictPerformance().catch(() => null),
      getStrictTuningHistory().catch(() => null),
    ])
      .then(([meta, experimentData, benchmarkData, eventData, fiData, strictDatesData, strictData, strictTuningData]) => {
        setMetadata(meta);
        setExperiments(experimentData.records);
        setBenchmark(benchmarkData.records);
        setEvents(eventData.records);
        setFeatureImportance(fiData.top_features);
        setStrictDates(strictDatesData?.available_dates ?? []);
        setStrictPerformance(strictData);
        setStrictTuning(strictTuningData?.records ?? []);
        setSelectedDate(meta.date_end);
        setRiskDate(meta.date_end);
        setEndDate(meta.date_end);
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== "maotai" || maotaiUpDown.length > 0) return;
    setMaotaiLoading(true);
    setMaotaiError(null);
    Promise.all([getMaotaiUpDown(), getMaotaiStats()])
      .then(([upDown, stats]) => {
        setMaotaiUpDown(upDown.records);
        setMaotaiStats(stats.records);
      })
      .catch((e) => setMaotaiError(e.message))
      .finally(() => setMaotaiLoading(false));
  }, [activeTab, maotaiUpDown.length]);

  useEffect(() => {
    setPrediction(null);
    setPredictionError(null);
    setRisk(null);
    setRiskError(null);
  }, [mode]);

  const bestModel = useMemo(() => {
    if (!metadata) return undefined;
    return experiments.find((item) => item.model === metadata.model_name);
  }, [experiments, metadata]);

  const overviewIsStrict = mode === "strict" && strictPerformance !== null;

  const finalModels = useMemo(() => {
    return experiments
      .filter((item) => item.stage === "Final" && item.window_size === 15)
      .map((item) => ({
        ...item,
        shortModel: item.model.replace(" XGB Rolling15", ""),
      }));
  }, [experiments]);

  const rollingFusion = useMemo(() => {
    return experiments
      .filter((item) => item.model.startsWith("Fusion XGB Rolling"))
      .map((item) => ({
        window: `W${item.window_size}`,
        accuracy: item.accuracy,
        f1: item.f1_weighted,
        roc: item.roc_auc ?? 0,
      }));
  }, [experiments]);

  const strictRollingFusion = useMemo(() => {
    const labels: Record<string, string> = {
      initial: "Initial",
      v2: "V2",
      v3: "V3",
      v4: "V4",
    };
    return strictTuning.map((item) => ({
      ...item,
      versionLabel: labels[item.version] ?? item.version.toUpperCase(),
      f1: item.f1_weighted,
      roc: item.roc_auc ?? 0,
    }));
  }, [strictTuning]);

  const maotaiSummaryStats = useMemo(() => {
    const count = maotaiStats.find((r) => r.stat === "count");
    const mean = maotaiStats.find((r) => r.stat === "mean");
    const std = maotaiStats.find((r) => r.stat === "std");
    const min = maotaiStats.find((r) => r.stat === "min");
    const max = maotaiStats.find((r) => r.stat === "max");
    return { count, mean, std, min, max };
  }, [maotaiStats]);

  async function handlePredict() {
    setPredicting(true);
    setPredictionError(null);
    try {
      const result = await predictByDate(selectedDate, mode);
      setPrediction({
        ...result,
        result: {
          ...result.result,
          mode: result.result.mode ?? mode,
        },
      });
    } catch (error) {
      setPredictionError(error instanceof Error ? error.message : "Prediction failed");
    } finally {
      setPredicting(false);
    }
  }

  async function handleRisk() {
    setRiskError(null);
    try {
      const result = await getRisk(riskDate, mode);
      setRisk({
        ...result,
        mode: result.mode ?? mode,
      });
    } catch (error) {
      setRiskError(error instanceof Error ? error.message : "Risk request failed");
    }
  }

  async function handleBacktest() {
    setRunningBacktest(true);
    setBacktestError(null);
    try {
      setBacktest(await runBacktest(startDate, endDate));
    } catch (error) {
      setBacktestError(error instanceof Error ? error.message : "Backtest failed");
    } finally {
      setRunningBacktest(false);
    }
  }

  const dates = metadata?.available_dates ?? [];
  const riskBacktestDates = useMemo(() => {
    if (mode === "strict" && strictDates.length > 0) return strictDates;
    return dates;
  }, [dates, mode, strictDates]);
  const predictionDates = riskBacktestDates;
  const maxFiImportance = featureImportance[0]?.importance ?? 1;

  useEffect(() => {
    if (riskBacktestDates.length === 0) return;

    const firstDate = riskBacktestDates[0];
    const lastDate = riskBacktestDates[riskBacktestDates.length - 1];

    if (!riskBacktestDates.includes(riskDate)) {
      setRiskDate(lastDate);
    }
    if (!predictionDates.includes(selectedDate)) {
      setSelectedDate(lastDate);
    }
    if (!riskBacktestDates.includes(startDate)) {
      setStartDate(firstDate);
    }
    if (!riskBacktestDates.includes(endDate)) {
      setEndDate(lastDate);
    }
  }, [endDate, predictionDates, riskBacktestDates, riskDate, selectedDate, startDate]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <LineChart size={22} />
          </div>
          <div>
            <strong>TSLA Sentiment Lab</strong>
            <span>Course Report Frontend</span>
          </div>
        </div>

        <nav className="nav-list">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Tesla Stock Movement Prediction with Market Sentiment</p>
            <h1>{({
              overview:    "Model performance at a glance — accuracy, F1, and final experiment comparison.",
              pipeline:    "How raw tweets and price data became a deployable XGBoost classifier.",
              experiments: "Ablation results, rolling-window sweep, and feature importance from the live model.",
              sentiment:   "Sentiment scoring benchmark and the effect of extreme tweet events on next-day returns.",
              prediction:  "Select a trading date and run the 1-day prediction in demo or strict mode.",
              risk:        "Risk signal follows the same global mode; backtest remains on the current demo path.",
              maotai:      "Exploratory price analysis of Kweichow Moutai (A-share) — no prediction model trained.",
            } as Record<TabId, string>)[activeTab]}</h1>
          </div>
          <div className="topbar-side">
            {(["overview", "prediction", "risk"] as TabId[]).includes(activeTab) && (
              <div className="mode-panel">
                <div className="mode-panel-head">
                  <span className="eyebrow">Global Mode</span>
                  <StatusPill value={mode} />
                </div>
                <div className="mode-toggle" role="tablist" aria-label="Prediction mode">
                  {(["demo", "strict"] as PredictionMode[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={mode === item ? "active" : ""}
                      onClick={() => setMode(item)}
                    >
                      {modeCopy[item].label}
                    </button>
                  ))}
                </div>
                <p className="mode-summary">{modeCopy[mode].summary}</p>
              </div>
            )}
            <div className="api-status">
              {loading ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
              <span>{loading ? "Loading backend data" : "Backend connected"}</span>
            </div>
          </div>
        </header>

        {loadError ? (
          <section className="empty-state">
            <h2>Backend data is not available</h2>
            <p>{loadError}</p>
            <code>python -m uvicorn DWP2_code.backend.app.main:app --reload --port 8000</code>
          </section>
        ) : (
          <>
            {activeTab === "overview" && (
              <section className="section-grid">
                <div className="hero-panel">
                  <div>
                    <p className="eyebrow">Switchable Prediction Modes</p>
                    <h2>{modeCopy[mode].label}</h2>
                    <p>
                      The frontend now routes both prediction and risk requests through a shared mode switch. Demo mode
                      uses the deployed Fusion XGB Rolling15 model; strict mode reads walk-forward out-of-sample
                      predictions from the backend.
                    </p>
                  </div>
                  <Sparkles size={42} />
                </div>

                <div className="metrics-grid">
                  {overviewIsStrict ? (
                    <>
                      <MetricCard title="Accuracy" value={percent(strictPerformance?.accuracy)} note="Walk-forward strict summary" tone="green" />
                      <MetricCard title="F1-score" value={percent(strictPerformance?.f1_weighted)} note="Weighted F1" tone="blue" />
                      <MetricCard title="ROC-AUC" value={percent(strictPerformance?.roc_auc)} note="Out-of-sample ranking quality" tone="amber" />
                      <MetricCard
                        title="Train / Test"
                        value={`${strictPerformance?.initial_train_size ?? "-"} / ${strictPerformance?.test_size ?? "-"}`}
                        note={`Window ${strictPerformance?.window_size ?? "-"} · avg threshold ${percent(strictPerformance?.avg_best_threshold)}`}
                      />
                    </>
                  ) : (
                    <>
                      <MetricCard title="Accuracy" value={percent(bestModel?.accuracy)} note="Final best model" tone="green" />
                      <MetricCard title="F1-score" value={percent(bestModel?.f1_weighted)} note="Weighted F1" tone="blue" />
                      <MetricCard title="ROC-AUC" value={percent(bestModel?.roc_auc)} note="Ranking quality" tone="amber" />
                      <MetricCard
                        title="Data Range"
                        value={`${metadata?.date_start ?? "-"} / ${metadata?.date_end ?? "-"}`}
                        note={`${dates.length} trading days`}
                      />
                    </>
                  )}
                </div>

                <div className="panel wide">
                  <div className="panel-title">
                    <h3>{overviewIsStrict ? "Walk-Forward Strict Summary" : "Final Model Comparison"}</h3>
                    <span>{overviewIsStrict ? "Dedicated strict performance endpoint" : "Rolling window = 15"}</span>
                  </div>
                  {overviewIsStrict ? (
                    <div className="strict-summary-grid">
                      <div className="strict-summary-card">
                        <span>Model</span>
                        <strong>{strictPerformance?.model_name}</strong>
                        <small>Strict mode reads precomputed walk-forward out-of-sample results.</small>
                      </div>
                      <div className="strict-summary-card">
                        <span>Precision / Recall</span>
                        <strong>{percent(strictPerformance?.precision_weighted)} / {percent(strictPerformance?.recall_weighted)}</strong>
                        <small>Weighted precision and recall from the strict summary file.</small>
                      </div>
                      <div className="strict-summary-card">
                        <span>Feature Layout</span>
                        <strong>{strictPerformance?.base_feature_count ?? "-"} base / {strictPerformance?.rolling_feature_count ?? "-"} rolling</strong>
                        <small>Feature counts used by the walk-forward pipeline.</small>
                      </div>
                    </div>
                  ) : (
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={finalModels}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="shortModel" />
                          <YAxis domain={[0, 0.8]} tickFormatter={percent} />
                          <Tooltip formatter={(value) => percent(Number(value))} />
                          <Bar dataKey="accuracy" name="Accuracy" fill="#0f766e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="f1_weighted" name="F1-score" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="roc_auc" name="ROC-AUC" fill="#d97706" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "pipeline" && (
              <section className="panel">
                <div className="panel-title">
                  <h3>Research Pipeline</h3>
                  <span>Shared research flow first, then split into demo and strict delivery paths</span>
                </div>
                <div className="pipeline">
                  {pipelineSteps.map(([title, text], index) => (
                    <div className="pipeline-step" key={title}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <h4>{title}</h4>
                      <p>{text}</p>
                    </div>
                  ))}
                </div>
                <div className="pipeline-mode-grid">
                  {pipelineModes.map((item) => (
                    <div className="pipeline-mode-card" key={item.mode}>
                      <div className="pipeline-mode-head">
                        <StatusPill value={item.mode} />
                        <h4>{item.title}</h4>
                      </div>
                      <p>{item.summary}</p>
                      <ul className="pipeline-mode-list">
                        {item.stages.map((stage) => (
                          <li key={stage}>{stage}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "experiments" && (
              <section className="section-grid">
                <div className="panel wide">
                  <div className="panel-title">
                    <h3>Fusion Rolling XGBoost by Window Size</h3>
                    <span>Why Rolling15 became the deployed model</span>
                  </div>
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height={280}>
                      <ReLineChart data={rollingFusion}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="window" />
                        <YAxis domain={[0.45, 0.75]} tickFormatter={percent} />
                        <Tooltip formatter={(value) => percent(Number(value))} />
                        <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#0f766e" strokeWidth={3} />
                        <Line type="monotone" dataKey="f1" name="F1-score" stroke="#2563eb" strokeWidth={3} />
                        <Line type="monotone" dataKey="roc" name="ROC-AUC" stroke="#d97706" strokeWidth={3} />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {strictRollingFusion.length > 0 && (
                  <div className="panel wide">
                  <div className="panel-title">
                    <h3>Strict Fusion XGBoost by Version</h3>
                      <span>Demo compares rolling window sizes; strict compares backend tuning versions</span>
                  </div>
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height={280}>
                        <ReLineChart data={strictRollingFusion}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="versionLabel" />
                          <YAxis domain={[0.45, 0.75]} tickFormatter={percent} />
                          <Tooltip formatter={(value) => percent(Number(value))} />
                          <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#0f766e" strokeWidth={3} />
                          <Line type="monotone" dataKey="f1" name="F1-score" stroke="#2563eb" strokeWidth={3} />
                          <Line type="monotone" dataKey="roc" name="ROC-AUC" stroke="#d97706" strokeWidth={3} />
                        </ReLineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {featureImportance.length > 0 && (
                  <div className="panel wide">
                    <div className="panel-title">
                      <h3>Demo Model Feature Importance</h3>
                      <span>Top 15 from the deployed demo model `Fusion XGB Rolling15`</span>
                    </div>
                    <div className="fi-list">
                      {featureImportance.map((item) => (
                        <div className="fi-row" key={item.feature}>
                          <span className="fi-name">{item.feature}</span>
                          <div className="fi-bar-track">
                            <div
                              className="fi-bar-fill"
                              style={{ width: `${(item.importance / maxFiImportance) * 100}%` }}
                            />
                          </div>
                          <span className="fi-score">{(item.importance * 100).toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="panel wide">
                  <div className="panel-title">
                    <h3>All Experiments</h3>
                    <span>{experiments.length} records loaded</span>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Stage</th>
                          <th>Model</th>
                          <th>Feature</th>
                          <th>Accuracy</th>
                          <th>F1</th>
                          <th>ROC-AUC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {experiments.map((row) => (
                          <tr key={`${row.stage}-${row.model}-${row.feature_type}`}>
                            <td>{row.stage}</td>
                            <td>{row.model}</td>
                            <td>{row.feature_type}</td>
                            <td>{percent(row.accuracy)}</td>
                            <td>{percent(row.f1_weighted)}</td>
                            <td>{percent(row.roc_auc)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "sentiment" && (
              <section className="section-grid">
                <div className="panel">
                  <div className="panel-title">
                    <h3>Sentiment Benchmark</h3>
                    <span>Rule-based baseline vs supervised text model</span>
                  </div>
                  <div className="chart-box compact">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={benchmark}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="model" />
                        <YAxis domain={[0, 1]} tickFormatter={percent} />
                        <Tooltip formatter={(value) => percent(Number(value))} />
                        <Bar dataKey="accuracy" name="Accuracy" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="f1_weighted" name="F1-score" fill="#0f766e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-title">
                    <h3>Extreme Sentiment Events</h3>
                    <span>Event vs non-event return comparison</span>
                  </div>
                  <div className="event-list">
                    {events.map((event) => (
                      <div className="event-card" key={String(event.event_type)}>
                        <strong>{String(event.event_type).replaceAll("_", " ")}</strong>
                        <span>{event.event_count} events</span>
                        <small>1-day event return {percent(Number(event.avg_future_return_1d_event))}</small>
                        <small>1-day non-event return {percent(Number(event.avg_future_return_1d_non_event))}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "prediction" && (
              <section className="section-grid">
                <div className="panel control-panel">
                  <div className="panel-title">
                    <h3>Next-Day Prediction</h3>
                    <span>Only 1-day is active in the current frontend</span>
                  </div>
                  <label>
                    Trading Date
                    <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
                      {predictionDates.map((date) => (
                        <option key={date} value={date}>
                          {date}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="subtle-card">
                    <strong>Available now</strong>
                    <div className="mode-inline">
                      <StatusPill value={mode} />
                      <span>Current mode is shared with the Risk Signal panel.</span>
                    </div>
                    <p>Primary action stays on 1-day prediction. Longer horizons are kept as planned placeholders.</p>
                    <div className="planned-list">
                      {plannedHorizons.map((item) => (
                        <span key={item} className="planned-pill">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="primary-button" onClick={handlePredict} disabled={predicting || !metadata}>
                    {predicting ? <Loader2 className="spin" size={18} /> : <Brain size={18} />}
                    Predict Next Trading Day
                  </button>
                  {predictionError && <p className="error-text">{predictionError}</p>}
                </div>

                <div className="panel result-panel">
                  {prediction ? (
                    <>
                      <div className="prediction-head">
                        <div className="result-pills">
                          <StatusPill value={prediction.result.signal} />
                          <StatusPill value={prediction.result.mode ?? mode} />
                        </div>
                        <h3>{prediction.result.prediction_label}</h3>
                        <div className="result-meta">
                          <span>Mode: {prediction.result.mode ?? mode}</span>
                          <span>Model: {prediction.result.model_name}</span>
                        </div>
                      </div>
                      <div className="prob-bars">
                        <div>
                          <span>Up Probability</span>
                          <strong>{percent(prediction.result.up_probability)}</strong>
                          <div className="bar-track">
                            <div className="bar-fill up" style={{ width: percent(prediction.result.up_probability) }} />
                          </div>
                        </div>
                        <div>
                          <span>Down Probability</span>
                          <strong>{percent(prediction.result.down_probability)}</strong>
                          <div className="bar-track">
                            <div className="bar-fill down" style={{ width: percent(prediction.result.down_probability) }} />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="placeholder">
                      <CalendarDays size={40} />
                      <p>Select a trading date and run the prediction.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "risk" && (
              <section className="section-grid">
                <div className="panel control-panel">
                  <div className="panel-title">
                    <h3>Risk Signal</h3>
                    <span>Decision support, not financial advice</span>
                  </div>
                  <label>
                    Trading Date
                    <select value={riskDate} onChange={(event) => setRiskDate(event.target.value)}>
                      {riskBacktestDates.map((date) => (
                        <option key={date} value={date}>
                          {date}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="subtle-card">
                    <strong>Shared mode</strong>
                    <div className="mode-inline">
                      <StatusPill value={mode} />
                      <span>Risk evaluation uses the same global mode as prediction.</span>
                    </div>
                    <p>{modeCopy[mode].summary}</p>
                  </div>
                  <button className="primary-button" onClick={handleRisk}>
                    <ShieldCheck size={18} />
                    Get Risk Signal
                  </button>
                  {riskError && <p className="error-text">{riskError}</p>}
                  {risk && (
                    <div className="risk-card">
                      <div className="result-pills">
                        <StatusPill value={risk.signal} />
                        <StatusPill value={risk.mode} />
                      </div>
                      <strong>{risk.recommendation}</strong>
                      <span>Mode: {risk.mode}</span>
                      <span>Model: {risk.model_name}</span>
                      <span>Risk level: {risk.risk_level}</span>
                      <small>{risk.brief_explanation}</small>
                    </div>
                  )}
                </div>

                <div className="panel control-panel">
                  <div className="panel-title">
                    <h3>Simple Backtest</h3>
                    <span>Long-only simplified strategy</span>
                  </div>

                  <div className="date-row">
                    <label>
                      Start
                      <select value={startDate} onChange={(event) => setStartDate(event.target.value)}>
                        {riskBacktestDates.map((date) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      End
                      <select value={endDate} onChange={(event) => setEndDate(event.target.value)}>
                        {riskBacktestDates.map((date) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button className="primary-button" onClick={handleBacktest} disabled={runningBacktest}>
                    {runningBacktest ? <Loader2 className="spin" size={18} /> : <CircleDollarSign size={18} />}
                    Run Backtest
                  </button>
                  <p className="info-note">
                    The backtest uses the fixed demo-model backtest engine, with 3% stop loss and 5% take profit rules for BUY trades.
                  </p>
                  {backtestError && <p className="error-text">{backtestError}</p>}
                </div>

                {backtest && (
                  <div className="panel wide">
                    <div className="metrics-grid">
                      <MetricCard
                        title="Directional Accuracy"
                        value={percent(backtest.directional_accuracy)}
                        note={`BUY↑ + SELL↓ correct / ${backtest.buy_signals + backtest.sell_signals} signals`}
                        tone="green"
                      />
                      <MetricCard
                        title="Win Rate"
                        value={percent(backtest.win_rate)}
                        note={`${backtest.trade_days} BUY-entry days`}
                        tone="blue"
                      />
                      <MetricCard title="Buy Signals" value={String(backtest.buy_signals)} note="up_prob ≥ 65%" tone="amber" />
                      <MetricCard title="Sell Signals" value={String(backtest.sell_signals)} note="up_prob ≤ 45%" tone="red" />
                      <MetricCard title="Stop Loss" value={percent(backtest.stop_loss_pct)} note={`${backtest.stop_loss_hits} hits`} tone="red" />
                      <MetricCard title="Take Profit" value={percent(backtest.take_profit_pct)} note={`${backtest.take_profit_hits} hits`} tone="green" />
                    </div>
                    {(backtest.buy_signals + backtest.sell_signals) < 20 && (
                      <p className="note-text" style={{ color: "#b45309" }}>
                        Small sample — only {backtest.buy_signals + backtest.sell_signals} signals in this window.
                        Accuracy figures are unreliable at this scale; use a longer date range for meaningful evaluation.
                      </p>
                    )}
                    {backtest.details && (
                      <div className="chart-box">
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={backtest.details.slice(-20)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" hide />
                            <YAxis tickFormatter={percent} />
                            <Tooltip
                              formatter={(value, name) => [percent(Number(value)), name]}
                              labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Bar dataKey="strategy_return" name="Strategy return" radius={[4, 4, 0, 0]}>
                              {backtest.details.slice(-20).map((item) => (
                                <Cell key={item.date} fill={item.strategy_return >= 0 ? "#0f766e" : "#dc2626"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {activeTab === "maotai" && (
              <section className="section-grid">
                <div className="hero-panel">
                  <div>
                    <p className="eyebrow">A-Share Comparative Analysis · 600519.SH</p>
                    <h2>贵州茅台 Maotai</h2>
                    <p>
                      Price-only exploratory analysis of Kweichow Moutai (2004–2024). No social-media sentiment data
                      is available for A-shares, so no prediction model was trained — this section shows the
                      historical price distribution and yearly up/down statistics.
                    </p>
                  </div>
                  <Zap size={42} />
                </div>

                {maotaiLoading && (
                  <div className="panel wide placeholder">
                    <Loader2 className="spin" size={32} />
                    <p>Loading Maotai data…</p>
                  </div>
                )}

                {maotaiError && (
                  <div className="panel wide">
                    <p className="error-text">{maotaiError}</p>
                  </div>
                )}

                {!maotaiLoading && !maotaiError && maotaiUpDown.length > 0 && (
                  <>
                    <div className="metrics-grid">
                      <MetricCard
                        title="Close Price (mean)"
                        value={`¥${fmt2(maotaiSummaryStats.mean?.close)}`}
                        note="2004–2024 average"
                        tone="green"
                      />
                      <MetricCard
                        title="Close Price (max)"
                        value={`¥${fmt2(maotaiSummaryStats.max?.close)}`}
                        note="All-time high in dataset"
                        tone="amber"
                      />
                      <MetricCard
                        title="Avg Daily Return (mean)"
                        value={`${fmt2(maotaiSummaryStats.mean?.pct_chg)}%`}
                        note="pct_chg mean"
                        tone="blue"
                      />
                      <MetricCard
                        title="Trading Days"
                        value={String(Math.round(maotaiSummaryStats.count?.close ?? 0) || "N/A")}
                        note="Total records"
                      />
                    </div>

                    <div className="panel wide">
                      <div className="panel-title">
                        <h3>Yearly Up / Down Ratio</h3>
                        <span>2004–2024 · {maotaiUpDown.length} years</span>
                      </div>
                      <div className="chart-box">
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={maotaiUpDown}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" />
                            <YAxis domain={[0, 1]} tickFormatter={percent} />
                            <Tooltip
                              formatter={(value, name) => [percent(Number(value)), name]}
                            />
                            <Bar dataKey="up_ratio" name="Up days" fill="#0f766e" radius={[4, 4, 0, 0]} stackId="a" />
                            <Bar dataKey="down_ratio" name="Down days" fill="#dc2626" radius={[0, 0, 0, 0]} stackId="a" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="panel wide">
                      <div className="panel-title">
                        <h3>Yearly Trading Day Count</h3>
                        <span>Up vs Down absolute days</span>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Year</th>
                              <th>Up Days</th>
                              <th>Down Days</th>
                              <th>Total Days</th>
                              <th>Up Ratio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {maotaiUpDown.map((row) => (
                              <tr key={row.year}>
                                <td>{row.year}</td>
                                <td style={{ color: "#0f766e", fontWeight: 700 }}>{row.up}</td>
                                <td style={{ color: "#dc2626", fontWeight: 700 }}>{row.down}</td>
                                <td>{row.total_days}</td>
                                <td>{percent(row.up_ratio)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
