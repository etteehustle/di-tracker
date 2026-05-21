import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type MetricInfoProps = {
  label: string;
  description?: string;
};

export function MetricInfo({ label, description }: MetricInfoProps) {
  return (
    <div className="metric-heading">
      <span>{label}</span>
      {description && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button className="metric-info-button" variant="ghost" size="icon" aria-label={`Explain ${label}`}>
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
