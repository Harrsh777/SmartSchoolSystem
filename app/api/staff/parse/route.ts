import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseDate, isValidDateFormat } from '@/lib/date-parser';

type ValidationStatus = 'valid' | 'warning' | 'error';

export interface StaffRow {
  rowIndex: number;
  data: Record<string, unknown>;
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
}

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

    // Parse CSV
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: StaffRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const rowData: Record<string, unknown> = {};

      headers.forEach((header, idx) => {
        rowData[header] = values[idx]?.trim() || '';
      });

      // Parse and normalize dates
      let dateOfJoining = '';
      if (rowData.doj || rowData.date_of_joining) {
        const dateStr = String(rowData.doj || rowData.date_of_joining || '');
        const parsedDate = parseDate(dateStr);
        if (parsedDate) {
          dateOfJoining = parsedDate;
        } else {
          dateOfJoining = dateStr;
        }
      }

      let dateOfBirth = '';
      if (rowData.dob) {
        const dobStr = String(rowData.dob || '');
        const parsedDate = parseDate(dobStr);
        if (parsedDate) {
          dateOfBirth = parsedDate;
        } else {
          dateOfBirth = dobStr;
        }
      }

      let dateOfPromotion = '';
      if (rowData.dop) {
        const parsedDate = parseDate(String(rowData.dop || ''));
        if (parsedDate) {
          dateOfPromotion = parsedDate;
        } else {
          dateOfPromotion = String(rowData.dop || '');
        }
      }

      // Map to staff data structure
      const staffData = {
        school_id: schoolId,
        school_code: schoolCode,
        staff_id: rowData.staff_id || rowData.employee_code || '',
        full_name: rowData.name || rowData.full_name || '',
        role: rowData.role || '',
        department: rowData.department || undefined,
        designation: rowData.designation || undefined,
        email: rowData.email || undefined,
        phone: rowData.phone || rowData.contact1 || '',
        date_of_joining: dateOfJoining,
        employment_type: rowData.employment_type || undefined,
        qualification: rowData.qualification || undefined,
        experience_years: rowData.experience_years ? parseInt(String(rowData.experience_years)) : undefined,
        gender: rowData.gender || undefined,
        address: rowData.address || undefined,
        // New fields
        dob: dateOfBirth || undefined,
        adhar_no: rowData.adhar_no || rowData.aadhaar_number || undefined,
        blood_group: rowData.blood_group || undefined,
        religion: rowData.religion || undefined,
        category: rowData.category || undefined,
        nationality: rowData.nationality || 'Indian',
        contact1: rowData.contact1 || rowData.phone || undefined,
        contact2: rowData.contact2 || undefined,
        employee_code: rowData.employee_code || rowData.staff_id || undefined,
        dop: dateOfPromotion || undefined,
        short_code: rowData.short_code || undefined,
        rfid: rowData.rfid || undefined,
        uuid: rowData.uuid || undefined,
        alma_mater: rowData.alma_mater || undefined,
        major: rowData.major || undefined,
        website: rowData.website || undefined,
      };

      // Validate row
      const validation = validateRow(staffData);
      
      rows.push({
        rowIndex: i,
        data: staffData,
        status: validation.status,
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    // Check for duplicate staff_ids within file
    const staffIds = new Map<string, number[]>();
    rows.forEach((row, idx) => {
      const staffId = String(row.data.staff_id || '');
      if (staffId) {
        if (!staffIds.has(staffId)) {
          staffIds.set(staffId, []);
        }
        staffIds.get(staffId)!.push(idx);
      }
    });

    // Mark duplicates as errors
    staffIds.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach(idx => {
          if (rows[idx].status !== 'error') {
            rows[idx].status = 'error';
            rows[idx].errors.push('Duplicate staff ID in file');
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

function validateRow(data: Record<string, unknown>): {
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  const staffId = String(data.staff_id || '');
  const employeeCode = String(data.employee_code || '');
  const fullName = String(data.full_name || '');
  const role = String(data.role || '');
  const phone = String(data.phone || '');
  const contact1 = String(data.contact1 || '');
  const dateOfJoining = String(data.date_of_joining || '');
  const department = String(data.department || '');
  const designation = String(data.designation || '');
  if (!staffId.trim() && !employeeCode.trim()) {
    errors.push('Staff ID or Employee Code is required');
  }
  if (!fullName.trim()) errors.push('Name/Full Name is required');
  if (!role.trim()) errors.push('Role is required');
  if (!phone.trim() && !contact1.trim()) {
    errors.push('Phone or Contact1 is required');
  }
  if (!dateOfJoining.trim()) errors.push('Date of joining (DOJ) is required');
  if (!department.trim()) errors.push('Department is required');
  if (!designation.trim()) errors.push('Designation is required');

  // Date validation
  if (dateOfJoining) {
    if (!isValidDateFormat(dateOfJoining)) {
      errors.push('Invalid date of joining format. Supported formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD');
    } else {
      const date = new Date(dateOfJoining);
      if (!isNaN(date.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date > today) {
          warnings.push('Date of joining is in the future');
        }
      }
    }
  }

  // Date of birth validation
  const dobStr = String(data.dob || '');
  if (dobStr) {
    if (!isValidDateFormat(dobStr)) {
      errors.push('Invalid date of birth format. Supported formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD');
    } else {
      const dob = new Date(dobStr);
      const today = new Date();
      if (!isNaN(dob.getTime()) && dob > today) {
        errors.push('Date of birth cannot be in the future');
      }
    }
  }

  // Date of promotion validation
  const dopStr = String(data.dop || '');
  if (dopStr) {
    if (!isValidDateFormat(dopStr)) {
      warnings.push('Invalid date of promotion format. Supported formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD');
    } else {
      const dop = new Date(dopStr);
      const today = new Date();
      if (!isNaN(dop.getTime()) && dop > today) {
        warnings.push('Date of promotion is in the future');
      }
      if (dateOfJoining) {
        const doj = new Date(dateOfJoining);
        if (!isNaN(dop.getTime()) && !isNaN(doj.getTime()) && dop < doj) {
          warnings.push('Date of promotion is before date of joining');
        }
      }
    }
  }

  // Email validation
  const email = String(data.email || '');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    warnings.push('Invalid email format');
  }

  // Contact validation
  const contact1Str = String(data.contact1 || '');
  const contact2Str = String(data.contact2 || '');
  if (contact1Str && !/^[0-9+\-\s()]+$/.test(contact1Str)) {
    warnings.push('Contact1 may contain invalid characters');
  }
  if (contact2Str && !/^[0-9+\-\s()]+$/.test(contact2Str)) {
    warnings.push('Contact2 may contain invalid characters');
  }

  // Aadhaar validation (12 digits)
  const adharNo = String(data.adhar_no || '');
  if (adharNo) {
    const aadhaar = adharNo.replace(/\s|-/g, '');
    if (!/^\d{12}$/.test(aadhaar)) {
      warnings.push('Aadhaar number should be 12 digits');
    }
  }

  // Blood group validation
  const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const bloodGroup = String(data.blood_group || '');
  if (bloodGroup && !validBloodGroups.includes(bloodGroup.toUpperCase())) {
    warnings.push(`Invalid blood group. Valid values: ${validBloodGroups.join(', ')}`);
  }

  // Gender validation
  const validGenders = ['Male', 'Female', 'Other', 'male', 'female', 'other'];
  const gender = String(data.gender || '');
  if (gender && !validGenders.includes(gender)) {
    warnings.push('Invalid gender. Valid values: Male, Female, Other');
  }

  // Experience years validation
  const experienceYears = typeof data.experience_years === 'number' 
    ? data.experience_years 
    : (data.experience_years ? Number(data.experience_years) : NaN);
  if (!isNaN(experienceYears) && (isNaN(experienceYears) || experienceYears < 0)) {
    warnings.push('Invalid experience years');
  }

  // Website URL validation
  const website = String(data.website || '');
  if (website) {
    try {
      new URL(website);
    } catch {
      warnings.push('Invalid website URL format');
    }
  }

  // Role validation (warning for unknown roles, but allow custom)
  const commonRoles = ['Principal', 'Teacher', 'Helper', 'Driver', 'Conductor', 'Administration'];
  const roleStr = String(data.role || '');
  if (roleStr && !commonRoles.some(r => roleStr.toLowerCase().includes(r.toLowerCase()))) {
    warnings.push('Uncommon role - please verify');
  }

  return {
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
    errors,
    warnings,
  };
}

