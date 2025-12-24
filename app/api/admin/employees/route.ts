import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password-utils';

function generateEmployeeId(): string {
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `EMP-${random}`;
}

function generateRandomPassword(length = 10): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function GET() {
  try {
    // Fetch employees with their assigned schools
    const { data: employees, error } = await supabase
      .from('admin_employees')
      .select(
        `
        id,
        emp_id,
        full_name,
        email,
        created_at,
        employee_schools:employee_schools(
          school_id,
          accepted_schools:accepted_schools!employee_schools_school_id_fkey(
            id,
            school_name,
            school_code
          )
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch employees', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: employees || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin employees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      full_name,
      email,
      school_ids,
    }: { full_name: string; email?: string; school_ids: string[] } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json(
        { error: 'Employee full name is required' },
        { status: 400 }
      );
    }

    if (!school_ids || !Array.isArray(school_ids) || school_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one school must be selected' },
        { status: 400 }
      );
    }

    // Generate unique employee ID
    let empId = '';
    for (let i = 0; i < 5; i++) {
      const candidate = generateEmployeeId();
      const { data: existing } = await supabase
        .from('admin_employees')
        .select('id')
        .eq('emp_id', candidate)
        .single();
      if (!existing) {
        empId = candidate;
        break;
      }
    }

    if (!empId) {
      return NextResponse.json(
        { error: 'Failed to generate a unique employee ID' },
        { status: 500 }
      );
    }

    // Generate and hash password
    const plainPassword = generateRandomPassword(12);
    const passwordHash = await hashPassword(plainPassword);

    // Insert employee
    const { data: employee, error: insertError } = await supabase
      .from('admin_employees')
      .insert([
        {
          emp_id: empId,
          full_name: full_name.trim(),
          email: email?.trim() || null,
          password_hash: passwordHash,
        },
      ])
      .select()
      .single();

    if (insertError || !employee) {
      return NextResponse.json(
        { error: 'Failed to create employee', details: insertError?.message },
        { status: 500 }
      );
    }

    // Insert mappings
    const mappings = school_ids.map((schoolId) => ({
      employee_id: employee.id,
      school_id: schoolId,
    }));

    const { error: mappingError } = await supabase
      .from('employee_schools')
      .insert(mappings);

    if (mappingError) {
      return NextResponse.json(
        {
          error: 'Employee created but failed to assign schools',
          details: mappingError.message,
        },
        { status: 500 }
      );
    }

    // Never store/display plain password again after this response
    return NextResponse.json(
      {
        data: {
          id: employee.id,
          emp_id: employee.emp_id,
          full_name: employee.full_name,
          email: employee.email,
          created_at: employee.created_at,
        },
        // Show generated password only once to the super admin
        password: plainPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating admin employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


