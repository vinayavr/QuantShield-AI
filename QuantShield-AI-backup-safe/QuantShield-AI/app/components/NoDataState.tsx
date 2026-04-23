"use client";

import Link from "next/link";

type NoDataStateProps = {
  title: string;
  description: string;
};

export default function NoDataState({ title, description }: NoDataStateProps) {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-5 py-8 text-white">
      <section className="section-surface mx-auto w-full max-w-2xl rounded-[2rem] p-8 text-center">
        
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80">
          QuantShield AI
        </p>

        <h1 className="mt-4 text-3xl font-semibold">
          {title || "No data available"}
        </h1>

        <p className="mt-4 text-base leading-7 text-slate-300">
          {description || "Run an analysis to view results."}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/investment"
            className="primary-cta rounded-full px-6 py-3 font-semibold"
          >
            Start an analysis
          </Link>

          <Link
            href="/login"
            className="secondary-cta rounded-full px-6 py-3 font-semibold"
          >
            Back to workspace
          </Link>
        </div>
      </section>
    </main>
  );
}