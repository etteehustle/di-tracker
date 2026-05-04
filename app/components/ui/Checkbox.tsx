import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type: _type, ...props }, ref) => (
    <input ref={ref} type="checkbox" className={cn("ui-checkbox", className)} {...props} />
  )
);

Checkbox.displayName = "Checkbox";
