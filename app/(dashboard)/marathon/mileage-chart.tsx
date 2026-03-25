"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { planWeeks, PHASE_BAR_COLOR } from "@/data/marathon-plan";

interface Props {
  currentWeek: number;
  selectedWeek?: number;
  onWeekClick?: (wk: number) => void;
}

export function MileageChart({ currentWeek, selectedWeek, onWeekClick }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={planWeeks}
        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
        barCategoryGap="20%"
        style={{ cursor: onWeekClick ? "pointer" : "default" }}
      >
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "hsl(28 18% 48%)" }}
          tickLine={false}
          axisLine={false}
          interval={2}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(28 18% 48%)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const w = payload[0].payload;
            return (
              <div className="rounded border border-border bg-card px-3 py-2 text-xs shadow">
                <p className="font-semibold text-foreground">Wk {w.wk} — {w.date}</p>
                <p className="text-muted-foreground">{w.phase}</p>
                <p className="font-mono font-semibold text-foreground">{w.mi} mi</p>
                {w.tuneUp && <p className="text-amber-700 mt-1">🏁 {w.tuneUp}</p>}
                {w.down && !w.tuneUp && <p className="text-amber-700 mt-1">↓ Down week</p>}
              </div>
            );
          }}
        />
        {currentWeek >= 1 && currentWeek <= 30 && (
          <ReferenceLine
            x={planWeeks[currentWeek - 1]?.date}
            stroke="hsl(25 75% 32%)"
            strokeWidth={2}
            strokeDasharray="4 2"
            label={{ value: "now", position: "top", fontSize: 9, fill: "hsl(25 75% 32%)" }}
          />
        )}
        <Bar
          dataKey="mi"
          radius={[3, 3, 0, 0]}
          onClick={(data) => onWeekClick?.(data.wk)}
        >
          {planWeeks.map((w) => {
            const isCurrent  = w.wk === currentWeek;
            const isSelected = w.wk === selectedWeek;
            const color = PHASE_BAR_COLOR[w.phase];
            return (
              <Cell
                key={w.wk}
                fill={color}
                opacity={isSelected ? 1 : isCurrent ? 0.9 : w.down ? 0.45 : 0.65}
                stroke={isSelected ? "hsl(25 75% 32%)" : "none"}
                strokeWidth={isSelected ? 2 : 0}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
