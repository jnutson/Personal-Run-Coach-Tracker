import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "positive" | "warning" | "negative" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default"   && "bg-secondary text-secondary-foreground",
        variant === "positive"  && "bg-green-500/10 text-green-400",
        variant === "warning"   && "bg-amber-500/10 text-amber-400",
        variant === "negative"  && "bg-red-500/10 text-red-400",
        variant === "outline"   && "border border-border text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
