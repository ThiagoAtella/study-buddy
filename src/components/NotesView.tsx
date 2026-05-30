import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Plus, Trash2, FileText, Eye, Pencil, Search, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Note = {
  id: string;
  title: string;
  content: string;
  subject_id: string | null;
  updated_at: string;
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  const closeLists = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };
  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-xs">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>');

  for (const raw of lines) {
    if (/^```/.test(raw)) {
      closeLists();
      if (inCode) { out.push("</code></pre>"); inCode = false; }
      else { out.push('<pre class="bg-muted p-3 rounded overflow-auto text-xs"><code>'); inCode = true; }
      continue;
    }
    if (inCode) { out.push(escapeHtml(raw)); continue; }

    const h = raw.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeLists();
      const lvl = h[1].length;
      const sizes = ["", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-sm"];
      out.push(`<h${lvl} class="font-display ${sizes[lvl]} mt-4 mb-2">${inline(h[2])}</h${lvl}>`);
      continue;
    }
    const ol = raw.match(/^\s*\d+\.\s+(.*)$/);
    const ul = raw.match(/^\s*[-*]\s+(.*)$/);
    if (ol) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (!inOl) { out.push('<ol class="list-decimal pl-6 space-y-1">'); inOl = true; }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    if (ul) {
      if (inOl) { out.push("</ol>"); inOl = false; }
      if (!inUl) { out.push('<ul class="list-disc pl-6 space-y-1">'); inUl = true; }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    closeLists();
    if (raw.trim() === "") out.push("<br/>");
    else out.push(`<p class="leading-relaxed">${inline(raw)}</p>`);
  }
  closeLists();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

type SaveStatus = "saved" | "saving" | "dirty";

export function NotesView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subjectId, setSubjectId] = useState<string>("none");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      setContent(selected.content);
      setSubjectId(selected.subject_id ?? "none");
      setSaveStatus("saved");
    }
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    );
  }, [notes, query]);

  const save = useMutation({
    mutationFn: async ({ t, c, s }: { t: string; c: string; s: string }) => {
      if (!selected) return;
      setSaveStatus("saving");
      const { error } = await supabase
        .from("notes")
        .update({
          title: t.trim() || "Sem título",
          content: c,
          subject_id: s === "none" ? null : s,
        })
        .eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      setSaveStatus("saved");
    },
    onError: () => {
      setSaveStatus("dirty");
      toast.error("Erro ao salvar");
    },
  });

  const triggerAutoSave = useCallback(
    (t: string, c: string, s: string) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        save.mutate({ t, c, s });
      }, 1500);
    },
    [save],
  );

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSaveStatus("dirty");
    triggerAutoSave(val, content, subjectId);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    setSaveStatus("dirty");
    triggerAutoSave(title, val, subjectId);
  };

  const handleSubjectChange = (val: string) => {
    setSubjectId(val);
    setSaveStatus("dirty");
    triggerAutoSave(title, content, val);
  };

  const handleManualSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    save.mutate({ t: title, c: content, s: subjectId });
    toast.success("Anotação salva");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selected && saveStatus === "dirty") {
          handleManualSave();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, saveStatus, title, content, subjectId]);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .insert({ user_id: userId, title: "Nova anotação", content: "" })
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      setSelectedId(n.id);
      setMode("edit");
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-6 min-h-[500px]">
      <div className="border border-border bg-card rounded flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <Button onClick={() => create.mutate()} className="w-full" size="sm">
            <Plus className="size-4" /> Nova anotação
          </Button>
          <div className="relative">
            <Search className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 h-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[600px]">
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground italic">
              {notes.length === 0 ? "Crie sua primeira anotação." : "Nada encontrado."}
            </p>
          )}
          {filtered.map((n) => {
            const subj = subjects.find((s) => s.id === n.subject_id);
            const isSel = n.id === selectedId;
            return (
              <button
                key={n.id}
                onClick={() => setSelectedId(n.id)}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 ${isSel ? "bg-muted" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {subj && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: subj.color }} />}
                  <p className="text-sm font-medium truncate">{n.title || "Sem título"}</p>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {n.content.replace(/[#*`>\-]/g, "").trim() || "Vazio"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                  {timeAgo(n.updated_at)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-border bg-card rounded flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground italic flex-col gap-2">
            <FileText className="size-10 opacity-40" />
            <p>Selecione ou crie uma anotação.</p>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título"
                className="flex-1 min-w-[180px] border-0 focus-visible:ring-0 font-display text-lg px-0 shadow-none"
              />
              <Select value={subjectId} onValueChange={handleSubjectChange}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem matéria —</SelectItem>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
                title={mode === "edit" ? "Pré-visualizar" : "Editar"}
              >
                {mode === "edit" ? <Eye className="size-4" /> : <Pencil className="size-4" />}
              </Button>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-[80px] justify-end">
                {saveStatus === "saving" && (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    <span>Salvando…</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <Check className="size-3 text-green-500" />
                    <span>Salvo</span>
                  </>
                )}
                {saveStatus === "dirty" && (
                  <button
                    onClick={handleManualSave}
                    className="underline underline-offset-2 hover:text-foreground"
                    title="Salvar agora (Ctrl+S)"
                  >
                    Salvar
                  </button>
                )}
              </div>

              <ConfirmDelete
                onConfirm={() => del.mutate(selected.id)}
                description={`Excluir a anotação "${selected.title}"?`}
              >
                <Button variant="ghost" size="icon">
                  <Trash2 className="size-4" />
                </Button>
              </ConfirmDelete>
            </div>
            {mode === "edit" ? (
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="# Use Markdown: # título, **negrito**, *itálico*, `código`, - listas, [link](url)"
                className="flex-1 min-h-[480px] border-0 focus-visible:ring-0 resize-none rounded-none font-mono text-sm leading-relaxed shadow-none"
              />
            ) : (
              <div
                className="flex-1 min-h-[480px] p-6 overflow-auto prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
