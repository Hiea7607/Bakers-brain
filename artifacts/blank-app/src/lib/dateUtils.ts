// artifacts/blank-app/src/lib/dateUtils.ts

/**
 * Converts any valid date input into the universal "DD Mon YYYY" format.
 * Example: "2026-09-11" -> "11 Sep 2026"
 */
export function formatToUniversalDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";

  const date = new Date(dateInput);

  // Return empty string if the date is invalid
  if (isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}