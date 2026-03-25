"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import type { TrainingPlan } from "@/lib/types";
import { format } from "date-fns";
import { fmt, KM_TO_MI } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  easy:      "bg-blue-100 text-blue-700",
  tempo:     "bg-amber-100 text-amber-700",
  long:      "bg-purple-100 text-purple-700",
  intervals: "bg-red-100 text-red-700",
  rest:      "bg-gray-100 text-gray-500",
  race:      "bg-green-100 text-green-700",
};

interface Props {
  plan: TrainingPlan[];
}

export function TrainingPlanTable({ plan }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");

  async function saveNotes(id: string) {
    await fetch("/api/training-plan/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes: editNotes }),
    });
    setEditing(null);
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Upcoming Plan (14 days)</CardTitle>
      </CardHeader>
      <CardContent>
        {plan.length === 0 ? (
          <EmptyState message="No upcoming planned workouts." />
        ) : (
          <div className="space-y-0">
            {plan.map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between py-3 border-b border-border last:border-0 gap-4"
              >
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">
                    {format(new Date(p.plan_date + "T12:00:00"), "EEE MMM d")}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium shrink-0 ${TYPE_COLORS[p.workout_type] ?? "bg-secondary text-secondary-foreground"}`}
                  >
                    {p.workout_type}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{p.target_pace_desc}</p>
                    {editing === p.id ? (
                      <div className="mt-2 flex gap-2">
                        <Input
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="h-7 text-xs"
                          placeholder="Notes…"
                        />
                        <Button size="sm" onClick={() => saveNotes(p.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                      </div>
                    ) : (
                      p.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>
                      )
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {p.target_distance_km && (
                    <span
                      className="text-sm text-muted-foreground tabular-nums cursor-default"
                      title={`${fmt(p.target_distance_km, 1)} km`}
                    >
                      {fmt(p.target_distance_km * KM_TO_MI, 1)} mi
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditing(p.id); setEditNotes(p.notes ?? ""); }}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
