import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function GoalsView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await supabase.from("weekly_goals").select("*")).data ?? [],
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["study_logs"],
    queryFn: async () => (await supabase.from("study_logs").select("*")).data ?? [],
  });

  const [subjectId, setSubjectId] = useState("");
  const [minutes, setMinutes] = useState("120");

  const upsert = useMutation({
    mutationFn: async () => {
      const existing = goals.find((g: any) => g.subject_id === subjectId);
      if (existing) {
        await supabase.from("weekly_goals").update({ minutes_per_week: Number(minutes) }).eq("id", existing.id);
      } else {
        await supabase.from("weekly_goals").insert({ user_id: userId, subject_id: subjectId, minutes_per_week: Number(minutes) });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Meta salva"); setSubjectId(""); },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("weekly_goals").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const minutesThisWeek = (sid: string) =>
    logs
      .filter((l: any) => l.subject_id === sid && new Date(l.studied_at) >= weekStart)
      .reduce((acc: number, l: any) => acc + (l.duration_minutes || 0), 0);

  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-8">
      <div>
        <h3 className="font-display text-xl mb-4">Definir meta semanal</h3>
        <form
          onSubmit={(e) => { e.preventDefault(); if (subjectId) upsert.mutate(); }}
          className="space-y-3"
        >
          <div>
            <Label>Matéria</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Minutos por semana</Label>
            <Input type="number" min={15} step={15} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={!subjectId}>Salvar meta</Button>
        </form>
      </div>

      <div className="space-y-3">
        {goals.length === 0 && <p className="text-muted-foreground italic">Nenhuma meta definida ainda.</p>}
        {goals.map((g: any) => {
          const subj = subjects.find((s: any) => s.id === g.subject_id);
          const done = minutesThisWeek(g.subject_id);
          const pct = Math.min(100, (done / g.minutes_per_week) * 100);
          return (
            <div key={g.id} className="border border-border bg-card p-5">
              <div className="flex justify-between mb-2">
                <span className="font-medium flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: subj?.color }} />
                  {subj?.name || "—"}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {done} / {g.minutes_per_week} min
                  </span>
                  <button onClick={() => del.mutate(g.id)}><Trash2 className="size-3.5 text-muted-foreground" /></button>
                </div>
              </div>
              <div className="h-2 bg-muted overflow-hidden">
                <div className="h-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
              </div>
              {pct >= 100 && <p className="text-xs mt-2 italic">Meta atingida! 🎉</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
