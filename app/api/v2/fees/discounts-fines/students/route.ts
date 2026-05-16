import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

function escapeIlike(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * GET /api/v2/fees/discounts-fines/students
 * Students for bulk discounts/fines with class-section and demographic filters.
 */
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) return permissionCheck;

    const sp = request.nextUrl.searchParams;
    const schoolCode = sp.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }

    const classFilter = sp.get('class')?.trim() || '';
    const sectionFilter = sp.get('section')?.trim() || '';
    if (!classFilter || !sectionFilter) {
      return NextResponse.json({ error: 'class and section are required' }, { status: 400 });
    }

    const gender = sp.get('gender')?.trim() || '';
    const category = sp.get('category')?.trim() || '';
    const admissionYear = sp.get('admission_year')?.trim() || '';
    const rte = sp.get('rte')?.trim().toLowerCase() || '';
    const sort = sp.get('sort') === 'roll' ? 'roll' : 'name';

    const code = schoolCode.toUpperCase();
    const supabase = getServiceRoleClient();

    const selectCols =
      'id, student_name, admission_no, roll_number, class, section, gender, category, date_of_admission, is_rte, school_code';

    let query = supabase
      .from('students')
      .select(selectCols)
      .eq('school_code', code)
      .ilike('class', escapeIlike(classFilter))
      .ilike('section', escapeIlike(sectionFilter))
      .limit(500);

    if (gender) query = query.ilike('gender', escapeIlike(gender));
    if (category) query = query.ilike('category', escapeIlike(category));
    if (rte === 'yes') query = query.eq('is_rte', true);
    if (rte === 'no') query = query.eq('is_rte', false);

    if (admissionYear) {
      const y = parseInt(admissionYear, 10);
      if (Number.isFinite(y)) {
        query = query.gte('date_of_admission', `${y}-01-01`).lte('date_of_admission', `${y}-12-31`);
      }
    }

    if (sort === 'roll') {
      query = query.order('roll_number', { ascending: true, nullsFirst: false });
    } else {
      query = query.order('student_name', { ascending: true });
    }

    const { data: initialData, error } = await query;
    let data = initialData;

    if (error) {
      const legacySelect =
        'id, student_name, admission_no, roll_number, class, section, gender, category, date_of_admission, school_code';
      let legacy = supabase
        .from('students')
        .select(legacySelect)
        .eq('school_code', code)
        .ilike('class', escapeIlike(classFilter))
        .ilike('section', escapeIlike(sectionFilter))
        .limit(500);

      if (gender) legacy = legacy.ilike('gender', escapeIlike(gender));
      if (category) legacy = legacy.ilike('category', escapeIlike(category));
      if (admissionYear) {
        const y = parseInt(admissionYear, 10);
        if (Number.isFinite(y)) {
          legacy = legacy.gte('date_of_admission', `${y}-01-01`).lte('date_of_admission', `${y}-12-31`);
        }
      }
      legacy = sort === 'roll' ? legacy.order('roll_number', { ascending: true }) : legacy.order('student_name', { ascending: true });

      const res2 = await legacy;
      if (res2.error) {
        return NextResponse.json({ error: res2.error.message }, { status: 500 });
      }
      data = (res2.data || []).map((r) => ({ ...r, is_rte: false }));
    }

    const students = (data || []).map((s) => {
      const dob = s.date_of_admission ? String(s.date_of_admission).slice(0, 10) : null;
      const yearOfJoining = dob ? new Date(dob).getFullYear() : null;
      return {
        id: String(s.id),
        student_name: String(s.student_name || ''),
        admission_no: String(s.admission_no || ''),
        roll_number: String(s.roll_number || ''),
        gender: s.gender != null ? String(s.gender) : null,
        category: s.category != null ? String(s.category) : null,
        date_of_admission: dob,
        year_of_joining: yearOfJoining,
        is_rte: Boolean((s as { is_rte?: boolean }).is_rte),
      };
    });

    if (sort === 'roll') {
      students.sort((a, b) => {
        const ra = a.roll_number || '';
        const rb = b.roll_number || '';
        if (!ra && !rb) return a.student_name.localeCompare(b.student_name);
        if (!ra) return 1;
        if (!rb) return -1;
        return ra.localeCompare(rb, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    const genders = [...new Set(students.map((s) => s.gender).filter(Boolean))].sort();
    const categories = [...new Set(students.map((s) => s.category).filter(Boolean))].sort();
    const years = [
      ...new Set(students.map((s) => s.year_of_joining).filter((y): y is number => y != null)),
    ].sort((a, b) => b - a);

    return NextResponse.json({
      data: {
        students,
        filter_options: { genders, categories, admission_years: years },
      },
    });
  } catch (e) {
    console.error('GET discounts-fines/students', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
