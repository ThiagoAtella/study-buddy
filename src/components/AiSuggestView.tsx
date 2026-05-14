import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { suggestStudyResources } from "@/lib/ai-suggest.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, ExternalLink, Bookmark } from "lucide-react";
import { toast } from "sonner";

export function AiSuggestView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(suggestStudyResources);
  const [subject, setSubject] = useState("");
  const [goal, setGoal] = useState("");
  const [results, setResults] = useState<any[] | null>(null);

  const ask = useMutation({
    mutationFn: async () => fn({ data: { subject, goal: goal || undefined } }),
    onSuccess: (r) => setResults(r),
    onError: (e: any) => toast.error(e.message || "Falha ao gerar sugestões"),
  });

  const save = useMutation({
    mutationFn: async (r: any) => {
      await supabase.from("recommended_links").insert({
        user_id: userId, title: r.title, url: r.url, description: r.why,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["links"] }); toast.success("Salvo nos seus links"); },
  });

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-8">
      <div>
        <h3 className="font-display text-xl mb-4 flex items-center gap-2"><Sparkles className="size-5" /> Sugestões com IA</h3>
        <form
          onSubmit={(e) => { e.preventDefault(); if (subject.trim()) ask.mutate(); }}
          className="space-y-3"
        >
          <div>
            <Label>O que quer estudar?</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="React, álgebra linear..." required />
          </div>
          <div>
            <Label>Objetivo (opcional)</Label>
            <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} placeholder="Ex: passar em entrevistas, projeto pessoal..." />
          </div>
          <Button type="submit" className="w-full" disabled={ask.isPending || !subject.trim()}>
            {ask.isPending ? "Gerando..." : "Gerar sugestões"}
          </Button>
          <p className="text-xs text-muted-foreground">A IA pode errar URLs — verifique antes de salvar.</p>
        </form>
      </div>

      <div className="space-y-3">
        {!results && <p className="text-muted-foreground italic">As sugestões aparecerão aqui.</p>}
        {results?.map((r, i) => (
          <div key={i} className="border border-border bg-card p-5">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <a href={r.url} target="_blank" rel="noreferrer" className="font-medium flex items-center gap-2 hover:underline">
                  {r.title} <ExternalLink className="size-3" />
                </a>
                <p className="text-sm text-muted-foreground mt-1">{r.why}</p>
                <span className="text-xs uppercase tracking-wider mt-2 inline-block text-muted-foreground">{r.level}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => save.mutate(r)}>
                <Bookmark className="size-3.5" /> Salvar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
