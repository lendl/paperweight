import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(utc);
dayjs.extend(relativeTime);

export function toUtcDayString(ts: number): string {
  return dayjs.utc(ts).format("YYYY-MM-DD");
}

export function utcMidnightMs(ts: number): number {
  return dayjs.utc(ts).startOf("day").valueOf();
}

export function formatUtcStrictDate(day: string, format: string): string {
  const parsed = dayjs.utc(day, "YYYY-MM-DD", true).startOf("day");
  if (!parsed.isValid()) return day;

  return parsed.format(format);
}

export function formatRelativeDate(ts: number): string {
  // dayjs says "a few seconds ago" for anything under 45s, which is both noisy
  // and wide enough to wrap tight columns. Floor the last minute to "just now".
  if (Math.abs(Date.now() - ts) < 60_000) return "just now";
  return dayjs(ts).fromNow();
}

export function formatAbsoluteDate(ts: number): string {
  return dayjs(ts).format("MMM D, YYYY");
}

export function formatShortDate(ts: number): string {
  return dayjs(ts).format("MMM D");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
