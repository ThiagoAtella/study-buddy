import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, Coffee, Settings2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ensureNotificationPermission } from "@/lib/notifications";

const PRESETS = [
  { label: "25 / 5 min (clássico)", focus: 25, brk: 5 },
  { label: "50 / 10 min (longo)", focus: 50, brk: 10 },
  { label: "15 / 3 min (curto)", focus: 15, brk: 3 },
  { label: "Personalizado", focus: 0, brk: 0 },
];

export function Pomodoro({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });

  const [subjectId, setSubjectId] = useState<string>("");
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [presetIdx, setPresetIdx] = useState(0);
  const [customFocus, setCustomFocus] = useState(25);
  const [customBreak, setCustomBreak] = useState(5);

  const focusMins = presetIdx < 3 ? PRESETS[presetIdx].focus : customFocus;
  const breakMins = presetIdx < 3 ? PRESETS[presetIdx].brk : customBreak;
  const FOCUS = focusMins * 60;
  const BREAK = breakMins * 60;

  const [secondsLeft, setSecondsLeft] = useState(FOCUS);

  useEffect(() => {
    if (!running) setSecondsLeft(mode === "focus" ? FOCUS : BREAK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMins, breakMins]);

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
      logSession.mutate(focusMins);
      toast.success(`Sessão de ${focusMins} min registrada. Hora da pausa!`);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Pomodoro completo", { body: `Faça uma pausa de ${breakMins} min` });
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

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const total = mode === "focus" ? FOCUS : BREAK;
  const pct = total > 0 ? ((total - secondsLeft) / total) * 100 : 0;

  return (
    <div className="max-w-lg mx-auto border border-border bg-card p-10 text-center">
      {/* Mode indicator */}
      <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {mode === "focus" ? "Foco" : (<><Coffee className="size-3" /> Pausa</>)}
      </div>

      {/* Timer */}
      <div className="font-display text-[8rem] leading-none my-4 tabular-nums">{mm}:{ss}</div>

      {/* Progress bar */}
      <div className="h-1 bg-muted overflow-hidden mb-8">
        <div className="h-full bg-foreground transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>

      {/* Subject selector */}
      <div className="text-left mb-6">
        <Label>Matéria desta sessão</Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger><SelectValue placeholder="Sem matéria específica" /></SelectTrigger>
          <SelectContent>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 mb-6">
        <Button onClick={toggle} size="lg" disabled={FOCUS === 0}>
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {running ? "Pausar" : "Iniciar"}
        </Button>
        <Button onClick={reset} size="lg" variant="outline">
          <RotateCcw className="size-4" /> Reiniciar
        </Button>
        <Button
          size="lg"
          variant="ghost"
          onClick={() => { if (!running) setShowSettings((v) => !v); }}
          disabled={running}
          aria-label="Configurações"
        >
          {showSettings ? <X className="size-4" /> : <Settings2 className="size-4" />}
        </Button>
      </div>

      {/* Settings panel */}
      {showSettings && !running && (
        <div className="border border-border rounded p-4 text-left space-y-4 mb-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Configurações</p>

          <div>
            <Label>Modo</Label>
            <Select
              value={String(presetIdx)}
              onValueChange={(v) => {
                const idx = Number(v);
                setPresetIdx(idx);
                if (idx < 3) {
                  setSecondsLeft(mode === "focus" ? PRESETS[idx].focus * 60 : PRESETS[idx].brk * 60);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p, i) => (
                  <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {presetIdx === 3 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Foco (min)</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={customFocus}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value));
                    setCustomFocus(v);
                    if (mode === "focus") setSecondsLeft(v * 60);
                  }}
                />
              </div>
              <div>
                <Label>Pausa (min)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={customBreak}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value));
                    setCustomBreak(v);
                    if (mode === "break") setSecondsLeft(v * 60);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {focusMins} min de foco · {breakMins} min de pausa · Sessões completas são registradas no histórico.
      </p>
    </div>
  );
}
