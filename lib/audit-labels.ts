/**
 * Human-readable labels for audit log action_type and entity_type.
 * Used only for display; storage remains the raw enum-like string.
 */
const ACTION_LABELS: Record<string, string> = {
  INSTITUTE_UPDATED: 'Institute info updated',
  ROLE_PERMISSION_CHANGED: 'Role or permission changed',
  ACADEMIC_YEAR_SETUP: 'Academic year setup changed',
  PROMOTION_RUN: 'Promotion run executed',
  PASSWORD_RESET: 'Password reset',
  STAFF_CREATED: 'Staff created',
  STAFF_UPDATED: 'Staff updated',
  STAFF_BULK_IMPORT: 'Staff bulk import',
  STUDENT_CREATED: 'Student created',
  STUDENT_UPDATED: 'Student updated',
  ATTENDANCE_MARKED: 'Attendance marked',
  ATTENDANCE_EDITED: 'Attendance edited',
  CLASS_CREATED: 'Class created',
  CLASS_UPDATED: 'Class updated',
  SUBJECT_ASSIGNED: 'Subject assigned',
  TIMETABLE_UPDATED: 'Timetable updated',
  EXAM_CREATED: 'Exam created',
  MARKS_UPDATED: 'Marks updated',
  REPORT_GENERATED: 'Report card generated',
  FEE_CREATED: 'Fee structure created',
  FEE_PAID: 'Fee payment recorded',
  REFUND_ISSUED: 'Refund issued',
  DISCOUNT_APPLIED: 'Discount applied',
  EXPENSE_RECORDED: 'Expense recorded',
  GATE_PASS_CREATED: 'Gate pass created',
  VISITOR_LOGGED: 'Visitor logged',
  LEAVE_REQUESTED: 'Leave requested',
  LEAVE_APPROVED: 'Leave approved',
  LEAVE_REJECTED: 'Leave rejected',
  CERTIFICATE_REQUESTED: 'Certificate requested',
  CERTIFICATE_APPROVED: 'Certificate approved',
  PASSWORD_CHANGED: 'Password changed',
  CONFIG_UPDATED: 'Configuration updated',
  // Generic fallbacks
  CREATED: 'Created',
  UPDATED: 'Updated',
  DELETED: 'Deleted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const ENTITY_LABELS: Record<string, string> = {
  INSTITUTE: 'Institute',
  USER: 'User',
  STAFF: 'Staff',
  STUDENT: 'Student',
  CLASS: 'Class',
  SUBJECT: 'Subject',
  TIMETABLE: 'Timetable',
  EXAM: 'Exam',
  MARKS: 'Marks',
  REPORT: 'Report',
  FEE: 'Fee',
  PAYMENT: 'Payment',
  EXPENSE: 'Expense',
  GATE_PASS: 'Gate pass',
  VISITOR: 'Visitor',
  LEAVE: 'Leave',
  CERTIFICATE: 'Certificate',
  CONFIG: 'Configuration',
};

export function getActionLabel(actionType: string, entityType?: string | null, metadata?: Record<string, unknown> | null): string {
  const base = ACTION_LABELS[actionType] ?? actionType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const entity = entityType ? (ENTITY_LABELS[entityType] ?? entityType) : '';
  const target = metadata?.target ?? metadata?.entityName ?? metadata?.class ?? metadata?.examName;
  const targetStr = target != null ? String(target) : '';
  if (entity && targetStr) return `${base} – ${entity}: ${targetStr}`;
  if (entity) return `${base} – ${entity}`;
  if (targetStr) return `${base} – ${targetStr}`;
  return base;
}

export function getEntityTypeLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}
