import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ensureNotificationPermission } from "@/lib/notifications";

const FOCUS = 25 * 60;
const BREAK = 5 * 60;

export function Pomodoro({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });
  const [subjectId, setSubjectId] = useState<string>("");
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const endsAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    if (endsAtRef.current == null) {
      endsAtRef.current = Date.now() + secondsLeft * 1000;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.round(((endsAtRef.current ?? 0) - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) finish();
    };
    tick();
    const id = setInterval(tick, 250);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const logSession = useMutation({
    mutationFn: async (minutes: number) => {
      await supabase.from("study_logs").insert({
        user_id: userId,
        subject_id: subjectId || null,
        duration_minutes: minutes,
        notes: "Pomodoro",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study_logs"] }),
  });

  function finish() {
    setRunning(false);
    if (mode === "focus") {
      const min = Math.round((FOCUS - 0) / 60);
      logSession.mutate(min);
      toast.success(`Sessão de ${min} min registrada. Hora da pausa!`);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Pomodoro completo", { body: "Faça uma pausa de 5 min" });
      }
      setMode("break");
      setSecondsLeft(BREAK);
    } else {
      toast.success("Pausa terminada — voltar ao foco!");
      setMode("focus");
      setSecondsLeft(FOCUS);
    }
    startedAtRef.current = null;
    endsAtRef.current = null;
  }

  function toggle() {
    if (!running) {
      ensureNotificationPermission();
      startedAtRef.current = Date.now();
      endsAtRef.current = Date.now() + secondsLeft * 1000;
    } else {
      endsAtRef.current = null;
    }
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(mode === "focus" ? FOCUS : BREAK);
    startedAtRef.current = null;
    endsAtRef.current = null;
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const total = mode === "focus" ? FOCUS : BREAK;
  const pct = ((total - secondsLeft) / total) * 100;

  return (
    <div className="max-w-lg mx-auto border border-border bg-card p-10 text-center">
      <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {mode === "focus" ? "Foco" : (<><Coffee className="size-3" /> Pausa</>)}
      </div>
      <div className="font-display text-[8rem] leading-none my-4 tabular-nums">{mm}:{ss}</div>
      <div className="h-1 bg-muted overflow-hidden mb-8">
        <div className="h-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="text-left mb-6">
        <Label>Matéria desta sessão</Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger><SelectValue placeholder="Sem matéria específica" /></SelectTrigger>
          <SelectContent>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-center gap-3">
        <Button onClick={toggle} size="lg">
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {running ? "Pausar" : "Iniciar"}
        </Button>
        <Button onClick={reset} size="lg" variant="outline">
          <RotateCcw className="size-4" /> Reiniciar
        </Button>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">25 min de foco, 5 min de pausa. Sessões completas são registradas no seu histórico.</p>
    </div>
  );
}
