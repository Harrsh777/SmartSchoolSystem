import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAndHashPassword } from '@/lib/password-generator';
import { randomUUID } from 'crypto';
import {
  digits10,
  digits12Aadhaar,
  normalizeStaffGenderForImport,
  validateStaffImportCore,
} from '@/lib/staff/import-validation';

const BATCH_SIZE = 500;

interface StaffInput extends Record<string, unknown> {
  staff_id?: string;
  employee_code?: string;
  full_name?: string;
  role?: string;
  department?: string;
  designation?: string;
  phone?: string;
  contact1?: string;
  email?: string;
  date_of_joining?: string;
  dob?: string;
  gender?: string;
  adhar_no?: string;
  category?: string;
}

type ExistingStaff = Record<string, unknown> & {
  id: string;
  staff_id: string;
};

function isNonEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return !Number.isNaN(value);
  return true;
}

function normalizeIncomingRow(
  member: StaffInput,
  schoolId: string,
  schoolCode: string
): Record<string, unknown> {
  const phone = digits10(member.phone) ?? null;
  const c1 = digits10(member.contact1) ?? phone;
  const c2Raw = digits10(member.contact2);
  const adhar = digits12Aadhaar(member.adhar_no) ?? null;
  const gender = normalizeStaffGenderForImport(member.gender) ?? null;

  return {
    school_id: schoolId,
    school_code: schoolCode,
    full_name: String(member.full_name ?? '').trim(),
    role: String(member.role ?? '').trim(),
    department: String(member.department ?? '').trim() || null,
    designation: String(member.designation ?? '').trim() || null,
    email: String(member.email ?? '').trim() || null,
    phone,
    date_of_joining: member.date_of_joining || null,
    employment_type: member.employment_type || null,
    qualification: member.qualification || null,
    experience_years: member.experience_years ?? null,
    gender,
    address: member.address || null,
    dob: member.dob || null,
    adhar_no: adhar,
    blood_group: member.blood_group || null,
    religion: member.religion || null,
    category: String(member.category ?? '').trim() || null,
    nationality: member.nationality || 'Indian',
    contact1: c1,
    contact2: c2Raw ?? null,
    employee_code: member.employee_code || member.staff_id || null,
    dop: member.dop || null,
    short_code: member.short_code || null,
    rfid: member.rfid || null,
    uuid: member.uuid || randomUUID(),
    alma_mater: member.alma_mater || null,
    major: member.major || null,
    website: member.website || null,
  };
}

function buildPhoneLookupMap(rows: ExistingStaff[]): Map<string, ExistingStaff> {
  const map = new Map<string, ExistingStaff>();
  for (const s of rows) {
    const p = digits10(s.phone);
    if (p && !map.has(p)) map.set(p, s);
    const c = digits10(s.contact1);
    if (c && !map.has(c)) map.set(c, s);
  }
  return map;
}

function findExistingForRow(
  member: StaffInput,
  byStaffId: Map<string, ExistingStaff>,
  byPhone: Map<string, ExistingStaff>
): ExistingStaff | undefined {
  const sid = String(member.staff_id || member.employee_code || '').trim();
  if (sid && byStaffId.has(sid)) return byStaffId.get(sid);
  const p = digits10(member.phone);
  if (p && byPhone.has(p)) return byPhone.get(p);
  const c1 = digits10(member.contact1);
  if (c1 && byPhone.has(c1)) return byPhone.get(c1);
  return undefined;
}

function maxStaffNumericSuffix(existingList: ExistingStaff[]): number {
  let max = 0;
  for (const s of existingList) {
    const m = String(s.staff_id).match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, staff } = body;

    if (!school_code || !staff || !Array.isArray(staff)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const schoolId = schoolData.id;

    const { data: subjectsRows } = await supabase
      .from('timetable_subjects')
      .select('name')
      .eq('school_code', school_code);
    const validSubjects = new Set(
      (subjectsRows ?? []).map((s) => s.name).filter(Boolean) as string[]
    );

    const { data: allExisting } = await supabase
      .from('staff')
      .select(
        'id, staff_id, full_name, role, department, designation, email, phone, date_of_joining, employment_type, qualification, experience_years, gender, address, dob, adhar_no, blood_group, religion, category, nationality, contact1, contact2, employee_code, dop, short_code, rfid, uuid, alma_mater, major, website'
      )
      .eq('school_code', school_code);

    const existingList = (allExisting || []) as ExistingStaff[];
    const byStaffId = new Map<string, ExistingStaff>();
    for (const s of existingList) {
      if (s.staff_id) byStaffId.set(String(s.staff_id), s);
      const ec = s.employee_code;
      if (ec && String(ec).trim()) {
        byStaffId.set(String(ec).trim(), s);
      }
    }
    const byPhone = buildPhoneLookupMap(existingList);

    const { data: existingLogins } = await supabase
      .from('staff_login')
      .select('staff_id')
      .eq('school_code', school_code);
    const existingLoginStaffIds = new Set(
      existingLogins?.map((l) => l.staff_id) || []
    );

    const errors: Array<{ row: number; error: string }> = [];
    let failedCount = 0;

    type Plan =
      | {
          kind: 'insert';
          row: number;
          payload: Record<string, unknown>;
        }
      | {
          kind: 'update';
          row: number;
          id: string;
          staff_id: string;
          patch: Record<string, unknown>;
        }
      | { kind: 'noop'; row: number; staff_id: string };

    const plans: Plan[] = [];

    (staff as StaffInput[]).forEach((raw, idx) => {
      const row = idx + 1;
      const v = validateStaffImportCore(raw, { validSubjects });
      if (v.errors.length > 0) {
        for (const msg of v.errors) {
          errors.push({ row, error: msg });
        }
        failedCount++;
        return;
      }

      const normalized = normalizeIncomingRow(raw, schoolId, school_code);
      const existing = findExistingForRow(raw, byStaffId, byPhone);

      if (existing) {
        const patch: Record<string, unknown> = {};
        for (const [field, incoming] of Object.entries(normalized)) {
          if (field === 'school_id' || field === 'school_code') continue;
          if (field === 'uuid' && isNonEmptyValue(existing.uuid)) continue;
          if (!isNonEmptyValue(incoming)) continue;
          const current = existing[field];
          if (!isNonEmptyValue(current)) {
            patch[field] = incoming;
          }
        }
        if (Object.keys(patch).length > 0) {
          plans.push({
            kind: 'update',
            row,
            id: existing.id,
            staff_id: existing.staff_id,
            patch,
          });
        } else {
          plans.push({ kind: 'noop', row, staff_id: existing.staff_id });
        }
      } else {
        plans.push({ kind: 'insert', row, payload: { ...normalized } });
      }
    });

    let nextNum = maxStaffNumericSuffix(existingList);
    for (const p of plans) {
      if (p.kind !== 'insert') continue;
      nextNum += 1;
      const staffId = `STF${String(nextNum).padStart(3, '0')}`;
      p.payload.staff_id = staffId;
      p.payload.employee_code = p.payload.employee_code || staffId;
    }

    let successCount = 0;
    const generatedPasswords: Array<{ staff_id: string; password: string }> =
      [];

    const inserts = plans.filter((p): p is Extract<Plan, { kind: 'insert' }> => p.kind === 'insert');

    for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
      const batch = inserts.slice(i, i + BATCH_SIZE);
      const batchRows = batch.map((b) => b.payload);

      const { error: insertError, data: insertedStaff } = await supabase
        .from('staff')
        .insert(batchRows)
        .select('staff_id');

      if (insertError) {
        batch.forEach((b) => {
          errors.push({ row: b.row, error: insertError.message });
          failedCount++;
        });
      } else {
        successCount += batch.length;
        const loginRecords = [];
        for (const member of insertedStaff || []) {
          const { password, hashedPassword } = await generateAndHashPassword();
          loginRecords.push({
            school_code: school_code,
            staff_id: member.staff_id,
            password_hash: hashedPassword,
            plain_password: password,
            is_active: true,
          });
          generatedPasswords.push({
            staff_id: member.staff_id,
            password: password,
          });
        }
        if (loginRecords.length > 0) {
          const { error: loginInsertError } = await supabase
            .from('staff_login')
            .insert(loginRecords);
          if (loginInsertError) {
            console.error(
              'Error inserting staff login records:',
              loginInsertError
            );
          } else {
            for (const r of loginRecords) {
              existingLoginStaffIds.add(r.staff_id as string);
            }
          }
        }
      }
    }

    const updates = plans.filter(
      (p): p is Extract<Plan, { kind: 'update' }> => p.kind === 'update'
    );
    for (const u of updates) {
      const { error: updateError } = await supabase
        .from('staff')
        .update(u.patch)
        .eq('id', u.id);
      if (updateError) {
        errors.push({ row: u.row, error: updateError.message });
        failedCount++;
      } else {
        successCount++;
      }
    }

    successCount += plans.filter((p) => p.kind === 'noop').length;

    const touchedStaffIds = new Set<string>();
    for (const p of plans) {
      if (p.kind === 'insert') {
        const sid = p.payload.staff_id;
        if (typeof sid === 'string') touchedStaffIds.add(sid);
      } else {
        touchedStaffIds.add(p.staff_id);
      }
    }

    for (const staffId of touchedStaffIds) {
      if (existingLoginStaffIds.has(staffId)) continue;
      try {
        const { password, hashedPassword } = await generateAndHashPassword();
        const { error: loginInsertError } = await supabase
          .from('staff_login')
          .insert({
            school_code: school_code,
            staff_id: staffId,
            password_hash: hashedPassword,
            plain_password: password,
            is_active: true,
          });
        if (loginInsertError) {
          if (loginInsertError.code !== '23505') {
            console.error(
              `Error generating password for ${staffId}:`,
              loginInsertError
            );
          }
        } else {
          generatedPasswords.push({ staff_id: staffId, password: password });
          existingLoginStaffIds.add(staffId);
        }
      } catch (err) {
        console.error(`Error generating password for ${staffId}:`, err);
      }
    }

    return NextResponse.json(
      {
        total: staff.length,
        success: successCount,
        failed: failedCount,
        errors,
        passwords: generatedPasswords,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error importing staff:', error);
    return NextResponse.json(
      {
        error: 'Failed to import staff',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
