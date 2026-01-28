import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/fees/receipts/[id]/download
 * Download a specific payment receipt as PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = schoolCode.toUpperCase().trim();

    // Fetch payment with all related data
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        student:student_id (
          *
        ),
        receipt:receipts (
          receipt_no,
          issued_at
        ),
        allocations:payment_allocations (
          *,
          student_fee:student_fee_id (
            *,
            fee_structure:fee_structure_id (
              name
            )
          )
        ),
        collector:collected_by (
          full_name,
          staff_id
        )
      `)
      .eq('id', id)
      .eq('school_code', normalizedSchoolCode)
      .eq('is_reversed', false)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment receipt not found' },
        { status: 404 }
      );
    }

    // Fetch school details
    const { data: school } = await supabase
      .from('accepted_schools')
      .select('*')
      .eq('school_code', normalizedSchoolCode)
      .single();

    // Generate HTML receipt with two copies
    const receiptHtml = generatePaymentReceiptHTML(school, payment);

    return new NextResponse(receiptHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating payment receipt:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generatePaymentReceiptHTML(school: Record<string, unknown>, payment: Record<string, unknown>): string {
  const paymentDate = new Date(String(payment.payment_date || '')).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const receipt = payment.receipt as Record<string, unknown> | undefined;
  const receiptDate = receipt?.issued_at 
    ? new Date(String(receipt.issued_at)).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : paymentDate;

  // Generate receipt content (will be duplicated for both copies)
  const receiptContent = generatePaymentReceiptContent(school, payment, paymentDate, receiptDate);

  // Return two copies - School Copy and Student Copy
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${school?.school_name || 'School'}</title>
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
    .receipt-title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      color: #2F6FED;
      margin-bottom: 15px;
    }
    .info-section {
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
    .amount-box {
      background: linear-gradient(135deg, #2F6FED 0%, #1E3A8A 100%);
      color: white;
      padding: 20px;
      border-radius: 6px;
      text-align: center;
      margin-bottom: 15px;
    }
    .amount-label {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 6px;
    }
    .amount-value {
      font-size: 28px;
      font-weight: bold;
    }
    .allocations-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 10px;
    }
    .allocations-table th {
      background: #2F6FED;
      color: white;
      padding: 6px;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
    }
    .allocations-table td {
      padding: 6px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 10px;
    }
    .allocations-table tr:last-child td {
      border-bottom: none;
    }
    .allocations-table tr:nth-child(even) {
      background: #f8f9fa;
    }
    .text-right {
      text-align: right;
    }
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 10px;
    }
    .payment-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    .detail-box {
      background: white;
      padding: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    .detail-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    .detail-value {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
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

function generatePaymentReceiptContent(
  school: Record<string, unknown>,
  payment: Record<string, unknown>,
  paymentDate: string,
  receiptDate: string
): string {
  return `
    <div class="header">
      <div class="school-name">${school?.school_name || 'School Name'}</div>
      <div class="school-details">
        ${school?.school_address ? `<div>${school.school_address}</div>` : ''}
        ${school?.city || school?.state ? `<div>${[school.city, school.state, school.zip_code].filter(Boolean).join(', ')}</div>` : ''}
        ${school?.school_phone ? `<div>Phone: ${school.school_phone}</div>` : ''}
        ${school?.school_email ? `<div>Email: ${school.school_email}</div>` : ''}
      </div>
    </div>

    <div class="receipt-title">PAYMENT RECEIPT</div>

    <div class="amount-box">
      <div class="amount-label">Amount Paid</div>
      <div class="amount-value">₹${Number(payment.amount || 0).toLocaleString('en-IN')}</div>
    </div>

    <div class="info-section">
      <div class="info-row">
        <span class="info-label">Receipt Number:</span>
        <span class="info-value"><strong>${(payment.receipt as Record<string, unknown> | undefined)?.receipt_no || 'N/A'}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Receipt Date:</span>
        <span class="info-value">${receiptDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Date:</span>
        <span class="info-value">${paymentDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Mode:</span>
        <span class="info-value"><strong>${String(payment.payment_mode || 'Cash').toUpperCase()}</strong></span>
      </div>
      ${payment.reference_no ? `
      <div class="info-row">
        <span class="info-label">Reference Number:</span>
        <span class="info-value">${payment.reference_no}</span>
      </div>
      ` : ''}
    </div>

    <div class="info-section">
      ${(() => {
        const student = payment.student as Record<string, unknown> | undefined;
        return `
      <div class="info-row">
        <span class="info-label">Student Name:</span>
        <span class="info-value"><strong>${student?.student_name || student?.full_name || 'N/A'}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Admission Number:</span>
        <span class="info-value">${student?.admission_no || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Class & Section:</span>
        <span class="info-value">${student?.class || 'N/A'} - ${student?.section || 'N/A'}</span>
      </div>
      ${student?.roll_number ? `
      <div class="info-row">
        <span class="info-label">Roll Number:</span>
        <span class="info-value">${student.roll_number}</span>
      </div>
      ` : ''}
    `;
      })()}
    </div>

    ${(() => {
      const allocations = payment.allocations as Record<string, unknown>[] | undefined;
      if (!allocations || allocations.length === 0) return '';
      return `
    <table class="allocations-table">
      <thead>
        <tr>
          <th>Fee Head</th>
          <th>Due Month</th>
          <th>Due Date</th>
          <th class="text-right">Allocated Amount</th>
        </tr>
      </thead>
      <tbody>
        ${allocations.map((alloc: Record<string, unknown>) => {
          const studentFee = alloc.student_fee as Record<string, unknown> | undefined;
          const feeStructure = studentFee?.fee_structure as Record<string, unknown> | undefined;
          const dueMonth = studentFee?.due_month ? new Date(String(studentFee.due_month)).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : 'N/A';
          const dueDate = studentFee?.due_date ? new Date(String(studentFee.due_date)).toLocaleDateString('en-IN') : 'N/A';
          return `
          <tr>
            <td>${feeStructure?.name || 'Fee'}</td>
            <td>${dueMonth}</td>
            <td>${dueDate}</td>
            <td class="text-right"><strong>₹${Number(alloc.allocated_amount || 0).toLocaleString('en-IN')}</strong></td>
          </tr>
        `;
        }).join('')}
      </tbody>
    </table>
    `;
    })()}

    ${payment.remarks ? `
    <div class="info-section">
      <div class="info-label">Remarks:</div>
      <div class="info-value" style="margin-top: 5px;">${payment.remarks}</div>
    </div>
    ` : ''}

    ${(() => {
      const collector = payment.collector as Record<string, unknown> | undefined;
      if (!collector) return '';
      const fullName = collector.full_name as string | undefined;
      const staffId = collector.staff_id as string | undefined;
      return `
    <div class="info-section">
      <div class="info-row">
        <span class="info-label">Collected By:</span>
        <span class="info-value">${fullName || 'N/A'} ${staffId ? `(${staffId})` : ''}</span>
      </div>
    </div>
    `;
    })()}

    <div class="footer">
      <div style="margin-bottom: 10px;">
        <strong>This is a computer-generated receipt. No signature required.</strong>
      </div>
      <div>Generated on ${new Date().toLocaleString('en-IN')}</div>
      ${school?.school_name ? `<div style="margin-top: 10px;">${school.school_name}</div>` : ''}
    </div>
  `;
}
