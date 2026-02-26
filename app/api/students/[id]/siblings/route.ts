import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizePhone(value: string): string {
  return getString(value).replace(/\D/g, '').trim();
}

function normalizeEmail(value: string): string {
  return getString(value).toLowerCase().trim();
}

/**
 * GET /api/students/[id]/siblings?school_code=XXX
 * Returns other students in the same school who share any parent contact
 * (father_contact, mother_contact, parent_phone, or parent_email).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'school_code is required' },
        { status: 400 }
      );
    }

    const fields = 'id,admission_no,student_name,class,section,father_contact,mother_contact,parent_phone,parent_email';

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(fields)
      .eq('id', studentId)
      .eq('school_code', schoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const phones: string[] = [];
    const emails: string[] = [];
    const fp = normalizePhone(getString(student.father_contact));
    const mp = normalizePhone(getString(student.mother_contact));
    const pp = normalizePhone(getString(student.parent_phone));
    const pe = normalizeEmail(getString(student.parent_email));
    if (fp && fp.length >= 8) phones.push(fp);
    if (mp && mp.length >= 8) phones.push(mp);
    if (pp && pp.length >= 8) phones.push(pp);
    if (pe) emails.push(pe);

    if (phones.length === 0 && emails.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const { data: allStudents, error: listError } = await supabase
      .from('students')
      .select(fields)
      .eq('school_code', schoolCode)
      .neq('id', studentId);

    if (listError) {
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    const phoneSet = new Set(phones);
    const emailSet = new Set(emails);

    const siblings = (allStudents || []).filter((s: { id: string; father_contact?: unknown; mother_contact?: unknown; parent_phone?: unknown; parent_email?: unknown }) => {
      const sFp = normalizePhone(getString(s.father_contact));
      const sMp = normalizePhone(getString(s.mother_contact));
      const sPp = normalizePhone(getString(s.parent_phone));
      const sPe = normalizeEmail(getString(s.parent_email));
      if (sFp && phoneSet.has(sFp)) return true;
      if (sMp && phoneSet.has(sMp)) return true;
      if (sPp && phoneSet.has(sPp)) return true;
      if (sPe && emailSet.has(sPe)) return true;
      return false;
    });

    return NextResponse.json({ data: siblings }, { status: 200 });
  } catch (error) {
    console.error('Error fetching siblings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
