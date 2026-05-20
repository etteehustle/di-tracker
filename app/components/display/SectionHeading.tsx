import type { ReactNode } from "react";

type SectionHeadingProps = {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
};

export function SectionHeading({ title, meta, action }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {action ?? (meta ? <span>{meta}</span> : null)}
    </div>
  );
}
