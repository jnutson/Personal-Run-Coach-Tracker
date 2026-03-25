"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricHover, miToKmLabel } from "@/components/metric-hover";
import {
  planWeeks,
  keySession,
  INJURY_WATCH_WEEKS,
  PHASE_BADGE,
  injuryProtocols,
} from "@/data/marathon-plan";

interface Props {
  currentWeek: number;
  actualMiByWeek: Record<number, number>;
}

export function PlanTable({ currentWeek, actualMiByWeek }: Props) {
  const [injuryOpen, setInjuryOpen] = useState(false);
  const [injuryTab, setInjuryTab] = useState<"daily" | "postRun" | "weeklyStrength">("daily");

  const tabs: { id: typeof injuryTab; label: string }[] = [
    { id: "daily",          label: "Daily" },
    { id: "postRun",        label: "Post-run" },
    { id: "weeklyStrength", label: "Weekly strength" },
  ];

  const tabContent = injuryProtocols[injuryTab];

  return (
    <div className="space-y-6">
      {/* Full plan table */}
      <Card>
        <CardHeader>
          <CardTitle>Full 30-Week Plan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2">Wk</th>
                  <th className="text-left font-medium px-4 py-2">Date</th>
                  <th className="text-right font-medium px-4 py-2">Planned</th>
                  <th className="text-right font-medium px-4 py-2">Actual</th>
                  <th className="text-left font-medium px-4 py-2">Phase</th>
                  <th className="text-left font-medium px-4 py-2">Key session</th>
                  <th className="text-left font-medium px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {planWeeks.map((w) => {
                  const isCurrent = w.wk === currentWeek;
                  const isPast    = w.wk < currentWeek;
                  const isWatch   = INJURY_WATCH_WEEKS.has(w.wk);
                  const session   = keySession[w.wk];
                  const actualMi  = actualMiByWeek[w.wk];
                  const hasActual = actualMi !== undefined && actualMi > 0;

                  // Color-code actual vs planned (brown gradient — no jarring red/green)
                  const actualColor = hasActual && w.mi > 0
                    ? actualMi >= w.mi * 0.9
                      ? "text-positive"
                      : actualMi >= w.mi * 0.7
                      ? "text-warning"
                      : "text-negative"
                    : "text-muted-foreground";

                  return (
                    <tr
                      key={w.wk}
                      className={[
                        "border-b border-border last:border-0",
                        isCurrent
                          ? "bg-primary/5 border-l-2 border-l-primary"
                          : w.down
                          ? "bg-amber-50"
                          : "",
                        isPast && !isCurrent ? "opacity-60" : "",
                        w.tuneUp ? "ring-1 ring-inset ring-green-300" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <td className="px-4 py-2.5 tabular-nums font-mono text-xs text-muted-foreground">
                        {w.wk}
                        {isWatch && (
                          <span className="ml-1 text-amber-600" title="Injury watch week">⚠</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{w.date}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-mono font-semibold">
                        {w.mi > 0 ? (
                          <MetricHover metric={miToKmLabel(w.mi)}>{w.mi}</MetricHover>
                        ) : "—"}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-mono font-semibold ${actualColor}`}>
                        {hasActual ? (
                          <MetricHover metric={miToKmLabel(actualMi)}>{actualMi.toFixed(1)}</MetricHover>
                        ) : isPast && w.mi > 0 ? (
                          <span className="text-muted-foreground/50">—</span>
                        ) : (
                          <span className="text-muted-foreground/30">·</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${PHASE_BADGE[w.phase]}`}>
                          {w.phase}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {session ? (
                          <span className="font-medium">{session.title}</span>
                        ) : w.phase === "Race" ? (
                          <span className="font-semibold text-green-700">Race day 🏁</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs">
                        {w.tuneUp && (
                          <span className="text-green-700 font-medium">🏁 {w.tuneUp}</span>
                        )}
                        {w.down && !w.tuneUp && (
                          <span className="text-amber-700">↓ Down week</span>
                        )}
                        {session && (
                          <span className="block text-muted-foreground/80">{session.detail}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Injury prevention — collapsible */}
      <Card>
        <button
          className="flex w-full items-center justify-between px-6 py-4 text-left"
          onClick={() => setInjuryOpen((o) => !o)}
        >
          <CardTitle className="text-base">Injury Prevention Protocols</CardTitle>
          <span className="text-muted-foreground text-sm">{injuryOpen ? "▲ hide" : "▼ show"}</span>
        </button>

        {injuryOpen && (
          <CardContent>
            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-border">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setInjuryTab(t.id)}
                  className={[
                    "px-4 py-2 text-sm transition-colors border-b-2 -mb-px",
                    injuryTab === t.id
                      ? "border-primary text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <ul className="space-y-2">
              {tabContent.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
