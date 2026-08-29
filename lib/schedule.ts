/** Schedule helpers for tests / assignments (datetime-local strings). */

export type Schedulable = {
  startAt?: string;
  dueAt?: string;
  dueDate?: string;
};

export function parseScheduleDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const end = new Date(`${value}T23:59:59`);
    return Number.isNaN(end.getTime()) ? null : end;
  }
  return null;
}

export function effectiveDueAt(item: Schedulable): string | undefined {
  return item.dueAt || (item.dueDate ? `${item.dueDate}T23:59` : undefined);
}

export function isNotYetOpen(item: Schedulable, now = new Date()): boolean {
  const start = parseScheduleDate(item.startAt);
  return Boolean(start && now < start);
}

export function isPastDue(item: Schedulable, now = new Date()): boolean {
  const due = parseScheduleDate(effectiveDueAt(item));
  return Boolean(due && now > due);
}

export function formatSchedule(value?: string | null): string {
  const d = parseScheduleDate(value);
  if (!d) return "—";
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dueDateFromDueAt(dueAt?: string): string {
  if (!dueAt) return "";
  return dueAt.slice(0, 10);
}
