/**
 * Parses a date string in multiple formats and returns ISO format (YYYY-MM-DD)
 * Supports:
 * - YYYY-MM-DD (e.g., 2024-01-15)
 * - DD-MM-YYYY (e.g., 15-01-2024)
 * - DD/MM/YYYY (e.g., 15/01/2024)
 * - YYYY/MM/DD (e.g., 2024/01/15)
 */
export function parseDate(dateString: string): string | null {
  if (!dateString || !dateString.trim()) {
    return null;
  }

  const trimmed = dateString.trim();
  
  // Try YYYY-MM-DD format first (ISO format)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return formatToISO(date);
    }
  }

  // Try DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isValidDate(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isValidDate(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try YYYY/MM/DD format
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    if (isValidDate(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try native Date parsing as fallback
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return formatToISO(date);
  }

  return null;
}

/**
 * Validates if a date is valid
 */
function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Formats a Date object to YYYY-MM-DD format
 */
function formatToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates if a date string is in a supported format
 */
export function isValidDateFormat(dateString: string): boolean {
  if (!dateString || !dateString.trim()) {
    return false;
  }

  const parsed = parseDate(dateString);
  return parsed !== null;
}

