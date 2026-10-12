export function formatToUniversalDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";

  let year, month, day;

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return "";
    year = dateInput.getFullYear();
    month = dateInput.getMonth();
    day = dateInput.getDate();
  } else {
    const dateStr = String(dateInput).trim();

    // 1. Check for strict Database Format (YYYY-MM-DD or YYYY/MM/DD)
    if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(dateStr)) {
      const parts = dateStr.split(/[/-]/);
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } 
    // 2. Check for Bangladesh Format (DD-MM-YYYY or DD/MM/YYYY)
    else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(dateStr)) {
      const parts = dateStr.split(/[/-]/);
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
    } 
    // 3. Fallback for standard text like "today"
    else {
      const fallback = new Date(dateStr);
      if (isNaN(fallback.getTime())) return dateStr;
      year = fallback.getFullYear();
      month = fallback.getMonth();
      day = fallback.getDate();
    }
  }

  const paddedDay = String(day).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = monthNames[month];

  return `${paddedDay} ${monthName} ${year}`;
}