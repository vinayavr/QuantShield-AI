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
  safeJsonParse,
  storeInvestmentData,
} from "../utils/utils";

const RISK_HELPERS: Record<RiskPreference, string> = {
  low: "Prioritizes capital preservation, lower drawdowns, and steadier allocations.",
  medium: "Balances return potential with controlled diversification and portfolio risk.",
  high: "Accepts higher volatility and more cyclical exposures in search of upside.",
};

const CHECKLIST = [
  "Monthly investment planning based on your horizon",
  "Live market and benchmark-aware allocation",
  "Readable return, volatility, and stock-level reasoning",
];

export default function InvestmentPage() {
  const router = useRouter();
  const user = useMemo(() => getStoredUser(), []);

  const {
    state: backendState,
    version: backendVersion,
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

    if (!Number.isFinite(parsedAmount) || parsedAmount < 5000) {
      setError("Enter an investment amount of at least INR 5,000.");
      return;
    }

    if (!Number.isFinite(parsedTimeValue) || parsedTimeValue <= 0) {
      setError("Enter a valid time horizon.");
      return;
    }

    if (isOffline) {
      setError("Backend unreachable. Try again.");
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

      const parsed = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(
          getFriendlyApiErrorMessage(parsed) ||
            "Backend request failed."
        );
      }

      const recommendation = parsed as RecommendResponse;

      if (
        !recommendation ||
        !recommendation.investment_plan ||
        !Array.isArray(recommendation.investment_plan.recommended_allocation) ||
        recommendation.investment_plan.recommended_allocation.length === 0
      ) {
        throw new Error("No portfolio generated. Retry.");
      }

      storeInvestmentData(recommendation);
      router.push("/dashboard");
    } catch (err) {
      let msg = getFriendlyApiErrorMessage(err);

      if (msg.includes("Market")) {
        msg = "Live market data is unavailable right now. Please retry in a moment.";
      }

      setError(msg || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SessionGuard>
      <main className="page-shell px-5 py-4 text-white md:px-8 md:py-5 lg:px-12">
        <section className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="section-surface rounded-[2rem] p-5 lg:p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
              Planning inputs
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight lg:text-[2rem]">
              Start with your real plan, not a generic AI prompt.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 lg:text-[15px]">
              {user?.name
                ? `Welcome back, ${user.name}. Set the amount, horizon, and risk comfort level you actually want to invest with, and QuantShield will turn that into a reviewable plan.`
                : "Set the amount, horizon, and risk comfort level you actually want to invest with, and QuantShield will turn that into a reviewable plan."}
            </p>

            <div className="mt-5 grid gap-2.5">
              {CHECKLIST.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="section-surface-strong rounded-[2rem] p-5 lg:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Investment Analysis</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Build a portfolio recommendation you can actually read and review.
                </p>
              </div>
              <BackendStatus state={backendState} version={backendVersion} />
            </div>

            {error && (
              <div className="mb-4 rounded-3xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200">
                {error}
              </div>
            )}

            {isOffline && (
              <div className="mb-4 text-yellow-300">
                Backend unreachable.
                <button onClick={refresh} className="ml-2 underline">
                  Retry
                </button>
              </div>
            )}

            {isChecking && <div className="mb-4 text-yellow-200">Checking backend...</div>}

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm text-slate-300">Amount to invest</label>
                <input
                  type="number"
                  placeholder="Investment amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl bg-slate-800 px-4 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-300">Time horizon</label>
                <input
                  type="number"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="w-full rounded-2xl bg-slate-800 px-4 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-300">Horizon unit</label>
                <select
                  value={timeUnit}
                  onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                  className="w-full rounded-2xl bg-slate-800 px-4 py-2.5"
                >
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Risk preference</label>
                <div className="flex gap-3">
                  {(["low", "medium", "high"] as RiskPreference[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRisk(r)}
                      className={`rounded-2xl px-4 py-2.5 ${
                        risk === r ? "bg-cyan-500 text-slate-950" : "bg-slate-700"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-sm text-slate-400">{RISK_HELPERS[risk]}</p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="primary-cta mt-5 w-full rounded-2xl py-2.5 font-semibold"
            >
              {loading ? "Running..." : isChecking ? "Checking backend..." : "Generate recommendation"}
            </button>
          </div>
        </section>
      </main>
    </SessionGuard>
  );
}
