const RUPEE = "\u20B9";

type Tone = "blue" | "green" | "yellow" | "red" | "indigo";

type MetricCardProps = {
  label: string;
  value: string | number | null | undefined;
  tone?: Tone;
  note?: string;
  type?: "currency" | "percent" | "score" | "text";
};

export default function MetricCard({
  label,
  value,
  tone = "blue",
  note,
  type = "text"
}: MetricCardProps) {
  const isValidNumber =
    typeof value === "number" && Number.isFinite(value);
  const numericString =
    typeof value === "string" ? Number.parseFloat(value.replace("%", "")) : NaN;
  const hasNumericString = Number.isFinite(numericString);

  const formatValue = () => {
    if (value === null || value === undefined) return "--";
    if (type === "currency" && isValidNumber) {
      return `${RUPEE} ${value.toLocaleString("en-IN")}`;
    }
    if (type === "percent" && isValidNumber) return `${value.toFixed(2)}%`;
    if (type === "score" && isValidNumber) return `${value.toFixed(1)} / 10`;
    return String(value);
  };

  const dynamicTone: Tone = (() => {
    const lowerLabel = label.toLowerCase();
if (lowerLabel.includes("risk") && isValidNumber) {
  const num = value as number;

  if (num >= 7) return "red";
  if (num >= 4) return "yellow";
  return "green";
}

    if (lowerLabel.includes("confidence")) {
      if (isValidNumber || hasNumericString) {
        const numericValue = isValidNumber ? (value as number) : numericString;
        if (numericValue >= 75) return "green";
        if (numericValue >= 45) return "yellow";
        return "red";
      }

      const text = String(value).toLowerCase();
      if (text.includes("high")) return "green";
      if (text.includes("medium")) return "yellow";
      if (text.includes("low")) return "red";
    }

    return tone;
  })();

  const tones: Record<Tone, string> = {
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    green: "border-green-500/30 bg-green-500/10 text-green-300",
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    indigo: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
  };

  return (
    <section className={`card-hover rounded-xl border p-5 ${tones[dynamicTone]}`}>
      <p className="text-sm text-gray-400">{label}</p>
      <h2 className="mt-2 break-words text-2xl font-bold">{formatValue()}</h2>
      {note ? <p className="mt-2 text-xs leading-5 text-gray-400">{note}</p> : null}
    </section>
  );
}
