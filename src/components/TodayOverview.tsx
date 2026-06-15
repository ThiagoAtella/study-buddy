import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, CheckSquare, Flame, Layers, Sparkles } from "lucide-react";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function TodayOverview({ userId }: { userId: string }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await supabase.from("tasks").select("*")).data ?? [],
  });
  const { data: cards = [] } = useQuery({
    queryKey: ["flashcards"],
    queryFn: async () => (await supabase.from("flashcards").select("*")).data ?? [],
  });
  const { data: slots = [] } = useQuery({
    queryKey: ["slots"],
    queryFn: async () =>
      (await supabase
        .from("schedule_slots")
        .select("*, subject:subjects(*)")
        .order("start_time")).data ?? [],
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["study_logs"],
    queryFn: async () =>
      (await supabase.from("study_logs").select("*").order("studied_at", { ascending: false })).data ?? [],
  });

  const now = new Date();
  const sod = startOfDay(now);
  const eod = endOfDay(now);

  const todayTasks = useMemo(
    () =>
      (tasks as any[]).filter((t) => {
        if (t.status === "done") return false;
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        return d >= sod && d <= eod;
      }),
    [tasks, sod, eod],
  );

  const overdueTasks = useMemo(
    () =>
      (tasks as any[]).filter((t) => {
        if (t.status === "done" || !t.due_date) return false;
        return new Date(t.due_date) < sod;
      }),
    [tasks, sod],
  );

  const dueCards = useMemo(
    () => (cards as any[]).filter((c) => new Date(c.due_at) <= now),
    [cards, now],
  );

  const nextSlot = useMemo(() => {
    const dow = now.getDay();
    const todays = (slots as any[])
      .filter((s) => s.day_of_week === dow)
      .map((s) => {
        const [h, m] = String(s.start_time).split(":").map(Number);
        const dt = new Date(now);
        dt.setHours(h, m || 0, 0, 0);
        return { ...s, dt };
      })
      .sort((a, b) => a.dt.getTime() - b.dt.getTime());
    return todays.find((s) => s.dt >= now) ?? todays[todays.length - 1] ?? null;
  }, [slots, now]);

  const streak = useMemo(() => {
    const days = new Set(
      (logs as any[]).map((l) => new Date(l.studied_at).toISOString().slice(0, 10)),
    );
    let s = 0;
    const d = new Date();
    while (days.has(d.toISOString().slice(0, 10))) {
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [logs]);

  const todayMinutes = useMemo(
    () =>
      (logs as any[])
        .filter((l) => {
          const d = new Date(l.studied_at);
          return d >= sod && d <= eod;
        })
        .reduce((a, l) => a + (l.duration_minutes || 0), 0),
    [logs, sod, eod],
  );

  const slotIsNow =
    nextSlot && nextSlot.dt <= now && (() => {
      const end = new Date(nextSlot.dt);
      end.setMinutes(end.getMinutes() + (nextSlot.duration_minutes || 30));
      return end >= now;
    })();

  const slotLabel = nextSlot
    ? nextSlot.dt >= now
      ? `${nextSlot.subject?.name ?? "Sessão"} às ${String(nextSlot.dt.getHours()).padStart(2, "0")}:${String(nextSlot.dt.getMinutes()).padStart(2, "0")}`
      : slotIsNow
        ? `Agora: ${nextSlot.subject?.name ?? "Sessão"}`
        : "Nenhum slot restante hoje"
    : "Sem cronograma para hoje";

  const allGood =
    todayTasks.length === 0 &&
    overdueTasks.length === 0 &&
    dueCards.length === 0;

  return (
    <section className="mb-10 relative overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur p-6 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 35%, transparent), transparent 70%)",
        }}
      />

      <div className="relative flex flex-wrap items-baseline justify-between gap-3 mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Hoje</p>
          <h2 className="font-display text-2xl md:text-3xl mt-1">
            {greeting()}
            <span className="text-primary italic">.</span>
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {now.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </p>
      </div>

      <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          icon={<Flame className="size-4" />}
          label="Sequência"
          value={`${streak} ${streak === 1 ? "dia" : "dias"}`}
          hint={todayMinutes > 0 ? `${todayMinutes} min hoje` : "Estude hoje para manter"}
          tone={streak > 0 ? "primary" : "muted"}
        />
        <Card
          icon={<CheckSquare className="size-4" />}
          label="Tarefas de hoje"
          value={String(todayTasks.length)}
          hint={
            overdueTasks.length > 0
              ? `${overdueTasks.length} atrasada${overdueTasks.length === 1 ? "" : "s"}`
              : todayTasks.length === 0
                ? "Nada vencendo hoje"
                : "Veja em Tarefas"
          }
          tone={overdueTasks.length > 0 ? "danger" : "default"}
        />
        <Card
          icon={<Layers className="size-4" />}
          label="Flashcards"
          value={String(dueCards.length)}
          hint={dueCards.length === 0 ? "Tudo em dia" : "Pendentes de revisão"}
          tone={dueCards.length > 0 ? "primary" : "default"}
        />
        <Card
          icon={<CalendarClock className="size-4" />}
          label="Cronograma"
          value={nextSlot ? (slotIsNow ? "Agora" : (nextSlot.dt >= now ? "Próximo" : "—")) : "—"}
          hint={slotLabel}
          tone={slotIsNow ? "primary" : "default"}
        />
      </div>

      {allGood && (
        <div className="relative mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Você está em dia. Que tal aprofundar uma matéria?
        </div>
      )}
    </section>
  );
}

function Card({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "danger" | "muted";
}) {
  const toneClasses =
    tone === "primary"
      ? "border-primary/30 bg-primary/5"
      : tone === "danger"
        ? "border-destructive/30 bg-destructive/5"
        : tone === "muted"
          ? "border-border bg-background/50"
          : "border-border bg-background/60";

  const iconTone =
    tone === "primary"
      ? "text-primary"
      : tone === "danger"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className={`rounded-xl border ${toneClasses} p-4 transition-all hover:translate-y-[-1px]`}>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>{label}</span>
        <span className={iconTone}>{icon}</span>
      </div>
      <p className="font-display text-3xl mt-2 leading-none tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1.5 truncate">{hint}</p>}
    </div>
  );
}
