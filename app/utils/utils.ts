import type { RecommendResponse } from "../types/types";

const RUPEE = "\u20B9";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

type StoredUser = {
  name: string;
  email: string;
};

export function getApiBaseUrl(): string {
  return API_URL.replace(/\/$/, "");
}

export async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function safeJsonParse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractErrorMessage(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nested =
      extractErrorMessage(record.detail) ??
      extractErrorMessage(record.error) ??
      extractErrorMessage(record.reason) ??
      extractErrorMessage(record.message);

    if (nested) {
      return nested;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  return null;
}

export function getFriendlyApiErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out. Check backend.";
  }

  if (error instanceof TypeError) {
    return "Cannot connect to backend.";
  }

  if (error instanceof Error) {
    return extractErrorMessage(error.message) ?? "Unexpected error.";
  }

  return extractErrorMessage(error) ?? "Unexpected error.";
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/health`);
    const data = await res.json();
    return data?.status === "ok";
  } catch {
    return false;
  }
}

function parseStoredJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    return null;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeAllocationItem(
  item: RecommendResponse["investment_plan"]["recommended_allocation"][number]
) {
  return {
    ...item,
    company: item?.company?.trim?.() || "Unnamed allocation",
    amount: isFiniteNumber(item?.amount) ? item.amount : 0,
    weight: isFiniteNumber(item?.weight) ? item.weight : 0,
    expected_return: isFiniteNumber(item?.expected_return)
      ? item.expected_return
      : undefined,
    historical_mean_return: isFiniteNumber(item?.historical_mean_return)
      ? item.historical_mean_return
      : undefined,
    cagr_return: isFiniteNumber(item?.cagr_return)
      ? item.cagr_return
      : undefined,
    trailing_one_year_return: isFiniteNumber(item?.trailing_one_year_return)
      ? item.trailing_one_year_return
      : undefined,
    stock_risk_score: isFiniteNumber(item?.stock_risk_score)
      ? item.stock_risk_score
      : undefined,
    selection_score: isFiniteNumber(item?.selection_score)
      ? item.selection_score
      : undefined,
    market_beta: isFiniteNumber(item?.market_beta)
      ? item.market_beta
      : undefined,
  };
}

export function normalizeRecommendationData(
  payload: RecommendResponse | null | undefined
): RecommendResponse | null {
  if (!payload?.investment_plan) {
    return null;
  }

  const allocation = Array.isArray(payload.investment_plan.recommended_allocation)
    ? payload.investment_plan.recommended_allocation.map(normalizeAllocationItem)
    : [];

  const totalInvested = isFiniteNumber(payload.investment_plan.total_invested)
    ? payload.investment_plan.total_invested
    : allocation.reduce((sum, item) => sum + item.amount, 0);

  const confidencePercent = isFiniteNumber(payload.summary?.confidence_percent)
    ? payload.summary.confidence_percent
    : undefined;

  const summaryHeadline =
    payload.summary?.headline?.trim() ||
    payload.summary?.market_condition?.trim() ||
    (allocation.length
      ? `Portfolio generated with ${allocation.length} selected allocation${allocation.length === 1 ? "" : "s"}.`
      : "Portfolio generated.");

  return {
    ...payload,
    summary: {
      headline: summaryHeadline,
      market_condition: payload.summary?.market_condition || "Portfolio generated",
      confidence: payload.summary?.confidence,
      confidence_percent: confidencePercent,
    },
    investment_plan: {
      ...payload.investment_plan,
      total_invested: totalInvested,
      recommended_allocation: allocation,
    },
    why_this_decision: Array.isArray(payload.why_this_decision)
      ? payload.why_this_decision.filter(Boolean)
      : [],
    stock_analysis: Array.isArray(payload.stock_analysis)
      ? payload.stock_analysis.filter(Boolean)
      : [],
    portfolio_risk_contribution:
      payload.portfolio_risk_contribution &&
      typeof payload.portfolio_risk_contribution === "object"
        ? payload.portfolio_risk_contribution
        : undefined,
    portfolio_split:
      payload.portfolio_split && typeof payload.portfolio_split === "object"
        ? payload.portfolio_split
        : undefined,
    metadata:
      payload.metadata && typeof payload.metadata === "object"
        ? payload.metadata
        : undefined,
    data_sources:
      payload.data_sources && typeof payload.data_sources === "object"
        ? payload.data_sources
        : undefined,
    generated_at:
      payload.generated_at || payload.service?.generated_at_utc || undefined,
  };
}

export function getStoredInvestmentData(): RecommendResponse | null {
  return normalizeRecommendationData(
    parseStoredJson<RecommendResponse>("investmentData")
  );
}

export function storeInvestmentData(payload: RecommendResponse): void {
  if (typeof window === "undefined") return;

  const normalized = normalizeRecommendationData(payload);
  if (!normalized) return;

  localStorage.setItem("investmentData", JSON.stringify(normalized));
}

export function getStoredUser(): StoredUser | null {
  return parseStoredJson<StoredUser>("user");
}

export function formatRupees(value: number): string {
  if (!Number.isFinite(value)) return `${RUPEE} 0`;
  return `${RUPEE} ${Math.round(value).toLocaleString("en-IN")}`;
}

export function formatGeneratedAt(value?: string): string {
  if (!value) return "Not available";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatPercent(
  value: number | null | undefined,
  fractionDigits = 2
): string {
  if (!isFiniteNumber(value)) return "N/A";
  return `${value.toFixed(fractionDigits)}%`;
}

export function getSummaryHeadline(data: RecommendResponse): string {
  return data.summary?.headline?.trim() || "No summary available";
}

export function getConfidenceDisplay(data: RecommendResponse): string {
  if (typeof data.summary?.confidence === "string" && data.summary.confidence.trim()) {
    return data.summary.confidence;
  }

  if (isFiniteNumber(data.summary?.confidence_percent)) {
    return `${Math.round(data.summary.confidence_percent)}%`;
  }

  return "N/A";
}

export function getDecisionHighlights(data: RecommendResponse): string[] {
  if (data.why_this_decision?.length) {
    return data.why_this_decision;
  }

  const lines: string[] = [];

  if (data.summary?.market_condition) {
    lines.push(`Market condition: ${data.summary.market_condition}.`);
  }

  if (isFiniteNumber(data.summary?.confidence_percent)) {
    lines.push(`Confidence level: ${Math.round(data.summary.confidence_percent)}%.`);
  }

  if (data.risk_score_basis) {
    lines.push(`Risk framing: ${data.risk_score_basis}.`);
  }

  if (data.metadata?.fallback_reason) {
    lines.push(`Data mode: ${data.metadata.fallback_reason}.`);
  }

  return lines;
}

export function getAllocationAnalysisLines(
  allocation: RecommendResponse["investment_plan"]["recommended_allocation"]
): string[] {
  return allocation.map((item) => {
    const fragments = [
      `${item.company}: ${item.weight}% weight`,
      `amount ${formatRupees(item.amount)}`,
    ];

    if (isFiniteNumber(item.historical_mean_return ?? item.expected_return)) {
      fragments.push(
        `mean return ${item.historical_mean_return ?? item.expected_return}%`
      );
    }

    if (isFiniteNumber(item.cagr_return)) {
      fragments.push(`CAGR ${item.cagr_return}%`);
    }

    return fragments.join(", ");
  });
}

export function getDataStatus(data: RecommendResponse | null | undefined): {
  label: string;
  tone: string;
} {
  if (!data?.metadata) {
    return {
      label: "Data status unavailable",
      tone: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    };
  }

  if (data?.metadata?.live_data_used) {
    return {
      label: "Live market data",
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }

  return {
    label: data?.metadata?.fallback_reason || "Fallback mode (limited data)",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };
}
