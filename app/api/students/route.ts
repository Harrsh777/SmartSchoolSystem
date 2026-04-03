import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission } from '@/lib/permission-middleware';
import { normalizeStudentGenderForDb } from '@/lib/students/gender';
import {
  getCached,
  cacheKeys,
  DASHBOARD_REDIS_TTL,
  invalidateCachePattern,
} from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    // Check permission for viewing students
    const permission = await requirePermission(request, 'student_directory', 'view', 'view');
    if (!permission || !permission.allowed) {
      // Allow if no staff ID (for admin/principal access)
      const staffId = request.headers.get('x-staff-id') || request.nextUrl.searchParams.get('staff_id');
      if (staffId) {
        return NextResponse.json(
          { error: 'Access denied. You do not have permission to view students.' },
          { status: 403 }
        );
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

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

    const { data: currentYearRow } = await supabase
      .from('academic_years')
      .select('id, year_name')
      .eq('school_code', schoolCode)
      .eq('is_current', true)
      .maybeSingle();
    if (!currentYearRow?.year_name) {
      return NextResponse.json(
        { error: 'Setup academic year first from Academic Year Management module.' },
        { status: 400 }
      );
    }

    // Get optional filters
    const classFilter = searchParams.get('class');
    const sectionFilter = searchParams.get('section');
    const academicYearFilter = searchParams.get('academic_year');
    const statusFilter = searchParams.get('status');
    const searchRaw = searchParams.get('search')?.trim() ?? '';
    const limitRaw = searchParams.get('limit');
    const parsedLimit = limitRaw != null && limitRaw !== '' ? parseInt(limitRaw, 10) : NaN;
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 500) : null;

    const pageRaw = searchParams.get('page');
    const paginate = pageRaw != null && pageRaw !== '';
    let page = 1;
    let pageSize = 25;
    if (paginate) {
      page = Math.max(1, parseInt(pageRaw, 10) || 1);
      const ps = parseInt(searchParams.get('page_size') || '25', 10);
      pageSize = Number.isFinite(ps) ? Math.min(100, Math.max(1, ps)) : 25;
    }

    // Build query - select only fields needed for list view (include transport for route mapping UI)
    const studentFields =
      'id,admission_no,student_name,first_name,last_name,date_of_birth,class,section,academic_year,status,student_contact,father_name,mother_name,father_contact,mother_contact,parent_name,parent_phone,parent_email,roll_number,email,house,photo_url,created_at,updated_at,transport_route_id,transport_pickup_stop_id,transport_dropoff_stop_id,transport_custom_fare,transport_fee,transport_type';
    let query = paginate
      ? supabase
          .from('students')
          .select(studentFields, { count: 'exact' })
          .eq('school_code', schoolCode)
      : supabase.from('students').select(studentFields).eq('school_code', schoolCode);

    // Apply filters - case-insensitive class/section so "CLASS-1" matches "Class-1" in DB
    function escapeIlike(value: string): string {
      return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
    }
    if (classFilter) {
      const trimmed = String(classFilter).trim();
      const escaped = escapeIlike(trimmed);
      query = query.ilike('class', escaped);
    }
    if (sectionFilter !== null && sectionFilter !== undefined && String(sectionFilter).trim() !== '') {
      const sectionVal = String(sectionFilter ?? '').trim();
      query = query.ilike('section', escapeIlike(sectionVal));
    }

    if (searchRaw.length >= 2) {
      const tokens = searchRaw.split(/\s+/).filter((t) => t.length > 0);
      if (tokens.length === 1) {
        const safe = escapeIlike(tokens[0]);
        const p = `%${safe}%`;
        query = query.or(`student_name.ilike.${p},admission_no.ilike.${p},email.ilike.${p}`);
      } else {
        // Full name: every word must appear in student_name (tighter than a single OR ilike).
        for (const tok of tokens) {
          query = query.ilike('student_name', `%${escapeIlike(tok)}%`);
        }
      }
    }

    if (academicYearFilter) {
      // Include students with matching academic_year OR null (students added without year)
      query = query.or(`academic_year.eq.${academicYearFilter},academic_year.is.null`);
    }
    if (statusFilter && statusFilter !== 'all') {
      // Map status filter to database values
      const statusMap: Record<string, string> = {
        'active': 'active',
        'deactivated': 'deactivated',
        'transferred': 'transferred',
        'alumni': 'alumni',
        'deleted': 'deleted',
      };
      const dbStatus = statusMap[statusFilter] || statusFilter;
      query = query.eq('status', dbStatus);
    } else if (!statusFilter) {
      // Default to active if no status specified
      query = query.eq('status', 'active');
    }
    // If statusFilter is 'all', don't filter by status

    const sortByParam = (searchParams.get('sort_by') || '').trim().toLowerCase();
    const sortOrderParam = (searchParams.get('sort_order') || '').trim().toLowerCase();
    let orderColumn = 'created_at';
    let ascending = false;
    if (sortByParam === 'student_name' || sortByParam === 'name') {
      orderColumn = 'student_name';
      ascending = sortOrderParam !== 'desc';
    } else if (sortByParam === 'roll_number' || sortByParam === 'roll') {
      orderColumn = 'roll_number';
      ascending = sortOrderParam !== 'desc';
    } else {
      orderColumn = 'created_at';
      ascending = sortOrderParam === 'asc';
    }
    query = query.order(orderColumn, { ascending, nullsFirst: false });

    if (paginate) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    } else if (limit != null) {
      query = query.limit(limit);
    }

    const listFingerprint = [
      paginate ? `pg:${page}:${pageSize}` : 'nopg',
      limit != null ? `lim:${limit}` : '',
      classFilter || '-',
      String(sectionFilter ?? '').slice(0, 64),
      academicYearFilter || '-',
      statusFilter || '-',
      searchRaw.slice(0, 160),
      sortByParam || '-',
      sortOrderParam || '-',
    ].join('|');

    const listCacheKey = cacheKeys.studentsList(schoolCode, listFingerprint);

    let listPayload: {
      mode: 'page';
      data: unknown[];
      total: number;
      page: number;
      page_size: number;
    } | { mode: 'list'; data: unknown[] };

    try {
      listPayload = await getCached(
        listCacheKey,
        async () => {
          const { data: students, error: studentsError, count } = await query;
          if (studentsError) throw new Error(studentsError.message);
          if (paginate) {
            return {
              mode: 'page' as const,
              data: students || [],
              total: count ?? 0,
              page,
              page_size: pageSize,
            };
          }
          return { mode: 'list' as const, data: students || [] };
        },
        { ttlSeconds: DASHBOARD_REDIS_TTL.studentsDirectory }
      );
    } catch (err) {
      const details = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { error: 'Failed to fetch students', details },
        { status: 500 }
      );
    }

    if (listPayload.mode === 'page') {
      return NextResponse.json(
        {
          data: listPayload.data,
          total: listPayload.total,
          page: listPayload.page,
          page_size: listPayload.page_size,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ data: listPayload.data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, ...studentData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const { data: currentYearForInsert } = await supabase
      .from('academic_years')
      .select('id, year_name')
      .eq('school_code', school_code)
      .eq('is_current', true)
      .maybeSingle();
    if (!currentYearForInsert?.year_name) {
      return NextResponse.json(
        { error: 'Setup academic year first from Academic Year Management module.' },
        { status: 400 }
      );
    }

    // Check for duplicate admission number
    const { data: existing } = await supabase
      .from('students')
      .select('admission_no')
      .eq('school_code', school_code)
      .eq('admission_no', studentData.admission_no)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Admission number already exists' },
        { status: 400 }
      );
    }

    // Check for duplicate Aadhaar number if provided
    if (studentData.aadhaar_number) {
      const { data: existingAadhaar } = await supabase
        .from('students')
        .select('aadhaar_number')
        .eq('school_code', school_code)
        .eq('aadhaar_number', studentData.aadhaar_number)
        .maybeSingle();

      if (existingAadhaar) {
        return NextResponse.json(
          { error: 'Aadhaar number already exists for a student at this school' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate RFID if provided
    if (studentData.rfid) {
      const { data: existingRfid } = await supabase
        .from('students')
        .select('rfid')
        .eq('school_code', school_code)
        .eq('rfid', studentData.rfid)
        .single();

      if (existingRfid) {
        return NextResponse.json(
          { error: 'RFID already exists for this school' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate roll number in same class and section if provided
    if (studentData.roll_number && studentData.class && studentData.section) {
      const { data: existingRoll } = await supabase
        .from('students')
        .select('roll_number')
        .eq('school_code', school_code)
        .eq('class', studentData.class)
        .eq('section', studentData.section)
        .eq('roll_number', studentData.roll_number)
        .single();

      if (existingRoll) {
        return NextResponse.json(
          { error: 'Roll number already exists in this class and section' },
          { status: 400 }
        );
      }
    }

    // Insert student with all fields
    const rteValue = Boolean(studentData.rte);
    const baseRow: Record<string, unknown> = {
      school_id: schoolData.id,
      school_code: school_code,
      admission_no: studentData.admission_no,
      student_name: studentData.student_name,
      class: studentData.class,
      section: studentData.section,
      first_name: studentData.first_name || null,
      middle_name: studentData.middle_name || null,
      last_name: studentData.last_name || null,
      date_of_birth: studentData.date_of_birth || null,
      gender: normalizeStudentGenderForDb(studentData.gender),
      blood_group: studentData.blood_group || null,
      email: studentData.email || null,
      student_contact: studentData.student_contact || null,
      address: studentData.address || null,
      city: studentData.city || null,
      state: studentData.state || null,
      pincode: studentData.pincode || null,
      landmark: studentData.landmark || null,
      roll_number: studentData.roll_number || null,
      date_of_admission: studentData.date_of_admission || null,
      last_class: studentData.last_class || null,
      last_school_name: studentData.last_school_name || null,
      last_school_percentage: studentData.last_school_percentage || null,
      last_school_result: studentData.last_school_result || null,
      medium: studentData.medium || null,
      schooling_type: studentData.schooling_type || null,
      aadhaar_number: studentData.aadhaar_number || null,
      rfid: studentData.rfid || null,
      pen_no: studentData.pen_no || null,
      apaar_no: studentData.apaar_no || null,
      sr_no: studentData.sr_no || null,
      parent_name: studentData.parent_name || null,
      parent_phone: studentData.parent_phone || null,
      parent_email: studentData.parent_email || null,
      father_name: studentData.father_name || null,
      father_occupation: studentData.father_occupation || null,
      father_contact: studentData.father_contact || null,
      mother_name: studentData.mother_name || null,
      mother_occupation: studentData.mother_occupation || null,
      mother_contact: studentData.mother_contact || null,
      staff_relation: studentData.staff_relation || null,
      religion: studentData.religion || null,
      category: studentData.category || null,
      nationality: studentData.nationality || 'Indian',
      house: studentData.house || null,
      transport_type: studentData.transport_type || null,
      rte: rteValue,
      // `fees/v2` uses `is_rte` for RTE checks.
      is_rte: rteValue,
      new_admission: studentData.new_admission !== undefined ? studentData.new_admission : true,
      academic_year: String(currentYearForInsert.year_name),
      status: 'active',
    };

    let newStudent: unknown;
    let insertError: { message?: string } | null = null;

    ({ data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert([baseRow])
      .select()
      .single());

    if (insertError) {
      const missingIsRte =
        /is_rte/i.test(insertError.message || '') &&
        (/column/i.test(insertError.message || '') || /does not exist/i.test(insertError.message || ''));

      if (missingIsRte) {
        const { is_rte, ...retryRow } = baseRow;
        ({ data: newStudent, error: insertError } = await supabase
          .from('students')
          .insert([retryRow])
          .select()
          .single());
      }
    }

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create student', details: insertError.message },
        { status: 500 }
      );
    }

    void invalidateCachePattern(cacheKeys.studentsListPattern(school_code));

    return NextResponse.json({ data: newStudent }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

