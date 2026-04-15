"use client";
import { useEffect, useState } from "react";

export default function Scenario() {

  const [data, setData] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("investmentData");
    if (!stored) return;

    setData(JSON.parse(stored));
  }, []);

  if (!data) {
    return <div className="text-white p-10">Loading...</div>;
  }

  // 🔥 Base values
  const invest = data.investment.recommended_investment;
  const hold = data.investment.recommended_hold;

  // 🔥 Scenario logic (demo-based)
  const aggressive = Math.round(invest * 1.5);
  const conservative = Math.round(invest * 0.6);

  const best_case = aggressive;
  const worst_case = conservative;

  const regret = best_case - invest;

  return (
    <div className="flex bg-black min-h-screen text-white">

      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-700 p-6">
        <h2 className="text-xl font-bold mb-10">Investment AI</h2>

        <ul className="space-y-4 text-gray-300">
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/explanation">Explainability</a></li>
          <li><a href="/scenario" className="text-white font-semibold">Regret</a></li>
        </ul>
      </div>

      {/* Main */}
      <div className="flex-1 p-10">

        <h1 className="text-3xl font-bold mb-6">
          Scenario & Regret Analysis
        </h1>

        {/* Current */}
        <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-xl mb-6">
          <p className="text-gray-400">Recommended Investment</p>
          <h2 className="text-2xl font-bold text-blue-400">
            ₹ {invest}
          </h2>
        </div>

        {/* Scenarios */}
        <div className="grid grid-cols-3 gap-6 mb-8">

          <div className="bg-green-500/10 border border-green-500/30 p-6 rounded-xl">
            <p className="text-gray-400">Aggressive Scenario</p>
            <h2 className="text-xl font-bold text-green-400">
              ₹ {aggressive}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Higher risk, higher return potential
            </p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-xl">
            <p className="text-gray-400">Recommended</p>
            <h2 className="text-xl font-bold text-yellow-400">
              ₹ {invest}
            </h2>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl">
            <p className="text-gray-400">Conservative Scenario</p>
            <h2 className="text-xl font-bold text-red-400">
              ₹ {conservative}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Lower risk, safer returns
            </p>
          </div>

        </div>

        {/* Regret Section */}
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl mb-6">

          <h3 className="text-xl font-semibold mb-4">
            Regret Analysis
          </h3>

          <div className="grid grid-cols-2 gap-6">

            <div>
              <p className="text-gray-400">Best Case (Aggressive)</p>
              <h2 className="text-green-400 text-xl font-bold">
                ₹ {best_case}
              </h2>
            </div>

            <div>
              <p className="text-gray-400">Worst Case (Conservative)</p>
              <h2 className="text-red-400 text-xl font-bold">
                ₹ {worst_case}
              </h2>
            </div>

          </div>

          <div className="mt-6">
            <p className="text-gray-400">Potential Regret</p>
            <h2 className="text-2xl font-bold text-orange-400">
              ₹ {regret}
            </h2>
          </div>

        </div>

        {/* Insight */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 p-6 rounded-xl">

          <h3 className="font-semibold mb-2">Insight</h3>

          <p className="text-gray-300">
            Regret represents the difference between the best possible investment outcome
            and the chosen strategy. A higher regret indicates potential missed opportunities,
            while lower regret suggests a safer and more stable investment decision.
          </p>

        </div>

      </div>

    </div>
  );
}