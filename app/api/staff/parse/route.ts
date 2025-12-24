import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseDate, isValidDateFormat } from '@/lib/date-parser';

type ValidationStatus = 'valid' | 'warning' | 'error';

export interface StaffRow {
  rowIndex: number;
  data: any;
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
      const rowData: any = {};

      headers.forEach((header, idx) => {
        rowData[header] = values[idx]?.trim() || '';
      });

      // Parse and normalize date_of_joining
      let dateOfJoining = '';
      if (rowData.date_of_joining) {
        const parsedDate = parseDate(rowData.date_of_joining);
        if (parsedDate) {
          dateOfJoining = parsedDate;
        } else {
          // Keep original if parsing fails (will be caught in validation)
          dateOfJoining = rowData.date_of_joining;
        }
      }

      // Map to staff data structure
      const staffData = {
        school_id: schoolId,
        school_code: schoolCode,
        staff_id: rowData.staff_id || '',
        full_name: rowData.full_name || '',
        role: rowData.role || '',
        department: rowData.department || undefined,
        designation: rowData.designation || undefined,
        email: rowData.email || undefined,
        phone: rowData.phone || '',
        date_of_joining: dateOfJoining,
        employment_type: rowData.employment_type || undefined,
        qualification: rowData.qualification || undefined,
        experience_years: rowData.experience_years ? parseInt(rowData.experience_years) : undefined,
        gender: rowData.gender || undefined,
        address: rowData.address || undefined,
      };

      // Validate row
      const validation = validateRow(staffData, i);
      
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
      if (row.data.staff_id) {
        if (!staffIds.has(row.data.staff_id)) {
          staffIds.set(row.data.staff_id, []);
        }
        staffIds.get(row.data.staff_id)!.push(idx);
      }
    });

    // Mark duplicates as errors
    staffIds.forEach((indices, staffId) => {
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

function validateRow(data: any, rowIndex: number): {
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.staff_id?.trim()) errors.push('Staff ID is required');
  if (!data.full_name?.trim()) errors.push('Full name is required');
  if (!data.role?.trim()) errors.push('Role is required');
  if (!data.phone?.trim()) errors.push('Phone is required');
  if (!data.date_of_joining?.trim()) errors.push('Date of joining is required');

  // Date validation
  if (data.date_of_joining) {
    if (!isValidDateFormat(data.date_of_joining)) {
      errors.push('Invalid date format. Supported formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD');
    } else {
      // Validate that the date is not in the future
      const date = new Date(data.date_of_joining);
      if (!isNaN(date.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date > today) {
          warnings.push('Date of joining is in the future');
        }
      }
    }
  }

  // Email validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    warnings.push('Invalid email format');
  }

  // Experience years validation
  if (data.experience_years && (isNaN(data.experience_years) || data.experience_years < 0)) {
    warnings.push('Invalid experience years');
  }

  // Role validation (warning for unknown roles, but allow custom)
  const commonRoles = ['Principal', 'Teacher', 'Helper', 'Driver', 'Conductor', 'Administration'];
  if (data.role && !commonRoles.some(r => data.role.toLowerCase().includes(r.toLowerCase()))) {
    warnings.push('Uncommon role - please verify');
  }

  return {
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
    errors,
    warnings,
  };
}

