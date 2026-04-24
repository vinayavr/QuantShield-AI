"use client";

import Image from "next/image";
import MetricCard from "../components/MetricCard";
import NoDataState from "../components/NoDataState";
import SessionGuard from "../components/SessionGuard";
import Sidebar from "../components/Sidebar";
import { useStoredRecommendation } from "../hooks/useStoredRecommendation";
import {
  formatGeneratedAt,
  formatPercent,
  getAllocationAnalysisLines,
  getConfidenceDisplay,
  getDataStatus,
  getDecisionHighlights,
} from "../utils/utils";

export default function Explanation() {
  const { data, hydrated } = useStoredRecommendation();
  const allocation = data?.investment_plan?.recommended_allocation ?? [];

  if (!hydrated) {
    return (
      <SessionGuard>
        <main className="page-shell text-white md:flex">
          <Sidebar active="/explanation" />
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
        title="Explainability is waiting for an analysis"
        description="Run a recommendation first so QuantShield can show screening logic, stock-level reasoning, and data provenance."
      />
    );
  }

  const dataStatus = getDataStatus(data);
  const whyThisDecision = getDecisionHighlights(data);
  const stockAnalysisLines = data.stock_analysis?.length
    ? data.stock_analysis
    : getAllocationAnalysisLines(allocation);

  return (
    <SessionGuard>
      <main className="page-shell text-white md:flex">
        <Sidebar active="/explanation" />

        <section className="flex-1 px-5 py-5 md:p-6 lg:p-8">
          <h1 className="text-3xl font-bold">Model Explainability</h1>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className={`rounded-full border px-3 py-1 ${dataStatus.tone}`}>
              {dataStatus.label}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-slate-200">
              Generated {formatGeneratedAt(data.generated_at)}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Portfolio Volatility"
              value={data.evaluation?.volatility_pct ?? data.risk_score ?? 0}
              type="percent"
              note={data.risk_score_basis}
            />
            <MetricCard label="Confidence" value={getConfidenceDisplay(data)} />
            <MetricCard
              label="Total Investment"
              value={data.investment_plan?.total_invested ?? 0}
              type="currency"
            />
          </div>

          <section className="section-surface mt-5 rounded-[1.75rem] p-5">
            <h2 className="font-semibold">Why This Decision?</h2>
            {whyThisDecision.length > 0 ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
                {whyThisDecision.map((item, i) => (
                  <li key={`${item}-${i}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                No model rationale was returned for this recommendation.
              </p>
            )}
          </section>

          <section className="section-surface-strong mt-5 rounded-[1.75rem] p-5">
            <h2 className="font-semibold">Stock Analysis</h2>

            {stockAnalysisLines.length > 0 ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
                {stockAnalysisLines.map((item, i) => (
                  <li key={`${item}-${i}`}>{item}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {allocation.map((item) => (
                <div
                  key={item.company}
                  className="rounded-2xl border border-white/10 bg-slate-950/75 p-4"
                >
                  <p className="text-sm text-slate-300">{item.company}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Risk Band: {item.stock_risk_level ?? "n/a"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Annualized Volatility: {formatPercent(item.stock_risk_score)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Trailing 1Y Return: {formatPercent(item.trailing_one_year_return)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Beta vs NIFTY 50: {item.market_beta ?? "n/a"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Selection Percentile: {item.selection_score ?? "n/a"} / 100
                  </p>
                </div>
              ))}
            </div>
          </section>

          {(data.shap_plot || data.charts?.shap_summary) && (
            <section className="section-surface mt-5 rounded-[1.75rem] p-5">
              <h2 className="font-semibold">Model Explainability (SHAP)</h2>

              <Image
                src={
                  data.shap_plot
                    ? `data:image/png;base64,${data.shap_plot}`
                    : `data:image/png;base64,${data.charts?.shap_summary}`
                }
                alt="SHAP plot"
                width={1200}
                height={720}
                unoptimized
                className="mt-4 h-auto rounded-xl"
              />
            </section>
          )}

          {(data.portfolio_chart || data.charts?.efficient_frontier) && (
            <section className="section-surface mt-5 rounded-[1.75rem] p-5">
              <h2 className="font-semibold">Portfolio Allocation</h2>

              <Image
                src={
                  data.portfolio_chart
                    ? `data:image/png;base64,${data.portfolio_chart}`
                    : `data:image/png;base64,${data.charts?.efficient_frontier}`
                }
                alt="Portfolio chart"
                width={1200}
                height={720}
                unoptimized
                className="mt-4 h-auto rounded-xl"
              />
            </section>
          )}

          {data.portfolio_risk_contribution && (
            <section className="section-surface-strong mt-5 rounded-[1.75rem] p-5">
              <h2 className="font-semibold">Risk Contribution</h2>

              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                {Object.entries(data.portfolio_risk_contribution).map(([stock, value]) => (
                  <div
                    key={stock}
                    className="rounded-2xl border border-white/10 bg-slate-950/75 p-3"
                  >
                    <p className="text-sm text-slate-400">{stock}</p>
                    <p className="font-bold text-yellow-400">{value}%</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="section-surface mt-5 rounded-[1.75rem] p-5">
            <h2 className="font-semibold">Data & Model Notes</h2>

            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>Market Data: {data.data_sources?.market_data ?? "N/A"}</p>
              <p>Model: {data.data_sources?.model ?? "N/A"}</p>
              <p>Features: {data.data_sources?.features ?? "N/A"}</p>

              {data.metadata?.as_of_date && (
                <p>Prices as of: {data.metadata.as_of_date}</p>
              )}

              {data.metadata?.return_basis && (
                <p>Return basis: {data.metadata.return_basis}</p>
              )}

              {data.metadata?.market_snapshot && (
                <p>{data.metadata.market_snapshot}</p>
              )}

              {data.metadata?.macro_snapshot && (
                <p>{data.metadata.macro_snapshot}</p>
              )}

              {data.metadata && (
                <p>
                  Universe screened: {data.metadata.considered_universe_size ?? 0},
                  shortlisted: {data.metadata.shortlisted_universe_size ?? 0}
                </p>
              )}
            </div>
          </section>
        </section>
      </main>
    </SessionGuard>
  );
}
