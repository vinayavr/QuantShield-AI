"use client";

import MetricCard from "../components/MetricCard";
import NoDataState from "../components/NoDataState";
import SessionGuard from "../components/SessionGuard";
import Sidebar from "../components/Sidebar";
import { useStoredRecommendation } from "../hooks/useStoredRecommendation";
import {
  formatGeneratedAt,
  formatRupees,
  getDataStatus,
} from "../utils/utils";

export default function Scenario() {
  const { data, hydrated } = useStoredRecommendation();
  const allocation = data?.investment_plan?.recommended_allocation ?? [];

  if (!hydrated) {
    return (
      <SessionGuard>
        <main className="page-shell text-white md:flex">
          <Sidebar active="/scenario" />
          <section className="flex-1 px-5 py-5 md:p-6 lg:p-8">
            <div className="section-surface rounded-[1.75rem] p-6 text-slate-300">
              Loading saved recommendation...
            </div>
          </section>
        </main>
      </SessionGuard>
    );
  }

  if (!data || allocation.length === 0) {
    return (
      <NoDataState
        title="Scenario analysis needs a recommendation first"
        description="Submit investment details to compare the optimized portfolio with simple upside and downside stress views."
      />
    );
  }

  const total =
    data.investment_plan?.total_invested ??
    allocation.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const aggressiveTotal = Math.round(total * 1.2);
  const conservativeTotal = Math.round(total * 0.9);
  const regret = Math.abs(aggressiveTotal - total);
  const dataStatus = getDataStatus(data);

  return (
    <SessionGuard>
      <main className="page-shell text-white md:flex">
        <Sidebar active="/scenario" />

        <section className="flex-1 px-5 py-5 md:p-6 lg:p-8">
          <h1 className="text-3xl font-bold">Scenario & Regret Analysis</h1>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className={`rounded-full border px-3 py-1 ${dataStatus.tone}`}>
              {dataStatus.label}
            </span>

            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-slate-200">
              Generated {formatGeneratedAt(data.generated_at)}
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <MetricCard
              label="Recommended Portfolio"
              value={total}
              type="currency"
              tone="yellow"
            />
            <MetricCard
              label="Aggressive Scenario"
              value={aggressiveTotal}
              type="currency"
              tone="green"
            />
            <MetricCard
              label="Conservative Scenario"
              value={conservativeTotal}
              type="currency"
              tone="red"
            />
          </div>

          <section className="section-surface mt-5 rounded-[1.75rem] p-5">
            <h2 className="font-semibold">Potential Regret</h2>

            <p className="mt-3 text-2xl font-bold text-orange-300">
              {formatRupees(regret)}
            </p>

            <p className="mt-3 text-sm text-slate-400">
              This compares your optimized portfolio with simple upside and downside
              stress scenarios to make the risk trade-off easier to present.
            </p>

            {data.metadata?.market_snapshot && (
              <p className="mt-2 text-sm text-slate-400">
                {data.metadata.market_snapshot}
              </p>
            )}

            {data.metadata?.macro_snapshot && (
              <p className="mt-2 text-sm text-slate-400">
                {data.metadata.macro_snapshot}
              </p>
            )}
          </section>

          <section className="mt-5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-5">
            <h2 className="font-semibold">Portfolio Breakdown</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {allocation.map((item) => (
                <div
                  key={item.company}
                  className="rounded-2xl border border-white/10 bg-slate-950/75 p-4"
                >
                  <p className="text-slate-400">{item.company}</p>

                  <p className="mt-2 text-xl font-bold text-green-300">
                    {item.amount_display ?? formatRupees(item.amount ?? 0)}
                  </p>

                  <p className="mt-1 text-sm text-blue-300">
                    Weight: {item.weight ?? 0}%
                  </p>
                </div>
              ))}
            </div>
          </section>

          {data.evaluation && (
            <section className="section-surface-strong mt-5 rounded-[1.75rem] p-5">
              <h2 className="font-semibold">Risk / Return Snapshot</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Expected Return"
                  value={data.evaluation.expected_return_pct ?? 0}
                  type="percent"
                  tone="green"
                />

                <MetricCard
                  label="Volatility"
                  value={data.evaluation.volatility_pct ?? 0}
                  type="percent"
                  tone="yellow"
                />

                <MetricCard
                  label="Sharpe-like Ratio"
                  value={data.evaluation.sharpe_like_ratio ?? 0}
                  tone="indigo"
                />
              </div>
            </section>
          )}
        </section>
      </main>
    </SessionGuard>
  );
}
