import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Fetch all examinations with related data
    const { data: examinations, error: examsError } = await supabase
      .from('examinations')
      .select(`
        *,
        class_mappings:exam_class_mappings(
          class_id,
          class:classes(
            class,
            section
          )
        ),
        subject_mappings:exam_subject_mappings(
          class_id,
          subject_id,
          max_marks,
          pass_marks,
          weightage,
          subject:subjects(
            name
          )
        ),
        schedules:exam_schedules(
          exam_date,
          start_time,
          end_time,
          class,
          section,
          subject
        )
      `)
      .eq('school_code', schoolCode)
      .order('start_date', { ascending: false });

    if (examsError) {
      return NextResponse.json(
        { error: 'Failed to fetch examination data', details: examsError.message },
        { status: 500 }
      );
    }

    // Convert to CSV
    if (!examinations || examinations.length === 0) {
      return new NextResponse('No examination data available', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="examination_report_${schoolCode}.csv"`,
        },
      });
    }

    const escapeCsvValue = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    };

    // Create CSV with relevant columns
    const csvHeader = [
      'Exam Name',
      'Academic Year',
      'Start Date',
      'End Date',
      'Status',
      'Description',
      'Class',
      'Section',
      'Subject',
      'Max Marks',
      'Pass Marks',
      'Weightage',
      'Exam Date',
      'Start Time',
      'End Time',
      'Created At',
    ].join(',') + '\n';

    const csvRows: string[] = [];

    examinations.forEach((exam: {
      exam_name?: string;
      academic_year?: string;
      start_date?: string;
      end_date?: string;
      status?: string;
      description?: string;
      created_at?: string;
      class_mappings?: Array<{
        class_id?: string;
        class?: { class?: string; section?: string } | Array<{ class?: string; section?: string }>;
      }>;
      subject_mappings?: Array<{
        class_id?: string;
        subject_id?: string;
        max_marks?: number;
        pass_marks?: number;
        weightage?: number;
        subject?: { name?: string } | Array<{ name?: string }>;
      }>;
      schedules?: Array<{
        exam_date?: string;
        start_time?: string;
        end_time?: string;
        class?: string;
        section?: string;
        subject?: string;
      }>;
      [key: string]: unknown;
    }) => {
      const classMappings = exam.class_mappings || [];
      const subjectMappings = exam.subject_mappings || [];
      const schedules = exam.schedules || [];

      if (schedules.length > 0) {
        // Use schedules if available (most detailed)
        schedules.forEach((schedule) => {
          // Find matching subject mapping by subject name
          const subjectMapping = subjectMappings.find((sm) => {
            const subject = Array.isArray(sm.subject) ? sm.subject[0] : sm.subject as { name?: string } | undefined;
            return subject?.name === schedule.subject;
          });

          csvRows.push([
            exam.exam_name || '',
            exam.academic_year || '',
            exam.start_date || '',
            exam.end_date || '',
            exam.status || '',
            exam.description || '',
            schedule.class || '',
            schedule.section || '',
            schedule.subject || '',
            subjectMapping?.max_marks || '',
            subjectMapping?.pass_marks || '',
            subjectMapping?.weightage || '',
            schedule.exam_date || '',
            schedule.start_time || '',
            schedule.end_time || '',
            exam.created_at || '',
          ].map(escapeCsvValue).join(','));
        });
      } else if (subjectMappings.length > 0) {
        // Use subject mappings if schedules not available
        subjectMappings.forEach((subjectMapping) => {
          const subject = Array.isArray(subjectMapping.subject)
            ? subjectMapping.subject[0]?.name || ''
            : (subjectMapping.subject as { name?: string } | undefined)?.name || '';

          // Find matching class
          const classMapping = classMappings.find((cm) => cm.class_id === subjectMapping.class_id);
          const classInfo = Array.isArray(classMapping?.class)
            ? classMapping.class[0]
            : classMapping?.class as { class?: string; section?: string } | undefined;

          csvRows.push([
            exam.exam_name || '',
            exam.academic_year || '',
            exam.start_date || '',
            exam.end_date || '',
            exam.status || '',
            exam.description || '',
            classInfo?.class || '',
            classInfo?.section || '',
            subject,
            subjectMapping.max_marks || '',
            subjectMapping.pass_marks || '',
            subjectMapping.weightage || '',
            '',
            '',
            '',
            exam.created_at || '',
          ].map(escapeCsvValue).join(','));
        });
      } else {
        // Just exam info with class mappings
        if (classMappings.length > 0) {
          classMappings.forEach((classMapping) => {
            const classInfo = Array.isArray(classMapping.class)
              ? classMapping.class[0]
              : classMapping.class as { class?: string; section?: string } | undefined;

            csvRows.push([
              exam.exam_name || '',
              exam.academic_year || '',
              exam.start_date || '',
              exam.end_date || '',
              exam.status || '',
              exam.description || '',
              classInfo?.class || '',
              classInfo?.section || '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              exam.created_at || '',
            ].map(escapeCsvValue).join(','));
          });
        } else {
          // Just exam info
          csvRows.push([
            exam.exam_name || '',
            exam.academic_year || '',
            exam.start_date || '',
            exam.end_date || '',
            exam.status || '',
            exam.description || '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            exam.created_at || '',
          ].map(escapeCsvValue).join(','));
        }
      }
    });

    const csvContent = csvHeader + csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="examination_report_${schoolCode}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating examination report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
