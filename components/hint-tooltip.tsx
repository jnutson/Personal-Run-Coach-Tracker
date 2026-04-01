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
        className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-full text-[9px] font-semibold leading-none text-muted-foreground/60 hover:text-primary border border-muted-foreground/25 hover:border-primary/50 bg-card/60 hover:bg-primary/5 transition-all duration-150 select-none focus:outline-none cursor-default"
        aria-label="More info"
        tabIndex={0}
      >
        i
      </button>
      <span
        className={cn(
          "absolute left-5 top-1/2 -translate-y-1/2 z-50 w-60 rounded-xl border border-border/80 bg-card px-3.5 py-2.5 text-xs text-muted-foreground shadow-[0_4px_20px_hsl(25_50%_15%/0.12)] leading-relaxed whitespace-normal pointer-events-none",
          "transition-all duration-150",
          open ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 pointer-events-none"
        )}
        role="tooltip"
      >
        {/* Wave accent line */}
        <span className="block mb-1.5" aria-hidden="true">
          <svg viewBox="0 0 40 4" className="w-8 h-1 text-driftwood opacity-60">
            <path
              d="M0 2 Q5 0 10 2 Q15 4 20 2 Q25 0 30 2 Q35 4 40 2"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </span>
        {hint}
      </span>
    </span>
  );
}

// Inline cn to avoid circular deps — hint-tooltip has no other imports
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
