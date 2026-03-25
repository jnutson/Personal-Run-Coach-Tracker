import { createServiceClient } from "@/lib/supabase";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DietCharts } from "./diet-charts";
import { ManualNutritionForm } from "./manual-nutrition-form";
import { fmt } from "@/lib/utils";
import type { NutritionDaily } from "@/lib/types";
import { subDays, format } from "date-fns";
import { health } from "@/config/user";

export const revalidate = 3600;

const TARGETS = health.micronutrientTargets;

function pct(v: number | null | undefined, target: number): number | null {
  if (!v) return null;
  return Math.round((v / target) * 100);
}

async function getData() {
  const db = createServiceClient();
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const { data, error } = await db
    .from("nutrition_daily")
    .select("*")
    .gte("date", thirtyDaysAgo)
    .order("date", { ascending: true });

  if (error) console.error("Diet fetch error:", error);
  return (data ?? []) as NutritionDaily[];
}

export default async function DietPage() {
  const nutrition = await getData();
  const latest = nutrition[nutrition.length - 1];
  const sevenDay = nutrition.slice(-7);

  const hasData = nutrition.length > 0;
  const avgCals = sevenDay.filter((d) => d.calories).reduce((s, d) => s + (d.calories ?? 0), 0) / (sevenDay.filter((d) => d.calories).length || 1);
  const target = latest?.calorie_target ?? 2800;
  const todayCals = latest?.calories;
  const todayProtein = latest?.protein_g;
  const todayCarbs = latest?.carbs_g;
  const todayFat = latest?.fat_g;
  const totalMacros = (todayProtein ?? 0) + (todayCarbs ?? 0) + (todayFat ?? 0);

  function barColor(p: number | null): string {
    if (!p) return "bg-muted";
    if (p >= 90 && p <= 115) return "bg-green-600";
    if (p >= 70) return "bg-amber-600";
    return "bg-red-600";
  }

  return (
    <div>
      <SectionHeader
        title="Diet"
        subtitle="Cronometer data · nutrition targets"
        action={<ManualNutritionForm />}
      />

      {/* No-data banner — shown when Cronometer hasn't synced yet */}
      {!hasData && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No nutrition data synced yet. Use <strong>Manual entry</strong> above to log today&apos;s food, or run the Cronometer sync script.
        </div>
      )}

      {/* Key stats — always visible */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Calories (today)"
          value={todayCals ? Math.round(todayCals).toLocaleString() : "—"}
          sub={`target: ${target.toLocaleString()}`}
          valueClass={
            todayCals
              ? todayCals >= target * 0.9 && todayCals <= target * 1.1
                ? "text-positive"
                : "text-warning"
              : "text-muted-foreground"
          }
        />
        <StatCard
          title="Calories (7d avg)"
          value={avgCals ? Math.round(avgCals).toLocaleString() : "—"}
          sub="kcal"
        />
        <StatCard
          title="Hydration (today)"
          value={latest?.hydration_oz ? `${latest.hydration_oz} oz` : "—"}
          sub={`target: ${health.hydrationTargetOz}+ oz`}
          valueClass={latest?.hydration_oz && latest.hydration_oz >= health.hydrationTargetOz ? "text-positive" : "text-foreground"}
        />
        <StatCard
          title="Protein (today)"
          value={todayProtein ? `${Math.round(todayProtein)}g` : "—"}
          sub={`target: ${health.proteinTargetG}+ g`}
          valueClass={todayProtein && todayProtein >= health.proteinTargetG ? "text-positive" : "text-foreground"}
        />
      </div>

      {/* Macros breakdown */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Today&apos;s Macros</CardTitle></CardHeader>
        <CardContent>
          {!todayCals ? (
            <p className="text-sm text-muted-foreground">No macro data for today. Log via Manual entry or sync Cronometer.</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Protein", g: todayProtein, color: "text-blue-700", bar: "bg-blue-600" },
                { label: "Carbs",   g: todayCarbs,   color: "text-amber-700", bar: "bg-amber-600" },
                { label: "Fat",     g: todayFat,     color: "text-purple-700", bar: "bg-purple-600" },
              ].map(({ label, g, color, bar }) => {
                const share = totalMacros > 0 && g ? Math.round((g / totalMacros) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-medium ${color}`}>{label}</span>
                      <span className="text-muted-foreground tabular-nums">{g ? `${Math.round(g)}g` : "—"}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${share}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{share}% of macros</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Micronutrients */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Key Micronutrients (today)</CardTitle></CardHeader>
        <CardContent>
          {!latest ? (
            <p className="text-sm text-muted-foreground">No micronutrient data available.</p>
          ) : (
            <div className="space-y-3">
              {(
                [
                  { label: "Iron",       key: "iron_mg",      unit: "mg", target: TARGETS.iron_mg       },
                  { label: "Sodium",     key: "sodium_mg",    unit: "mg", target: TARGETS.sodium_mg     },
                  { label: "Potassium",  key: "potassium_mg", unit: "mg", target: TARGETS.potassium_mg  },
                  { label: "Magnesium",  key: "magnesium_mg", unit: "mg", target: TARGETS.magnesium_mg  },
                  { label: "Vitamin D",  key: "vitamin_d_iu", unit: "IU", target: TARGETS.vitamin_d_iu  },
                  { label: "Calcium",    key: "calcium_mg",   unit: "mg", target: TARGETS.calcium_mg    },
                ] as const
              ).map(({ label, key, unit, target }) => {
                const val = latest[key];
                const p = pct(val, target);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="tabular-nums">
                        {val ? `${fmt(val, 0)} / ${target} ${unit}` : `— / ${target} ${unit}`}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(p)}`}
                        style={{ width: `${Math.min(p ?? 0, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {hasData && <DietCharts nutrition={nutrition} />}
    </div>
  );
}
