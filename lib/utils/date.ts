import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Date utilities for the application.
 * All dates are handled as JavaScript Date objects.
 * For display, we use Indonesian locale (id-ID).
 */

export const DEFAULT_DATE_FORMAT = "EEEE, dd MMMM yyyy";
export const SHORT_DATE_FORMAT = "dd/MM/yyyy";
export const TIME_FORMAT = "HH:mm";
export const DATETIME_FORMAT = "dd/MM/yyyy HH:mm";

export const APP_LOCALE = id;

/**
 * Format a Date into a display string.
 * @param date - The date to format
 * @param fmt - Format string (date-fns tokens)
 */
export function formatDate(
  date: Date | string | null | undefined,
  fmt: string = SHORT_DATE_FORMAT
): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return format(d, fmt, { locale: APP_LOCALE });
}

/**
 * Format a Date as a readable date+time.
 */
export function formatDateTime(
  date: Date | string | null | undefined
): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return format(d, DATETIME_FORMAT, { locale: APP_LOCALE });
}

/**
 * Check if a given date is valid (not NaN).
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Parse a date string (YYYY-MM-DD) into a Date at start of day in local timezone.
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Get the first day of a month (0-indexed month).
 */
export function getMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}

/**
 * Get the last millisecond of a month.
 */
export function getMonthEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
}

/**
 * Get the current month and year as { year, month } (month is 0-indexed 0-11).
 */
export function getCurrentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

/**
 * Returns true if two dates are the same day (ignoring time).
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Convert a UTC date to local date parts.
 */
export function toLocalDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };
}
