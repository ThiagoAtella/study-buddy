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
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const todayKey = now.toISOString().slice(0, 10);

    const { data: slots } = await supabase
      .from("schedule_slots")
      .select("id, start_time, subject:subjects(name)")
      .eq("day_of_week", dow);

    if (!slots) return;
    const fired = getFired();

    for (const slot of slots) {
      const slotHHMM = (slot.start_time as string).slice(0, 5);
      if (slotHHMM === `${hh}:${mm}` && fired[slot.id] !== todayKey) {
        const subjectName = (slot.subject as any)?.name || "Estudo";
        new Notification("Hora de estudar", {
          body: `É hora de estudar: ${subjectName}`,
          icon: "/favicon.ico",
        });
        fired[slot.id] = todayKey;
      }
    }
    setFired(fired);
  };

  tick();
  const id = setInterval(tick, 30_000);
  return () => clearInterval(id);
}
