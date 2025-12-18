"use client";

import { Label } from "@/components/ui/label";

type ControlBlockProps = {
  id: string;
  label: string;
  valueLabel: string;
  children: React.ReactNode;
};

export function ControlBlock({ id, label, valueLabel, children }: ControlBlockProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-foreground">{valueLabel}</span>
      </div>
      {children}
    </div>
  );
}
