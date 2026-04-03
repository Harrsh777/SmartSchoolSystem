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
import {
  friendlyStaffImportDbError,
  isStaffAdharUniqueViolation,
  staffAdharDuplicateMessage,
} from '@/lib/import-friendly-errors';

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

/** Match existing staff by Aadhaar (12 digits) for this school — enables re-import / upsert. */
function buildAdharLookupMap(rows: ExistingStaff[]): Map<string, ExistingStaff> {
  const map = new Map<string, ExistingStaff>();
  for (const s of rows) {
    const a = digits12Aadhaar(s.adhar_no);
    if (a && !map.has(a)) map.set(a, s);
  }
  return map;
}

function findExistingForRow(
  member: StaffInput,
  byStaffId: Map<string, ExistingStaff>,
  byPhone: Map<string, ExistingStaff>,
  byAdhar: Map<string, ExistingStaff>
): ExistingStaff | undefined {
  const sid = String(member.staff_id || member.employee_code || '').trim();
  if (sid && byStaffId.has(sid)) return byStaffId.get(sid);
  const p = digits10(member.phone);
  if (p && byPhone.has(p)) return byPhone.get(p);
  const c1 = digits10(member.contact1);
  if (c1 && byPhone.has(c1)) return byPhone.get(c1);
  const ad = digits12Aadhaar(member.adhar_no);
  if (ad && byAdhar.has(ad)) return byAdhar.get(ad);
  return undefined;
}

const STAFF_ROW_SELECT =
  'id, staff_id, school_code, full_name, role, department, designation, email, phone, date_of_joining, employment_type, qualification, experience_years, gender, address, dob, adhar_no, blood_group, religion, category, nationality, contact1, contact2, employee_code, dop, short_code, rfid, uuid, alma_mater, major, website';

/** Import upsert: overwrite DB fields when the file has a non-empty value. */
function buildImportUpsertPatch(normalized: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [field, incoming] of Object.entries(normalized)) {
    if (field === 'school_id' || field === 'school_code') continue;
    if (field === 'uuid') continue;
    if (field === 'staff_id' || field === 'employee_code') continue;
    if (!isNonEmptyValue(incoming)) continue;
    patch[field] = incoming;
  }
  return patch;
}

function maxStaffNumericSuffix(existingList: ExistingStaff[]): number {
  let max = 0;
  for (const s of existingList) {
    const m = String(s.staff_id).match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

type StaffInsertPlan = {
  kind: 'insert';
  row: number;
  payload: Record<string, unknown>;
  /** How many spreadsheet rows this insert represents (after merging same-Aadhaar rows). */
  importRowsRepresented: number;
};

/**
 * Excel often makes two rows the same 12-digit Aadhaar (or parses two cells to the same value).
 * Multiple INSERTs with the same Aadhaar would make row 2 fail after row 1 succeeds — merge into one row (last wins).
 */
function dedupeInsertPlansByAadhar(plans: StaffInsertPlan[]): StaffInsertPlan[] {
  const withCount = (p: StaffInsertPlan): StaffInsertPlan => ({
    ...p,
    importRowsRepresented: p.importRowsRepresented ?? 1,
  });

  const noAadhar: StaffInsertPlan[] = [];
  const byAdhar = new Map<string, StaffInsertPlan[]>();
  for (const p of plans) {
    const a = digits12Aadhaar(p.payload.adhar_no);
    if (!a) {
      noAadhar.push(withCount(p));
      continue;
    }
    if (!byAdhar.has(a)) byAdhar.set(a, []);
    byAdhar.get(a)!.push(p);
  }

  const merged: StaffInsertPlan[] = [];
  byAdhar.forEach((group) => {
    if (group.length === 1) {
      merged.push(withCount(group[0]));
      return;
    }
    const mergedPayload: Record<string, unknown> = { ...group[0].payload };
    for (let i = 1; i < group.length; i++) {
      Object.assign(mergedPayload, group[i].payload);
    }
    const last = group[group.length - 1];
    merged.push({
      kind: 'insert',
      row: last.row,
      payload: mergedPayload,
      importRowsRepresented: group.length,
    });
  });

  return [...noAadhar, ...merged];
}

function normalizeSchoolCode(code: string): string {
  return String(code ?? '').trim().toUpperCase();
}

type AdharRecoverResult =
  | { kind: 'updated'; staffId: string }
  | { kind: 'not_found' }
  | { kind: 'other_school' };

/**
 * After insert hits unique on Aadhaar: update same-school row, or detect true cross-school/global conflict.
 * Uses limit(1) — maybeSingle() errors when duplicate rows share the same Aadhaar (bad legacy data).
 * School codes are compared case-insensitively (URL may be lowercase; DB often uppercase).
 */
async function recoverAfterAdharInsertConflict(
  schoolCodeNorm: string,
  payload: Record<string, unknown>
): Promise<AdharRecoverResult> {
  const ad = digits12Aadhaar(payload.adhar_no);
  if (!ad) return { kind: 'not_found' };

  const { data: localRows, error: localErr } = await supabase
    .from('staff')
    .select('id, staff_id')
    .eq('school_code', schoolCodeNorm)
    .eq('adhar_no', ad)
    .limit(1);

  if (localErr) {
    console.error('recoverAfterAdharInsertConflict local select:', localErr);
  }

  const local = localRows?.[0];
  if (local?.id && local.staff_id) {
    const patch = buildImportUpsertPatch(payload);
    const { error } = await supabase
      .from('staff')
      .update(patch)
      .eq('id', local.id);
    if (!error) {
      return { kind: 'updated', staffId: String(local.staff_id) };
    }
  }

  const { data: anyRows, error: anyErr } = await supabase
    .from('staff')
    .select('id, staff_id, school_code')
    .eq('adhar_no', ad)
    .limit(1);

  if (anyErr) {
    console.error('recoverAfterAdharInsertConflict global select:', anyErr);
  }

  const anyRow = anyRows?.[0];
  if (anyRow?.id && anyRow.staff_id && anyRow.school_code != null) {
    if (normalizeSchoolCode(String(anyRow.school_code)) !== schoolCodeNorm) {
      return { kind: 'other_school' };
    }
    const patch = buildImportUpsertPatch(payload);
    const { error: upErr } = await supabase
      .from('staff')
      .update(patch)
      .eq('id', anyRow.id);
    if (!upErr) {
      return { kind: 'updated', staffId: String(anyRow.staff_id) };
    }
  }

  return { kind: 'not_found' };
}

/** Create staff_login only when a staff row exists (never for failed inserts / orphan STF ids). */
async function ensureStaffLoginIfMissing(
  schoolCodeNorm: string,
  staffId: string,
  existingLoginStaffIds: Set<string>,
  generatedPasswords: Array<{ staff_id: string; password: string }>
): Promise<void> {
  if (!staffId || existingLoginStaffIds.has(staffId)) return;

  const { data: staffRow } = await supabase
    .from('staff')
    .select('staff_id')
    .eq('school_code', schoolCodeNorm)
    .eq('staff_id', staffId)
    .maybeSingle();

  if (!staffRow) return;

  try {
    const { password, hashedPassword } = await generateAndHashPassword();
    const { error: loginInsertError } = await supabase.from('staff_login').insert({
      school_code: schoolCodeNorm,
      staff_id: staffId,
      password_hash: hashedPassword,
      plain_password: password,
      is_active: true,
    });
    if (loginInsertError) {
      if (loginInsertError.code !== '23505') {
        console.error(`staff_login insert for ${staffId}:`, loginInsertError);
      }
      if (loginInsertError.code === '23505') {
        existingLoginStaffIds.add(staffId);
      }
    } else {
      generatedPasswords.push({ staff_id: staffId, password });
      existingLoginStaffIds.add(staffId);
    }
  } catch (err) {
    console.error(`ensureStaffLoginIfMissing ${staffId}:`, err);
  }
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

    const schoolCodeNorm = normalizeSchoolCode(school_code);

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCodeNorm)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const schoolId = schoolData.id;

    const { data: subjectsRows } = await supabase
      .from('timetable_subjects')
      .select('name')
      .eq('school_code', schoolCodeNorm);
    const validSubjects = new Set(
      (subjectsRows ?? []).map((s) => s.name).filter(Boolean) as string[]
    );

    const { data: allExisting } = await supabase
      .from('staff')
      .select(STAFF_ROW_SELECT)
      .eq('school_code', schoolCodeNorm);

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
    const byAdhar = buildAdharLookupMap(existingList);

    const staffArr = staff as StaffInput[];

    const { data: existingLogins } = await supabase
      .from('staff_login')
      .select('staff_id')
      .eq('school_code', schoolCodeNorm);
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
          importRowsRepresented: number;
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

    staffArr.forEach((raw, idx) => {
      const row = idx + 1;

      const v = validateStaffImportCore(raw, { validSubjects });
      if (v.errors.length > 0) {
        for (const msg of v.errors) {
          errors.push({ row, error: msg });
        }
        failedCount++;
        return;
      }

      const normalized = normalizeIncomingRow(raw, schoolId, schoolCodeNorm);
      const existing = findExistingForRow(raw, byStaffId, byPhone, byAdhar);

      if (existing) {
        const patch = buildImportUpsertPatch(normalized);
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
        plans.push({
          kind: 'insert',
          row,
          payload: { ...normalized },
          importRowsRepresented: 1,
        });
      }
    });

    const nonInserts = plans.filter((p) => p.kind !== 'insert');
    const rawInserts = plans.filter(
      (p): p is Extract<Plan, { kind: 'insert' }> => p.kind === 'insert'
    );
    const dedupedInserts = dedupeInsertPlansByAadhar(rawInserts);
    const plansFinal: Plan[] = [...nonInserts, ...dedupedInserts];

    let nextNum = maxStaffNumericSuffix(existingList);
    for (const p of plansFinal) {
      if (p.kind !== 'insert') continue;
      nextNum += 1;
      const staffId = `STF${String(nextNum).padStart(3, '0')}`;
      p.payload.staff_id = staffId;
      p.payload.employee_code = p.payload.employee_code || staffId;
    }

    let successCount = 0;
    const generatedPasswords: Array<{ staff_id: string; password: string }> =
      [];

    const inserts = plansFinal.filter(
      (p): p is Extract<Plan, { kind: 'insert' }> => p.kind === 'insert'
    );

    for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
      const batch = inserts.slice(i, i + BATCH_SIZE);
      const batchRows = batch.map((b) => b.payload);

      const { error: insertError, data: insertedStaff } = await supabase
        .from('staff')
        .insert(batchRows)
        .select('staff_id');

      const processInserted = async (
        members: { staff_id: string; importRowsRepresented?: number }[]
      ) => {
        for (const member of members) {
          successCount += member.importRowsRepresented ?? 1;
        }
        const loginRecords: Array<{
          school_code: string;
          staff_id: string;
          password_hash: string;
          plain_password: string;
          is_active: boolean;
        }> = [];
        const passwordsForRows: Array<{ staff_id: string; password: string }> =
          [];
        for (const member of members) {
          const { password, hashedPassword } = await generateAndHashPassword();
          loginRecords.push({
            school_code: schoolCodeNorm,
            staff_id: member.staff_id,
            password_hash: hashedPassword,
            plain_password: password,
            is_active: true,
          });
          passwordsForRows.push({
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
            generatedPasswords.push(...passwordsForRows);
          }
        }
      };

      if (
        !insertError &&
        insertedStaff &&
        insertedStaff.length === batch.length
      ) {
        await processInserted(
          insertedStaff.map((m, idx) => ({
            staff_id: m.staff_id,
            importRowsRepresented: batch[idx].importRowsRepresented,
          }))
        );
        continue;
      }

      // Batch failed (e.g. one bad row) — retry row-by-row so only problem rows show errors.
      if (insertError) {
        console.warn('Staff batch insert failed, retrying per row:', insertError.message);
      }
      for (const b of batch) {
        const { error: rowErr, data: rowData } = await supabase
          .from('staff')
          .insert([b.payload])
          .select('staff_id')
          .maybeSingle();

        if (rowErr || !rowData) {
          let recovered = false;
          if (rowErr && isStaffAdharUniqueViolation(rowErr)) {
            const outcome = await recoverAfterAdharInsertConflict(
              schoolCodeNorm,
              b.payload as Record<string, unknown>
            );
            if (outcome.kind === 'updated') {
              successCount += b.importRowsRepresented;
              await ensureStaffLoginIfMissing(
                schoolCodeNorm,
                outcome.staffId,
                existingLoginStaffIds,
                generatedPasswords
              );
              recovered = true;
            } else if (outcome.kind === 'other_school') {
              errors.push({
                row: b.row,
                error: staffAdharDuplicateMessage('other_school_or_global_db'),
              });
              failedCount++;
              recovered = true;
            }
          }
          if (!recovered) {
            errors.push({
              row: b.row,
              error: friendlyStaffImportDbError(
                rowErr ?? insertError ?? { message: '' }
              ),
            });
            failedCount++;
          }
        } else {
          await processInserted([
            {
              staff_id: rowData.staff_id,
              importRowsRepresented: b.importRowsRepresented,
            },
          ]);
        }
      }
    }

    const updates = plansFinal.filter(
      (p): p is Extract<Plan, { kind: 'update' }> => p.kind === 'update'
    );
    for (const u of updates) {
      const { error: updateError } = await supabase
        .from('staff')
        .update(u.patch)
        .eq('id', u.id);
      if (updateError) {
        errors.push({
          row: u.row,
          error: friendlyStaffImportDbError(updateError),
        });
        failedCount++;
      } else {
        successCount++;
        await ensureStaffLoginIfMissing(
          schoolCodeNorm,
          u.staff_id,
          existingLoginStaffIds,
          generatedPasswords
        );
      }
    }

    successCount += plansFinal.filter((p) => p.kind === 'noop').length;

    for (const p of plansFinal) {
      if (p.kind !== 'noop') continue;
      await ensureStaffLoginIfMissing(
        schoolCodeNorm,
        p.staff_id,
        existingLoginStaffIds,
        generatedPasswords
      );
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
