/**
 * Parse a date string in various formats to ISO date string (YYYY-MM-DD)
 * @param dateString - Date string in various formats
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 */
export function parseDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;

  // Remove extra whitespace
  const trimmed = dateString.toString().trim();
  if (!trimmed) return null;

  try {
    // Try parsing as ISO date first
    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toISOString().split('T')[0];
    }

    // Try common date formats
    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match1 = trimmed.match(ddmmyyyy);
    if (match1) {
      const [, day, month, year] = match1;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // MM/DD/YYYY or MM-DD-YYYY
    const mmddyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match2 = trimmed.match(mmddyyyy);
    if (match2) {
      const [, month, day, year] = match2;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // YYYY/MM/DD or YYYY-MM-DD
    const yyyymmdd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
    const match3 = trimmed.match(yyyymmdd);
    if (match3) {
      const [, year, month, day] = match3;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try parsing as Date object
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Check if a date string is in a valid format
 * @param dateString - Date string to validate
 * @returns True if the date string is in a valid format
 */
export function isValidDateFormat(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const parsed = parseDate(dateString);
  return parsed !== null;
}
