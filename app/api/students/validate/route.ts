import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { parseDate } from '@/lib/date-parser';

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

    // Get existing students to check for duplicates
    const { data: existingStudents } = await supabase
      .from('students')
      .select('admission_no, email, aadhaar_number, rfid, roll_number, class, section')
      .eq('school_code', schoolCode);

    const existingAdmissionNos = new Set(existingStudents?.map(s => s.admission_no) || []);
    const existingEmails = new Set(existingStudents?.map(s => s.email).filter(Boolean) || []);
    const existingAadhaars = new Set(existingStudents?.map(s => s.aadhaar_number).filter(Boolean) || []);
    const existingRfids = new Set(existingStudents?.map(s => s.rfid).filter(Boolean) || []);

    // Get existing classes for validation
    const { data: classes } = await supabase
      .from('classes')
      .select('class, section, academic_year')
      .eq('school_code', schoolCode);

    const validClassSections = new Set(
      classes?.map(c => `${c.class}-${c.section}-${c.academic_year}`) || []
    );

    // Map Excel columns to database fields
    const columnMapping: Record<string, string> = {
      'Admission No': 'admission_no',
      'Admission Number': 'admission_no',
      'Student Name': 'student_name',
      'First Name': 'first_name',
      'Last Name': 'last_name',
      'Class': 'class',
      'Section': 'section',
      'Date of Birth': 'date_of_birth',
      'DOB': 'date_of_birth',
      'Gender': 'gender',
      'Email': 'email',
      'Student Contact': 'student_contact',
      'Aadhaar Number': 'aadhaar_number',
      'Aadhaar': 'aadhaar_number',
      'Blood Group': 'blood_group',
      'Date of Admission': 'date_of_admission',
      'DOA': 'date_of_admission',
      'Academic Year': 'academic_year',
      'Father Name': 'father_name',
      'Father Occupation': 'father_occupation',
      'Father Contact': 'father_contact',
      'Mother Name': 'mother_name',
      'Mother Occupation': 'mother_occupation',
      'Mother Contact': 'mother_contact',
      'Address': 'address',
      'City': 'city',
      'State': 'state',
      'Pincode': 'pincode',
      'Religion': 'religion',
      'Category': 'category',
      'Nationality': 'nationality',
      'Roll Number': 'roll_number',
      'RFID': 'rfid',
      'RTE': 'rte',
      'New Admission': 'new_admission',
    };

    const validatedRows: ValidatedRow[] = [];

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
      const admissionNo = String(mappedData.admission_no || '');
      if (!admissionNo.trim()) {
        errors.push('Admission No is required');
      } else if (existingAdmissionNos.has(admissionNo)) {
        errors.push('Admission No already exists in the system');
      }

      const studentName = String(mappedData.student_name || '');
      const firstName = String(mappedData.first_name || '');
      const lastName = String(mappedData.last_name || '');
      if (!studentName && !firstName) {
        errors.push('Student Name or First Name is required');
      } else {
        // Build student_name from first_name and last_name if not provided
        if (!studentName) {
          mappedData.student_name = `${firstName} ${lastName}`.trim();
        }
      }

      const classValue = String(mappedData.class || '');
      if (!classValue.trim()) {
        errors.push('Class is required');
      }

      const section = String(mappedData.section || '');
      if (!section.trim()) {
        errors.push('Section is required');
      }

      // Validate class-section combination
      const academicYear = String(mappedData.academic_year || '');
      if (classValue && section && academicYear) {
        const classSectionKey = `${classValue}-${section}-${academicYear}`;
        if (validClassSections.size > 0 && !validClassSections.has(classSectionKey)) {
          warnings.push(`Class-Section combination "${classValue}-${section}" may not exist for academic year ${academicYear}`);
        }
      }

      // Date validations
      const dateOfBirth = String(mappedData.date_of_birth || '');
      if (dateOfBirth) {
        const parsedDate = parseDate(dateOfBirth);
        if (parsedDate) {
          mappedData.date_of_birth = parsedDate;
          const dob = new Date(parsedDate);
          if (dob > new Date()) {
            errors.push('Date of Birth cannot be in the future');
          }
        } else {
          errors.push('Invalid Date of Birth format. Use YYYY-MM-DD');
        }
      }

      const dateOfAdmission = String(mappedData.date_of_admission || '');
      if (dateOfAdmission) {
        const parsedDate = parseDate(dateOfAdmission);
        if (parsedDate) {
          mappedData.date_of_admission = parsedDate;
        } else {
          warnings.push('Invalid Date of Admission format. Use YYYY-MM-DD');
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

      // Phone validation
      ['student_contact', 'father_contact', 'mother_contact'].forEach(field => {
        const phoneValue = String(mappedData[field] || '');
        if (phoneValue) {
          const cleanPhone = phoneValue.replace(/\D/g, '');
          if (cleanPhone.length !== 10) {
            errors.push(`${field.replace('_', ' ')} must be 10 digits`);
          } else {
            mappedData[field] = cleanPhone;
          }
        }
      });

      // Aadhaar validation
      const aadhaarNumber = String(mappedData.aadhaar_number || '');
      if (aadhaarNumber) {
        const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
        if (cleanAadhaar.length !== 12) {
          errors.push('Aadhaar number must be 12 digits');
        } else {
          mappedData.aadhaar_number = cleanAadhaar;
          if (existingAadhaars.has(cleanAadhaar)) {
            warnings.push('Aadhaar number already exists in the system');
          }
        }
      }

      // RFID validation
      const rfid = String(mappedData.rfid || '');
      if (rfid) {
        if (existingRfids.has(rfid)) {
          warnings.push('RFID already exists in the system');
        }
      }

      // Gender validation
      const gender = String(mappedData.gender || '');
      if (gender) {
        const validGenders = ['Male', 'Female', 'Other', 'male', 'female', 'other'];
        if (!validGenders.includes(gender)) {
          warnings.push('Gender should be Male, Female, or Other');
        } else {
          mappedData.gender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
        }
      }

      // Blood group validation
      const bloodGroup = String(mappedData.blood_group || '');
      if (bloodGroup) {
        const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const bgUpper = bloodGroup.toUpperCase();
        if (!validBloodGroups.includes(bgUpper)) {
          errors.push('Invalid blood group');
        } else {
          mappedData.blood_group = bgUpper;
        }
      }

      // Boolean fields
      if (mappedData.rte !== undefined) {
        const rteValue = String(mappedData.rte).toLowerCase();
        mappedData.rte = rteValue === 'true' || rteValue === 'yes' || rteValue === '1';
      }

      if (mappedData.new_admission !== undefined) {
        const newAdmValue = String(mappedData.new_admission).toLowerCase();
        mappedData.new_admission = newAdmValue === 'true' || newAdmValue === 'yes' || newAdmValue === '1';
      }

      // Set defaults
      if (!mappedData.nationality) {
        mappedData.nationality = 'Indian';
      }
      if (!mappedData.academic_year) {
        mappedData.academic_year = new Date().getFullYear().toString();
      }

      // Backward compatibility
      if (!mappedData.parent_name) {
        mappedData.parent_name = mappedData.father_name || mappedData.mother_name || null;
      }
      if (!mappedData.parent_phone) {
        mappedData.parent_phone = mappedData.father_contact || mappedData.mother_contact || null;
      }

      validatedRows.push({
        rowIndex: rowNumber,
        data: mappedData,
        errors,
        warnings,
      });
    });

    // Check for duplicate admission numbers within file
    const admissionNos = new Map<string, number[]>();
    validatedRows.forEach((row, idx) => {
      const admissionNo = String(row.data.admission_no || '');
      if (admissionNo) {
        if (!admissionNos.has(admissionNo)) {
          admissionNos.set(admissionNo, []);
        }
        admissionNos.get(admissionNo)!.push(idx);
      }
    });

    admissionNos.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach(idx => {
          if (!validatedRows[idx].errors.includes('Duplicate admission number in file')) {
            validatedRows[idx].errors.push('Duplicate admission number in file');
          }
        });
      }
    });

    return NextResponse.json({
      data: validatedRows,
      total: validatedRows.length,
      valid: validatedRows.filter(r => r.errors.length === 0).length,
      invalid: validatedRows.filter(r => r.errors.length > 0).length,
      warnings: validatedRows.filter(r => r.warnings.length > 0).length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error validating student file:', error);
    return NextResponse.json(
      { error: 'Failed to validate file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

