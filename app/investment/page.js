"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Investment() {

  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [risk, setRisk] = useState("medium");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {

    if (!amount) {
      alert("Please enter investment amount");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: Number(amount),
          time_horizon: duration ? duration : "medium",
          risk_preference: risk
        })
      });

      if (!res.ok) {
        throw new Error("API failed");
      }

      const data = await res.json();

      // store data for dashboard
      localStorage.setItem("investmentData", JSON.stringify(data));

      // navigate to dashboard
      router.push("/dashboard");

    } catch (err) {
      console.error(err);
      alert("Something went wrong. Check backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">

      <div className="bg-gray-900 border border-gray-700 p-10 rounded-2xl shadow-2xl w-[450px]">

        <h2 className="text-2xl font-bold text-center mb-2">
          Investment Details
        </h2>

        <p className="text-center text-gray-400 mb-8">
          Enter your investment parameters
        </p>

        <div className="space-y-5">

          {/* Amount */}
          <div>
            <label className="text-sm text-gray-400">Investment Amount</label>
            <input
              type="number"
              placeholder="₹ 1,00,000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 p-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm text-gray-400">
              Investment Duration (months)
            </label>
            <input
              type="number"
              placeholder="e.g. 12"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full mt-1 p-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Risk */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Risk Preference
            </label>

            <div className="flex justify-between">

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="risk"
                  onChange={() => setRisk("low")}
                />
                <span className="text-gray-300">Low</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="risk"
                  defaultChecked
                  onChange={() => setRisk("medium")}
                />
                <span className="text-gray-300">Medium</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="risk"
                  onChange={() => setRisk("high")}
                />
                <span className="text-gray-300">High</span>
              </label>

            </div>
          </div>

        </div>

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] transition duration-300 text-white py-3 rounded-lg font-semibold shadow-lg shadow-blue-500/20"
        >
          {loading ? "Analyzing..." : "Analyze Investment →"}
        </button>

      </div>

    </div>
  );
}