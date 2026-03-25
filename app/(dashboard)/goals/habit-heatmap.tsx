"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyCheckin } from "@/lib/types";
import { format, subDays, eachDayOfInterval } from "date-fns";

const HABITS = ["exercise", "meditate", "stretch"] as const;

export function HabitHeatmap({ checkins }: { checkins: DailyCheckin[] }) {
  // Build lookup: date string → checkin
  const byDate: Record<string, DailyCheckin> = {};
  checkins.forEach((c) => { byDate[c.date] = c; });

  // Last 90 days
  const today = new Date();
  const start = subDays(today, 89);
  const days = eachDayOfInterval({ start, end: today });

  // Group into weeks (columns)
  const weeks: Date[][] = [];
  let week: Date[] = [];
  days.forEach((d, i) => {
    if (d.getDay() === 1 && i > 0) { weeks.push(week); week = []; } // new week on Monday
    week.push(d);
  });
  if (week.length) weeks.push(week);

  function cellColor(habit: typeof HABITS[number], date: Date): string {
    const key = format(date, "yyyy-MM-dd");
    const c = byDate[key];
    if (!c) return "bg-muted/40";
    const done = c[habit];
    if (done === null || done === undefined) return "bg-muted/40";
    return done ? "bg-green-500/80" : "bg-red-500/30";
  }

  return (
    <Card className="mb-6 overflow-x-auto">
      <CardHeader><CardTitle>Habit Grid (90 days)</CardTitle></CardHeader>
      <CardContent>
        {HABITS.map((habit) => (
          <div key={habit} className="mb-4">
            <p className="text-xs text-muted-foreground capitalize mb-1.5">{habit}</p>
            <div className="flex gap-0.5">
              {weeks.map((wk, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {wk.map((d) => (
                    <div
                      key={d.toISOString()}
                      title={`${format(d, "MMM d")} — ${habit}`}
                      className={`w-3 h-3 rounded-sm ${cellColor(habit, d)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500/80 inline-block" /> Done</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500/30 inline-block" /> Skipped</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-muted/40 inline-block" /> No data</span>
        </div>
      </CardContent>
    </Card>
  );
}
