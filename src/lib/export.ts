import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set<string>())
  );
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(","));
  return lines.join("\n");
}

function download(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportAllData() {
  try {
    const [logs, subjects, flashcards, topics, goals] = await Promise.all([
      supabase.from("study_logs").select("*, subject:subjects(name)").order("studied_at"),
      supabase.from("subjects").select("*").order("created_at"),
      supabase.from("flashcards").select("*").order("created_at"),
      supabase.from("topics").select("*").order("created_at"),
      supabase.from("weekly_goals").select("*").order("created_at"),
    ]);

    const stamp = new Date().toISOString().slice(0, 10);

    const flattenLogs = (logs.data ?? []).map((l: any) => ({
      studied_at: l.studied_at,
      duration_minutes: l.duration_minutes,
      subject: l.subject?.name ?? "",
      notes: l.notes ?? "",
    }));

    download(`estudo-${stamp}-sessoes.csv`, toCSV(flattenLogs));
    download(`estudo-${stamp}-materias.csv`, toCSV((subjects.data ?? []) as any));
    download(`estudo-${stamp}-flashcards.csv`, toCSV((flashcards.data ?? []) as any));
    download(`estudo-${stamp}-topicos.csv`, toCSV((topics.data ?? []) as any));
    download(`estudo-${stamp}-metas.csv`, toCSV((goals.data ?? []) as any));

    toast.success("Dados exportados");
  } catch (e: any) {
    toast.error("Falha ao exportar: " + (e?.message ?? "erro"));
  }
}
