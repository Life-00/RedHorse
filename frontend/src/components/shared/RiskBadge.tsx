type Level = "low" | "medium" | "high";

export default function RiskBadge({ level }: { level: Level }) {
  const styles: Record<Level, string> = {
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-rose-100 text-rose-700",
  };
  const labels: Record<Level, string> = { low: "안전", medium: "주의", high: "위험" };

  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}
