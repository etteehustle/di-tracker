type BadgeProps = {
  label: string;
  tone?: string;
};

export function Badge({ label, tone }: BadgeProps) {
  return <span className={`badge ${tone ?? label.toLowerCase()}`}>{label}</span>;
}
