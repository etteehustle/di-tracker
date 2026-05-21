import { Card } from "@/components/ui/card";
import { MetricInfo } from "./MetricInfo";

type MetricCardProps = {
  label: string;
  value: string;
  tone?: "neutral" | "green" | "red" | "blue";
  description?: string;
  className?: string;
};

export function MetricCard({ label, value, tone = "neutral", description, className = "" }: MetricCardProps) {
  return (
    <Card className={`metric-card ${tone} ${className}`.trim()}>
      <MetricInfo label={label} description={description} />
      <strong>{value}</strong>
    </Card>
  );
}
