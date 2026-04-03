import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseDate } from '@/lib/date-parser';
import {
  normalizeStaffGenderForImport,
  validateStaffImportCore,
  digits10,
} from '@/lib/staff/import-validation';

type ValidationStatus = 'valid' | 'warning' | 'error';

export interface StaffRow {
  rowIndex: number;
  data: Record<string, unknown>;
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
}

/** Normalize first CSV header row to DB-ish keys */
const HEADER_ALIASES: Record<string, string> = {
  name: 'full_name',
  'full name': 'full_name',
  full_name: 'full_name',
  role: 'role',
  department: 'department',
  designation: 'designation',
  subject: 'designation',
  email: 'email',
  phone: 'phone',
  mobile: 'phone',
  'primary contact': 'contact1',
  primary_contact: 'contact1',
  contact_1: 'contact1',
  contact1: 'contact1',
  'secondary contact': 'contact2',
  secondary_contact: 'contact2',
  contact2: 'contact2',
  doj: 'date_of_joining',
  'date of joining': 'date_of_joining',
  date_of_joining: 'date_of_joining',
  dob: 'dob',
  'date of birth': 'dob',
  gender: 'gender',
  'aadhaar number': 'adhar_no',
  aadhaar_number: 'adhar_no',
  adhar_no: 'adhar_no',
  aadhaar: 'adhar_no',
  category: 'category',
  'blood group': 'blood_group',
  blood_group: 'blood_group',
  religion: 'religion',
  nationality: 'nationality',
  address: 'address',
  staff_id: 'staff_id',
  'employee code': 'employee_code',
  employee_code: 'employee_code',
  'employment type': 'employment_type',
  employment_type: 'employment_type',
  qualification: 'qualification',
  'experience years': 'experience_years',
  experience_years: 'experience_years',
  'alma mater': 'alma_mater',
  alma_mater: 'alma_mater',
  'major/specialization': 'major',
  major: 'major',
  website: 'website',
  dop: 'dop',
  'date of promotion': 'dop',
  short_code: 'short_code',
  rfid: 'rfid',
  uuid: 'uuid',
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const schoolId = schoolData.id;

    const { data: subjectsRows } = await supabase
      .from('timetable_subjects')
      .select('name')
      .eq('school_code', schoolCode);
    const validSubjects = new Set(
      (subjectsRows ?? []).map((s) => s.name).filter(Boolean) as string[]
    );

    const fileContent = await file.text();
    const lines = fileContent.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'File must contain at least a header row and one data row' },
        { status: 400 }
      );
    }

    const rawHeaders = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    const headers = rawHeaders.map((h) => HEADER_ALIASES[h] || h);

    const rows: StaffRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const rowData: Record<string, unknown> = {};

      headers.forEach((header, idx) => {
        const v = values[idx]?.trim() ?? '';
        if (v !== '') rowData[header] = v;
      });

      let dateOfJoining = '';
      if (rowData.date_of_joining) {
        const parsed = parseDate(String(rowData.date_of_joining));
        dateOfJoining = parsed || String(rowData.date_of_joining);
      }

      let dateOfBirth = '';
      if (rowData.dob) {
        const parsed = parseDate(String(rowData.dob));
        dateOfBirth = parsed || String(rowData.dob);
      }

      let dateOfPromotion = '';
      if (rowData.dop) {
        const parsed = parseDate(String(rowData.dop));
        dateOfPromotion = parsed || String(rowData.dop);
      }

      const phoneDigits = digits10(rowData.phone);
      const c1Digits = digits10(rowData.contact1);

      const staffData: Record<string, unknown> = {
        school_id: schoolId,
        school_code: schoolCode,
        staff_id: rowData.staff_id || rowData.employee_code || '',
        full_name: rowData.full_name || '',
        role: rowData.role || '',
        department: rowData.department,
        designation: rowData.designation,
        email: rowData.email,
        phone: phoneDigits ?? rowData.phone ?? '',
        date_of_joining: dateOfJoining,
        employment_type: rowData.employment_type,
        qualification: rowData.qualification,
        experience_years: rowData.experience_years
          ? parseInt(String(rowData.experience_years), 10)
          : undefined,
        gender: rowData.gender,
        address: rowData.address,
        dob: dateOfBirth || undefined,
        adhar_no: rowData.adhar_no,
        blood_group: rowData.blood_group,
        religion: rowData.religion,
        category: rowData.category,
        nationality: rowData.nationality || 'Indian',
        contact1: c1Digits ?? rowData.contact1,
        contact2: rowData.contact2,
        employee_code: rowData.employee_code || rowData.staff_id,
        dop: dateOfPromotion || undefined,
        short_code: rowData.short_code,
        rfid: rowData.rfid,
        uuid: rowData.uuid,
        alma_mater: rowData.alma_mater,
        major: rowData.major,
        website: rowData.website,
      };

      const validation = validateStaffImportCore(staffData, { validSubjects });
      const genderNorm = normalizeStaffGenderForImport(staffData.gender);
      if (genderNorm) staffData.gender = genderNorm;
      if (phoneDigits) staffData.phone = phoneDigits;
      if (c1Digits) staffData.contact1 = c1Digits;
      const ad = String(staffData.adhar_no ?? '').replace(/\D/g, '');
      if (ad.length === 12) staffData.adhar_no = ad;

      rows.push({
        rowIndex: i,
        data: staffData,
        status:
          validation.errors.length > 0
            ? 'error'
            : validation.warnings.length > 0
              ? 'warning'
              : 'valid',
        errors: validation.errors,
        warnings: [...validation.warnings],
      });
    }

    const staffIds = new Map<string, number[]>();
    rows.forEach((row, idx) => {
      const id = String(row.data.staff_id || '').trim();
      if (id) {
        if (!staffIds.has(id)) staffIds.set(id, []);
        staffIds.get(id)!.push(idx);
      }
    });
    staffIds.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((idx) => {
          rows[idx].status = 'error';
          if (!rows[idx].errors.includes('Duplicate staff ID in file')) {
            rows[idx].errors.push('Duplicate staff ID in file');
          }
        });
      }
    });

    const phones = new Map<string, number[]>();
    rows.forEach((row, idx) => {
      const p = digits10(row.data.phone);
      if (p) {
        if (!phones.has(p)) phones.set(p, []);
        phones.get(p)!.push(idx);
      }
    });
    phones.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((idx) => {
          rows[idx].status = 'error';
          if (!rows[idx].errors.includes('Duplicate phone in file')) {
            rows[idx].errors.push('Duplicate phone in file');
          }
        });
      }
    });

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error) {
    console.error('Error parsing file:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}
