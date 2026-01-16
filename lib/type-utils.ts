/**
 * Type utility functions for safely handling unknown types
 */

/**
 * Safely converts an unknown value to a string
 * @param value - The value to convert
 * @returns A string representation of the value, or empty string if conversion fails
 */
export function getString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/**
 * Safely converts an unknown value to a number
 * @param value - The value to convert
 * @returns A number representation of the value, or 0 if conversion fails
 */
export function getNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Safely gets an icon size value from an unknown type
 * Ensures the value is a valid number for icon size props
 * @param value - The value to convert to icon size
 * @param defaultValue - Default size if value is invalid (default: 20)
 * @returns A number suitable for icon size prop
 */
export function getIconSize(value: unknown, defaultValue: number = 20): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number' && value > 0) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return defaultValue;
}
