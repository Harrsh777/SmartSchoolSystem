/**
 * Generates a password based on school name mixed with numbers
 * Format: school name (lowercase, no spaces) + random numbers
 * Example: "ABC School" -> "abcschool1234"
 */
export function generatePassword(schoolName: string): string {
  // Clean school name: lowercase, remove spaces and special characters
  const cleanName = schoolName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8); // Limit to 8 chars for name part

  // Generate random 4-digit number
  const randomNumbers = Math.floor(1000 + Math.random() * 9000).toString();

  // Combine: name + numbers
  return cleanName + randomNumbers;
}

