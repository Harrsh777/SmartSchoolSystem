import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');

    if (!schoolCode || !classId) {
      return NextResponse.json(
        { error: 'School code and class ID are required' },
        { status: 400 }
      );
    }

    // Get school information
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('school_name, school_code')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Get class information
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, class, section, academic_year')
      .eq('id', classId)
      .eq('school_code', schoolCode)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Get period group for the class
    const { data: periodGroupData } = await supabase
      .from('timetable_period_groups')
      .select('id, group_name, selected_days, periods')
      .eq('school_code', schoolCode)
      .single();

    // Fetch timetable slots (without nested select to avoid FK issues)
    const { data: slotsData, error: slotsError } = await supabase
      .from('timetable_slots')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('class_id', classId)
      .order('day', { ascending: true })
      .order('period_order', { ascending: true, nullsFirst: false })
      .order('period', { ascending: true, nullsFirst: false });

    if (slotsError) {
      console.error('Error fetching timetable slots:', slotsError);
      return NextResponse.json(
        { error: 'Failed to fetch timetable slots', details: slotsError.message },
        { status: 500 }
      );
    }

    // Fetch subjects and teachers for slots
    const subjectIds = [...new Set((slotsData || []).map((slot: { subject_id?: string }) => slot.subject_id).filter(Boolean))];
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name, color')
      .in('id', subjectIds)
      .eq('school_code', schoolCode);

    const subjectsMap = new Map((subjectsData || []).map((s: { id: string; name: string; color: string }) => [s.id, s]));

    const slotsWithTeachers = await Promise.all(
      (slotsData || []).map(async (slot: { teacher_ids?: string[]; subject_id?: string; [key: string]: unknown }) => {
        const slotWithData: { teachers?: Array<{ full_name?: string }>; subject?: { name?: string; color?: string }; [key: string]: unknown } = { ...slot };
        
        // Add subject data
        if (slot.subject_id && subjectsMap.has(slot.subject_id)) {
          slotWithData.subject = subjectsMap.get(slot.subject_id);
        }

        // Add teacher data
        if (slot.teacher_ids && Array.isArray(slot.teacher_ids) && slot.teacher_ids.length > 0) {
          const { data: teachers } = await supabase
            .from('staff')
            .select('id, full_name, staff_id')
            .in('id', slot.teacher_ids)
            .eq('school_code', schoolCode);
          
          slotWithData.teachers = teachers || [];
        }
        
        return slotWithData;
      })
    );

    // Get period group periods if available
    const days = periodGroupData?.selected_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = periodGroupData?.periods 
      ? periodGroupData.periods.filter((p: { is_break?: boolean }) => !p.is_break).sort((a: { period_order: number }, b: { period_order: number }) => a.period_order - b.period_order)
      : [];

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Header information
    const headerData = [
      [schoolData.school_name || 'School Name'],
      [`Class Timetable: ${classData.class}${classData.section ? `-${classData.section}` : ''}`],
      [`Academic Year: ${classData.academic_year || 'N/A'}`],
      [`Period Group: ${periodGroupData?.group_name || 'N/A'}`],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [], // Empty row
    ];

    // Create header sheet
    const headerWs = XLSX.utils.aoa_to_sheet(headerData);
    headerWs['!cols'] = [{ wch: 50 }];
    XLSX.utils.book_append_sheet(wb, headerWs, 'Info');

    // Create timetable data
    const timetableData: string[][] = [];
    
    // Header row
    const headerRow = ['Day / Period'];
    periods.forEach((period: { period_order: number; period_name?: string; period_start_time?: string; period_end_time?: string }) => {
      const periodLabel = period.period_name 
        ? `${period.period_name} (${period.period_start_time || ''} - ${period.period_end_time || ''})`
        : `Period ${period.period_order}`;
      headerRow.push(periodLabel);
    });
    timetableData.push(headerRow);

    // Data rows
    days.forEach((day: string) => {
      const row: string[] = [day];
      periods.forEach((period: { period_order: number }) => {
        const slot = slotsWithTeachers.find((s: Record<string, unknown>) => 
          s.day === day && s.period_order === period.period_order
        );
        
        if (slot && (slot as { subject?: { name?: string } }).subject) {
          const subject = (slot as { subject: { name?: string }; teachers?: Array<{ full_name?: string }> }).subject;
          const teachers = (slot as { teachers?: Array<{ full_name?: string }> }).teachers;
          const teacherNames = teachers && teachers.length > 0 
            ? teachers.map((t: { full_name?: string }) => t.full_name).join(', ')
            : '';
          const cellValue = teacherNames 
            ? `${subject?.name || ''} (${teacherNames})`
            : subject?.name || '';
          row.push(cellValue);
        } else {
          row.push('');
        }
      });
      timetableData.push(row);
    });

    // Create timetable sheet
    const timetableWs = XLSX.utils.aoa_to_sheet(timetableData);
    
    // Set column widths
    const colWidths = [{ wch: 15 }]; // Day column
    periods.forEach(() => colWidths.push({ wch: 25 })); // Period columns
    timetableWs['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, timetableWs, 'Timetable');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    const className = `${classData.class}${classData.section ? `-${classData.section}` : ''}`;
    const filename = `timetable_${className}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating timetable download:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
