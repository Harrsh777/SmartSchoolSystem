import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseDate, isValidDateFormat } from '@/lib/date-parser';
import type { StudentRow } from '@/app/dashboard/[school]/students/import/page';

// Field mapping: CSV header -> database field
const FIELD_MAPPING: Record<string, string> = {
  'name': 'name',
  'gender': 'gender',
  'dob': 'date_of_birth',
  'date of birth': 'date_of_birth',
  'address': 'address',
  'city': 'city',
  'state': 'state',
  'pincode': 'pincode',
  'aadhaar number': 'aadhaar_number',
  'aadhaar': 'aadhaar_number',
  'class': 'class',
  'section': 'section',
  'sr no': 'sr_no',
  'sr number': 'sr_no',
  'doa': 'date_of_admission',
  'date of admission': 'date_of_admission',
  'religion': 'religion',
  'category': 'category',
  'nationality': 'nationality',
  'house': 'house',
  'student contact': 'student_contact',
  'father name': 'father_name',
  'father occupation': 'father_occupation',
  'father contact': 'father_contact',
  'mother name': 'mother_name',
  'mother occupation': 'mother_occupation',
  'mother contact': 'mother_contact',
  'last class': 'last_class',
  'last school name': 'last_school_name',
  'last school percentage': 'last_school_percentage',
  'last school result': 'last_school_result',
  'medium': 'medium',
  'schooling type': 'schooling_type',
  'transport type': 'transport_type',
  'staff relation': 'staff_relation',
  'new admission': 'new_admission',
  'roll number': 'roll_number',
  'rfid': 'rfid',
  'rte': 'rte',
  'admission no': 'admission_no',
  'admission number': 'admission_no',
  'pen no': 'pen_no',
  'pen number': 'pen_no',
  'apaar no': 'apaar_no',
  'apaar number': 'apaar_no',
  'blood group': 'blood_group',
  'email': 'email',
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const schoolId = schoolData.id;

    // Read file content
    const fileContent = await file.text();
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'File must contain at least a header row and one data row' },
        { status: 400 }
      );
    }

    // Parse CSV headers - normalize them
    const rawHeaders = parseCSVLine(lines[0]);
    const headers = rawHeaders.map(h => {
      const normalized = h.trim().toLowerCase();
      return FIELD_MAPPING[normalized] || normalized;
    });

    const rows: StudentRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const rowData: Record<string, unknown> = {};

      headers.forEach((header, idx) => {
        const value = values[idx]?.trim() || '';
        if (value) {
          rowData[header] = value;
        }
      });

      // Extract name - split into first_name and last_name
      let firstName = '';
      let lastName = '';
      let studentName = '';
      
      const name = String(rowData.name || '');
      if (name) {
        const nameParts = name.trim().split(/\s+/);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
        studentName = name.trim();
      }

      // Parse dates
      let dateOfBirth: string | undefined = undefined;
      if (rowData.date_of_birth || rowData.dob) {
        const dobValue = String(rowData.date_of_birth || rowData.dob || '');
        const parsedDate = parseDate(dobValue);
        if (parsedDate) {
          dateOfBirth = parsedDate;
        }
      }

      let dateOfAdmission: string | undefined = undefined;
      if (rowData.date_of_admission || rowData.doa) {
        const doaValue = String(rowData.date_of_admission || rowData.doa || '');
        const parsedDate = parseDate(doaValue);
        if (parsedDate) {
          dateOfAdmission = parsedDate;
        }
      }

      // Parse boolean fields
      const rte = parseBoolean(rowData.rte);
      const newAdmission = parseBoolean(rowData.new_admission, true); // Default to true

      // Parse numeric fields
      const lastSchoolPercentage = rowData.last_school_percentage 
        ? parseFloat(String(rowData.last_school_percentage)) 
        : undefined;

      // Normalize gender
      const gender = normalizeGender(rowData.gender);

      // Normalize blood group
      const bloodGroup = normalizeBloodGroup(rowData.blood_group);

      // Build student data structure
      const studentData: Record<string, unknown> = {
        school_id: schoolId,
        school_code: schoolCode,
        admission_no: rowData.admission_no || rowData['admission number'] || '',
        student_name: studentName || `${firstName} ${lastName}`.trim(),
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        class: rowData.class || '',
        section: rowData.section || '',
        date_of_birth: dateOfBirth,
        gender: gender,
        address: rowData.address || undefined,
        city: rowData.city || undefined,
        state: rowData.state || undefined,
        pincode: rowData.pincode || undefined,
        aadhaar_number: rowData.aadhaar_number || undefined,
        email: rowData.email || undefined,
        student_contact: rowData.student_contact || undefined,
        blood_group: bloodGroup,
        sr_no: rowData.sr_no || undefined,
        date_of_admission: dateOfAdmission,
        religion: rowData.religion || undefined,
        category: rowData.category || undefined,
        nationality: rowData.nationality || 'Indian',
        house: rowData.house || undefined,
        last_class: rowData.last_class || undefined,
        last_school_name: rowData.last_school_name || undefined,
        last_school_percentage: lastSchoolPercentage,
        last_school_result: rowData.last_school_result || undefined,
        medium: rowData.medium || undefined,
        schooling_type: rowData.schooling_type || undefined,
        roll_number: rowData.roll_number || undefined,
        rfid: rowData.rfid || undefined,
        pen_no: rowData.pen_no || undefined,
        apaar_no: rowData.apaar_no || undefined,
        rte: rte,
        new_admission: newAdmission,
        // Parent/Guardian Information
        father_name: rowData.father_name || undefined,
        father_occupation: rowData.father_occupation || undefined,
        father_contact: rowData.father_contact || undefined,
        mother_name: rowData.mother_name || undefined,
        mother_occupation: rowData.mother_occupation || undefined,
        mother_contact: rowData.mother_contact || undefined,
        staff_relation: rowData.staff_relation || undefined,
        transport_type: rowData.transport_type || undefined,
        // Backward compatibility
        parent_name: rowData.father_name || rowData.mother_name || undefined,
        parent_phone: rowData.father_contact || rowData.mother_contact || undefined,
        parent_email: rowData.email || undefined,
        academic_year: new Date().getFullYear().toString(),
        status: 'active' as const,
      };

      // Validate row
      const validation = validateRow(studentData);
      
      rows.push({
        rowIndex: i,
        data: studentData,
        status: validation.status,
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    // Check for duplicate admission numbers within file
    const admissionNos = new Map<string, number[]>();
    rows.forEach((row, idx) => {
      if (row.data.admission_no) {
        if (!admissionNos.has(row.data.admission_no)) {
          admissionNos.set(row.data.admission_no, []);
        }
        admissionNos.get(row.data.admission_no)!.push(idx);
      }
    });

    // Mark duplicates as errors
    admissionNos.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach(idx => {
          if (rows[idx].status !== 'error') {
            rows[idx].status = 'error';
            rows[idx].errors.push('Duplicate admission number in file');
          }
        });
      }
    });

    // Check for duplicate Aadhaar numbers within file
    const aadhaarNos = new Map<string, number[]>();
    rows.forEach((row, idx) => {
      if (row.data.aadhaar_number) {
        if (!aadhaarNos.has(row.data.aadhaar_number)) {
          aadhaarNos.set(row.data.aadhaar_number, []);
        }
        aadhaarNos.get(row.data.aadhaar_number)!.push(idx);
      }
    });

    aadhaarNos.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach(idx => {
          if (rows[idx].status !== 'error') {
            rows[idx].status = 'error';
            rows[idx].errors.push('Duplicate Aadhaar number in file');
          }
        });
      }
    });

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error) {
    console.error('Error parsing file:', error);
    return NextResponse.json(
      { error: 'Failed to parse file', details: error instanceof Error ? error.message : 'Unknown error' },
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

function parseBoolean(value: unknown, defaultValue: boolean = false): boolean {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'y';
  }
  return defaultValue;
}

function normalizeGender(gender: unknown): string | undefined {
  if (!gender) return undefined;
  const genderStr = String(gender);
  const normalized = genderStr.trim();
  const lower = normalized.toLowerCase();
  if (lower === 'male' || lower === 'm') return 'Male';
  if (lower === 'female' || lower === 'f') return 'Female';
  if (lower === 'other' || lower === 'o') return 'Other';
  return normalized;
}

function normalizeBloodGroup(bg: unknown): string | undefined {
  if (!bg) return undefined;
  const bgStr = String(bg);
  const normalized = bgStr.trim().toUpperCase();
  const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (validGroups.includes(normalized)) {
    return normalized;
  }
  return undefined;
}

function validateRow(data: Record<string, unknown>): {
  status: 'valid' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  const admissionNo = String(data.admission_no || '');
  const studentName = String(data.student_name || '');
  const firstName = String(data.first_name || '');
  const classValue = String(data.class || '');
  const section = String(data.section || '');
  
  if (!admissionNo.trim()) {
    errors.push('Admission number is required');
  }
  
  if (!studentName.trim() && !firstName.trim()) {
    errors.push('Student name is required');
  }
  
  if (!classValue.trim()) {
    errors.push('Class is required');
  }
  
  if (!section.trim()) {
    errors.push('Section is required');
  }

  // Date validations
  const dateOfBirth = String(data.date_of_birth || '');
  if (dateOfBirth) {
    if (!isValidDateFormat(dateOfBirth)) {
      warnings.push('Invalid DOB format. Supported: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD');
    } else {
      const dob = new Date(dateOfBirth);
      if (!isNaN(dob.getTime())) {
        const age = new Date().getFullYear() - dob.getFullYear();
        if (age < 3 || age > 25) {
          warnings.push(`Unusual age detected: ${age} years`);
        }
        if (dob > new Date()) {
          errors.push('Date of birth cannot be in the future');
        }
      }
    }
  } else {
    warnings.push('Date of birth is recommended');
  }

  const dateOfAdmission = String(data.date_of_admission || '');
  if (dateOfAdmission) {
    if (!isValidDateFormat(dateOfAdmission)) {
      warnings.push('Invalid DOA format. Supported: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD');
    } else {
      const doa = new Date(dateOfAdmission);
      if (doa > new Date()) {
        warnings.push('Date of admission is in the future');
      }
      if (dateOfBirth) {
        const dob = new Date(dateOfBirth);
        if (doa < dob) {
          errors.push('Date of admission cannot be before date of birth');
        }
      }
    }
  }

  // Email validation
  const email = String(data.email || '');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    warnings.push('Invalid email format');
  }

  const parentEmail = String(data.parent_email || '');
  if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
    warnings.push('Invalid parent email format');
  }

  // Phone number validation (Indian format)
  const phoneRegex = /^[6-9]\d{9}$/;
  const studentContact = String(data.student_contact || '');
  const fatherContact = String(data.father_contact || '');
  const motherContact = String(data.mother_contact || '');
  
  if (studentContact && !phoneRegex.test(studentContact.replace(/\D/g, ''))) {
    warnings.push('Student contact should be a valid 10-digit Indian mobile number');
  }

  if (fatherContact && !phoneRegex.test(fatherContact.replace(/\D/g, ''))) {
    warnings.push('Father contact should be a valid 10-digit Indian mobile number');
  }

  if (motherContact && !phoneRegex.test(motherContact.replace(/\D/g, ''))) {
    warnings.push('Mother contact should be a valid 10-digit Indian mobile number');
  }

  // Aadhaar validation (12 digits)
  const aadhaarNumber = String(data.aadhaar_number || '');
  if (aadhaarNumber) {
    const aadhaarDigits = aadhaarNumber.replace(/\D/g, '');
    if (aadhaarDigits.length !== 12) {
      warnings.push('Aadhaar number should be 12 digits');
    }
  }

  // Pincode validation (6 digits)
  const pincode = String(data.pincode || '');
  if (pincode) {
    const pincodeDigits = pincode.replace(/\D/g, '');
    if (pincodeDigits.length !== 6) {
      warnings.push('Pincode should be 6 digits');
    }
  }

  // Percentage validation
  const lastSchoolPercentage = typeof data.last_school_percentage === 'number' 
    ? data.last_school_percentage 
    : (data.last_school_percentage ? Number(data.last_school_percentage) : NaN);
  if (!isNaN(lastSchoolPercentage)) {
    if (lastSchoolPercentage < 0 || lastSchoolPercentage > 100) {
      warnings.push('Last school percentage should be between 0 and 100');
    }
  }

  // Blood group validation
  const bloodGroup = String(data.blood_group || '');
  if (bloodGroup && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) {
    warnings.push('Invalid blood group. Valid values: A+, A-, B+, B-, AB+, AB-, O+, O-');
  }

  // Gender validation
  const gender = String(data.gender || '');
  if (gender && !['Male', 'Female', 'Other'].includes(gender)) {
    warnings.push('Gender should be Male, Female, or Other');
  }

  return {
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
    errors,
    warnings,
  };
}
