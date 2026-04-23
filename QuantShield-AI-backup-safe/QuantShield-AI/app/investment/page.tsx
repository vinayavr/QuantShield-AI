"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackendStatus from "../components/BackendStatus";
import SessionGuard from "../components/SessionGuard";
import { useBackendHealth } from "../hooks/useBackendHealth";
import type {
  RecommendRequest,
  RecommendResponse,
  RiskPreference,
  TimeUnit,
} from "../types/types";
import {
  fetchWithTimeout,
  getApiBaseUrl,
  getFriendlyApiErrorMessage,
  getStoredUser,
} from "../utils/utils";

const RISK_HELPERS: Record<RiskPreference, string> = {
  low: "Prioritizes capital preservation, lower drawdowns, and steadier allocations.",
  medium: "Balances return potential with controlled diversification and portfolio risk.",
  high: "Accepts higher volatility and more cyclical exposures in search of upside.",
};

const checklist = [
  "Live universe screening from NIFTY constituents",
  "Portfolio construction constrained by risk preference",
  "Explainability, scenario review, and allocation breakdown",
];

export default function InvestmentPage() {
  const router = useRouter();
  const user = useMemo(() => getStoredUser(), []);

  const {
    state: backendState,
    version: backendVersion,
    isOnline,
    isChecking,
    isOffline,
    refresh,
  } = useBackendHealth();

  const [amount, setAmount] = useState("");
  const [risk, setRisk] = useState<RiskPreference>("medium");
  const [timeValue, setTimeValue] = useState("3");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("years");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    const parsedTimeValue = Number(timeValue);
    setError("");

    // ✅ VALIDATION
    if (!Number.isFinite(parsedAmount) || parsedAmount < 5000) {
      setError("Enter an investment amount of at least INR 5,000.");
      return;
    }

    if (!Number.isFinite(parsedTimeValue) || parsedTimeValue <= 0) {
      setError("Enter a valid time horizon.");
      return;
    }

    if (!isOnline) {
      setError("Backend service is not available yet. Start FastAPI server and retry.");
      return;
    }

    setLoading(true);

    try {
      const payload: RecommendRequest = {
        amount: parsedAmount,
        risk_preference: risk,
        time_value: parsedTimeValue,
        time_unit: timeUnit,
      };

      const response = await fetchWithTimeout(`${getApiBaseUrl()}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // ✅ HANDLE BACKEND ERRORS PROPERLY
      if (!response.ok) {
        let message = "Backend request failed.";

        try {
          const err = await response.json();
          message = err?.detail || message;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }

        throw new Error(message);
      }

      const recommendation = (await response.json()) as RecommendResponse;

      // ✅ STRICT VALIDATION (CRITICAL FIX)
      if (
        !recommendation ||
        !recommendation.investment_plan ||
        !Array.isArray(recommendation.investment_plan.recommended_allocation) ||
        recommendation.investment_plan.recommended_allocation.length === 0
      ) {
        throw new Error(
          "No valid portfolio generated. Market data fetch may have failed. Retry."
        );
      }

      // ✅ SAVE DATA
      localStorage.setItem("investmentData", JSON.stringify(recommendation));

      // ✅ NAVIGATE
      router.push("/dashboard");

    } catch (err) {
      let msg = getFriendlyApiErrorMessage(err);

      // ✅ SMART ERROR MAPPING
      if (msg.includes("Market fetch failed")) {
        msg = "Live market data unavailable (NIFTY / VIX issue). Retry.";
      }

      if (msg.includes("Insufficient")) {
        msg = "Not enough market data. Try again.";
      }

      if (msg.includes("date datatypes")) {
        msg = "Internal data merge error fixed. Restart backend and retry.";
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED ENTER KEY (NO DOUBLE TRIGGER)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <SessionGuard>
      <main className="page-shell min-h-screen px-5 py-8 text-white md:px-8 lg:px-12">
        <section className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">

          {/* LEFT PANEL */}
          <div className="section-surface rounded-[2rem] p-8">
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80">
              Analysis setup
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Configure a review-grade portfolio recommendation.
            </h1>

            <p className="mt-4 text-base leading-7 text-slate-300">
              {user?.name
                ? `Welcome back, ${user.name}.`
                : "Complete the analysis inputs below."}
            </p>

            <div className="mt-8 grid gap-4">
              {checklist.map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-slate-950/55 px-4 py-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="section-surface-strong rounded-[2rem] p-8">

            <div className="flex justify-between">
              <h2 className="text-2xl font-semibold">Portfolio mandate</h2>
              <BackendStatus state={backendState} version={backendVersion} />
            </div>

            {error && (
              <div className="mt-6 rounded-3xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            {isOffline && (
              <div className="mt-6 text-amber-200">
                Backend offline.
                <button onClick={refresh} className="ml-2 underline">
                  Retry
                </button>
              </div>
            )}

            <div className="mt-8 space-y-6" onKeyDown={handleKeyDown}>

              {/* AMOUNT */}
              <input
                type="number"
                placeholder="Amount (min ₹5000)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 bg-slate-900 rounded"
              />

              {/* TIME */}
              <input
                type="number"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="w-full p-3 bg-slate-900 rounded"
              />

              {/* UNIT (ADDED – IMPORTANT FIX) */}
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                className="w-full p-3 bg-slate-900 rounded"
              >
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>

              {/* RISK */}
              <div className="flex gap-4">
                {(["low", "medium", "high"] as RiskPreference[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    className={`p-3 rounded ${
                      risk === r ? "bg-cyan-500" : "bg-slate-800"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* RISK HELPER TEXT */}
              <p className="text-xs text-slate-400">
                {RISK_HELPERS[risk]}
              </p>

            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || isOffline || isChecking}
              className="primary-cta mt-8 w-full"
            >
              {loading
                ? "Running..."
                : isChecking
                ? "Checking backend..."
                : "Generate recommendation"}
            </button>

          </div>
        </section>
      </main>
    </SessionGuard>
  );
}