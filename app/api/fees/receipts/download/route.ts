import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * POST /api/fees/receipts/download
 * Generate and download fee receipt(s) as PDF
 * Body: { school_code, student_id, fee_ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, student_id, fee_ids } = body;

    if (!school_code || !student_id || !fee_ids || !Array.isArray(fee_ids) || fee_ids.length === 0) {
      return NextResponse.json(
        { error: 'School code, student ID, and fee IDs are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = school_code.toUpperCase().trim();

    // Fetch school details
    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('*')
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Fetch student details
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', student_id)
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Fetch fee details
    const { data: fees, error: feesError } = await supabase
      .from('student_fees')
      .select(`
        *,
        fee_structure:fee_structure_id (
          id,
          name,
          class_name,
          section
        )
      `)
      .eq('student_id', student_id)
      .eq('school_code', normalizedSchoolCode)
      .in('id', fee_ids);

    if (feesError || !fees || fees.length === 0) {
      return NextResponse.json(
        { error: 'Fees not found' },
        { status: 404 }
      );
    }

    // Fetch fee structure items (fee heads) for each fee structure
    const feeStructureIds = [...new Set(fees.map(f => f.fee_structure_id))];
    const { data: structureItems } = await supabase
      .from('fee_structure_items')
      .select(`
        *,
        fee_head:fee_head_id (
          id,
          name,
          description,
          is_optional
        )
      `)
      .in('fee_structure_id', feeStructureIds);

    // Group structure items by fee_structure_id
    const itemsByStructure: Record<string, Record<string, unknown>[]> = {};
    ((structureItems || []) as Record<string, unknown>[]).forEach((item: Record<string, unknown>) => {
      const structureId = String(item.fee_structure_id || '');
      if (!itemsByStructure[structureId]) {
        itemsByStructure[structureId] = [];
      }
      itemsByStructure[structureId].push(item);
    });

    // Fetch payments for these fees
    const { data: payments } = await supabase
      .from('payments')
      .select(`
        *,
        receipt:receipts (receipt_no, issued_at),
        allocations:payment_allocations (
          *,
          student_fee:student_fee_id (id)
        )
      `)
      .eq('student_id', student_id)
      .eq('school_code', normalizedSchoolCode)
      .eq('is_reversed', false);

    // Generate HTML receipt
    const receiptHtml = generateReceiptHTML(school, student, fees, payments || [], itemsByStructure);

    // Return HTML that can be viewed in browser and printed/saved as PDF
    return new NextResponse(receiptHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateReceiptHTML(
  school: Record<string, unknown>,
  student: Record<string, unknown>,
  fees: Record<string, unknown>[],
  payments: Record<string, unknown>[],
  itemsByStructure: Record<string, Record<string, unknown>[]>
): string {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalAmount = fees.reduce((sum, fee) => {
    return sum + Number(fee.base_amount || 0) + Number(fee.adjustment_amount || 0);
  }, 0);

  const totalPaid = fees.reduce((sum, fee) => sum + Number(fee.paid_amount || 0), 0);
  const totalDue = totalAmount - totalPaid;

  // Find payments related to these fees
  const feeIds = new Set(fees.map((f: Record<string, unknown>) => f.id as string));
  const relevantPayments = payments.filter((payment: Record<string, unknown>) => {
    const allocations = payment.allocations as Record<string, unknown>[] | undefined;
    return allocations?.some((alloc: Record<string, unknown>) => feeIds.has(alloc.student_fee_id as string));
  });

  // Generate receipt content (will be duplicated for both copies)
  const receiptContent = generateReceiptContent(school, student, fees, relevantPayments, itemsByStructure, currentDate, totalAmount, totalPaid, totalDue);

  // Return two copies - School Copy and Student Copy
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fee Receipt - ${school.school_name || 'School'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    @page {
      size: A5;
      margin: 0;
    }
    body {
      font-family: 'Arial', sans-serif;
      padding: 0;
      background: #f5f5f5;
      width: 148mm; /* A5 width */
      min-height: 210mm; /* A5 height */
    }
    .page-container {
      width: 148mm;
      min-height: 210mm;
      background: white;
      padding: 15mm;
      page-break-after: always;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .page-container:last-child {
      page-break-after: auto;
    }
    .receipt-container {
      width: 100%;
      background: white;
    }
    .copy-label {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      color: #2F6FED;
      margin-bottom: 15px;
      padding: 8px;
      background: #e3f2fd;
      border-radius: 4px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #2F6FED;
      padding-bottom: 12px;
      margin-bottom: 15px;
    }
    .school-name {
      font-size: 20px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 6px;
    }
    .school-details {
      font-size: 11px;
      color: #666;
      line-height: 1.4;
    }
    .student-info {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 15px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .info-label {
      font-weight: 600;
      color: #555;
    }
    .info-value {
      color: #1a1a1a;
    }
    .fees-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 10px;
    }
    .fees-table th {
      background: #2F6FED;
      color: white;
      padding: 6px;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
    }
    .fees-table td {
      padding: 6px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 10px;
    }
    .fees-table tr:last-child td {
      border-bottom: none;
    }
    .fees-table tr:nth-child(even) {
      background: #f8f9fa;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .summary {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      margin-top: 12px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .summary-label {
      font-weight: 600;
      color: #555;
    }
    .summary-value {
      font-weight: bold;
      color: #1a1a1a;
    }
    .total-row {
      border-top: 2px solid #2F6FED;
      padding-top: 6px;
      margin-top: 6px;
      font-size: 14px;
    }
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 10px;
    }
    .payment-info {
      margin-top: 12px;
      padding: 10px;
      background: #e8f5e9;
      border-radius: 6px;
      border-left: 3px solid #4caf50;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .fee-section {
      margin-bottom: 20px;
    }
    .fee-header {
      background: #2F6FED;
      color: white;
      padding: 8px;
      border-radius: 6px 6px 0 0;
      margin-bottom: 0;
      font-size: 12px;
    }
    .fee-summary {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 0 0 6px 6px;
      border-top: 2px solid #e0e0e0;
      font-size: 11px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
        width: 148mm;
      }
      .page-container {
        box-shadow: none;
        padding: 15mm;
        page-break-after: always;
      }
      .page-container:last-child {
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <!-- School Copy -->
  <div class="page-container">
    <div class="receipt-container">
      <div class="copy-label">SCHOOL COPY</div>
      ${receiptContent}
    </div>
  </div>

  <!-- Student Copy -->
  <div class="page-container">
    <div class="receipt-container">
      <div class="copy-label">STUDENT COPY</div>
      ${receiptContent}
    </div>
  </div>
</body>
</html>
  `;
}

function generateReceiptContent(
  school: Record<string, unknown>,
  student: Record<string, unknown>,
  fees: Record<string, unknown>[],
  relevantPayments: Record<string, unknown>[],
  itemsByStructure: Record<string, Record<string, unknown>[]>,
  currentDate: string,
  totalAmount: number,
  totalPaid: number,
  totalDue: number
): string {
  return `
    <div class="header">
      <div class="school-name">${school.school_name || 'School Name'}</div>
      <div class="school-details">
        ${school.school_address ? `<div>${school.school_address}</div>` : ''}
        ${school.city || school.state ? `<div>${[school.city, school.state, school.zip_code].filter(Boolean).join(', ')}</div>` : ''}
        ${school.school_phone ? `<div>Phone: ${school.school_phone}</div>` : ''}
        ${school.school_email ? `<div>Email: ${school.school_email}</div>` : ''}
      </div>
    </div>

    <div class="student-info">
      <div class="info-row">
        <span class="info-label">Receipt Date:</span>
        <span class="info-value">${currentDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Student Name:</span>
        <span class="info-value">${student.student_name || student.full_name || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Admission Number:</span>
        <span class="info-value">${student.admission_no || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Class & Section:</span>
        <span class="info-value">${student.class || 'N/A'} - ${student.section || 'N/A'}</span>
      </div>
      ${student.roll_number ? `
      <div class="info-row">
        <span class="info-label">Roll Number:</span>
        <span class="info-value">${student.roll_number}</span>
      </div>
      ` : ''}
    </div>

    ${fees.map((fee: Record<string, unknown>) => {
      const balance = Number((fee.base_amount as number) || 0) + Number((fee.adjustment_amount as number) || 0) - Number((fee.paid_amount as number) || 0);
      const status = balance <= 0 ? 'Paid' : (fee.status as string) === 'overdue' ? 'Overdue' : 'Pending';
      const structureItems = itemsByStructure[fee.fee_structure_id as string] || [];
      
      const feeStructure = fee.fee_structure as Record<string, unknown> | undefined;
      const dueMonth = fee.due_month ? new Date(String(fee.due_month)).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : 'N/A';
      const dueDate = fee.due_date ? new Date(String(fee.due_date)).toLocaleDateString('en-IN') : 'N/A';
      
      return `
      <div class="fee-section">
        <div class="fee-header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 13px;">${feeStructure?.name || 'Fee'}</strong>
              <div style="font-size: 10px; opacity: 0.9; margin-top: 2px;">
                Due: ${dueMonth} | 
                Due Date: ${dueDate}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; opacity: 0.9;">Status</div>
              <div style="font-size: 12px; font-weight: bold;">${status}</div>
            </div>
          </div>
        </div>
        
        ${structureItems.length > 0 ? `
        <table class="fees-table" style="margin-bottom: 0;">
          <thead>
            <tr>
              <th style="width: 50%;">Fee Head</th>
              <th class="text-right" style="width: 25%;">Amount</th>
              <th class="text-right" style="width: 25%;">Allocated</th>
            </tr>
          </thead>
          <tbody>
            ${structureItems.map((item: Record<string, unknown>) => {
              // Calculate proportional amount for this fee head
              const headAmount = Number((item.amount as number) || 0);
              const totalStructureAmount = structureItems.reduce((sum: number, i: Record<string, unknown>) => sum + Number((i.amount as number) || 0), 0);
              const proportionalAmount = totalStructureAmount > 0 
                ? (headAmount / totalStructureAmount) * Number(fee.base_amount || 0)
                : 0;
              
              const feeHead = item.fee_head as Record<string, unknown> | undefined;
              const headName = feeHead?.name as string | undefined;
              const headDescription = feeHead?.description as string | undefined;
              const isOptional = feeHead?.is_optional as boolean | undefined;
              
              return `
              <tr>
                <td>
                  <div style="font-weight: 600; font-size: 10px;">${headName || 'Fee Head'}</div>
                  ${headDescription ? `<div style="font-size: 9px; color: #666; margin-top: 1px;">${headDescription}</div>` : ''}
                  ${isOptional ? `<span style="font-size: 8px; color: #2F6FED; margin-left: 4px;">(Optional)</span>` : ''}
                </td>
                <td class="text-right" style="font-size: 10px;">₹${headAmount.toLocaleString('en-IN')}</td>
                <td class="text-right" style="font-size: 10px;">₹${proportionalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : ''}
        
        <div class="fee-summary">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center;">
            <div>
              <div style="font-size: 9px; color: #666; margin-bottom: 2px;">Base Amount</div>
              <div style="font-size: 12px; font-weight: bold;">₹${Number(fee.base_amount || 0).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div style="font-size: 9px; color: #666; margin-bottom: 2px;">Adjustment</div>
              ${(() => {
                const adjustmentAmount = Number(fee.adjustment_amount || 0);
                const color = adjustmentAmount > 0 ? '#4caf50' : adjustmentAmount < 0 ? '#f44336' : '#1a1a1a';
                const display = adjustmentAmount !== 0 ? (adjustmentAmount > 0 ? '+' : '') + '₹' + adjustmentAmount.toLocaleString('en-IN') : '₹0';
                return `<div style="font-size: 12px; font-weight: bold; color: ${color};">${display}</div>`;
              })()}
            </div>
            <div>
              <div style="font-size: 9px; color: #666; margin-bottom: 2px;">Paid Amount</div>
              <div style="font-size: 12px; font-weight: bold; color: #4caf50;">₹${Number(fee.paid_amount || 0).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div style="font-size: 9px; color: #666; margin-bottom: 2px;">Balance</div>
              <div style="font-size: 12px; font-weight: bold; color: ${balance > 0 ? '#f44336' : '#4caf50'};">
                ₹${balance.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      </div>
      `;
    }).join('')}

    <div class="summary">
      <div class="summary-row">
        <span class="summary-label">Total Amount:</span>
        <span class="summary-value">₹${totalAmount.toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Total Paid:</span>
        <span class="summary-value" style="color: #4caf50;">₹${totalPaid.toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row total-row">
        <span class="summary-label">Balance Due:</span>
        <span class="summary-value" style="color: ${totalDue > 0 ? '#f44336' : '#4caf50'};">
          ₹${totalDue.toLocaleString('en-IN')}
        </span>
      </div>
    </div>

    ${relevantPayments.length > 0 ? `
    <div class="payment-info">
      <div style="font-weight: 600; margin-bottom: 10px; color: #2e7d32;">Payment History:</div>
      ${relevantPayments.map((payment: Record<string, unknown>) => {
        const receipt = payment.receipt as Record<string, unknown> | undefined;
        const receiptNo = receipt ? (receipt.receipt_no as string | undefined) : undefined;
        const paymentDateStr = payment.payment_date ? String(payment.payment_date) : null;
        const paymentDate = paymentDateStr ? new Date(paymentDateStr).toLocaleDateString('en-IN') : 'N/A';
        const paymentMode = String(payment.payment_mode || 'Cash');
        return `
        <div class="payment-row">
          <span>Receipt: ${receiptNo || 'N/A'} - ${paymentDate} (${paymentMode})</span>
          <span style="font-weight: 600;">₹${Number(payment.amount || 0).toLocaleString('en-IN')}</span>
        </div>
      `;
      }).join('')}
    </div>
    ` : ''}

    <div class="footer">
      <div style="margin-bottom: 10px;">
        <strong>This is a computer-generated receipt. No signature required.</strong>
      </div>
      <div>Generated on ${new Date().toLocaleString('en-IN')}</div>
      ${school.school_name ? `<div style="margin-top: 10px;">${school.school_name}</div>` : ''}
    </div>
  `;
}
