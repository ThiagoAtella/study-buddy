import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateQuiz, gradeAnswer } from "@/lib/ai-flashcards.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Q = { question: string; expected: string };
type Grade = { score: number; correct: string; missing: string; tip: string };

export function QuizView() {
  const genFn = useServerFn(generateQuiz);
  const gradeFn = useServerFn(gradeAnswer);
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [grades, setGrades] = useState<Record<number, Grade>>({});

  const gen = useMutation({
    mutationFn: async () => genFn({ data: { topic, count: Number(count) } }),
    onSuccess: (r) => { setQuestions(r.questions); setIdx(0); setAnswer(""); setGrades({}); },
    onError: (e: any) => toast.error(e.message || "Falha ao gerar quiz"),
  });

  const grade = useMutation({
    mutationFn: async () => {
      const q = questions![idx];
      return gradeFn({ data: { question: q.question, expected: q.expected, answer } });
    },
    onSuccess: (g) => setGrades((p) => ({ ...p, [idx]: g })),
    onError: (e: any) => toast.error(e.message || "Falha ao corrigir"),
  });

  const current = questions?.[idx];
  const currentGrade = grades[idx];

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-8">
      <div>
        <h3 className="font-display text-xl mb-4 flex items-center gap-2"><Sparkles className="size-5" /> Quiz com IA</h3>
        <form
          onSubmit={(e) => { e.preventDefault(); if (topic.trim()) gen.mutate(); }}
          className="space-y-3"
        >
          <div>
            <Label>Tópico</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="React hooks, geometria..." required />
          </div>
          <div>
            <Label>Sugestões de matérias</Label>
            <Select onValueChange={(v) => setTopic(v)}>
              <SelectTrigger><SelectValue placeholder="Usar nome de uma matéria" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s: any) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nº de perguntas</Label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[3, 5, 8].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={gen.isPending}>
            {gen.isPending ? "Gerando..." : "Gerar quiz"}
          </Button>
        </form>
      </div>

      <div>
        {!questions && <p className="text-muted-foreground italic">Gere um quiz para começar.</p>}
        {current && (
          <div className="space-y-5">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Pergunta {idx + 1} de {questions!.length}
            </div>
            <p className="font-display text-2xl">{current.question}</p>
            <div>
              <Label>Sua resposta</Label>
              <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} disabled={!!currentGrade} />
            </div>

            {!currentGrade && (
              <Button onClick={() => grade.mutate()} disabled={!answer.trim() || grade.isPending}>
                {grade.isPending ? "Corrigindo..." : "Enviar resposta"}
              </Button>
            )}

            {currentGrade && (
              <div className="border border-border bg-card p-5 space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl">{currentGrade.score.toFixed(1)}</span>
                  <span className="text-muted-foreground">/ 10</span>
                </div>
                <div className="flex gap-2"><CheckCircle2 className="size-4 mt-0.5 shrink-0" /><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Acertos</div><p className="text-sm">{currentGrade.correct}</p></div></div>
                <div className="flex gap-2"><AlertCircle className="size-4 mt-0.5 shrink-0" /><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Faltou</div><p className="text-sm">{currentGrade.missing}</p></div></div>
                <div className="border-t border-border pt-3"><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Dica</div><p className="text-sm italic">{currentGrade.tip}</p></div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Ver gabarito</summary>
                  <p className="mt-2 whitespace-pre-wrap">{current.expected}</p>
                </details>
                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => { setIdx(0); setAnswer(""); setGrades({}); setQuestions(null); }}>Novo quiz</Button>
                  {idx < questions!.length - 1 && (
                    <Button onClick={() => { setIdx(idx + 1); setAnswer(""); }}>Próxima</Button>
                  )}
                  {idx === questions!.length - 1 && (
                    <span className="text-sm text-muted-foreground self-center">
                      Média: {(Object.values(grades).reduce((a, b) => a + b.score, 0) / Object.values(grades).length).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
