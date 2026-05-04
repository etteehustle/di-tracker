"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "../../lib/utils";

export function Calendar({ className, showOutsideDays = true, navLayout = "around", ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout={navLayout}
      className={cn("ui-calendar", className)}
      components={{
        Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />
      }}
      {...props}
    />
  );
}
