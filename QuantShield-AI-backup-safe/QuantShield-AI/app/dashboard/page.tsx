"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import MetricCard from "../components/MetricCard";
import SessionGuard from "../components/SessionGuard";
import NoDataState from "../components/NoDataState";
import Sidebar from "../components/Sidebar";
import type { RecommendResponse } from "../types/types";
import {
  formatGeneratedAt,
  formatRupees,
  getDataStatus,
  getStoredInvestmentData,
} from "../utils/utils";

const COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#22d3ee"];

export default function Dashboard() {
  const [data, setData] = useState<RecommendResponse | null>(null);

  useEffect(() => {
    setData(getStoredInvestmentData());
  }, []);

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

  if (!data) {
    return (
      <NoDataState
        title="No recommendation available yet"
        description="Run a portfolio analysis first so the dashboard can display allocation, risk, and market context."
      />
    );
  }

  const dataStatus = getDataStatus(data);

  return (
    <SessionGuard>
      <main className="page-shell min-h-screen text-white md:flex">
        <Sidebar active="/dashboard" />

        <section className="flex-1 p-6 md:p-10">
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
                {data.metadata?.selected_stocks_count ?? allocation.length} stocks selected
              </span>
            </div>
          </div>

          <div className="section-surface mt-6 rounded-[1.75rem] p-6">
            <p className="text-sm font-semibold text-white">Portfolio brief</p>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              {data.summary?.headline ?? "No summary available"}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Market Condition" value={data.summary?.market_condition ?? "N/A"} />
            <MetricCard label="Confidence" value={data.summary?.confidence ?? "N/A"} />
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

          <div className="section-surface-strong mt-6 rounded-xl p-6">
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

          <div className="section-surface mt-6 rounded-xl p-6">
            <h3 className="font-semibold">Return Comparison Chart</h3>
            <p className="mt-2 text-sm text-slate-400">
              Historical mean return and CAGR are shown side by side for the selected allocation.
            </p>

            <div className="mt-6 grid gap-4">
              {allocation.map((item, index) => {
                const meanValue = item.historical_mean_return ?? item.expected_return ?? 0;
                const cagrValue = item.cagr_return ?? 0;

                return (
                  <div
                    key={item.company}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-200">{item.company}</p>
                      <p className="text-xs text-slate-400">Weight {item.weight}%</p>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Historical Mean Return</span>
                          <span className="text-cyan-300">{meanValue}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-900/80">
                          <div
                            className="h-3 rounded-full"
                            style={{
                              width: `${Math.max((meanValue / maxReturn) * 100, 4)}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-slate-400">CAGR</span>
                          <span className="text-sky-300">{cagrValue}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-900/80">
                          <div
                            className="h-3 rounded-full bg-sky-500/80"
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
            <div className="section-surface mt-6 rounded-xl p-6">
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

          {data.evaluation && (
            <div className="section-surface-strong mt-6 rounded-xl p-6">
              <h3 className="font-semibold">Portfolio Evaluation</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
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
            </div>
          )}

          <div className="section-surface-strong mt-6 rounded-xl p-6">
            <h3 className="font-semibold">Recommended Action</h3>
            <p className="mt-2 text-slate-300">
              {data.what_to_do?.recommended_action ?? "No recommendation available"}
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5">
            <h3 className="font-semibold text-red-200">Disclaimer</h3>
            <p className="mt-2 text-sm text-slate-200">{data.note}</p>

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
