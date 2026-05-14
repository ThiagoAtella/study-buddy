import { supabase } from "@/integrations/supabase/client";

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

const FIRED_KEY = "study-notifications-fired";

function getFired(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(FIRED_KEY) || "{}"); } catch { return {}; }
}
function setFired(map: Record<string, string>) {
  localStorage.setItem(FIRED_KEY, JSON.stringify(map));
}

export function startScheduleWatcher() {
  if (typeof window === "undefined") return () => {};

  const tick = async () => {
    if (Notification.permission !== "granted") return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const dow = now.getDay();
    const todayKey = now.toISOString().slice(0, 10);

    const { data: slots } = await supabase
      .from("schedule_slots")
      .select("id, start_time, reminder_minutes, subject:subjects(name)")
      .eq("day_of_week", dow);

    if (!slots) return;
    const fired = getFired();

    for (const slot of slots) {
      const [h, m] = (slot.start_time as string).slice(0, 5).split(":").map(Number);
      const slotDate = new Date(now);
      slotDate.setHours(h, m, 0, 0);
      const remind = (slot as any).reminder_minutes ?? 0;
      const targetTime = slotDate.getTime() - remind * 60_000;
      const diff = now.getTime() - targetTime;
      // Fire if we're within the same minute window after target
      if (diff >= 0 && diff < 60_000 && fired[slot.id] !== todayKey) {
        const subjectName = (slot.subject as any)?.name || "Estudo";
        const body = remind > 0
          ? `Em ${remind} min: ${subjectName}`
          : `É hora de estudar: ${subjectName}`;
        new Notification("Hora de estudar", { body, icon: "/favicon.ico" });
        fired[slot.id] = todayKey;
      }
    }
    setFired(fired);
  };

  tick();
  const id = setInterval(tick, 30_000);
  return () => clearInterval(id);
}
