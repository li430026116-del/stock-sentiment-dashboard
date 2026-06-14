const defaultApiBase =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://127.0.0.1:8000";

export const API_BASE = import.meta.env.VITE_API_BASE ?? defaultApiBase;
export type PredictionMode = "demo" | "strict";

export type Metadata = {
  supported_stock_codes: string[];
  prediction_target: string;
  prediction_target_description: string;
  model_name: string;
  rolling_window: number;
  date_start: string;
  date_end: string;
  available_dates: string[];
};

export type ExperimentRecord = {
  stage: string;
  experiment_group: string;
  model: string;
  window_size: number;
  target_horizon: string;
  feature_type: string;
  accuracy: number;
  f1_weighted: number;
  roc_auc: number | null;
  notes: string;
};

export type BenchmarkRecord = {
  model: string;
  accuracy: number;
  precision_weighted: number;
  recall_weighted: number;
  f1_weighted: number;
};

export type ExtremeEventRecord = {
  event_type: string;
  event_count: number;
  avg_future_return_1d_event: number;
  avg_future_return_1d_non_event: number;
  avg_future_return_3d_event: number;
  avg_future_return_3d_non_event: number;
};

export type ResultDataset<T> = {
  name: string;
  source_file: string;
  row_count: number;
  columns: string[];
  records: T[];
};

export type PredictionResult = {
  stock_code: string;
  model_name: string;
  prediction_label: "UP" | "DOWN";
  prediction_class: number;
  up_probability: number;
  down_probability: number;
  signal: "BUY" | "SELL" | "HOLD";
  mode?: PredictionMode;
};

export type DatePrediction = {
  stock_code: string;
  date: string;
  prediction_target: string;
  result: PredictionResult;
};

export type RiskResult = {
  stock_code: string;
  date: string;
  mode: PredictionMode;
  model_name: string;
  prediction_target: string;
  prediction_label: string;
  up_probability: number;
  down_probability: number;
  signal: string;
  risk_level: string;
  stop_loss_pct: number;
  take_profit_pct: number;
  recommendation: string;
  brief_explanation: string;
};

export type BacktestResult = {
  stock_code: string;
  start_date: string;
  end_date: string;
  strategy_type: string;
  notes: string;
  requested_days: number;
  total_days: number;
  skipped_days: number;
  trade_days: number;
  buy_signals: number;
  sell_signals: number;
  hold_signals: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  stop_loss_hits: number;
  take_profit_hits: number;
  win_rate: number;
  directional_accuracy: number;
  cumulative_return: number;
  average_daily_return: number;
  details: Array<{
    date: string;
    signal: string;
    prediction_label: string;
    up_probability: number;
    down_probability: number;
    future_return_1d: number;
    strategy_return: number;
    stop_loss_pct: number;
    take_profit_pct: number;
    exit_reason: string;
  }> | null;
  skipped_details: Array<{ date: string; reason: string }> | null;
};

export type FeatureImportanceItem = {
  feature: string;
  importance: number;
};

export type FeatureImportanceResult = {
  model_name: string;
  top_features: FeatureImportanceItem[];
};

export type StrictPerformanceResult = {
  model_name: string;
  mode: PredictionMode;
  window_size: number;
  base_feature_count: number;
  rolling_feature_count: number;
  initial_train_size: number;
  test_size: number;
  accuracy: number;
  precision_weighted: number;
  recall_weighted: number;
  f1_weighted: number;
  roc_auc: number;
  avg_best_threshold: number;
};

export type StrictTuningRecord = {
  version: string;
  model_name: string;
  window_size: number;
  base_feature_count: number | null;
  rolling_feature_count: number | null;
  initial_train_size: number;
  test_size: number;
  accuracy: number;
  precision_weighted: number;
  recall_weighted: number;
  f1_weighted: number;
  roc_auc: number | null;
  avg_best_threshold: number | null;
};

export type StrictTuningResult = {
  mode: PredictionMode;
  records: StrictTuningRecord[];
};

export type StrictAvailableDatesResult = {
  mode: PredictionMode;
  available_dates: string[];
};

export type MaotaiUpDownRow = {
  year: number;
  up: number;
  down: number;
  total_days: number;
  up_ratio: number;
  down_ratio: number;
};

export type MaotaiStatsRow = {
  stat: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  pct_chg: number | null;
  vol: number | null;
  amount: number | null;
};

function formatApiError(status: number, detail?: string) {
  if (status === 422) {
    return detail ?? "The request parameters are invalid for the current model or dataset.";
  }
  if (status >= 500) {
    if (detail?.includes("Strict predictions file not found") || detail?.includes("Strict summary file not found")) {
      return "Strict mode data is missing on the backend. Check the walk-forward output files and backend paths.";
    }
    if (detail?.includes("Startup resource check failed")) {
      return "Backend startup checks failed. A required model, manifest, dataset, or result file is missing.";
    }
    if (detail?.includes("Model manifest")) {
      return "Backend model metadata is unavailable. Check the deployment manifest file.";
    }
    return detail ?? "Backend service error. Check server logs and required model/data files.";
  }
  return detail ?? `Request failed with status ${status}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(formatApiError(response.status, body.detail));
  }

  return response.json() as Promise<T>;
}

export function getMetadata() {
  return request<Metadata>("/metadata");
}

export function getExperiments() {
  return request<ResultDataset<ExperimentRecord>>("/results/experiments");
}

export function getBenchmark() {
  return request<ResultDataset<BenchmarkRecord>>("/results/benchmark");
}

export function getExtremeEvents() {
  return request<ResultDataset<ExtremeEventRecord>>("/results/extreme-events");
}

export function predictByDate(date: string, mode: PredictionMode) {
  return request<DatePrediction>("/predict/by-date", {
    method: "POST",
    body: JSON.stringify({ stock_code: "TSLA", date, horizons: [1], mode }),
  });
}

export function getRisk(date: string, mode: PredictionMode) {
  return request<RiskResult>("/signal/risk", {
    method: "POST",
    body: JSON.stringify({ stock_code: "TSLA", date, horizon: 1, mode }),
  });
}

export function runBacktest(startDate: string, endDate: string) {
  return request<BacktestResult>("/backtest/simple", {
    method: "POST",
    body: JSON.stringify({ stock_code: "TSLA", start_date: startDate, end_date: endDate }),
  });
}

export function getFeatureImportance() {
  return request<FeatureImportanceResult>("/explain/feature-importance");
}

export function getStrictPerformance() {
  return request<StrictPerformanceResult>("/strict/performance");
}

export function getStrictTuningHistory() {
  return request<StrictTuningResult>("/strict/tuning-history");
}

export function getStrictAvailableDates() {
  return request<StrictAvailableDatesResult>("/strict/available-dates");
}

export function getMaotaiUpDown() {
  return request<ResultDataset<MaotaiUpDownRow>>("/results/maotai-up-down");
}

export function getMaotaiStats() {
  return request<ResultDataset<MaotaiStatsRow>>("/results/maotai-stats");
}
