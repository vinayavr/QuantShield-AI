"use client";
import { useEffect, useState } from "react";
import Chart from "chart.js/auto";

export default function Explanation() {

  const [data, setData] = useState(null);

  useEffect(() => {

    const stored = localStorage.getItem("investmentData");
    if (!stored) return;

    const parsed = JSON.parse(stored);
    setData(parsed);

    setTimeout(() => {

      const ctx = document.getElementById("shapChart");
      if (!ctx || !parsed.feature_importance) return;

      const labels = Object.keys(parsed.feature_importance);
      const values = Object.values(parsed.feature_importance);

      new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Impact on Risk",
            data: values,
            backgroundColor: values.map(v => v >= 0 ? "#3b82f6" : "#ef4444"),
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: "y",
          plugins: {
            legend: { labels: { color: "white" } }
          },
          scales: {
            x: {
              ticks: { color: "#9ca3af" },
              grid: { color: "#374151" }
            },
            y: {
              ticks: { color: "#9ca3af" },
              grid: { display: false }
            }
          }
        }
      });

    }, 300);

  }, []);

  if (!data) {
    return <div className="text-white p-10">Loading...</div>;
  }

  const features = data.feature_importance;
  const topFeature = Object.entries(features).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))[0];

  return (
    <div className="flex bg-black min-h-screen text-white">

      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 p-6">
        <h2 className="text-xl font-bold mb-10">Investment AI</h2>

        <ul className="space-y-4 text-gray-400">
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/explanation" className="text-white font-semibold">Explainability</a></li>
          <li><a href="/scenario">Regret</a></li>
        </ul>
      </div>

      {/* Main */}
      <div className="flex-1 p-10">

        <h1 className="text-3xl font-bold mb-2">
          Model Explainability
        </h1>

        <p className="text-gray-400 mb-8">
          Understanding how model factors influence risk prediction
        </p>

        {/* Key Insight */}
        <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-xl mb-8">
          <h3 className="text-lg font-semibold mb-2">Key Insight</h3>
          <p className="text-gray-300">
            The model primarily reacts to recent market indicators such as volatility,
            macroeconomic changes, and trend signals.
          </p>
        </div>

        {/* Top Feature */}
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl mb-8 flex justify-between">

          <div>
            <p className="text-gray-400 text-sm">Top Risk Driver</p>
            <h2 className="text-xl font-bold text-blue-400">
              {topFeature[0]}
            </h2>
          </div>

          <div className="text-right">
            <p className="text-gray-400 text-sm">Impact</p>
            <h2 className="text-xl font-bold">
              {topFeature[1].toFixed(3)}
            </h2>
          </div>

        </div>

        {/* Chart */}
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl mb-8">
          <h3 className="mb-4 font-semibold">Feature Impact</h3>
          <canvas id="shapChart"></canvas>
        </div>

        {/* Confidence */}
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl mb-8">

          <h3 className="mb-2 font-semibold">Model Confidence</h3>

          <div className="w-full bg-gray-700 h-3 rounded">
            <div
              className="bg-blue-500 h-3 rounded"
              style={{ width: `${data.summary.confidence_percent}%` }}
            ></div>
          </div>

          <p className="text-sm text-gray-400 mt-2">
            {data.summary.confidence_percent.toFixed(2)}% confidence
          </p>

        </div>

        {/* Notes */}
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl">
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