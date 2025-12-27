import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

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

    // Read Excel file
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

    // Get existing staff IDs to check for duplicates
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('staff_id, email, phone, adhar_no')
      .eq('school_code', schoolCode);

    // existingStaffIds kept for potential future use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const existingStaffIds = new Set(existingStaff?.map(s => s.staff_id) || []);
    const existingEmails = new Set(existingStaff?.map(s => s.email).filter(Boolean) || []);
    const existingPhones = new Set(existingStaff?.map(s => s.phone).filter(Boolean) || []);
    const existingAadhaars = new Set(existingStaff?.map(s => s.adhar_no).filter(Boolean) || []);

    // Get subjects for designation validation
    const { data: subjects } = await supabase
      .from('timetable_subjects')
      .select('name')
      .eq('school_code', schoolCode);

    const validSubjects = new Set(subjects?.map(s => s.name) || []);

    // Map Excel columns to database fields
    const columnMapping: Record<string, string> = {
      'Full Name': 'full_name',
      'Role': 'role',
      'Department': 'department',
      'Designation': 'designation',
      'Email': 'email',
      'Phone': 'phone',
      'Date of Joining': 'date_of_joining',
      'Employment Type': 'employment_type',
      'Date of Birth': 'dob',
      'Gender': 'gender',
      'Aadhaar Number': 'adhar_no',
      'Blood Group': 'blood_group',
      'Religion': 'religion',
      'Category': 'category',
      'Nationality': 'nationality',
      'Primary Contact': 'contact1',
      'Secondary Contact': 'contact2',
      'Address': 'address',
      'Date of Promotion': 'dop',
      'Qualification': 'qualification',
      'Experience (Years)': 'experience_years',
      'Alma Mater': 'alma_mater',
      'Major/Specialization': 'major',
      'Website': 'website',
    };

    const validatedRows: ValidatedRow[] = [];
    // allErrors kept for potential future use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const allErrors: ValidationError[] = [];

    // Validate each row
    (data as Array<Record<string, unknown>>).forEach((row, index: number) => {
      const rowNumber = index + 2; // +2 because Excel rows start at 1 and we have header
      const errors: string[] = [];
      const warnings: string[] = [];
      const mappedData: Record<string, unknown> = {};

      // Map columns
      Object.keys(columnMapping).forEach(excelCol => {
        const dbField = columnMapping[excelCol];
        const value = row[excelCol];
        if (value !== undefined && value !== null && value !== '') {
          mappedData[dbField] = String(value).trim();
        }
      });

      // Required field validations
      const fullName = String(mappedData.full_name || '');
      if (!fullName.trim()) {
        errors.push('Full Name is required');
      }

      const role = String(mappedData.role || '');
      if (!role.trim()) {
        errors.push('Role is required');
      }

      const department = String(mappedData.department || '');
      if (!department.trim()) {
        errors.push('Department is required');
      }

      const designation = String(mappedData.designation || '');
      if (!designation.trim()) {
        errors.push('Designation is required');
      } else if (validSubjects.size > 0 && !validSubjects.has(designation)) {
        warnings.push(`Designation "${designation}" does not match any existing subject`);
      }

      const phone = String(mappedData.phone || mappedData.contact1 || '');
      if (!phone.trim()) {
        errors.push('Phone or Primary Contact is required');
      } else {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          errors.push('Phone number must be 10 digits');
        } else {
          mappedData.phone = cleanPhone;
          if (mappedData.contact1) {
            mappedData.contact1 = String(mappedData.contact1).replace(/\D/g, '');
          }
        }
      }

      const contact2 = String(mappedData.contact2 || '');
      if (contact2) {
        const cleanContact2 = contact2.replace(/\D/g, '');
        if (cleanContact2.length !== 10) {
          errors.push('Secondary Contact must be 10 digits');
        } else {
          mappedData.contact2 = cleanContact2;
        }
      }

      const dateOfJoining = String(mappedData.date_of_joining || '');
      if (!dateOfJoining) {
        errors.push('Date of Joining is required');
      } else {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateOfJoining)) {
          errors.push('Date of Joining must be in YYYY-MM-DD format');
        }
      }

      // Email validation
      const email = String(mappedData.email || '');
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push('Invalid email format');
        }
        if (existingEmails.has(email)) {
          warnings.push('Email already exists in the system');
        }
      }

      // Phone duplicate check
      if (phone && existingPhones.has(phone.replace(/\D/g, ''))) {
        warnings.push('Phone number already exists in the system');
      }

      // Aadhaar validation
      const adharNo = String(mappedData.adhar_no || '');
      if (adharNo) {
        const cleanAadhaar = adharNo.replace(/\D/g, '');
        if (cleanAadhaar.length !== 12) {
          errors.push('Aadhaar number must be 12 digits');
        } else {
          mappedData.adhar_no = cleanAadhaar;
          if (existingAadhaars.has(cleanAadhaar)) {
            warnings.push('Aadhaar number already exists in the system');
          }
        }
      }

      // Date validations
      ['dob', 'dop'].forEach(dateField => {
        const dateValue = String(mappedData[dateField] || '');
        if (dateValue) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(dateValue)) {
            errors.push(`${dateField} must be in YYYY-MM-DD format`);
          }
        }
      });

      // Gender validation
      const gender = String(mappedData.gender || '');
      if (gender) {
        const validGenders = ['Male', 'Female', 'Other', 'male', 'female', 'other'];
        if (!validGenders.includes(gender)) {
          errors.push('Gender must be Male, Female, or Other');
        }
      }

      // Blood group validation
      const bloodGroup = String(mappedData.blood_group || '');
      if (bloodGroup) {
        const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        if (!validBloodGroups.includes(bloodGroup)) {
          errors.push('Invalid blood group');
        }
      }

      // Experience years validation
      const experienceYears = mappedData.experience_years;
      if (experienceYears !== undefined && experienceYears !== null) {
        const expYears = typeof experienceYears === 'number' 
          ? experienceYears 
          : parseFloat(String(experienceYears));
        if (isNaN(expYears) || expYears < 0) {
          errors.push('Experience (Years) must be a valid number');
        } else {
          mappedData.experience_years = expYears;
        }
      }

      // Set defaults
      if (!mappedData.nationality) {
        mappedData.nationality = 'Indian';
      }

      // Clean phone numbers
      if (mappedData.contact1) {
        mappedData.contact1 = String(mappedData.contact1).replace(/\D/g, '');
      }
      if (mappedData.contact2) {
        mappedData.contact2 = String(mappedData.contact2).replace(/\D/g, '');
      }

      validatedRows.push({
        rowIndex: rowNumber,
        data: mappedData,
        errors,
        warnings,
      });
    });

    return NextResponse.json({
      data: validatedRows,
      total: validatedRows.length,
      valid: validatedRows.filter(r => r.errors.length === 0).length,
      invalid: validatedRows.filter(r => r.errors.length > 0).length,
      warnings: validatedRows.filter(r => r.warnings.length > 0).length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error validating staff file:', error);
    return NextResponse.json(
      { error: 'Failed to validate file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

