"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const pillars = [
  {
    title: "Live market context",
    description:
      "QuantShield screens the live NIFTY universe, combines market regime checks, and refreshes recommendations on demand.",
    icon: TrendingUp,
  },
  {
    title: "Transparent methodology",
    description:
      "Every recommendation is paired with allocation logic, risk scoring, portfolio evaluation, and explainability outputs.",
    icon: BrainCircuit,
  },
  {
    title: "Decision-grade framing",
    description:
      "The interface highlights assumptions, data freshness, and scenario comparisons so results can be reviewed with discipline.",
    icon: ShieldCheck,
  },
];

const highlights = [
  "Live NIFTY 50 screening and allocation",
  "Risk preference aware portfolio construction",
  "Explainability and scenario analysis views",
  "Clear investor disclaimer and market freshness",
];

// ✅ ENV BASED URL
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  const [backendVersion, setBackendVersion] = useState("");

  useEffect(() => {
    const checkBackend = async (retries = 3) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${API_BASE}/health`, {
          signal: controller.signal,
          cache: "no-store",
        });

        clearTimeout(timeoutId);

        if (!res.ok) throw new Error();

        const data = await res.json();

        if (data.status === "healthy") {
          setBackendStatus("online");
          setBackendVersion(data.version || "");
          return;
        }

        throw new Error();
      } catch {
        if (retries > 0) {
          setTimeout(() => checkBackend(retries - 1), 1500);
        } else {
          setBackendStatus("offline");
        }
      }
    };

    checkBackend();
  }, []);

  return (
    <main className="hero-page min-h-screen px-5 py-8 text-white md:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        
        {/* TOP BADGE */}
        <div className="flex flex-col gap-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 md:w-fit md:flex-row md:items-center">
          <span className="inline-flex items-center gap-2">
            <BadgeCheck size={16} className="text-emerald-300" />
            AI-assisted portfolio analysis platform
          </span>
          <span className="text-slate-400">
            Built for disciplined recommendation review, not blind auto-investing.
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          
          {/* LEFT */}
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">
              QuantShield AI
            </p>

            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
              A more credible front door for AI-assisted portfolio recommendations.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              QuantShield combines live market signals, risk-aware screening, and
              explainable allocation outputs so users can review recommendations with
              the context a legitimate fintech product should provide.
            </p>

            {/* BUTTONS */}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              
              <Link
                href="/login"
                className="primary-cta inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold"
              >
                Login / Sign Up
                <ArrowRight size={18} />
              </Link>

              <Link
                href={backendStatus === "online" ? "/investment" : "#"}
                className={`secondary-cta inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold ${
                  backendStatus !== "online"
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {backendStatus === "online"
                  ? "Skip to Analysis"
                  : backendStatus === "checking"
                  ? "Checking backend..."
                  : "Backend Offline"}
              </Link>
            </div>

            {/* HIGHLIGHTS */}
            <div className="mt-8 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
              {highlights.map((item) => (
                <div key={item} className="glass-panel rounded-2xl px-4 py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT CARD */}
          <div className="hero-card rounded-[2rem] border border-white/10 p-6 shadow-2xl shadow-cyan-950/30">
            
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-400">
              <span>System posture</span>

              <span
                className={`rounded-full px-3 py-1 ${
                  backendStatus === "online"
                    ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : backendStatus === "checking"
                    ? "border border-yellow-400/30 bg-yellow-400/10 text-yellow-200"
                    : "border border-red-400/30 bg-red-400/10 text-red-200"
                }`}
              >
                {backendStatus === "online"
                  ? "Live data mode"
                  : backendStatus === "checking"
                  ? "Checking..."
                  : "Offline mode"}
              </span>
            </div>

            {/* VERSION DISPLAY */}
            {backendVersion && (
              <p className="mt-2 text-xs text-slate-500">
                Backend v{backendVersion}
              </p>
            )}

            <div className="mt-6 space-y-4">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;

                return (
                  <div
                    key={pillar.title}
                    className="rounded-3xl border border-white/10 bg-slate-950/60 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
                        <Icon size={20} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">
                        {pillar.title}
                      </h2>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {pillar.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
              Recommendations are research support, not execution advice.
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}