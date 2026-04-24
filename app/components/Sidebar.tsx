"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Brain, LayoutDashboard, LogOut } from "lucide-react";

type SidebarProps = {
  active?: "/dashboard" | "/explanation" | "/scenario";
};

export default function Sidebar({ active }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    {
      label: "Dashboard",
      href: "/dashboard" as const,
      icon: LayoutDashboard,
      desc: "Overview & insights",
    },
    {
      label: "Explainability",
      href: "/explanation" as const,
      icon: Brain,
      desc: "Model reasoning",
    },
    {
      label: "Scenario",
      href: "/scenario" as const,
      icon: BarChart3,
      desc: "Simulation & regret",
    },
  ];

  const handleLogout = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("investmentData");
    } catch (e) {
      console.warn("Logout cleanup failed", e);
    }

    router.replace("/login");
  };

  return (
    <aside className="section-surface w-full border-b px-5 py-4 md:min-h-screen md:w-72 md:border-b-0 md:border-r md:px-6 md:py-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">QuantShield AI</h2>
        <p className="mt-1 text-sm text-slate-400">
          Portfolio intelligence workspace
        </p>
      </div>

      <div className="mt-6 rounded-[1.75rem] border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm leading-6 text-slate-200 md:mt-8">
        Review allocations with context, not just return numbers.
      </div>

      <nav className="mt-6 flex gap-3 overflow-x-auto text-sm md:mt-10 md:block md:space-y-3">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = active === link.href || pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 ${
                isActive
                  ? "border-cyan-400/20 bg-cyan-500/15 text-white shadow-md shadow-cyan-950/20"
                  : "border-transparent text-slate-400 hover:border-white/8 hover:bg-slate-900/60 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                className={
                  isActive
                    ? "shrink-0 text-cyan-100"
                    : "shrink-0 text-slate-500 group-hover:text-white"
                }
              />

              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold">{link.label}</span>
                <span className="text-xs text-slate-500 group-hover:text-slate-300">
                  {link.desc}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300 hover:border-cyan-400/30 hover:text-white md:mt-10"
      >
        <LogOut size={16} />
        End local session
      </button>
    </aside>
  );
}
