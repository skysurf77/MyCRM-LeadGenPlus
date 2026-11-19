"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function RangeFilter({
  label,
  min,
  max,
  step = 1,
  placeholderMin = "min",
  placeholderMax = "max",
  onChange,
}: {
  label: string;
  min: number | null;
  max: number | null;
  step?: number;
  placeholderMin?: string;
  placeholderMax?: string;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = min !== null || max !== null;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function parse(v: string): number | null {
    if (v.trim() === "") return null;
    const n = Number(v.replace(",", "."));
    return Number.isNaN(n) ? null : n;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted",
          active && "border-brand/40 bg-brand-soft text-brand"
        )}
      >
        {label}
        {active && (
          <span className="text-xs tabular-nums">
            {min ?? "…"}–{max ?? "…"}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-56 animate-fade-in rounded-lg border bg-background p-3 shadow-card">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={step}
              value={min ?? ""}
              placeholder={placeholderMin}
              onChange={(e) => onChange(parse(e.target.value), max)}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="number"
              step={step}
              value={max ?? ""}
              placeholder={placeholderMax}
              onChange={(e) => onChange(min, parse(e.target.value))}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}
    </div>
  );
}
