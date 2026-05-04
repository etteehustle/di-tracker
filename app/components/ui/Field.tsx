import type { HTMLAttributes, LabelHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const FieldGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-field-group", className)} {...props} />
));

FieldGroup.displayName = "FieldGroup";

export const Field = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-field", className)} {...props} />
));

Field.displayName = "Field";

export const FieldLabel = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => <label ref={ref} className={cn("ui-field-label", className)} {...props} />
);

FieldLabel.displayName = "FieldLabel";
