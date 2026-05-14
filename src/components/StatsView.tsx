import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="font-display text-5xl mt-2">{value}</p>
    </div>
  );
}

export function StatsView() {
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });
  const { data: topics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => (await supabase.from("topics").select("*")).data ?? [],
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["study_logs"],
    queryFn: async () => (await supabase.from("study_logs").select("*").order("studied_at", { ascending: false })).data ?? [],
  });

  const totalMin = logs.reduce((a: number, l: any) => a + (l.duration_minutes || 0), 0);
  const totalHours = (totalMin / 60).toFixed(1);
  const done = topics.filter((t: any) => t.completed).length;

  // Streak (consecutive days with at least one study log)
  const streak = useMemo(() => {
    const days = new Set(logs.map((l: any) => new Date(l.studied_at).toISOString().slice(0, 10)));
    let s = 0;
    const d = new Date();
    while (days.has(d.toISOString().slice(0, 10))) {
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [logs]);

  // 90-day heatmap data
  const heatmap = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of logs as any[]) {
      const k = new Date(l.studied_at).toISOString().slice(0, 10);
      map.set(k, (map.get(k) || 0) + (l.duration_minutes || 0));
    }
    const days: { date: string; minutes: number }[] = [];
    const start = new Date();
    start.setDate(start.getDate() - 90);
    for (let i = 0; i <= 90; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const k = d.toISOString().slice(0, 10);
      days.push({ date: k, minutes: map.get(k) || 0 });
    }
    return days;
  }, [logs]);

  // Hours per subject
  const perSubject = subjects.map((s: any) => {
    const m = logs.filter((l: any) => l.subject_id === s.id).reduce((a: number, l: any) => a + (l.duration_minutes || 0), 0);
    return { ...s, minutes: m };
  }).sort((a: any, b: any) => b.minutes - a.minutes);
  const maxMin = Math.max(1, ...perSubject.map((p: any) => p.minutes));

  const intensity = (m: number) => {
    if (m === 0) return "var(--muted)";
    if (m < 25) return "oklch(0.75 0.04 85)";
    if (m < 60) return "oklch(0.55 0.05 85)";
    if (m < 120) return "oklch(0.35 0.04 85)";
    return "oklch(0.18 0 0)";
  };

  return (
    <div className="space-y-10">
      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Horas totais" value={totalHours} />
        <Stat label="Sequência (dias)" value={String(streak)} />
        <Stat label="Tópicos concluídos" value={String(done)} />
        <Stat label="Sessões" value={String(logs.length)} />
      </div>

      <div>
        <h3 className="font-display text-2xl mb-4">Atividade — últimos 90 dias</h3>
        <div className="border border-border bg-card p-4 overflow-x-auto">
          <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridAutoColumns: "12px" }}>
            {heatmap.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.minutes} min`}
                className="size-3 rounded-sm"
                style={{ backgroundColor: intensity(d.minutes) }}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-display text-2xl mb-4">Horas por matéria</h3>
        <div className="space-y-3">
          {perSubject.map((s: any) => (
            <div key={s.id} className="border border-border bg-card p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
                <span className="text-muted-foreground">{(s.minutes / 60).toFixed(1)}h</span>
              </div>
              <div className="h-1.5 bg-muted overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${(s.minutes / maxMin) * 100}%`, backgroundColor: s.color }} />
              </div>
            </div>
          ))}
          {perSubject.length === 0 && <p className="text-muted-foreground italic">Adicione matérias e use o Pomodoro para ver estatísticas.</p>}
        </div>
      </div>
    </div>
  );
}
