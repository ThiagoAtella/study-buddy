import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, BellRing, LogOut, ExternalLink, Bell, Download } from "lucide-react";
import { toast } from "sonner";
import { ensureNotificationPermission, startScheduleWatcher } from "@/lib/notifications";
import { Pomodoro } from "@/components/Pomodoro";
import { GoalsView } from "@/components/GoalsView";
import { FlashcardsView } from "@/components/FlashcardsView";
import { StatsView } from "@/components/StatsView";
import { AiSuggestView } from "@/components/AiSuggestView";
import { QuizView } from "@/components/QuizView";
import { TutorView } from "@/components/TutorView";
import { CalendarView } from "@/components/CalendarView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StreakBadge } from "@/components/StreakBadge";
import { exportAllData } from "@/lib/export";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/login" });
      } else {
        setUser(data.session.user);
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate({ to: "/login" });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifGranted(Notification.permission === "granted");
    }
    const stop = startScheduleWatcher();
    return stop;
  }, [user]);

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  const requestNotif = async () => {
    const ok = await ensureNotificationPermission();
    setNotifGranted(ok);
    if (ok) toast.success("Notificações ativadas");
    else toast.error("Permissão negada");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl leading-none">Estudo<span className="italic">.</span></h1>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mt-1">
              {user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge />
            <Button
              variant={notifGranted ? "secondary" : "default"}
              size="sm"
              onClick={requestNotif}
              title="Ativar notificações"
            >
              {notifGranted ? <BellRing className="size-4" /> : <Bell className="size-4" />}
              <span className="ml-2 hidden sm:inline">
                {notifGranted ? "Notificações ativas" : "Ativar avisos"}
              </span>
            </Button>
            <Button variant="ghost" size="icon" onClick={exportAllData} title="Exportar dados (CSV)">
              <Download className="size-4" />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()} title="Sair">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <Tabs defaultValue="pomodoro">
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 mb-8 gap-6 flex-wrap">
            {[
              ["pomodoro", "Pomodoro"],
              ["subjects", "Matérias"],
              ["schedule", "Cronograma"],
              ["calendar", "Calendário"],
              ["goals", "Metas"],
              ["flashcards", "Flashcards"],
              ["quiz", "Quiz"],
              ["tutor", "Tutor IA"],
              ["stats", "Estatísticas"],
              ["ai", "Sugestões"],
              ["links", "Recomendações"],
            ].map(([v, l]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:shadow-none bg-transparent px-0 pb-3 font-display text-lg"
              >
                {l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="pomodoro"><Pomodoro userId={user.id} /></TabsContent>
          <TabsContent value="subjects"><SubjectsView userId={user.id} /></TabsContent>
          <TabsContent value="schedule"><ScheduleView userId={user.id} /></TabsContent>
          <TabsContent value="calendar"><CalendarView /></TabsContent>
          <TabsContent value="goals"><GoalsView userId={user.id} /></TabsContent>
          <TabsContent value="flashcards"><FlashcardsView userId={user.id} /></TabsContent>
          <TabsContent value="quiz"><QuizView /></TabsContent>
          <TabsContent value="tutor"><TutorView /></TabsContent>
          <TabsContent value="stats"><StatsView /></TabsContent>
          <TabsContent value="ai"><AiSuggestView userId={user.id} /></TabsContent>
          <TabsContent value="links"><LinksView userId={user.id} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------- Matérias + Tópicos ---------- */
function SubjectsView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const { data: topics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [color, setColor] = useState("#2d2d2d");
  const [description, setDescription] = useState("");

  const addSubject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subjects").insert({ user_id: userId, name, color, description });
      if (error) throw error;
    },
    onSuccess: () => {
      setName(""); setDescription("");
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Matéria criada");
    },
  });

  const delSubject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-8">
      <div>
        <h3 className="font-display text-xl mb-4">Nova matéria</h3>
        <form
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) addSubject.mutate(); }}
          className="space-y-3"
        >
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Programação" required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Cor</Label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-full border border-border rounded" />
          </div>
          <Button type="submit" className="w-full"><Plus className="size-4" /> Adicionar</Button>
        </form>
      </div>

      <div className="space-y-6">
        {subjects.length === 0 && (
          <p className="text-muted-foreground italic">Nenhuma matéria ainda. Crie sua primeira ao lado.</p>
        )}
        {subjects.map((s) => {
          const subjectTopics = topics.filter((t) => t.subject_id === s.id);
          const done = subjectTopics.filter((t) => t.completed).length;
          return (
            <div key={s.id} className="border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="size-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <div>
                    <h4 className="font-display text-2xl">{s.name}</h4>
                    {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {done}/{subjectTopics.length} tópicos
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => delSubject.mutate(s.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <TopicsList subjectId={s.id} userId={userId} topics={subjectTopics} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopicsList({ subjectId, userId, topics }: { subjectId: string; userId: string; topics: any[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("topics").insert({ user_id: userId, subject_id: subjectId, title });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); qc.invalidateQueries({ queryKey: ["topics"] }); },
  });
  const toggle = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await supabase.from("topics").update({
        completed: !t.completed,
        completed_at: !t.completed ? new Date().toISOString() : null,
      }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <ul className="space-y-2">
        {topics.map((t) => (
          <li key={t.id} className="flex items-center gap-3 group">
            <Checkbox checked={t.completed} onCheckedChange={() => toggle.mutate(t)} />
            <span className={t.completed ? "line-through text-muted-foreground" : ""}>{t.title}</span>
            <button onClick={() => del.mutate(t.id)} className="ml-auto opacity-0 group-hover:opacity-100">
              <Trash2 className="size-3.5 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => { e.preventDefault(); if (title.trim()) add.mutate(); }}
        className="mt-3 flex gap-2"
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Novo tópico..." className="h-8" />
        <Button type="submit" size="sm" variant="secondary">Adicionar</Button>
      </form>
    </div>
  );
}

/* ---------- Cronograma ---------- */
function ScheduleView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });
  const { data: slots = [] } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => (await supabase.from("schedule_slots").select("*, subject:subjects(*)").order("start_time")).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [day, setDay] = useState("1");
  const [time, setTime] = useState("19:00");
  const [duration, setDuration] = useState("30");
  const [remind, setRemind] = useState("0");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedule_slots").insert({
        user_id: userId, subject_id: subjectId,
        day_of_week: Number(day), start_time: time,
        duration_minutes: Number(duration),
        reminder_minutes: Number(remind),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["slots"] });
      toast.success("Horário adicionado");
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["slots"] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">Defina seus horários — você receberá um aviso no horário marcado.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={subjects.length === 0}><Plus className="size-4" /> Horário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo horário de estudo</DialogTitle></DialogHeader>
            <div className="space-y-4">
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
                <Label>Dia</Label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hora</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
                <div>
                  <Label>Duração (min)</Label>
                  <Input type="number" min={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Avisar antes (min)</Label>
                <Select value={remind} onValueChange={setRemind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No horário exato</SelectItem>
                    <SelectItem value="5">5 minutos antes</SelectItem>
                    <SelectItem value="10">10 minutos antes</SelectItem>
                    <SelectItem value="15">15 minutos antes</SelectItem>
                    <SelectItem value="30">30 minutos antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => add.mutate()} disabled={!subjectId}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-7 gap-3">
        {DAYS.map((d, i) => {
          const daySlots = slots.filter((s) => s.day_of_week === i);
          return (
            <div key={i} className="border border-border bg-card p-3 min-h-[180px]">
              <h4 className="font-display text-lg mb-3">{d}</h4>
              <div className="space-y-2">
                {daySlots.map((s) => (
                  <div key={s.id} className="text-sm border-l-2 pl-2 py-1 group flex items-start justify-between" style={{ borderColor: s.subject?.color || "#000" }}>
                    <div>
                      <div className="font-medium">{(s.start_time as string).slice(0, 5)}</div>
                      <div className="text-muted-foreground text-xs">{s.subject?.name} · {s.duration_minutes}min</div>
                    </div>
                    <button onClick={() => del.mutate(s.id)} className="opacity-0 group-hover:opacity-100">
                      <Trash2 className="size-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
                {daySlots.length === 0 && <p className="text-xs text-muted-foreground italic">—</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ---------- Recomendações ---------- */
function LinksView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });
  const { data: links = [] } = useQuery({
    queryKey: ["links"],
    queryFn: async () => (await supabase.from("recommended_links").select("*, subject:subjects(*)").order("created_at", { ascending: false })).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("recommended_links").insert({
        user_id: userId, title, url, description,
        subject_id: subjectId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false); setTitle(""); setUrl(""); setDescription(""); setSubjectId("");
      qc.invalidateQueries({ queryKey: ["links"] });
      toast.success("Link salvo");
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recommended_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links"] }),
  });

  const suggestions = [
    { title: "freeCodeCamp", url: "https://www.freecodecamp.org/portuguese/", desc: "Cursos gratuitos de programação em português" },
    { title: "Rocketseat", url: "https://www.rocketseat.com.br/", desc: "Trilhas de desenvolvimento web e mobile" },
    { title: "MDN Web Docs", url: "https://developer.mozilla.org/pt-BR/", desc: "Documentação completa de web (HTML, CSS, JS)" },
    { title: "The Odin Project", url: "https://www.theodinproject.com/", desc: "Currículo completo de full-stack gratuito" },
    { title: "CS50 — Harvard", url: "https://cs50.harvard.edu/", desc: "Introdução à ciência da computação" },
    { title: "Khan Academy", url: "https://pt.khanacademy.org/", desc: "Matemática, ciências e mais — gratuito" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-2xl">Meus links</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4" /> Link</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Salvar recurso</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div><Label>URL</Label><Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
                <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
                <div>
                  <Label>Matéria (opcional)</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => add.mutate()} disabled={!title || !url}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {links.map((l) => (
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="border border-border bg-card p-4 hover:bg-accent transition-colors group block">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-medium flex items-center gap-2">{l.title} <ExternalLink className="size-3" /></h4>
                  {l.description && <p className="text-sm text-muted-foreground mt-1">{l.description}</p>}
                  {l.subject && <span className="text-xs uppercase tracking-wider mt-2 inline-block" style={{ color: l.subject.color }}>{l.subject.name}</span>}
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); del.mutate(l.id); }}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </button>
              </div>
            </a>
          ))}
          {links.length === 0 && <p className="text-muted-foreground italic">Nenhum link salvo ainda.</p>}
        </div>
      </div>

      <div>
        <h3 className="font-display text-2xl mb-4">Sugestões para começar</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {suggestions.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="border border-dashed border-border p-4 hover:bg-accent transition-colors block">
              <h4 className="font-medium flex items-center gap-2">{s.title} <ExternalLink className="size-3" /></h4>
              <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
