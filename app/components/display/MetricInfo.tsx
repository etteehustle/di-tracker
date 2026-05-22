"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type MetricInfoProps = {
  label: string;
  description?: string;
};

export function MetricInfo({ label, description }: MetricInfoProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="metric-heading">
      <span>{label}</span>
      {description && (
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <Button
              className="metric-info-button"
              variant="ghost"
              size="icon"
              aria-label={`Explain ${label}`}
              aria-expanded={open}
              onClick={(event) => {
                event.preventDefault();
                setOpen((current) => !current);
              }}
              onBlur={() => setOpen(false)}
            >
              <Info data-icon="inline-start" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" align="end">
            {description}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
