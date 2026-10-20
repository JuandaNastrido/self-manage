/**
 * UI formatting utilities for time, numbers, and display helpers.
 */
import { formatCurrency, formatAmountPlain } from "./money";
import { formatDate as formatDateFn, SHORT_DATE_FORMAT } from "./date";

/**
 * Format seconds into a human-readable duration string.
 * @param totalSeconds - Total seconds
 * @returns "mm:ss" for < 1 hour, "HH:mm:ss" for >= 1 hour
 */
export function formatDuration(totalSeconds: number): string {
  const secs = Math.floor(Math.max(0, totalSeconds));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Get CSS color for task priority.
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-800 border-gray-300",
    MEDIUM: "bg-blue-100 text-blue-800 border-blue-300",
    HIGH: "bg-amber-100 text-amber-800 border-amber-300",
    CRITICAL: "bg-red-100 text-red-800 border-red-300",
  };
  return colors[priority] || colors.MEDIUM;
}

/**
 * Get CSS color for task status badge.
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    TODO: "bg-gray-100 text-gray-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    DONE: "bg-green-100 text-green-800",
    ARCHIVED: "bg-gray-200 text-gray-600",
  };
  return colors[status] || colors.TODO;
}

export { formatCurrency, formatAmountPlain, formatDateFn as formatDate, SHORT_DATE_FORMAT };
