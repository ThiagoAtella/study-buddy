import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tutorChat } from "@/lib/ai-flashcards.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Monte um plano de estudos semanal para mim",
  "Me ensine este conceito do zero",
  "Quais são os erros mais comuns nesse assunto?",
  "Me dê um exercício para praticar",
];

export function TutorView() {
  const chatFn = useServerFn(tutorChat);
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });

  const [subjectName, setSubjectName] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const next = [...messages, { role: "user" as const, content: text }];
      setMessages(next);
      setInput("");
      const r = await chatFn({ data: { subjectName: subjectName || undefined, messages: next } });
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
    },
    onError: (e: any) => toast.error(e.message || "Falha no tutor"),
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, send.isPending]);

  const submit = (text: string) => { if (text.trim() && !send.isPending) send.mutate(text.trim()); };

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-8">
      <div className="space-y-4">
        <h3 className="font-display text-xl flex items-center gap-2"><Sparkles className="size-5" /> Tutor IA</h3>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Matéria (opcional)</label>
          <Select value={subjectName} onValueChange={(v) => setSubjectName(v === "__none" ? "" : v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Geral" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Geral</SelectItem>
              {subjects.map((s: any) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Sugestões</p>
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => submit(s)} className="text-left text-sm border border-border bg-card px-3 py-2 w-full hover:bg-accent transition-colors">
              {s}
            </button>
          ))}
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setMessages([])}>Limpar conversa</Button>
        )}
      </div>

      <div className="flex flex-col h-[70vh] border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <p className="text-muted-foreground italic">Comece uma conversa. Peça explicações, exercícios ou um plano de estudo.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={
                m.role === "user"
                  ? "bg-foreground text-background px-4 py-2 max-w-[80%]"
                  : "border-l-2 border-foreground pl-4 max-w-[90%] whitespace-pre-wrap text-sm"
              }>
                {m.content}
              </div>
            </div>
          ))}
          {send.isPending && <div className="text-sm text-muted-foreground italic">Pensando...</div>}
          <div ref={endRef} />
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); submit(input); }}
          className="border-t border-border p-3 flex gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } }}
            placeholder="Pergunte algo ou peça um plano..."
            rows={2}
            className="resize-none"
          />
          <Button type="submit" disabled={!input.trim() || send.isPending}><Send className="size-4" /></Button>
        </form>
      </div>
    </div>
  );
}
