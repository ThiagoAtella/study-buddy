// SuperMemo 2 algorithm. quality: 0=again, 3=hard, 4=good, 5=easy
export function sm2(card: { ease_factor: number; interval_days: number; repetitions: number }, quality: 0 | 3 | 4 | 5) {
  let { ease_factor, interval_days, repetitions } = card;
  if (quality < 3) {
    repetitions = 0;
    interval_days = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval_days = 1;
    else if (repetitions === 2) interval_days = 6;
    else interval_days = Math.round(interval_days * ease_factor);
    ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  }
  const due = new Date();
  due.setDate(due.getDate() + interval_days);
  return {
    ease_factor,
    interval_days,
    repetitions,
    due_at: due.toISOString(),
    last_reviewed_at: new Date().toISOString(),
  };
}
