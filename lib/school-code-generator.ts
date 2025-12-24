import { supabase } from './supabase';

/**
 * Generates a unique school code in format SCH001, SCH002, etc.
 * Gets the highest existing code and increments it
 * Includes retry mechanism to ensure uniqueness even in race conditions
 */
export async function generateSchoolCode(): Promise<string> {
  const maxRetries = 10; // Maximum number of retry attempts
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Get all existing school codes from accepted_schools
      const { data: acceptedSchools, error: acceptedError } = await supabase
        .from('accepted_schools')
        .select('school_code')
        .not('school_code', 'is', null);

      if (acceptedError) {
        console.error('Error fetching accepted schools:', acceptedError);
        // On first attempt, try starting from SCH001
        if (attempt === 0) {
          // Check if SCH001 already exists
          const { data: checkData } = await supabase
            .from('accepted_schools')
            .select('school_code')
            .eq('school_code', 'SCH001')
            .single();
          
          if (!checkData) {
            return 'SCH001';
          }
        }
        // If fetch fails, try a random code
        const randomNum = Math.floor(Math.random() * 999) + 1;
        const candidateCode = `SCH${randomNum.toString().padStart(3, '0')}`;
        
        // Verify this code doesn't exist
        const { data: exists } = await supabase
          .from('accepted_schools')
          .select('school_code')
          .eq('school_code', candidateCode)
          .single();
        
        if (!exists) {
          return candidateCode;
        }
        continue; // Try again
      }

      // Extract numbers from existing codes (SCH001 -> 1, SCH002 -> 2, etc.)
      const existingNumbers = (acceptedSchools || [])
        .map(school => {
          const match = school.school_code?.match(/SCH(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      // Find the next available number
      const nextNumber = existingNumbers.length > 0 
        ? Math.max(...existingNumbers) + 1 
        : 1;

      // Format as SCH001, SCH002, etc. (3 digits with leading zeros)
      const candidateCode = `SCH${nextNumber.toString().padStart(3, '0')}`;

      // Double-check that this code doesn't exist (handles race conditions)
      const { data: exists, error: checkError } = await supabase
        .from('accepted_schools')
        .select('school_code')
        .eq('school_code', candidateCode)
        .single();

      // If code doesn't exist, it's safe to use
      if (!exists && checkError?.code === 'PGRST116') {
        // PGRST116 means no rows found, which is what we want
        return candidateCode;
      }

      // If code exists (race condition), increment and try again
      if (exists) {
        // Try next number
        const nextAttempt = nextNumber + 1;
        const nextCandidate = `SCH${nextAttempt.toString().padStart(3, '0')}`;
        
        // Verify this one doesn't exist either
        const { data: nextExists } = await supabase
          .from('accepted_schools')
          .select('school_code')
          .eq('school_code', nextCandidate)
          .single();
        
        if (!nextExists) {
          return nextCandidate;
        }
        // Continue to next iteration
        continue;
      }

      // If we get here, something unexpected happened, try next number
      continue;
    } catch (error) {
      console.error(`Error generating school code (attempt ${attempt + 1}):`, error);
      
      // On last attempt, generate a random code with timestamp to ensure uniqueness
      if (attempt === maxRetries - 1) {
        const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
        const randomNum = Math.floor(Math.random() * 99) + 1;
        return `SCH${timestamp}${randomNum.toString().padStart(2, '0')}`.slice(0, 6); // Ensure SCH format
      }
    }
  }

  // Final fallback (should never reach here, but just in case)
  const timestamp = Date.now().toString().slice(-4);
  return `SCH${timestamp}`;
}

