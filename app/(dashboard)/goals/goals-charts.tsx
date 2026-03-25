"use client";

import {
  LineChart, Line,
  XAxis, YAxis,
  Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyCheckin } from "@/lib/types";
import { format } from "date-fns";

const TS = {
  backgroundColor: "#111",
  border: "1px solid #222",
  borderRadius: 6,
  fontSize: 12,
  color: "#ededed",
};

export function GoalsCharts({ checkins }: { checkins: DailyCheckin[] }) {
  const data = [...checkins]
    .reverse()
    .slice(-30)
    .map((d) => ({
      date:   format(new Date(d.date + "T12:00:00"), "MMM d"),
      energy: d.energy,
      mood:   d.mood,
      mh:     d.mental_health,
    }));

  return (
    <Card className="mb-6">
      <CardHeader><CardTitle>Survey Scores Trend (30d)</CardTitle></CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
            <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={20} domain={[1, 10]} />
            <Tooltip contentStyle={TS} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="energy" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Energy" connectNulls />
            <Line type="monotone" dataKey="mood"   stroke="#22c55e" dot={false} strokeWidth={1.5} name="Mood"   connectNulls />
            <Line type="monotone" dataKey="mh"     stroke="#f59e0b" dot={false} strokeWidth={1.5} name="Mental Health" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
