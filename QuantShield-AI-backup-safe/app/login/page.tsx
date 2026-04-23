"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
};

function getNextRoute(nextValue: string | null) {
  if (nextValue === "/dashboard") return "/dashboard";
  if (nextValue === "/explanation") return "/explanation";
  if (nextValue === "/scenario") return "/scenario";
  return "/investment";
}

export default function Login() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // ✅ AUTO REDIRECT IF ALREADY LOGGED IN
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name && parsed?.email) {
          router.push("/investment");
        }
      }
    } catch {
      localStorage.removeItem("user");
    }
  }, [router]);

  const handleStart = () => {
    const nextErrors: FormErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      nextErrors.name = "Enter the reviewer or analyst name.";
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValid.test(trimmedEmail)) {
      nextErrors.email = "Use a valid work email address.";
    }

    if (accessCode.length < 8) {
      nextErrors.password =
        "Use at least 8 characters for the local workspace access code.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);

    try {
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          created_at: new Date().toISOString(),
        })
      );

      const nextValue = new URLSearchParams(window.location.search).get("next");
      router.push(getNextRoute(nextValue));
    } catch (error) {
      console.error(error);
      setErrors({
        password: "Session setup failed. Please retry.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED ENTER KEY (PREVENT DOUBLE TRIGGER)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleStart();
    }
  };

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-5 py-8 text-white">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-2xl shadow-slate-950/40 lg:grid-cols-[0.95fr_1.05fr]">

        {/* LEFT PANEL */}
        <div className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r lg:p-10">
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
            Login / Sign Up
          </span>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight">
            Sign in to QuantShield AI.
          </h1>

          <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">
            Use a simple local sign-in to access the portfolio analysis flow and test the
            application experience.
          </p>

          <div className="mt-8 space-y-4">
            <div className="section-surface rounded-3xl p-5">
              <p className="text-sm font-semibold text-white">Why this matters</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Clear identity and review context improves trust in financial tools.
              </p>
            </div>

            <div className="section-surface rounded-3xl p-5">
              <p className="text-sm font-semibold text-white">Current mode</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Demo login only. No server authentication.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="p-8 lg:p-10">

          {/* ICON CARDS */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="section-surface rounded-3xl p-4">
              <ShieldCheck size={18} className="text-emerald-300" />
              <p className="mt-3 text-sm font-medium">Transparent onboarding</p>
            </div>

            <div className="section-surface rounded-3xl p-4">
              <LockKeyhole size={18} className="text-cyan-300" />
              <p className="mt-3 text-sm font-medium">Local session only</p>
            </div>

            <div className="section-surface rounded-3xl p-4">
              <UserRound size={18} className="text-amber-300" />
              <p className="mt-3 text-sm font-medium">Reviewer identity retained</p>
            </div>
          </div>

          {/* FORM */}
          <div className="mt-8 space-y-5" onKeyDown={handleKeyDown}>

            <label className="block">
              <span className="text-sm text-slate-300">Reviewer name</span>
              <input
                type="text"
                placeholder="Aarav Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3"
              />
              {errors.name && <p className="mt-2 text-sm text-rose-300">{errors.name}</p>}
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Work email</span>
              <input
                type="email"
                placeholder="analyst@quantshield.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3"
              />
              {errors.email && <p className="mt-2 text-sm text-rose-300">{errors.email}</p>}
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Workspace access code</span>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3"
              />

              {errors.password ? (
                <p className="mt-2 text-sm text-rose-300">{errors.password}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Local-only session. No password stored on server.
                </p>
              )}
            </label>
          </div>

          {/* BUTTON */}
          <button
            onClick={handleStart}
            disabled={loading}
            className="primary-cta mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-base font-semibold"
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </div>
      </section>
    </main>
  );
}