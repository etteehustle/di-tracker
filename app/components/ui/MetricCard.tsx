type MetricCardProps = {
  label: string;
  value: string;
  tone?: "neutral" | "green" | "red" | "blue";
  className?: string;
};

export function MetricCard({ label, value, tone = "neutral", className = "" }: MetricCardProps) {
  return (
    <article className={`metric-card ${tone} ${className}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
