"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ManualNutritionForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    calories: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
    hydration_oz: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/nutrition/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        calories:     form.calories     ? Number(form.calories)     : null,
        protein_g:    form.protein_g    ? Number(form.protein_g)    : null,
        carbs_g:      form.carbs_g      ? Number(form.carbs_g)      : null,
        fat_g:        form.fat_g        ? Number(form.fat_g)        : null,
        hydration_oz: form.hydration_oz ? Number(form.hydration_oz) : null,
      }),
    });
    setSaving(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Manual entry
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3">
      <label className="text-xs text-muted-foreground">
        Date
        <Input className="mt-1 w-32" type="date" value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </label>
      {(["calories", "protein_g", "carbs_g", "fat_g", "hydration_oz"] as const).map((k) => (
        <label key={k} className="text-xs text-muted-foreground capitalize">
          {k.replace("_g", " (g)").replace("_oz", " (oz)")}
          <Input className="mt-1 w-20" type="number" value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        </label>
      ))}
      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
