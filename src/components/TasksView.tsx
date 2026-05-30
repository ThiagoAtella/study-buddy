import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Calendar as CalendarIcon, Flag } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: number;
  status: string;
  subject_id: string | null;
  completed_at: string | null;
};

const COLUMNS: { key: "todo" | "doing" | "done"; label: string }[] = [
  { key: "todo", label: "A fazer" },
  { key: "doing", label: "Fazendo" },
  { key: "done", label: "Concluídas" },
];

const PRIORITIES = [
  { v: "0", label: "Baixa", color: "text-muted-foreground" },
  { v: "1", label: "Média", color: "text-amber-600 dark:text-amber-400" },
  { v: "2", label: "Alta", color: "text-red-600 dark:text-red-400" },
];

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function dueClass(iso: string | null, status: string) {
  if (!iso || status === "done") return "text-muted-foreground";
  const now = Date.now();
  const due = new Date(iso).getTime();
  if (due < now) return "text-red-600 dark:text-red-400 font-medium";
  if (due - now < 24 * 3600 * 1000) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

export function TasksView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("priority", { ascending: false })
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("1");
  const [subjectId, setSubjectId] = useState<string>("none");

  const reset = () => {
    setTitle(""); setDescription(""); setDue(""); setPriority("1"); setSubjectId("none");
  };

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        user_id: userId,
        title,
        description: description || null,
        due_date: due ? new Date(due).toISOString() : null,
        priority: Number(priority),
        subject_id: subjectId === "none" ? null : subjectId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      reset(); setOpen(false);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa criada");
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status };
      patch.completed_at = status === "done" ? new Date().toISOString() : null;
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };
  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) move.mutate({ id, status });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Organize trabalhos, exercícios e entregas. Arraste para mover entre as colunas.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4" /> Nova tarefa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Entregar trabalho de história" />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prazo</Label>
                  <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Matéria (opcional)</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => add.mutate()} disabled={!title.trim()}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, col.key)}
              className="border border-border bg-card p-4 min-h-[300px] rounded"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-display text-lg">{col.label}</h4>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhuma tarefa aqui.</p>
                )}
                {items.map((t) => {
                  const subj = subjects.find((s) => s.id === t.subject_id);
                  const pri = PRIORITIES[t.priority] ?? PRIORITIES[1];
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, t.id)}
                      className="group border border-border bg-background p-3 rounded cursor-grab active:cursor-grabbing"
                      style={{ borderLeft: `3px solid ${subj?.color || "var(--border)"}` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {t.title}
                        </p>
                        <button onClick={() => del.mutate(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        {t.due_date && (
                          <span className={`flex items-center gap-1 ${dueClass(t.due_date, t.status)}`}>
                            <CalendarIcon className="size-3" />
                            {fmtDate(t.due_date)}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 ${pri.color}`}>
                          <Flag className="size-3" />
                          {pri.label}
                        </span>
                        {subj && <span className="text-muted-foreground">· {subj.name}</span>}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {COLUMNS.filter((c) => c.key !== t.status).map((c) => (
                          <button
                            key={c.key}
                            onClick={() => move.mutate({ id: t.id, status: c.key })}
                            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5"
                          >
                            → {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
