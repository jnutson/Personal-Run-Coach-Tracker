"use client";

import { useState } from "react";

interface HintTooltipProps {
  hint: string;
}

export function HintTooltip({ hint }: HintTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-full text-[9px] font-medium leading-none text-muted-foreground/50 hover:text-muted-foreground border border-muted-foreground/25 hover:border-muted-foreground/60 transition-colors select-none focus:outline-none cursor-default"
        aria-label="More info"
        tabIndex={0}
      >
        i
      </button>
      {open && (
        <span className="absolute left-5 top-1/2 -translate-y-1/2 z-50 w-56 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-lg leading-relaxed whitespace-normal pointer-events-none">
          {hint}
        </span>
      )}
    </span>
  );
}
