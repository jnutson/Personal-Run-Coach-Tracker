"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GarminDaily, GarminActivity } from "@/lib/types";
import { format, startOfWeek } from "date-fns";
import { fmt, KM_TO_MI } from "@/lib/utils";

const TOOLTIP_STYLE = {
  backgroundColor: "#111",
  border: "1px solid #222",
  borderRadius: 6,
  fontSize: 12,
  color: "#ededed",
};

interface Props {
  daily: GarminDaily[];
  activities: GarminActivity[];
}

export function TrainingCharts({ daily, activities }: Props) {
  const chartData = daily.map((d) => ({
    date: format(new Date(d.date + "T12:00:00"), "MMM d"),
    hrv: d.hrv,
    rhr: d.resting_hr,
    vo2max: d.vo2max,
    load: d.training_load,
  }));

  // Weekly mileage grouped by Mon–Sun week
  const weeklyMapRaw: Record<string, { label: string; mi: number }> = {};
  activities
    .filter((a) => a.activity_type === "run" || a.activity_type === "running")
    .forEach((a) => {
      const wkStart = startOfWeek(new Date(a.activity_date + "T12:00:00"), { weekStartsOn: 1 });
      const key   = format(wkStart, "yyyy-MM-dd");
      const label = format(wkStart, "MMM d");
      if (!weeklyMapRaw[key]) weeklyMapRaw[key] = { label, mi: 0 };
      weeklyMapRaw[key].mi += (a.distance_km ?? 0) * KM_TO_MI;
    });
  const weeklyMiles = Object.entries(weeklyMapRaw)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { label, mi }]) => ({ week: label, mi: Math.round(mi * 10) / 10 }));

  // Pace by run type
  const paceByType: Record<string, { count: number; total: number }> = {};
  activities
    .filter((a) => (a.activity_type === "run" || a.activity_type === "running") && a.avg_pace_sec_km)
    .forEach((a) => {
      const name = a.name?.toLowerCase() ?? "easy";
      let type = "easy";
      if (name.includes("tempo")) type = "tempo";
      else if (name.includes("long")) type = "long";
      else if (name.includes("interval") || name.includes("workout")) type = "intervals";
      const bucket = paceByType[type] ?? { count: 0, total: 0 };
      bucket.count++;
      bucket.total += a.avg_pace_sec_km ?? 0;
      paceByType[type] = bucket;
    });

  const paceData = Object.entries(paceByType).map(([type, { count, total }]) => ({
    type,
    pace: Math.round(total / count),
    paceStr: `${Math.floor(total / count / 60)}:${String(Math.round((total / count) % 60)).padStart(2, "0")}`,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* HRV Trend */}
      <Card>
        <CardHeader>
          <CardTitle>HRV Trend (30d)</CardTitle>
        </CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="hrv" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="HRV (ms)" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* VO2 Max */}
      <Card>
        <CardHeader>
          <CardTitle>VO₂ Max Trend (30d)</CardTitle>
        </CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={30} domain={["auto", "auto"]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="vo2max" stroke="#22c55e" dot={false} strokeWidth={1.5} name="VO₂ Max" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Training Load */}
      <Card>
        <CardHeader>
          <CardTitle>Training Load (30d)</CardTitle>
        </CardHeader>
        <CardContent className="h-48">
          {chartData.every((d) => d.load == null) ? (
            <p className="text-sm text-muted-foreground pt-8 text-center">No training load data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="load" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="Training Load" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Weekly mileage */}
      <Card>
        <CardHeader><CardTitle>Weekly Run Miles (Mon–Sun)</CardTitle></CardHeader>
        <CardContent className="h-48">
          {weeklyMiles.length === 0 ? (
            <p className="text-sm text-muted-foreground pt-8 text-center">No run data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyMiles}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={32}
                  tickFormatter={(v) => `${v}mi`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} mi`, "Miles"]} />
                <Bar dataKey="mi" fill="hsl(25 75% 32%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Avg pace by run type */}
      <Card>
        <CardHeader>
          <CardTitle>Avg Pace by Run Type (30d)</CardTitle>
        </CardHeader>
        <CardContent className="h-48">
          {paceData.length === 0 ? (
            <p className="text-sm text-muted-foreground pt-8 text-center">No run data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}`} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: "#999" }} tickLine={false} axisLine={false} width={60} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [`${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")} /km`, "Avg pace"]}
                />
                <Bar dataKey="pace" fill="#3b82f6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
