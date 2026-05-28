import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame } from "lucide-react";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeStreak(dates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  // If today not studied, start from yesterday so a streak is still valid
  if (!dates.has(ymd(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(ymd(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function StreakBadge() {
  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => (await supabase.from("study_logs").select("studied_at")).data ?? [],
  });

  const dates = new Set(logs.map((l) => ymd(new Date(l.studied_at as string))));
  const streak = computeStreak(dates);

  if (streak === 0) return null;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 h-8 rounded-md border border-border bg-card text-sm"
      title={`${streak} ${streak === 1 ? "dia seguido" : "dias seguidos"} estudando`}
    >
      <Flame className="size-4 text-orange-500" />
      <span className="font-medium">{streak}</span>
      <span className="text-muted-foreground hidden sm:inline">{streak === 1 ? "dia" : "dias"}</span>
    </div>
  );
}
