import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseDate, isValidDateFormat } from '@/lib/date-parser';
import type { StudentRow } from '@/app/dashboard/[school]/students/import/page';

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
    const rows: StudentRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const rowData: any = {};

      headers.forEach((header, idx) => {
        rowData[header] = values[idx]?.trim() || '';
      });

      // Parse and normalize date_of_birth
      let dateOfBirth = undefined;
      if (rowData.date_of_birth) {
        const parsedDate = parseDate(rowData.date_of_birth);
        if (parsedDate) {
          dateOfBirth = parsedDate;
        }
      }

      // Map to student data structure with school_code
      const studentData = {
        school_id: schoolId,
        school_code: schoolCode,
        admission_no: rowData.admission_no || '',
        student_name: rowData.student_name || '',
        class: rowData.class || '',
        section: rowData.section || '',
        date_of_birth: dateOfBirth,
        gender: rowData.gender || undefined,
        parent_name: rowData.parent_name || undefined,
        parent_phone: rowData.parent_phone || undefined,
        parent_email: rowData.parent_email || undefined,
        address: rowData.address || undefined,
        academic_year: new Date().getFullYear().toString(),
        status: 'active' as const,
      };

      // Validate row
      const validation = validateRow(studentData, i);
      
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
    admissionNos.forEach((indices, admissionNo) => {
      if (indices.length > 1) {
        indices.forEach(idx => {
          if (rows[idx].status !== 'error') {
            rows[idx].status = 'error';
            rows[idx].errors.push('Duplicate admission number in file');
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

function validateRow(data: any, rowIndex: number): {
  status: 'valid' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.admission_no?.trim()) errors.push('Admission number is required');
  if (!data.student_name?.trim()) errors.push('Student name is required');
  if (!data.class?.trim()) errors.push('Class is required');
  if (!data.section?.trim()) errors.push('Section is required');

  // Date validation
  if (data.date_of_birth) {
    if (!isValidDateFormat(data.date_of_birth)) {
      warnings.push('Invalid date format. Supported formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD');
    } else {
      const dob = new Date(data.date_of_birth);
      if (!isNaN(dob.getTime())) {
        const age = new Date().getFullYear() - dob.getFullYear();
        if (age < 3 || age > 25) {
          warnings.push('Unusual age detected');
        }
      }
    }
  }

  // Email validation
  if (data.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.parent_email)) {
    warnings.push('Invalid email format');
  }

  return {
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
    errors,
    warnings,
  };
}

