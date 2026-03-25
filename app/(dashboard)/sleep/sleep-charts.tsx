"use client";

import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GarminDaily } from "@/lib/types";
import { format } from "date-fns";

const TS = {
  backgroundColor: "#111",
  border: "1px solid #222",
  borderRadius: 6,
  fontSize: 12,
  color: "#ededed",
};

interface Props {
  daily: GarminDaily[];
}

export function SleepCharts({ daily }: Props) {
  const data = daily.map((d) => ({
    date: format(new Date(d.date + "T12:00:00"), "MMM d"),
    sleep: d.sleep_duration,
    sleepScore: d.sleep_score,
    bbStart: d.body_battery_start,
    bbEnd: d.body_battery_end,
    steps: d.steps,
    rhr: d.resting_hr,
    hrv: d.hrv,
    wearHours: d.wear_hours,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Sleep duration */}
      <Card>
        <CardHeader><CardTitle>Sleep Duration (30d)</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={28} domain={[0, 10]}
                tickFormatter={(v) => `${v}h`} />
              <Tooltip contentStyle={TS} formatter={(v: number) => [`${Math.floor(v)}h ${Math.round((v % 1) * 60)}m`, "Sleep"]} />
              <Bar dataKey="sleep" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sleep score */}
      <Card>
        <CardHeader><CardTitle>Sleep Score (30d)</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={28} domain={[0, 100]} />
              <Tooltip contentStyle={TS} />
              <Line type="monotone" dataKey="sleepScore" stroke="#22c55e" dot={false} strokeWidth={1.5} name="Score" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Body Battery */}
      <Card>
        <CardHeader><CardTitle>Body Battery (30d)</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={28} domain={[0, 100]} />
              <Tooltip contentStyle={TS} />
              <Line type="monotone" dataKey="bbStart" stroke="#22c55e" dot={false} strokeWidth={1.5} name="Start of day" connectNulls />
              <Line type="monotone" dataKey="bbEnd" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="End of day" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader><CardTitle>Daily Steps (30d)</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={38}
                tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
              <Tooltip contentStyle={TS} formatter={(v: number) => [v.toLocaleString(), "Steps"]} />
              <Bar dataKey="steps" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* RHR + HRV */}
      <Card>
        <CardHeader><CardTitle>Resting HR (30d)</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={30} domain={["auto", "auto"]} />
              <Tooltip contentStyle={TS} formatter={(v: number) => [`${v} bpm`, "RHR"]} />
              <Line type="monotone" dataKey="rhr" stroke="#ef4444" dot={false} strokeWidth={1.5} name="RHR" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Watch wear hours */}
      <Card>
        <CardHeader><CardTitle>Watch Wear Hours (30d)</CardTitle></CardHeader>
        <CardContent className="h-48">
          {data.every((d) => d.wearHours == null) ? (
            <p className="text-sm text-muted-foreground pt-8 text-center">
              No wear data yet — syncs after next Garmin run.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={30} domain={[0, 24]}
                  tickFormatter={(v) => `${v}h`} />
                <Tooltip contentStyle={TS} formatter={(v: number) => [`${v}h`, "Wear time"]} />
                <Line type="monotone" dataKey="wearHours" stroke="#a78bfa" dot={false} strokeWidth={1.5} name="Wear hours" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
