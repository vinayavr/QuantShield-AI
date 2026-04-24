"use client";

type BackendStatusProps = {
  state: "checking" | "online" | "offline";
  version?: string;
};

export default function BackendStatus({ state, version }: BackendStatusProps) {
  const tone =
    state === "online"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
      : state === "offline"
      ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
      : "border-amber-400/20 bg-amber-400/10 text-amber-200";

  const label =
    state === "online"
      ? "Backend online"
      : state === "offline"
      ? "Backend unreachable"
      : "Checking backend";

  return (
    <div className={`rounded-full border px-3 py-1 text-sm ${tone}`}>
      {label}
      {version ? ` | v${version}` : ""}
    </div>
  );
}
