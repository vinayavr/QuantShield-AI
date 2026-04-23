import type { RecommendResponse } from "../types/types";

const RUPEE = "\u20B9";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

export function getApiBaseUrl(): string {
  return API_URL.replace(/\/$/, "");
}

// ✅ SAFE FETCH WITH CONTROLLED RETRY
export async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  retries = 1
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      // ✅ Retry only on server errors (5xx)
      if (response.status >= 500 && attempt < retries) {
        continue;
      }

      return response;
    } catch (error) {
      // ✅ Retry only for network/timeout errors
      if (attempt < retries) {
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error("Unexpected fetch failure");
}

// ✅ SAFE JSON PARSE
export async function safeJsonParse(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// ✅ FRIENDLY ERRORS
export function getFriendlyApiErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The request timed out. Ensure backend is running.";
  }

  if (error instanceof TypeError) {
    return "Cannot connect to backend. Start FastAPI server.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Analysis failed. Backend or data source issue.";
}

// ✅ BACKEND HEALTH CHECK
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ✅ LOCAL STORAGE SAFE ACCESS
export function getStoredInvestmentData(): RecommendResponse | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem("investmentData");
    return stored ? (JSON.parse(stored) as RecommendResponse) : null;
  } catch (error) {
    console.warn("Invalid stored data:", error);
    return null;
  }
}

// ✅ MONEY PARSING
export function parseMoney(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (!value) return 0;

  const cleaned = value.replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

// ✅ FORMAT ₹
export function formatRupees(value: number): string {
  if (!Number.isFinite(value)) return `${RUPEE} 0`;

  return `${RUPEE} ${Math.round(value).toLocaleString("en-IN")}`;
}

// ✅ SAFE NUMBER
export function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// ✅ DATE FORMAT
export function formatGeneratedAt(value?: string): string {
  if (!value) return "Not available";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ✅ DATA STATUS (MATCHES YOUR BACKEND)
export function getDataStatus(data: RecommendResponse): {
  label: string;
  tone: string;
} {
  if (data?.metadata?.live_data_used) {
    return {
      label: "Live market data",
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }

  return {
    label:
      data?.metadata?.fallback_reason ||
      "Fallback mode (limited market data)",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };
}

// ✅ USER STORAGE
export function getStoredUser():
  | {
      name: string;
      email: string;
    }
  | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn("Invalid stored user:", error);
    return null;
  }
}