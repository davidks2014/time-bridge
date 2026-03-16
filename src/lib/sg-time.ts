// src/lib/sg-time.ts

export const SINGAPORE_TIMEZONE = "Asia/Singapore";

/**
 * Format any ISO/Date value for Singapore display.
 */
export function formatSingaporeDateTime(
  value: string | Date | null | undefined
): string {
  if (!value) return "";

  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return "";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: SINGAPORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(dt);
}

/**
 * Convert ISO/Date into datetime-local string in Singapore time.
 * Example output: 2026-03-10T21:15
 */
export function toSingaporeDateTimeLocalInput(
  value: string | Date | null | undefined
): string {
  if (!value) return "";

  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SINGAPORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(dt);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

/**
 * Parse releaseDate from client.
 *
 * Supported:
 * 1) "2026-03-10T21:30"       -> treated as Singapore local time
 * 2) "2026-03-10T21:30:00"    -> treated as Singapore local time
 * 3) Full ISO with timezone/Z -> used as-is
 */
export function parseSingaporeDateTimeInput(raw: unknown): Date | null {
  if (raw === null || raw === undefined) return null;

  const str = String(raw).trim();
  if (!str) return null;

  const hasExplicitTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(str);

  let normalized = str;

  if (!hasExplicitTimezone) {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) {
      normalized = `${str}:00+08:00`;
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(str)) {
      normalized = `${str}+08:00`;
    }
  }

  const dt = new Date(normalized);
  if (Number.isNaN(dt.getTime())) {
    throw new Error("INVALID_RELEASE_DATE");
  }

  return dt;
}