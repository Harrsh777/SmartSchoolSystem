import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAndHashPassword } from '@/lib/password-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, regenerate_all } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get all staff for the school
    const { data: allStaff, error: staffError } = await supabase
      .from('staff')
      .select('school_code, staff_id, id')
      .eq('school_code', school_code);

    if (staffError) {
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: staffError.message },
        { status: 500 }
      );
    }

    if (!allStaff || allStaff.length === 0) {
      return NextResponse.json({
        message: 'No staff found for this school',
        results: {
          total: 0,
          processed: 0,
          created: 0,
          updated: 0,
          errors: [],
        },
      }, { status: 200 });
    }

    // Get existing login records
    const staffIds = allStaff.map(s => s.staff_id);
    const { data: existingLogins } = await supabase
      .from('staff_login')
      .select('staff_id')
      .eq('school_code', school_code)
      .in('staff_id', staffIds);

    const existingStaffIds = new Set(
      existingLogins?.map(l => l.staff_id) || []
    );

    // Determine which staff to process
    const staffToProcess = regenerate_all
      ? allStaff // Process all if regenerate_all is true
      : allStaff.filter(s => !existingStaffIds.has(s.staff_id)); // Only those without passwords

    const results = {
      total: allStaff.length,
      processed: staffToProcess.length,
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    for (let i = 0; i < staffToProcess.length; i += BATCH_SIZE) {
      const batch = staffToProcess.slice(i, i + BATCH_SIZE);
      const loginRecords = [];

      for (const member of batch) {
        try {
          const { password, hashedPassword } = await generateAndHashPassword();
          const isExisting = existingStaffIds.has(member.staff_id);

          loginRecords.push({
            school_code: member.school_code,
            staff_id: member.staff_id,
            password_hash: hashedPassword,
            plain_password: password, // Store plain text password
            is_active: true,
          });

          // Count based on whether record exists and regenerate_all flag
          if (isExisting && regenerate_all) {
            results.updated++;
          } else if (!isExisting) {
            results.created++;
          }
        } catch (err) {
          results.errors.push(
            `Staff ${member.staff_id}: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      }

      // Upsert login records (insert new or update existing)
      if (loginRecords.length > 0) {
        const { error: upsertError } = await supabase
          .from('staff_login')
          .upsert(loginRecords, {
            onConflict: 'school_code,staff_id',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          results.errors.push(`Batch upsert error: ${upsertError.message}`);
        }
      }
    }

    return NextResponse.json({
      message: 'Password generation completed',
      results,
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating staff passwords:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

