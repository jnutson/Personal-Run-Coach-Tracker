import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HintTooltip } from "@/components/hint-tooltip";

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
  /** Short plain-English definition shown in a styled tooltip on the i icon. */
  hint?: string;
}

export function StatCard({ title, value, sub, valueClass, hint }: StatCardProps) {
  return (
    <Card className="card-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          {title}
          {hint && <HintTooltip hint={hint} />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-semibold tabular-nums", valueClass ?? "text-foreground")}>
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
