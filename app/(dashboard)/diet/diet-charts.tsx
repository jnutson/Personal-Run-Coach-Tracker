"use client";

import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NutritionDaily } from "@/lib/types";
import { format } from "date-fns";

const TS = {
  backgroundColor: "#111",
  border: "1px solid #222",
  borderRadius: 6,
  fontSize: 12,
  color: "#ededed",
};

export function DietCharts({ nutrition }: { nutrition: NutritionDaily[] }) {
  const data = nutrition.map((d) => ({
    date:     format(new Date(d.date + "T12:00:00"), "MMM d"),
    calories: d.calories,
    target:   d.calorie_target ?? 2800,
    protein:  d.protein_g,
    carbs:    d.carbs_g,
    fat:      d.fat_g,
    hydration: d.hydration_oz,
  }));

  const avgTarget = nutrition[0]?.calorie_target ?? 2800;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Calorie trend */}
      <Card>
        <CardHeader><CardTitle>Calorie Trend (30d)</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={38}
                tickFormatter={(v) => `${Math.round(v / 1000 * 10) / 10}k`} />
              <Tooltip contentStyle={TS} formatter={(v: number) => [v?.toLocaleString(), "kcal"]} />
              <ReferenceLine y={avgTarget} stroke="#f59e0b" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="calories" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Calories" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Macros stacked bar */}
      <Card>
        <CardHeader><CardTitle>Macros Breakdown (30d)</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={TS} formatter={(v: number) => [`${Math.round(v)}g`]} />
              <Bar dataKey="protein" stackId="a" fill="#3b82f6" name="Protein" />
              <Bar dataKey="carbs"   stackId="a" fill="#f59e0b" name="Carbs"   />
              <Bar dataKey="fat"     stackId="a" fill="#a855f7" name="Fat" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hydration */}
      <Card>
        <CardHeader><CardTitle>Hydration — oz/day (30d)</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} tickLine={false} axisLine={false} width={28} domain={[0, "auto"]} />
              <Tooltip contentStyle={TS} formatter={(v: number) => [`${v} oz`, "Hydration"]} />
              <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 4" />
              <Bar dataKey="hydration" fill="#22c55e" radius={[2, 2, 0, 0]} name="Hydration (oz)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
