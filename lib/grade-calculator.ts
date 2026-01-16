/**
 * Grade Calculation Utility
 * Handles all grade-related calculations based on percentage
 */

export interface GradeScale {
  grade: string;
  min_percentage: number;
  max_percentage: number;
  grade_point?: number;
  description?: string;
}

/**
 * Default grade scale (can be overridden by school-specific settings)
 */
export const DEFAULT_GRADE_SCALE: GradeScale[] = [
  { grade: 'A+', min_percentage: 90, max_percentage: 100, grade_point: 10, description: 'Outstanding' },
  { grade: 'A', min_percentage: 80, max_percentage: 89, grade_point: 9, description: 'Excellent' },
  { grade: 'B+', min_percentage: 70, max_percentage: 79, grade_point: 8, description: 'Very Good' },
  { grade: 'B', min_percentage: 60, max_percentage: 69, grade_point: 7, description: 'Good' },
  { grade: 'C', min_percentage: 50, max_percentage: 59, grade_point: 6, description: 'Average' },
  { grade: 'D', min_percentage: 40, max_percentage: 49, grade_point: 5, description: 'Below Average' },
  { grade: 'F', min_percentage: 0, max_percentage: 39, grade_point: 0, description: 'Fail' },
];

/**
 * Calculate percentage from marks
 */
export function calculatePercentage(marksObtained: number, maxMarks: number): number {
  if (maxMarks === 0) return 0;
  const percentage = (marksObtained / maxMarks) * 100;
  return Math.round(percentage * 100) / 100; // Round to 2 decimal places
}

/**
 * Get grade from percentage using grade scale
 */
export function getGradeFromPercentage(
  percentage: number,
  gradeScale: GradeScale[] = DEFAULT_GRADE_SCALE
): string {
  // Ensure percentage is within valid range
  const validPercentage = Math.max(0, Math.min(100, percentage));

  // Find matching grade
  for (const scale of gradeScale) {
    if (validPercentage >= scale.min_percentage && validPercentage <= scale.max_percentage) {
      return scale.grade;
    }
  }

  // Default to F if no match found
  return 'F';
}

/**
 * Check if student passed based on marks and passing marks threshold
 */
export function checkPassStatus(marksObtained: number, passingMarks: number): 'pass' | 'fail' {
  return marksObtained >= passingMarks ? 'pass' : 'fail';
}

/**
 * Calculate overall percentage from multiple subjects
 */
export function calculateOverallPercentage(
  marksArray: Array<{ marks_obtained: number; max_marks: number }>
): number {
  const totalObtained = marksArray.reduce((sum, m) => sum + m.marks_obtained, 0);
  const totalMax = marksArray.reduce((sum, m) => sum + m.max_marks, 0);
  return calculatePercentage(totalObtained, totalMax);
}

/**
 * Get grade color for UI display
 */
export function getGradeColor(grade: string): string {
  const gradeColors: Record<string, string> = {
    'A+': 'text-green-700 dark:text-green-400 font-bold',
    'A': 'text-green-600 dark:text-green-400',
    'B+': 'text-blue-600 dark:text-blue-400',
    'B': 'text-blue-500 dark:text-blue-400',
    'C': 'text-yellow-600 dark:text-yellow-400',
    'D': 'text-orange-600 dark:text-orange-400',
    'F': 'text-red-600 dark:text-red-400 font-bold',
  };
  return gradeColors[grade] || 'text-gray-600 dark:text-gray-400';
}

/**
 * Get pass/fail status color
 */
export function getPassStatusColor(status: 'pass' | 'fail'): string {
  return status === 'pass'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
}

/**
 * Calculate rank from sorted marks array
 */
export function calculateRank(
  studentPercentage: number,
  allPercentages: number[]
): number {
  // Sort in descending order
  const sorted = [...allPercentages].sort((a, b) => b - a);
  
  // Find position (1-based index)
  const rank = sorted.findIndex((p) => p === studentPercentage) + 1;
  
  // Handle ties - if multiple students have same percentage, they get same rank
  return rank || 1;
}
