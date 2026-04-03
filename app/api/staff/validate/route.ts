import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { parseDate } from '@/lib/date-parser';
import {
  validateStaffImportCore,
  normalizeStaffGenderForImport,
  digits10,
  digits12Aadhaar,
} from '@/lib/staff/import-validation';

interface ValidatedRow {
  rowIndex: number;
  data: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;

    if (!file || !schoolCode) {
      return NextResponse.json(
        { error: 'File and school code are required' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'File is empty or invalid' },
        { status: 400 }
      );
    }

    const { data: subjects } = await supabase
      .from('timetable_subjects')
      .select('name')
      .eq('school_code', schoolCode);
    const validSubjects = new Set(
      (subjects ?? []).map((s) => s.name).filter(Boolean) as string[]
    );

    const { data: staffAdharRows } = await supabase
      .from('staff')
      .select('adhar_no')
      .eq('school_code', schoolCode);
    const existingAdhars = new Set(
      (staffAdharRows ?? [])
        .map((r) => digits12Aadhaar(r.adhar_no))
        .filter((a): a is string => Boolean(a))
    );

    const columnMapping: Record<string, string> = {
      'Full Name': 'full_name',
      Role: 'role',
      Department: 'department',
      Designation: 'designation',
      'Designation (Subject)': 'designation',
      Email: 'email',
      Phone: 'phone',
      'Date of Joining': 'date_of_joining',
      'Date of Join': 'date_of_joining',
      'Date of join': 'date_of_joining',
      DOJ: 'date_of_joining',
      'Employment Type': 'employment_type',
      'Date of Birth': 'dob',
      DOB: 'dob',
      Gender: 'gender',
      'Aadhaar Number': 'adhar_no',
      Aadhaar: 'adhar_no',
      'Blood Group': 'blood_group',
      Religion: 'religion',
      Category: 'category',
      Nationality: 'nationality',
      'Primary Contact': 'contact1',
      'Secondary Contact': 'contact2',
      Address: 'address',
      'Date of Promotion': 'dop',
      Qualification: 'qualification',
      'Experience (Years)': 'experience_years',
      Experience: 'experience_years',
      'Alma Mater': 'alma_mater',
      'Major/Specialization': 'major',
      Website: 'website',
    };

    const validatedRows: ValidatedRow[] = [];

    (data as Array<Record<string, unknown>>).forEach((row, index: number) => {
      const rowNumber = index + 2;
      const mappedData: Record<string, unknown> = {};

      Object.keys(columnMapping).forEach((excelCol) => {
        const dbField = columnMapping[excelCol];
        const value = row[excelCol];
        if (value !== undefined && value !== null && value !== '') {
          mappedData[dbField] = String(value).trim();
        }
      });

      if (mappedData.date_of_joining) {
        const p = parseDate(String(mappedData.date_of_joining));
        if (p) mappedData.date_of_joining = p;
      }
      if (mappedData.dob) {
        const p = parseDate(String(mappedData.dob));
        if (p) mappedData.dob = p;
      }
      if (mappedData.dop) {
        const p = parseDate(String(mappedData.dop));
        if (p) mappedData.dop = p;
      }

      const phoneD = digits10(mappedData.phone);
      if (phoneD) mappedData.phone = phoneD;
      if (!mappedData.contact1 && phoneD) mappedData.contact1 = phoneD;
      const c1 = digits10(mappedData.contact1);
      if (c1) mappedData.contact1 = c1;
      const c2 = digits10(mappedData.contact2);
      if (c2) mappedData.contact2 = c2;

      const adNorm = digits12Aadhaar(mappedData.adhar_no);
      if (adNorm) mappedData.adhar_no = adNorm;

      const g = normalizeStaffGenderForImport(mappedData.gender);
      if (g) mappedData.gender = g;

      if (!mappedData.nationality) mappedData.nationality = 'Indian';

      const core = validateStaffImportCore(mappedData, { validSubjects });
      const errors = [...core.errors];
      const warnings = [...core.warnings];

      const adhar12 = digits12Aadhaar(mappedData.adhar_no);
      if (adhar12 && existingAdhars.has(adhar12)) {
        warnings.push(
          'This Aadhaar is already on file for a staff member at your school — import will update that record with the row you upload (matched by Aadhaar, phone, or staff ID).'
        );
      }

      const exp = mappedData.experience_years;
      if (exp !== undefined && exp !== null && String(exp).trim() !== '') {
        const n = typeof exp === 'number' ? exp : parseFloat(String(exp));
        if (Number.isNaN(n) || n < 0) {
          errors.push('Experience (Years) must be a valid non-negative number');
        } else {
          mappedData.experience_years = n;
        }
      }

      const bg = String(mappedData.blood_group || '').trim();
      if (bg) {
        const valid = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const u = bg.toUpperCase();
        if (!valid.includes(u)) errors.push('Invalid blood group');
        else mappedData.blood_group = u;
      }

      validatedRows.push({
        rowIndex: rowNumber,
        data: mappedData,
        errors,
        warnings,
      });
    });

    const phones = new Map<string, number[]>();
    validatedRows.forEach((row, idx) => {
      const p = digits10(row.data.phone);
      if (p) {
        if (!phones.has(p)) phones.set(p, []);
        phones.get(p)!.push(idx);
      }
    });
    phones.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((idx) => {
          if (!validatedRows[idx].errors.includes('Duplicate phone in file')) {
            validatedRows[idx].errors.push('Duplicate phone in file');
          }
        });
      }
    });

    const aadhars = new Map<string, number[]>();
    validatedRows.forEach((row, idx) => {
      const a = digits12Aadhaar(row.data.adhar_no);
      if (a) {
        if (!aadhars.has(a)) aadhars.set(a, []);
        aadhars.get(a)!.push(idx);
      }
    });
    aadhars.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((idx) => {
          const w =
            'Same Aadhaar appears on multiple rows — each row will update the same staff record if that Aadhaar exists, or only the first new row can be created; remove duplicate rows if they are different people.';
          if (!validatedRows[idx].warnings.includes(w)) {
            validatedRows[idx].warnings.push(w);
          }
        });
      }
    });

    return NextResponse.json(
      {
        data: validatedRows,
        total: validatedRows.length,
        valid: validatedRows.filter((r) => r.errors.length === 0).length,
        invalid: validatedRows.filter((r) => r.errors.length > 0).length,
        warnings: validatedRows.filter((r) => r.warnings.length > 0).length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error validating staff file:', error);
    return NextResponse.json(
      {
        error: 'Failed to validate file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
