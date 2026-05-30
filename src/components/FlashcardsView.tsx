import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateFlashcards, explainFlashcard } from "@/lib/ai-flashcards.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Plus, Trash2, Sparkles, Lightbulb, Brain } from "lucide-react";
import { sm2 } from "@/lib/sm2";
import { toast } from "sonner";

export function FlashcardsView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const genFn = useServerFn(generateFlashcards);
  const explainFn = useServerFn(explainFlashcard);

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });
  const { data: cards = [] } = useQuery({
    queryKey: ["flashcards"],
    queryFn: async () => (await supabase.from("flashcards").select("*").order("due_at")).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");

  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [aiCount, setAiCount] = useState("8");
  const [aiSubject, setAiSubject] = useState<string>("");

  const add = useMutation({
    mutationFn: async () => {
      await supabase.from("flashcards").insert({
        user_id: userId, front, back,
        subject_id: subjectId || null,
      });
    },
    onSuccess: () => {
      setOpen(false); setFront(""); setBack(""); setSubjectId("");
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      toast.success("Cartão criado");
    },
  });

  const aiGen = useMutation({
    mutationFn: async () => genFn({
      data: {
        topic: aiTopic,
        context: aiContext || undefined,
        count: Number(aiCount),
        subjectId: aiSubject || undefined,
      },
    }),
    onSuccess: (r) => {
      setAiOpen(false); setAiTopic(""); setAiContext(""); setAiSubject("");
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      toast.success(`${r.inserted} cartões gerados pela IA`);
    },
    onError: (e: any) => toast.error(e.message || "Falha na IA"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("flashcards").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashcards"] }),
  });
  const review = useMutation({
    mutationFn: async ({ card, q }: { card: any; q: 0 | 3 | 4 | 5 }) => {
      const next = sm2(card, q);
      await supabase.from("flashcards").update(next).eq("id", card.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashcards"] }),
  });

  const dueCards = useMemo(
    () => cards.filter((c: any) => new Date(c.due_at) <= new Date()),
    [cards]
  );

  const [revealed, setRevealed] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const current = dueCards[0];

  const explain = useMutation({
    mutationFn: async () => explainFn({ data: { front: current.front, back: current.back } }),
    onSuccess: (r) => setExplanation(r.explanation),
    onError: (e: any) => toast.error(e.message || "Falha ao explicar"),
  });

  const handleAnswer = (q: 0 | 3 | 4 | 5) => {
    if (!current) return;
    review.mutate({ card: current, q });
    setRevealed(false);
    setExplanation(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-2xl">Revisão</h3>
          <p className="text-sm text-muted-foreground">
            {dueCards.length} cartão(ões) para revisar agora · {cards.length} no total
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={aiOpen} onOpenChange={setAiOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary"><Sparkles className="size-4" /> Gerar com IA</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Gerar flashcards com IA</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Tópico</Label>
                  <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="React hooks, fotossíntese, álgebra linear..." />
                </div>
                <div>
                  <Label>Contexto / notas (opcional)</Label>
                  <Textarea value={aiContext} onChange={(e) => setAiContext(e.target.value)} rows={4} placeholder="Cole anotações ou diga o foco específico..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quantos cartões</Label>
                    <Select value={aiCount} onValueChange={setAiCount}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[3, 5, 8, 10, 15].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Matéria (opcional)</Label>
                    <Select value={aiSubject} onValueChange={setAiSubject}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => aiGen.mutate()} disabled={!aiTopic.trim() || aiGen.isPending}>
                  {aiGen.isPending ? "Gerando..." : "Gerar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4" /> Cartão</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo cartão</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Frente (pergunta)</Label><Textarea value={front} onChange={(e) => setFront(e.target.value)} rows={2} /></div>
                <div><Label>Verso (resposta)</Label><Textarea value={back} onChange={(e) => setBack(e.target.value)} rows={3} /></div>
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
                <Button onClick={() => add.mutate()} disabled={!front || !back}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {current ? (
        <div className="max-w-xl mx-auto border border-border bg-card p-10">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">Pergunta</p>
          <p className="font-display text-3xl mb-8">{current.front}</p>
          {revealed ? (
            <>
              <div className="border-t border-border pt-6">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Resposta</p>
                <p className="text-lg whitespace-pre-wrap">{current.back}</p>
              </div>

              {explanation ? (
                <div className="mt-5 border-t border-border pt-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Lightbulb className="size-3.5" /> Explicação da IA
                  </p>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{explanation}</div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="mt-4" onClick={() => explain.mutate()} disabled={explain.isPending}>
                  <Lightbulb className="size-3.5" /> {explain.isPending ? "Explicando..." : "Aprofundar com IA"}
                </Button>
              )}

              <div className="grid grid-cols-4 gap-2 mt-8">
                <Button variant="destructive" onClick={() => handleAnswer(0)}>De novo</Button>
                <Button variant="outline" onClick={() => handleAnswer(3)}>Difícil</Button>
                <Button onClick={() => handleAnswer(4)}>Bom</Button>
                <Button variant="secondary" onClick={() => handleAnswer(5)}>Fácil</Button>
              </div>
            </>
          ) : (
            <Button className="w-full" size="lg" onClick={() => setRevealed(true)}>Mostrar resposta</Button>
          )}
        </div>
      ) : (
        <div className="max-w-xl mx-auto text-center py-14 border border-dashed border-border rounded">
          <Brain className="size-12 mx-auto text-muted-foreground opacity-30 mb-3" />
          <p className="text-muted-foreground italic">
            {cards.length === 0
              ? "Nenhum cartão ainda. Crie o primeiro ou gere com IA."
              : "Nada para revisar agora. Volte mais tarde! 🎉"}
          </p>
          {cards.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Próxima revisão: {new Date(cards[0]?.due_at).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      )}

      {cards.length > 0 && (
        <div>
          <h4 className="font-display text-xl mb-3">Todos os cartões</h4>
          <ul className="space-y-1.5">
            {cards.map((c: any) => {
              const subj = subjects.find((s: any) => s.id === c.subject_id);
              return (
                <li key={c.id} className="flex items-center justify-between text-sm border-b border-border py-2 group">
                  <div className="flex items-center gap-2 truncate min-w-0">
                    {subj && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: subj.color }} />}
                    <span className="truncate">{c.front}</span>
                  </div>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-2">
                    próx. {new Date(c.due_at).toLocaleDateString("pt-BR")}
                    <ConfirmDelete onConfirm={() => del.mutate(c.id)} description={`Excluir este cartão?`}>
                      <button className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-colors">
                        <Trash2 className="size-3.5" />
                      </button>
                    </ConfirmDelete>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
