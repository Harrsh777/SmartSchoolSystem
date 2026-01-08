import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * PATCH /api/finance/salary/[id]
 * Update a salary record or mark as paid
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      base_salary,
      bonus,
      deduction,
      payment_status,
      payment_date,
      payment_mode,
      payment_reference,
      notes,
      updated_by,
      create_expense, // If true, create expense entry when marking as paid
    } = body;

    // Get existing record for audit
    const { data: existing, error: fetchError } = await supabase
      .from('salary_records')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Salary record not found' },
        { status: 404 }
      );
    }

    // Prevent editing paid salaries
    if (existing.payment_status === 'PAID' && (base_salary !== undefined || bonus !== undefined || deduction !== undefined)) {
      return NextResponse.json(
        { error: 'Cannot edit salary details after payment' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (base_salary !== undefined) updateData.base_salary = parseFloat(base_salary);
    if (bonus !== undefined) updateData.bonus = parseFloat(bonus);
    if (deduction !== undefined) updateData.deduction = parseFloat(deduction);
    if (payment_status !== undefined) updateData.payment_status = payment_status;
    if (payment_date !== undefined) updateData.payment_date = payment_date;
    if (payment_mode !== undefined) updateData.payment_mode = payment_mode;
    if (payment_reference !== undefined) updateData.payment_reference = payment_reference;
    if (notes !== undefined) updateData.notes = notes;
    if (updated_by !== undefined) updateData.updated_by = updated_by;

    // Recalculate net salary if salary components changed
    if (base_salary !== undefined || bonus !== undefined || deduction !== undefined) {
      const newBase = base_salary !== undefined ? parseFloat(base_salary) : existing.base_salary;
      const newBonus = bonus !== undefined ? parseFloat(bonus) : existing.bonus;
      const newDeduction = deduction !== undefined ? parseFloat(deduction) : existing.deduction;
      updateData.net_salary = newBase + newBonus - newDeduction;
    }

    // Update salary record
    const { data: updatedRecord, error: updateError } = await supabase
      .from('salary_records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update salary record', details: updateError.message },
        { status: 500 }
      );
    }

    // If marking as paid and create_expense is true, create expense entry
    if (payment_status === 'PAID' && create_expense) {
      // Check if expense entry already exists
      const { data: existingExpense } = await supabase
        .from('expense_entries')
        .select('id')
        .eq('salary_record_id', id)
        .single();
      
      if (!existingExpense) {
        // Get staff name
      const { data: staff } = await supabase
        .from('staff')
        .select('full_name')
        .eq('id', existing.staff_id)
        .single();

      // Get financial year
      const { data: financialYear } = await supabase
        .from('financial_years')
        .select('id')
        .eq('school_code', existing.school_code)
        .eq('is_current', true)
        .single();

      // Create expense entry
      const { data: schoolData } = await supabase
        .from('accepted_schools')
        .select('id')
        .eq('school_code', existing.school_code)
        .single();

        if (schoolData) {
          await supabase.from('expense_entries').insert([{
            school_id: schoolData.id,
            school_code: existing.school_code,
            financial_year_id: financialYear?.id || null,
            category: 'Salary',
            amount: parseFloat(updatedRecord.net_salary.toString()),
            entry_date: payment_date || new Date().toISOString().split('T')[0],
            paid_to: staff?.full_name || 'Staff',
            payment_mode: payment_mode || 'Bank',
            notes: `Salary for ${updatedRecord.salary_month}`,
            salary_record_id: id,
            is_finalized: true,
            created_by: updated_by || null,
          }]);
        }
      }
    }

    // Create audit log
    await supabase.from('finance_audit_logs').insert([{
      school_code: existing.school_code,
      table_name: 'salary_records',
      record_id: id,
      action: payment_status === 'PAID' ? 'PAY_SALARY' : 'UPDATE',
      old_values: existing,
      new_values: updatedRecord,
      changed_by: updated_by || null,
    }]);

    return NextResponse.json({ data: updatedRecord }, { status: 200 });
  } catch (error) {
    console.error('Error updating salary record:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



