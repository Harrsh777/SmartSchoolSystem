import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAndHashPassword } from '@/lib/password-generator';
import { getRequiredCurrentAcademicYear } from '@/lib/current-academic-year';
import {
  parseStudentImportClassSection,
  matchCanonicalClassFromAllowList,
} from '@/lib/students/import-class-section';
import { normalizeStudentGenderForDb } from '@/lib/students/gender';
import { friendlyStudentImportDbError } from '@/lib/import-friendly-errors';

const BATCH_SIZE = 500;

interface StudentInput {
  admission_no: string;
  class?: unknown;
  section?: unknown;
  academic_year?: unknown;
  [key: string]: unknown;
}

interface ExistingStudentRow extends Record<string, unknown> {
  id: string;
  admission_no: string;
  class?: string | null;
  section?: string | null;
}

function isNonEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, students } = body;

    if (!school_code || !students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const schoolId = schoolData.id;
    const currentYear = (await getRequiredCurrentAcademicYear(String(school_code))).year_name;

    // Get allowed class/section/academic_year from the school's Classes module (only these can be imported)
    const { data: existingClasses, error: classesError } = await supabase
      .from('classes')
      .select('class, section, academic_year')
      .eq('school_code', school_code);

    if (classesError) {
      return NextResponse.json(
        { error: 'Failed to load classes', details: classesError.message },
        { status: 500 }
      );
    }

    if (!existingClasses?.length) {
      return NextResponse.json(
        { error: 'No classes found. Create classes in the Classes module first, then import students.' },
        { status: 400 }
      );
    }

    // Preload existing students by admission_no for UPSERT behaviour
    const admissionNos = (students as StudentInput[])
      .map((s) => s.admission_no)
      .filter(Boolean);

    const { data: existingStudents } = await supabase
      .from('students')
      .select(
        'id, admission_no, class, section, student_name, first_name, last_name, date_of_birth, gender, address, city, state, pincode, aadhaar_number, email, student_contact, blood_group, sr_no, date_of_admission, religion, category, nationality, house, last_class, last_school_name, last_school_percentage, last_school_result, medium, schooling_type, roll_number, rfid, pen_no, apaar_no, rte, is_rte, new_admission, father_name, father_occupation, father_contact, mother_name, mother_occupation, mother_contact, staff_relation, transport_type, parent_name, parent_phone, parent_email, academic_year, status'
      )
      .eq('school_code', school_code)
      .in('admission_no', admissionNos);

    const existingByAdmission = new Map<string, ExistingStudentRow>();
    for (const row of existingStudents || []) {
      existingByAdmission.set(String(row.admission_no), row as ExistingStudentRow);
    }

    // Get existing students without passwords (for password generation)
    interface StudentWithAdmission {
      admission_no?: string;
      [key: string]: unknown;
    }
    const allAdmissionNos = (students as StudentWithAdmission[])
      .map((s) => s.admission_no)
      .filter(Boolean);
    const { data: existingLogins } = await supabase
      .from('student_login')
      .select('admission_no')
      .eq('school_code', school_code)
      .in('admission_no', allAdmissionNos);

    const existingLoginAdmissionNos = new Set(
      existingLogins?.map((l) => l.admission_no) || []
    );

    const errors: Array<{ row: number; error: string }> = [];
    let failedCount = 0;

    // Build lists for inserts and updates
    const studentsToInsert: Array<Record<string, unknown>> = [];
    const studentsToUpdate: Array<{ id: string; admission_no: string; patch: Record<string, unknown>; row: number }> = [];

    (students as StudentInput[]).forEach((student, idx: number) => {
      const row = idx + 1;
      const existing = student.admission_no
        ? existingByAdmission.get(String(student.admission_no))
        : undefined;

      // Normalize class/section using Classes module when we actually need to set them
      const parsed = parseStudentImportClassSection({
        class: student.class,
        section: student.section,
      });

      if (!existing) {
        // INSERT branch - strict on class/section validity
        if (!parsed.ok) {
          errors.push({ row, error: parsed.error });
          failedCount++;
          return;
        }
        const canonical = matchCanonicalClassFromAllowList(
          { class: parsed.class, section: parsed.section },
          currentYear,
          existingClasses ?? [],
          currentYear
        );
        if (!canonical) {
          errors.push({
            row,
            error: `Unknown class/section "${parsed.class}" / "${parsed.section}" for academic year ${currentYear}. Add it in Classes (e.g. class ${parsed.class}, section ${parsed.section}) or fix the cell.`,
          });
          failedCount++;
          return;
        }

        studentsToInsert.push({
          _importRow: row,
          school_id: schoolId,
          school_code: school_code,
          admission_no: student.admission_no,
          student_name:
            (student.student_name as string | undefined) ||
            `${(student.first_name as string | undefined) || ''} ${(student.last_name as string | undefined) || ''}`.trim(),
          first_name: student.first_name || null,
          last_name: student.last_name || null,
          class: canonical.class,
          section: canonical.section,
          date_of_birth: student.date_of_birth || null,
          gender: normalizeStudentGenderForDb(student.gender),
          address: student.address || null,
          city: student.city || null,
          state: student.state || null,
          pincode: student.pincode || null,
          aadhaar_number: student.aadhaar_number || null,
          email: student.email || null,
          student_contact: student.student_contact || null,
          blood_group: student.blood_group || null,
          sr_no: student.sr_no || null,
          date_of_admission: student.date_of_admission || null,
          religion: student.religion || null,
          category: student.category || null,
          nationality: student.nationality || 'Indian',
          house: student.house || null,
          last_class: student.last_class || null,
          last_school_name: student.last_school_name || null,
          last_school_percentage: student.last_school_percentage || null,
          last_school_result: student.last_school_result || null,
          medium: student.medium || null,
          schooling_type: student.schooling_type || null,
          roll_number: student.roll_number || null,
          rfid: student.rfid || null,
          pen_no: student.pen_no || null,
          apaar_no: student.apaar_no || null,
          rte: student.rte ?? false,
          // `fees/v2` uses `is_rte` for RTE checks/display.
          is_rte: student.rte ?? false,
          new_admission: student.new_admission ?? true,
          father_name: student.father_name || null,
          father_occupation: student.father_occupation || null,
          father_contact: student.father_contact || null,
          mother_name: student.mother_name || null,
          mother_occupation: student.mother_occupation || null,
          mother_contact: student.mother_contact || null,
          staff_relation: student.staff_relation || null,
          transport_type: student.transport_type || null,
          parent_name:
            student.father_name ||
            student.mother_name ||
            (student.parent_name as string | null) ||
            null,
          parent_phone:
            student.father_contact ||
            student.mother_contact ||
            (student.parent_phone as string | null) ||
            null,
          parent_email: student.parent_email || null,
          academic_year: canonical.academic_year,
          status: 'active',
        });
      } else {
        // UPDATE branch - only fill missing/null fields, never overwrite existing non-empty values
        const patch: Record<string, unknown> = {};

        const candidate: Record<string, unknown> = {
          student_name:
            (student.student_name as string | undefined) ||
            `${(student.first_name as string | undefined) || ''} ${(student.last_name as string | undefined) || ''}`.trim(),
          first_name: student.first_name,
          last_name: student.last_name,
          date_of_birth: student.date_of_birth,
          gender: normalizeStudentGenderForDb(student.gender),
          address: student.address,
          city: student.city,
          state: student.state,
          pincode: student.pincode,
          aadhaar_number: student.aadhaar_number,
          email: student.email,
          student_contact: student.student_contact,
          blood_group: student.blood_group,
          sr_no: student.sr_no,
          date_of_admission: student.date_of_admission,
          religion: student.religion,
          category: student.category,
          nationality: student.nationality,
          house: student.house,
          last_class: student.last_class,
          last_school_name: student.last_school_name,
          last_school_percentage: student.last_school_percentage,
          last_school_result: student.last_school_result,
          medium: student.medium,
          schooling_type: student.schooling_type,
          roll_number: student.roll_number,
          rfid: student.rfid,
          pen_no: student.pen_no,
          apaar_no: student.apaar_no,
          rte: student.rte,
          is_rte: student.rte,
          new_admission: student.new_admission,
          father_name: student.father_name,
          father_occupation: student.father_occupation,
          father_contact: student.father_contact,
          mother_name: student.mother_name,
          mother_occupation: student.mother_occupation,
          mother_contact: student.mother_contact,
          staff_relation: student.staff_relation,
          transport_type: student.transport_type,
          parent_name:
            student.father_name ||
            student.mother_name ||
            (student.parent_name as string | null) ||
            null,
          parent_phone:
            student.father_contact ||
            student.mother_contact ||
            (student.parent_phone as string | null) ||
            null,
          parent_email: student.parent_email,
        };

        for (const [field, incoming] of Object.entries(candidate)) {
          if (!isNonEmptyValue(incoming)) continue;
          const current = (existing as Record<string, unknown>)[field];
          if (!isNonEmptyValue(current)) {
            patch[field] = incoming;
          }
        }

        // Only consider class/section if the existing record doesn't have them yet
        if ((!existing.class || !existing.section) && parsed.ok) {
          const canonical = matchCanonicalClassFromAllowList(
            { class: parsed.class, section: parsed.section },
            currentYear,
            existingClasses ?? [],
            currentYear
          );
          if (canonical) {
            if (!isNonEmptyValue(existing.class) && isNonEmptyValue(canonical.class)) {
              patch.class = canonical.class;
            }
            if (!isNonEmptyValue(existing.section) && isNonEmptyValue(canonical.section)) {
              patch.section = canonical.section;
            }
            if (!isNonEmptyValue(existing.academic_year) && isNonEmptyValue(canonical.academic_year)) {
              patch.academic_year = canonical.academic_year;
            }
          }
        }

        if (Object.keys(patch).length > 0) {
          studentsToUpdate.push({
            id: existing.id,
            admission_no: existing.admission_no,
            patch,
            row,
          });
        }
      }
    });

    let successCount = 0;
    const generatedPasswords: Array<{ admission_no: string; password: string }> = [];

    // Insert in batches and generate passwords (strip _importRow before insert)
    for (let i = 0; i < studentsToInsert.length; i += BATCH_SIZE) {
      const batch = studentsToInsert.slice(i, i + BATCH_SIZE);
      // Strip _importRow before insert (omit from payload)
      const batchForDb = batch.map((s) => {
        const { _importRow, ...rest } = s as Record<string, unknown> & { _importRow?: number };
        void _importRow; // intentionally omitted from insert
        return rest;
      }) as Record<string, unknown>[];

      const { error: insertError, data: insertedStudents } = await supabase
        .from('students')
        .insert(batchForDb)
        .select('admission_no');

      const insertLoginsFor = async (
        admissionNos: { admission_no: string }[]
      ) => {
        successCount += admissionNos.length;
        const loginRecords = [];
        for (const student of admissionNos) {
          const { password, hashedPassword } = await generateAndHashPassword();
          loginRecords.push({
            school_code: school_code,
            admission_no: student.admission_no,
            password_hash: hashedPassword,
            plain_password: password,
            is_active: true,
          });
          generatedPasswords.push({
            admission_no: student.admission_no,
            password: password,
          });
        }
        if (loginRecords.length > 0) {
          const { error: loginInsertError } = await supabase
            .from('student_login')
            .insert(loginRecords);
          if (loginInsertError) {
            console.error('Error inserting student login records:', loginInsertError);
          }
        }
      };

      if (
        !insertError &&
        insertedStudents &&
        insertedStudents.length === batch.length
      ) {
        await insertLoginsFor(insertedStudents);
        continue;
      }

      if (insertError) {
        console.warn('Student batch insert failed, retrying per row:', insertError.message);
      }

      for (const s of batch) {
        const rowNum = (s as { _importRow?: number })._importRow ?? 0;
        const { _importRow, ...payload } = s as Record<string, unknown> & {
          _importRow?: number;
        };
        void _importRow;

        const { error: rowErr, data: rowStudent } = await supabase
          .from('students')
          .insert([payload])
          .select('admission_no')
          .maybeSingle();

        if (rowErr || !rowStudent) {
          errors.push({
            row: rowNum,
            error: friendlyStudentImportDbError(rowErr ?? insertError ?? { message: '' }),
          });
          failedCount++;
        } else {
          await insertLoginsFor([rowStudent]);
        }
      }
    }

    // Apply partial updates (UPSERT behaviour) one-by-one
    for (const { id, patch, row } of studentsToUpdate) {
      try {
        const { error: updateError } = await supabase
          .from('students')
          .update(patch)
          .eq('id', id);

        if (updateError) {
          errors.push({
            row,
            error: friendlyStudentImportDbError(updateError),
          });
          failedCount++;
        } else {
          successCount++;
        }
      } catch (e) {
        errors.push({
          row,
          error:
            e instanceof Error
              ? friendlyStudentImportDbError({ message: e.message })
              : 'Something went wrong while updating this row. Please try again.',
        });
        failedCount++;
      }
    }

    // Generate passwords for existing students without passwords
    const existingStudentsWithoutPasswords = (students as StudentInput[]).filter(
      (s) =>
        s.admission_no &&
        existingByAdmission.has(String(s.admission_no)) &&
        !existingLoginAdmissionNos.has(s.admission_no)
    );

    for (const student of existingStudentsWithoutPasswords) {
      try {
        const { password, hashedPassword } = await generateAndHashPassword();
        const { error: loginInsertError } = await supabase
          .from('student_login')
          .insert({
            school_code: school_code,
            admission_no: student.admission_no,
            password_hash: hashedPassword,
            plain_password: password, // Store plain text password
            is_active: true,
          });

        if (loginInsertError) {
          // Check if it's a duplicate (already exists)
          if (loginInsertError.code === '23505') {
            console.log(
              `Password already exists for student ${student.admission_no}, skipping`
            );
          } else {
            console.error(
              `Error generating password for ${student.admission_no}:`,
              loginInsertError
            );
          }
        } else {
          generatedPasswords.push({
            admission_no: student.admission_no,
            password: password,
          });
        }
      } catch (err) {
        console.error(
          `Error generating password for ${student.admission_no}:`,
          err
        );
      }
    }

    return NextResponse.json(
      {
        total: (students as unknown[]).length,
        success: successCount,
        failed: failedCount,
        errors,
        passwords: generatedPasswords,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'ACADEMIC_YEAR_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Setup academic year first from Academic Year Management module.' },
        { status: 400 }
      );
    }
    console.error('Error importing students:', error);
    return NextResponse.json(
      {
        error: 'Failed to import students',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
