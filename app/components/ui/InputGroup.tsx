import type { HTMLAttributes, InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const InputGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-input-group", className)} {...props} />
));

InputGroup.displayName = "InputGroup";

export const InputGroupInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn("ui-input-group-input", className)} {...props} />
);

InputGroupInput.displayName = "InputGroupInput";

export const InputGroupAddon = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-input-group-addon", className)} {...props} />
));

InputGroupAddon.displayName = "InputGroupAddon";
