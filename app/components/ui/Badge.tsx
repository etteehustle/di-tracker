import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva("ui-badge", {
  variants: {
    tone: {
      neutral: "ui-badge-neutral",
      buy_low: "ui-badge-success",
      sell_high: "ui-badge-warning",
      active: "ui-badge-info",
      settled_hit: "ui-badge-success",
      settled_not_hit: "ui-badge-accent",
      deleted: "ui-badge-destructive",
      merged: "ui-badge-destructive"
    }
  },
  defaultVariants: {
    tone: "neutral"
  }
});

const badgeTones = new Set(["neutral", "buy_low", "sell_high", "active", "settled_hit", "settled_not_hit", "deleted", "merged"]);

type BadgeProps = {
  label: string;
  tone?: VariantProps<typeof badgeVariants>["tone"] | string;
  className?: string;
};

function getBadgeTone(tone: BadgeProps["tone"], label: string): VariantProps<typeof badgeVariants>["tone"] {
  const normalizedTone = String(tone ?? label.toLowerCase()) as VariantProps<typeof badgeVariants>["tone"];
  return badgeTones.has(String(normalizedTone)) ? normalizedTone : "neutral";
}

export function Badge({ label, tone, className }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone: getBadgeTone(tone, label), className }))}>{label}</span>;
}
