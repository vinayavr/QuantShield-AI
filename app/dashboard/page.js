"use client";
import { useEffect, useState } from "react";
import Chart from "chart.js/auto";

export default function Dashboard() {

  const [data, setData] = useState(null);

  useEffect(() => {

    const stored = localStorage.getItem("investmentData");
    if (!stored) return;

    const parsed = JSON.parse(stored);
    setData(parsed);

    let chart1, chart2;

    setTimeout(() => {

      const ctx1 = document.getElementById("chart1");
      const ctx2 = document.getElementById("chart2");

      if (ctx1 && parsed.chart) {
        chart1 = new Chart(ctx1, {
          type: "line",
          data: {
            labels: parsed.chart.dates.slice(-20),
            datasets: [
              {
                label: "Close",
                data: parsed.chart.close.slice(-20),
                borderColor: "#3b82f6",
                tension: 0.4
              }
            ]
          }
        });
      }

      if (ctx2 && parsed.portfolio_allocation) {
        chart2 = new Chart(ctx2, {
          type: "doughnut",
          data: {
            labels: Object.keys(parsed.portfolio_allocation),
            datasets: [{
              data: Object.values(parsed.portfolio_allocation),
              backgroundColor: ["#3b82f6","#10b981","#f59e0b"]
            }]
          }
        });
      }

    }, 300);

    // ✅ CLEANUP (correct place)
    return () => {
      chart1 && chart1.destroy();
      chart2 && chart2.destroy();
    };

  }, []);

  if (!data) {
    return <div className="text-white p-10">Loading...</div>;
  }

  return (
    <div className="flex bg-black min-h-screen text-white">

      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-700 p-6">
        <h2 className="text-xl font-bold mb-10">Investment AI</h2>

        <ul className="space-y-4 text-gray-300">
          <li><a href="/dashboard" className="text-white font-semibold">Dashboard</a></li>
          <li><a href="/explanation">Explainability</a></li>
          <li><a href="/scenario">Regret</a></li>
        </ul>
      </div>

      {/* Main */}
      <div className="flex-1 p-10">

        <h1 className="text-3xl font-bold mb-8">
          Investment Dashboard
        </h1>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">

          <div className="bg-yellow-500/10 p-6 rounded-xl border border-yellow-500/30">
            <p className="text-gray-400">Market Condition</p>
            <h2 className="text-2xl font-bold text-yellow-400">
              {data.summary.market_condition}
            </h2>
          </div>

          <div className="bg-blue-500/10 p-6 rounded-xl border border-blue-500/30">
            <p className="text-gray-400">Confidence</p>
            <h2 className="text-2xl font-bold text-blue-400">
              {data.summary.confidence_percent.toFixed(2)}%
            </h2>
          </div>

          <div className="bg-green-500/10 p-6 rounded-xl border border-green-500/30">
            <p className="text-gray-400">Market Direction</p>
            <h2 className="text-2xl font-bold text-green-400">
              {data.summary.market_direction}
            </h2>
          </div>

        </div>

        {/* Investment */}
        <div className="grid grid-cols-2 gap-6 mb-8">

          <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
            <p className="text-gray-400">Invest</p>
            <h2 className="text-xl font-bold text-green-400">
              ₹ {data.investment.recommended_investment}
            </h2>
          </div>

          <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
            <p className="text-gray-400">Hold</p>
            <h2 className="text-xl font-bold text-red-400">
              ₹ {data.investment.recommended_hold}
            </h2>
          </div>

        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6 mb-8">

          <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
            <h3 className="mb-4 font-semibold">Market Trend</h3>
            <canvas id="chart1"></canvas>
          </div>

          <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
            <h3 className="mb-4 font-semibold">Portfolio Allocation</h3>
            <canvas id="chart2"></canvas>
          </div>

        </div>

        {/* Recommendation */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">

          <h3 className="mb-3 font-semibold">Recommendation</h3>

          <p className="text-gray-300 mb-2">
            {data.explanation.direction_note}
          </p>

          <p className="text-gray-400 text-sm">
            {data.explanation.disclaimer}
          </p>

        </div>

      </div>
    </div>
  );
}