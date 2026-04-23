"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser } from "../utils/utils";

type SessionGuardProps = {
  children: React.ReactNode;
};

export default function SessionGuard({ children }: SessionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const user = getStoredUser();

      if (!user) {
        router.replace(
          `/login?next=${encodeURIComponent(pathname || "/investment")}`
        );
        return;
      }

      setChecked(true);
    } catch (err) {
      console.warn("Session check failed:", err);

      // fallback safety
      router.replace("/login");
    }
  }, [pathname, router]);

  // ✅ prevents flicker / blank render
  if (!checked) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-5 py-8 text-white">
        <section className="section-surface rounded-[2rem] px-8 py-6 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80">
            QuantShield AI
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            Checking local session
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Redirecting to the workspace entry screen if needed.
          </p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}