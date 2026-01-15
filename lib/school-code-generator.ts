/**
 * Generate a unique school code based on school name
 * @param schoolName - Name of the school
 * @returns Generated school code (uppercase, max 10 characters)
 */
export function generateSchoolCode(schoolName: string): string {
  if (!schoolName || schoolName.trim().length === 0) {
    throw new Error('School name is required');
  }

  // Remove special characters and convert to uppercase
  let code = schoolName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .substring(0, 10); // Max 10 characters

  // If code is too short, pad with numbers
  if (code.length < 4) {
    code = code + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    code = code.substring(0, 10);
  }

  // If code is empty after processing, generate a random one
  if (code.length === 0) {
    code = 'SCH' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  }

  return code;
}
