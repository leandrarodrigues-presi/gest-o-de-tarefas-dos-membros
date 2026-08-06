import { addDays, startOfWeek, toISODate } from "@/lib/week";

export type PeriodMode = "week" | "month" | "year" | "custom";

export interface PeriodValue {
  mode: PeriodMode;
  start: string; // ISO date
  end: string; // ISO date
}

export function defaultPeriod(mode: PeriodMode = "month", ref = new Date()): PeriodValue {
  if (mode === "week") {
    const s = startOfWeek(ref);
    return { mode, start: toISODate(s), end: toISODate(addDays(s, 6)) };
  }
  if (mode === "year") {
    return { mode, start: toISODate(new Date(ref.getFullYear(), 0, 1)), end: toISODate(new Date(ref.getFullYear(), 11, 31)) };
  }
  if (mode === "month") {
    return {
      mode,
      start: toISODate(new Date(ref.getFullYear(), ref.getMonth(), 1)),
      end: toISODate(new Date(ref.getFullYear(), ref.getMonth() + 1, 0)),
    };
  }
  const s = startOfWeek(ref);
  return { mode: "custom", start: toISODate(s), end: toISODate(addDays(s, 6)) };
}

export function periodLabel(p: PeriodValue) {
  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
  return `${fmt(p.start)} a ${fmt(p.end)}`;
}

export function inPeriod(iso: string | null | undefined, p: PeriodValue) {
  if (!iso) return false;
  return iso >= p.start && iso <= p.end;
}
