import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// PATCH - Approve or reject student leave request by class teacher
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, rejection_reason, teacher_id, staff_id } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "approve" or "reject"' 
      }, { status: 400 });
    }

    if (action === 'reject' && !rejection_reason) {
      return NextResponse.json({ 
        error: 'Rejection reason is required when rejecting a leave request' 
      }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // First, verify the teacher is the class teacher for this student
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('student_leave_requests')
      .select('student_id, school_code')
      .eq('id', id)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ 
        error: 'Leave request not found' 
      }, { status: 404 });
    }

    // Get student's class information (class, section; academic_year optional)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('class, section')
      .eq('id', leaveRequest.student_id)
      .eq('school_code', leaveRequest.school_code)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ 
        error: 'Student not found' 
      }, { status: 404 });
    }

    // Check if the teacher is the class teacher for this student's class
    let classQuery = supabase
      .from('classes')
      .select('id')
      .eq('school_code', leaveRequest.school_code)
      .eq('class', student.class)
      .eq('section', student.section);

    const conditions: string[] = [];
    if (teacher_id) {
      conditions.push(`class_teacher_id.eq.${teacher_id}`);
    }
    if (staff_id) {
      conditions.push(`class_teacher_staff_id.eq.${staff_id}`);
    }

    if (conditions.length === 0) {
      return NextResponse.json({ 
        error: 'Either teacher_id or staff_id is required' 
      }, { status: 400 });
    }

    classQuery = classQuery.or(conditions.join(','));

    const { data: classData, error: classError } = await classQuery.maybeSingle();

    if (classError || !classData) {
      return NextResponse.json({ 
        error: 'You are not the class teacher for this student\'s class' 
      }, { status: 403 });
    }

    // Use only columns that exist in student_leave_requests: status, rejected_reason, approved_by, approved_at
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> =
      action === 'approve'
        ? {
            status: 'approved',
            approved_by: teacher_id || null,
            approved_at: now,
            rejected_reason: null,
          }
        : {
            status: 'rejected',
            rejected_reason: rejection_reason,
            approved_by: null,
            approved_at: null,
          };

    const { data: updatedRequest, error: updateError } = await supabase
      .from('student_leave_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating student leave request:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update leave request',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      data: updatedRequest,
      message: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Error in PATCH /api/leave/student-requests/[id]/class-teacher-approval:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
