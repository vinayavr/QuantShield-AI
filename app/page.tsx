"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronRight,
  Radar,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useBackendHealth } from "./hooks/useBackendHealth";

const highlights = [
  {
    title: "Market check",
    detail: "Live posture, confidence, and risk framing",
    icon: TrendingUp,
  },
  {
    title: "Mix review",
    detail: "Allocation, returns, and portfolio balance in one flow",
    icon: Radar,
  },
  {
    title: "Risk clarity",
    detail: "Readable signals without raw-model noise",
    icon: ShieldCheck,
  },
];

const sideNotes = [
  {
    title: "Grounded market context",
    description: "Live market tone and benchmark signals before allocation.",
    icon: TrendingUp,
  },
  {
    title: "Readable reasoning",
    description: "Allocation, returns, and volatility in plain language.",
    icon: Radar,
  },
  {
    title: "Calmer decision support",
    description: "Freshness, assumptions, and planning without hype.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  const { state: backendStatus, version: backendVersion } = useBackendHealth();

  return (
    <main className="hero-page px-5 py-4 text-white md:px-8 md:py-5 lg:px-12">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/60 p-2 shadow-lg shadow-cyan-950/20">
              <Image
                src="/quantshield-logo.svg"
                alt="QuantShield AI logo"
                width={54}
                height={54}
                priority
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/80">
                QuantShield AI
              </p>
              <h1 className="mt-1 text-lg font-semibold text-white md:text-xl">
                Clean and Straight Forward Portfolio Guidance
              </h1>
            </div>
          </div>

          <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 lg:flex lg:items-center lg:gap-3">
            <BadgeCheck size={16} className="text-emerald-300" />
            Portfolio planning workspace
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
              QuantShield AI
            </p>

            <h1 className="mt-2 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl xl:text-[4rem] xl:leading-[0.95]">
              Clean and Straight Forward Portfolio Guidance
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
              Check the market. Review the mix. Understand the risk.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/investment"
                className={`primary-cta inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold ${
                  backendStatus === "offline" ? "opacity-50" : ""
                }`}
              >
                {backendStatus === "online"
                  ? "Go to Analysis"
                  : backendStatus === "checking"
                  ? "Checking backend..."
                  : "Proceed anyway"}
                <ChevronRight size={18} />
              </Link>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.title} className="glass-panel rounded-[1.45rem] p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-cyan-400/10 p-2.5 text-cyan-200">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-4.5 text-slate-400">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-card rounded-[2rem] border border-white/10 p-4.5 shadow-2xl shadow-cyan-950/30">
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

            {backendVersion && (
              <p className="mt-2 text-xs text-slate-500">
                Backend v{backendVersion}
              </p>
            )}

            <div className="mt-4 space-y-3">
              {sideNotes.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-[1.45rem] border border-white/10 bg-slate-950/60 p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-cyan-400/10 p-2.5 text-cyan-200">
                        <Icon size={18} />
                      </div>
                      <h2 className="text-[15px] font-semibold text-white">
                        {item.title}
                      </h2>
                    </div>

                    <p className="mt-2 text-sm leading-5 text-slate-300">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-5 text-amber-100">
              Research support, not execution advice.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
