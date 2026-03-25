"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DailyCheckin } from "@/lib/types";
import { format } from "date-fns";

export function JournalLog({ checkins }: { checkins: DailyCheckin[] }) {
  const [query, setQuery] = useState("");

  const withJournal = checkins.filter((c) => c.journal && c.journal.trim().length > 0);
  const filtered = query
    ? withJournal.filter((c) => c.journal!.toLowerCase().includes(query.toLowerCase()))
    : withJournal;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>Journal Entries</CardTitle>
        <Input
          placeholder="Search journal…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-48 h-7 text-xs"
        />
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {query ? "No entries match your search." : "No journal entries yet."}
          </p>
        ) : (
          <div className="space-y-4">
            {filtered.slice(0, 20).map((c) => (
              <div key={c.id} className="border-b border-border pb-4 last:border-0">
                <p className="text-xs text-muted-foreground mb-1">
                  {format(new Date(c.date + "T12:00:00"), "EEEE, MMM d, yyyy")}
                </p>
                <p className="text-sm text-foreground leading-relaxed">{c.journal}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
