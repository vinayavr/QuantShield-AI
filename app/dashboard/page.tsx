"use client";

import Image from "next/image";
import { useMemo } from "react";
import MetricCard from "../components/MetricCard";
import SessionGuard from "../components/SessionGuard";
import NoDataState from "../components/NoDataState";
import Sidebar from "../components/Sidebar";
import { useStoredRecommendation } from "../hooks/useStoredRecommendation";
import {
  formatGeneratedAt,
  formatRupees,
  getConfidenceDisplay,
  getDataStatus,
  getSummaryHeadline,
} from "../utils/utils";

const COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#22d3ee"];

export default function Dashboard() {
  const { data, hydrated } = useStoredRecommendation();

  const allocation = useMemo(
    () => data?.investment_plan?.recommended_allocation ?? [],
    [data]
  );

  const donutBackground = useMemo(() => {
    if (!allocation.length) {
      return "conic-gradient(#1e293b 0deg, #1e293b 360deg)";
    }

    let start = 0;
    const segments = allocation.map((item, index) => {
      const sweep = (item.weight / 100) * 360;
      const end = start + sweep;
      const segment = `${COLORS[index % COLORS.length]} ${start}deg ${end}deg`;
      start = end;
      return segment;
    });

    if (start < 360) {
      segments.push(`#1e293b ${start}deg 360deg`);
    }

    return `conic-gradient(${segments.join(", ")})`;
  }, [allocation]);

  const maxReturn = useMemo(() => {
    const values = allocation.flatMap((item) => [
      item.historical_mean_return ?? item.expected_return ?? 0,
      item.cagr_return ?? 0,
    ]);

    const max = Math.max(...values, 0);
    return max > 0 ? max : 1;
  }, [allocation]);

  if (!hydrated) {
    return (
      <SessionGuard>
        <main className="page-shell text-white md:flex">
          <Sidebar active="/dashboard" />
          <section className="flex-1 p-5 md:p-6 lg:p-8">
            <div className="section-surface rounded-[1.75rem] p-6 text-slate-300">
              Loading saved recommendation...
            </div>
          </section>
        </main>
      </SessionGuard>
    );
  }

  if (!data) {
    return (
      <NoDataState
        title="No recommendation available yet"
        description="Run a portfolio analysis first so the dashboard can display allocation, risk, and market context."
      />
    );
  }

  const dataStatus = getDataStatus(data);
  const selectedCount = data.metadata?.selected_stocks_count ?? allocation.length;

  return (
    <SessionGuard>
      <main className="page-shell text-white md:flex">
        <Sidebar active="/dashboard" />

        <section className="flex-1 p-5 md:p-6 lg:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Investment Dashboard</h1>
              <p className="mt-2 text-sm text-slate-400">
                Generated on {formatGeneratedAt(data.generated_at)}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className={`rounded-full border px-3 py-1 ${dataStatus.tone}`}>
                {dataStatus.label}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-slate-200">
                {selectedCount} stocks selected
              </span>
            </div>
          </div>

          <div className="section-surface mt-6 rounded-[2rem] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold text-white">Portfolio brief</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {getSummaryHeadline(data)}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-white/10 bg-slate-950/55 px-4 py-2 text-slate-200">
                  Best fit: {data.investment_plan?.best_company ?? "Portfolio mix"}
                </span>
                <span className="rounded-full border border-white/10 bg-slate-950/55 px-4 py-2 text-slate-300">
                  Generated {formatGeneratedAt(data.generated_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="section-surface-strong mt-6 overflow-hidden rounded-[2rem] p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                  Portfolio Evaluation
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white">
                  Snapshot for this recommendation
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Return, risk, and diversification in one quick view.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
                <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">
                    Expected Return
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-emerald-100">
                    {data.evaluation?.expected_return_pct?.toFixed(2) ?? "0.00"}%
                  </p>
                </div>
                <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">
                    Volatility
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-cyan-100">
                    {data.evaluation?.volatility_pct?.toFixed(2) ?? "0.00"}%
                  </p>
                </div>
              </div>
            </div>

            {data.evaluation && (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                  label="Historical Mean Return"
                  value={data.evaluation.expected_return_pct}
                  type="percent"
                />
                <MetricCard
                  label="Weighted CAGR"
                  value={data.evaluation.cagr_return_pct ?? 0}
                  type="percent"
                />
                <MetricCard
                  label="Volatility"
                  value={data.evaluation.volatility_pct}
                  type="percent"
                />
                <MetricCard
                  label="Sharpe-like Ratio"
                  value={data.evaluation.sharpe_like_ratio}
                />
                <MetricCard
                  label="Effective Holdings"
                  value={data.evaluation.diversification_score}
                  note="Calculated as 1 / sum(weight^2)."
                />
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Market Condition" value={data.summary?.market_condition ?? "N/A"} />
            <MetricCard label="Confidence" value={getConfidenceDisplay(data)} />
            <MetricCard
              label="Total Investment"
              value={data.investment_plan?.total_invested ?? 0}
              type="currency"
            />
            <MetricCard
              label="Portfolio Volatility"
              value={data.evaluation?.volatility_pct ?? data.risk_score ?? 0}
              type="percent"
              note={data.risk_score_basis}
            />
          </div>

          <div className="section-surface-strong mt-5 rounded-xl p-5">
            <h3 className="mb-4 font-semibold">Stock Allocation</h3>

            <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr] xl:items-start">
              {data.charts?.efficient_frontier ? (
                <Image
                  src={`data:image/png;base64,${data.charts.efficient_frontier}`}
                  alt="Efficient frontier chart"
                  width={1200}
                  height={720}
                  unoptimized
                  className="h-auto rounded-xl"
                />
              ) : allocation.length > 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-6">
                  <div className="mx-auto flex max-w-[260px] flex-col items-center">
                    <div
                      className="relative h-56 w-56 rounded-full"
                      style={{ background: donutBackground }}
                    >
                      <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-[#07131c] text-center">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            Total
                          </p>
                          <p className="mt-2 text-lg font-semibold text-white">
                            {formatRupees(data.investment_plan?.total_invested ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid w-full gap-3">
                      {allocation.map((item, index) => (
                        <div key={item.company} className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-slate-300">{item.company}</span>
                          </div>
                          <span className="text-cyan-300">{item.weight}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {allocation.map((item) => (
                  <div
                    key={item.company}
                    className="rounded-2xl border border-white/10 bg-slate-950/75 p-4"
                  >
                    <p className="text-slate-400">{item.company}</p>
                    <h3 className="text-lg font-bold text-green-400">
                      {item.amount_display ?? formatRupees(item.amount)}
                    </h3>
                    {item.monthly_amount_display ? (
                      <p className="mt-1 text-sm text-cyan-300">
                        Monthly: {item.monthly_amount_display}
                      </p>
                    ) : null}
                    <p className="text-sm text-blue-300">Weight: {item.weight}%</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Historical Mean Return: {item.historical_mean_return ?? item.expected_return ?? 0}%
                    </p>
                    <p className="text-xs text-slate-500">
                      CAGR: {item.cagr_return ?? 0}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="section-surface mt-5 rounded-xl p-5">
            <h3 className="font-semibold">Return Comparison Chart</h3>
            <p className="mt-2 text-sm text-slate-400">
              Historical mean return and CAGR are shown side by side for the selected allocation.
            </p>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              {allocation.map((item, index) => {
                const meanValue = item.historical_mean_return ?? item.expected_return ?? 0;
                const cagrValue = item.cagr_return ?? 0;

                return (
                  <div
                    key={item.company}
                    className="rounded-[1.6rem] border border-white/10 bg-slate-950/60 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-semibold text-slate-100">{item.company}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                          Return profile
                        </p>
                      </div>
                      <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                        Weight {item.weight}%
                      </p>
                    </div>

                    <div className="mt-5 grid gap-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Historical Mean Return</span>
                          <span className="text-cyan-300">{meanValue}%</span>
                        </div>
                        <div className="h-3.5 rounded-full bg-slate-900/80">
                          <div
                            className="h-3.5 rounded-full"
                            style={{
                              width: `${Math.max((meanValue / maxReturn) * 100, 4)}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-slate-400">CAGR</span>
                          <span className="text-sky-300">{cagrValue}%</span>
                        </div>
                        <div className="h-3.5 rounded-full bg-slate-900/80">
                          <div
                            className="h-3.5 rounded-full bg-sky-500/80"
                            style={{
                              width: `${Math.max((cagrValue / maxReturn) * 100, 4)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {data.charts?.shap_summary && (
            <div className="section-surface mt-5 rounded-xl p-5">
              <h3 className="font-semibold">Model Explainability (SHAP)</h3>
              <Image
                src={`data:image/png;base64,${data.charts.shap_summary}`}
                alt="SHAP feature importance summary"
                width={1200}
                height={720}
                unoptimized
                className="mt-4 h-auto rounded-xl"
              />
            </div>
          )}

            <div className="section-surface-strong mt-5 rounded-xl p-5">
            <h3 className="font-semibold">Recommended Action</h3>
            <p className="mt-2 text-slate-300">
              {data.what_to_do?.recommended_action ?? "No recommendation available"}
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <h3 className="font-semibold text-red-200">Disclaimer</h3>
            <p className="mt-2 text-sm text-slate-200">
              {typeof data.note === "string"
                ? data.note
                : data.note
                ? JSON.stringify(data.note)
                : "No notes available"}
            </p>

            {data.sip && (
              <p className="mt-2 text-sm text-slate-300">
                Suggested monthly pace: {formatRupees(data.sip.monthly_investment)} for{" "}
                {data.sip.months} months.
              </p>
            )}
          </div>
        </section>
      </main>
    </SessionGuard>
  );
}
