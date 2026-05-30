import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, Coffee, Settings2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ensureNotificationPermission } from "@/lib/notifications";

export function Pomodoro({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });

  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingFocus, setPendingFocus] = useState("25");
  const [pendingBreak, setPendingBreak] = useState("5");

  const FOCUS = focusMin * 60;
  const BREAK = breakMin * 60;

  const [subjectId, setSubjectId] = useState<string>("");
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
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
      logSession.mutate(focusMin);
      toast.success(`Sessão de ${focusMin} min registrada. Hora da pausa!`);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Pomodoro completo", { body: `Faça uma pausa de ${breakMin} min` });
      }
      setMode("break");
      setSecondsLeft(BREAK);
    } else {
      toast.success("Pausa terminada — voltar ao foco!");
      setMode("focus");
      setSecondsLeft(FOCUS);
    }
    startedAtRef.current = null;
  }

  function toggle() {
    if (!running) {
      ensureNotificationPermission();
      startedAtRef.current = Date.now();
    }
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(mode === "focus" ? FOCUS : BREAK);
    startedAtRef.current = null;
  }

  function applySettings() {
    const f = Math.max(1, Math.min(90, Number(pendingFocus) || 25));
    const b = Math.max(1, Math.min(30, Number(pendingBreak) || 5));
    setFocusMin(f);
    setBreakMin(b);
    setRunning(false);
    setMode("focus");
    setSecondsLeft(f * 60);
    setShowSettings(false);
    toast.success(`Timer ajustado: ${f} min foco, ${b} min pausa`);
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const total = mode === "focus" ? FOCUS : BREAK;
  const pct = ((total - secondsLeft) / total) * 100;

  return (
    <div className="max-w-lg mx-auto border border-border bg-card p-10 text-center relative">
      <button
        onClick={() => {
          setPendingFocus(String(focusMin));
          setPendingBreak(String(breakMin));
          setShowSettings((v) => !v);
        }}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        title="Configurar durações"
      >
        {showSettings ? <X className="size-4" /> : <Settings2 className="size-4" />}
      </button>

      {showSettings ? (
        <div className="text-left space-y-4 py-4">
          <h3 className="font-display text-xl text-center mb-2">Configurar Timer</h3>
          <div>
            <Label>Foco (minutos, 1–90)</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={pendingFocus}
              onChange={(e) => setPendingFocus(e.target.value)}
            />
          </div>
          <div>
            <Label>Pausa (minutos, 1–30)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={pendingBreak}
              onChange={(e) => setPendingBreak(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={applySettings}>Aplicar</Button>
        </div>
      ) : (
        <>
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
          <p className="mt-6 text-xs text-muted-foreground">
            {focusMin} min de foco, {breakMin} min de pausa. Sessões completas são registradas no seu histórico.
          </p>
        </>
      )}
    </div>
  );
}
