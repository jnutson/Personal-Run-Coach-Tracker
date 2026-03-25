"use client";

/**
 * MetricHover — wraps an imperial value with a dotted underline and a native
 * browser tooltip showing the metric equivalent on hover.
 *
 * Usage:
 *   <MetricHover metric="14.5 km">9.0 mi</MetricHover>
 *
 * Conversion helpers live in lib/metric-utils.ts (no "use client" boundary)
 * so they can be called from server components too.
 */
export function MetricHover({
  children,
  metric,
}: {
  children: React.ReactNode;
  metric: string;
}) {
  return (
    <span
      title={metric}
      className="cursor-help border-b border-dotted border-current/40 pb-px"
    >
      {children}
    </span>
  );
}

// Re-export for convenience so client components can import everything from one place
export { miToKmLabel, kmToMiLabel, paceToKmLabel } from "@/lib/metric-utils";
