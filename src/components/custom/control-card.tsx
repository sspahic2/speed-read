"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ControlCardProps = {
  title: string;
  valueLabel: string;
  tooltip?: string;
  children: React.ReactNode;
};

export function ControlCard({ title, valueLabel, tooltip, children }: ControlCardProps) {
  return (
    <div className="pointer-events-auto rounded-xl border border-border/70 bg-card/90 p-3 shadow-sm backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <span className="flex items-center gap-2">
          {title}
          {tooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="max-w-xs text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </span>
        <span className="text-foreground">{valueLabel}</span>
      </div>
      {children}
    </div>
  );
}
