import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { sm2 } from "@/lib/sm2";
import { toast } from "sonner";

export function FlashcardsView({ userId }: { userId: string }) {
  const qc = useQueryClient();
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

  const add = useMutation({
    mutationFn: async () => {
      await supabase.from("flashcards").insert({
        user_id: userId, front, back,
        subject_id: subjectId || null,
      });
    },
    onSuccess: () => { setOpen(false); setFront(""); setBack(""); setSubjectId(""); qc.invalidateQueries({ queryKey: ["flashcards"] }); toast.success("Cartão criado"); },
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
  const current = dueCards[0];

  const handleAnswer = (q: 0 | 3 | 4 | 5) => {
    if (!current) return;
    review.mutate({ card: current, q });
    setRevealed(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-display text-2xl">Revisão</h3>
          <p className="text-sm text-muted-foreground">{dueCards.length} cartão(ões) para revisar agora · {cards.length} no total</p>
        </div>
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
        <div className="text-center py-10 text-muted-foreground italic">
          {cards.length === 0 ? "Nenhum cartão ainda. Crie o primeiro." : "Nada para revisar agora. Volte mais tarde."}
        </div>
      )}

      {cards.length > 0 && (
        <div>
          <h4 className="font-display text-xl mb-3">Todos os cartões</h4>
          <ul className="space-y-1.5">
            {cards.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between text-sm border-b border-border py-2 group">
                <span className="truncate">{c.front}</span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  próx. {new Date(c.due_at).toLocaleDateString("pt-BR")}
                  <button onClick={() => del.mutate(c.id)} className="opacity-0 group-hover:opacity-100">
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
