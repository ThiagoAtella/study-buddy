import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarView() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => (await supabase.from("study_logs").select("*, subject:subjects(*)").order("studied_at")).data ?? [],
  });

  const byDay = useMemo(() => {
    const map: Record<string, { minutes: number; items: any[] }> = {};
    for (const l of logs) {
      const key = ymd(new Date(l.studied_at as string));
      if (!map[key]) map[key] = { minutes: 0, items: [] };
      map[key].minutes += l.duration_minutes || 0;
      map[key].items.push(l);
    }
    return map;
  }, [logs]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = ymd(new Date());
  const monthTotal = Object.entries(byDay)
    .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .reduce((acc, [, v]) => acc + v.minutes, 0);
  const monthDays = Object.keys(byDay).filter((k) => k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl">{MONTHS[month]} <span className="text-muted-foreground">{year}</span></h3>
          <p className="text-sm text-muted-foreground mt-1">
            {monthDays} {monthDays === 1 ? "dia estudado" : "dias estudados"} · {Math.round(monthTotal / 60 * 10) / 10}h no mês
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs uppercase tracking-widest text-muted-foreground">
        {DAYS_SHORT.map((d, i) => <div key={i} className="px-2 py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />;
          const key = ymd(d);
          const entry = byDay[key];
          const isToday = key === todayKey;
          const intensity = entry ? Math.min(1, entry.minutes / 120) : 0;
          return (
            <div
              key={i}
              className={`aspect-square border p-2 flex flex-col justify-between transition-colors ${isToday ? "border-foreground" : "border-border"}`}
              style={entry ? { backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(intensity * 35)}%, var(--card))` } : { backgroundColor: "var(--card)" }}
              title={entry ? `${entry.minutes} minutos em ${entry.items.length} sessão(ões)` : ""}
            >
              <span className={`text-sm font-medium ${isToday ? "font-display text-base" : ""}`}>{d.getDate()}</span>
              {entry && (
                <span className="text-[10px] text-muted-foreground self-end">{entry.minutes}m</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Menos</span>
        {[0.15, 0.35, 0.55, 0.85].map((v, i) => (
          <span key={i} className="size-4 border border-border" style={{ backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(v * 35)}%, var(--card))` }} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}
