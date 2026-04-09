import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { escapeHtml } from '@/lib/fees/receipt-html-escape';
import { rupeesToWords } from '@/lib/fees/receipt-amount-words';
import { receiptA5PageStyles, receiptSharedStyles, receiptToolbarHtml } from '@/lib/fees/receipt-html-shared';

/** PostgREST often returns `receipts` as a single-element array for reverse FK embeds. */
function normalizePaymentReceiptJoin(payment: Record<string, unknown>): Record<string, unknown> | undefined {
  const r = payment.receipt;
  if (r == null) return undefined;
  if (Array.isArray(r)) {
    return (r[0] as Record<string, unknown> | undefined) ?? undefined;
  }
  return r as Record<string, unknown>;
}

type InstallmentAfterPayment = {
  student_fee_id?: string;
  fee_name?: string;
  billable_gross?: number;
  paid_amount?: number;
  balance_due?: number;
};

const PAYMENT_SELECT = `
        *,
        student:student_id (
          *
        ),
        receipt:receipts (
          receipt_no,
          issued_at,
          receipt_data
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
      `;

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

    let payment: Record<string, unknown> | null = null;

    const byPaymentId = await supabase
      .from('payments')
      .select(PAYMENT_SELECT)
      .eq('id', id)
      .eq('school_code', normalizedSchoolCode)
      .eq('is_reversed', false)
      .maybeSingle();

    if (byPaymentId.error) {
      console.error('Payment receipt lookup:', byPaymentId.error);
      return NextResponse.json(
        { error: 'Payment receipt not found' },
        { status: 404 }
      );
    }

    if (byPaymentId.data) {
      payment = byPaymentId.data as Record<string, unknown>;
    } else {
      const { data: receiptRow, error: receiptLookupError } = await supabase
        .from('receipts')
        .select('payment_id')
        .eq('id', id)
        .eq('school_code', normalizedSchoolCode)
        .maybeSingle();

      if (receiptLookupError || !receiptRow?.payment_id) {
        return NextResponse.json(
          { error: 'Payment receipt not found' },
          { status: 404 }
        );
      }

      const byReceiptPaymentId = await supabase
        .from('payments')
        .select(PAYMENT_SELECT)
        .eq('id', receiptRow.payment_id)
        .eq('school_code', normalizedSchoolCode)
        .eq('is_reversed', false)
        .maybeSingle();

      if (byReceiptPaymentId.error || !byReceiptPaymentId.data) {
        return NextResponse.json(
          { error: 'Payment receipt not found' },
          { status: 404 }
        );
      }
      payment = byReceiptPaymentId.data as Record<string, unknown>;
    }

    if (!payment) {
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
    const receiptHtml = generatePaymentReceiptHTML(school, payment as Record<string, unknown>);

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

  const receipt = normalizePaymentReceiptJoin(payment);
  const receiptDate = receipt?.issued_at
    ? new Date(String(receipt.issued_at)).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : paymentDate;

  const logoUrl = String((school as { logo_url?: unknown } | null)?.logo_url ?? '').trim();

  const receiptContentSchool = generatePaymentReceiptContent(
    school,
    payment,
    paymentDate,
    receiptDate,
    receipt,
    'SCHOOL COPY'
  );
  const receiptContentStudent = generatePaymentReceiptContent(
    school,
    payment,
    paymentDate,
    receiptDate,
    receipt,
    'STUDENT COPY'
  );

  const shared = receiptSharedStyles();
  const schoolName = escapeHtml(String(school?.school_name || 'School'));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fee Receipt - ${schoolName}</title>
  <style>
    ${receiptA5PageStyles()}
    ${shared}
  </style>
</head>
<body class="compact-receipt">
  <div class="page-shell">
    ${receiptToolbarHtml('Fee receipt')}
    <div class="receipt-sheet">
      ${logoUrl ? `<div class="receipt-watermark"><img src="${escapeHtml(logoUrl)}" alt=""/></div>` : ''}
      <div class="receipt-inner">${receiptContentSchool}</div>
    </div>
    <div class="receipt-sheet" style="margin-top: 8px;">
      ${logoUrl ? `<div class="receipt-watermark"><img src="${escapeHtml(logoUrl)}" alt=""/></div>` : ''}
      <div class="receipt-inner">${receiptContentStudent}</div>
    </div>
  </div>
</body>
</html>
  `;
}

function formatReceiptShortDate(raw: unknown): string {
  if (raw == null || raw === '') return '';
  try {
    return new Date(String(raw)).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(raw);
  }
}

function installmentLabelFromPayment(
  payment: Record<string, unknown>,
  receiptData: Record<string, unknown> | undefined
): string {
  const snap = receiptData?.allocations as Array<{ due_month?: string | null }> | undefined;
  const allocations = payment.allocations as Record<string, unknown>[] | undefined;
  const seen = new Set<string>();
  const labels: string[] = [];

  const push = (raw: unknown) => {
    if (raw == null || raw === '') return;
    const key = String(raw).slice(0, 10);
    if (seen.has(key)) return;
    seen.add(key);
    const s = formatReceiptShortDate(raw);
    if (s) labels.push(s);
  };

  if (snap && snap.length) {
    for (const row of snap) push(row.due_month);
  } else if (allocations?.length) {
    for (const alloc of allocations) {
      const sf = alloc.student_fee as Record<string, unknown> | undefined;
      push(sf?.due_month);
    }
  }
  return labels.length ? labels.join(' · ') : '—';
}

function schoolWebsiteHref(school: Record<string, unknown>): string {
  const w = String(
    school.website ?? school.school_website ?? school.school_url ?? ''
  ).trim();
  return w;
}

function generatePaymentReceiptContent(
  school: Record<string, unknown>,
  payment: Record<string, unknown>,
  paymentDate: string,
  receiptDate: string,
  receipt: Record<string, unknown> | undefined,
  copyLabel: string
): string {
  const receiptNo = receipt?.receipt_no != null ? String(receipt.receipt_no) : '';
  const receiptDataRaw = receipt?.receipt_data as Record<string, unknown> | undefined;
  const installmentsAfter =
    (receiptDataRaw?.installments_after_payment as InstallmentAfterPayment[] | undefined) || [];
  const hasAnyOutstanding = installmentsAfter.some((r) => Number(r.balance_due ?? 0) > 0.02);

  const student = payment.student as Record<string, unknown> | undefined;
  const studentName = String(student?.student_name || student?.full_name || 'N/A');
  const admissionNo = String(student?.admission_no || 'N/A');
  const cls = String(student?.class || 'N/A');
  const section = String(student?.section || 'N/A');
  const fatherName = String(student?.father_name || student?.parent_name || '').trim();
  const board = String(student?.medium || student?.schooling_type || '').trim();

  const websiteRaw = schoolWebsiteHref(school);
  const websiteDisplay = websiteRaw
    ? websiteRaw.replace(/^https?:\/\//i, '')
    : '';
  const affiliation = String(school?.affiliation || '').trim();

  const logoUrl = String((school as { logo_url?: unknown } | null)?.logo_url ?? '').trim();
  const totalPaid = Number(payment.amount || 0);
  const amountWords = rupeesToWords(totalPaid);

  const allocations = payment.allocations as Record<string, unknown>[] | undefined;
  let tableRows = '';
  let sumActual = 0;
  let sumConc = 0;
  let sumLast = 0;
  let sumPaid = 0;

  if (allocations && allocations.length > 0) {
    tableRows = allocations
      .map((alloc: Record<string, unknown>) => {
        const studentFee = alloc.student_fee as Record<string, unknown> | undefined;
        const feeStructure = studentFee?.fee_structure as Record<string, unknown> | undefined;
        const headName = String(feeStructure?.name || 'Fee');
        const feeSource = String(studentFee?.fee_source || '').toLowerCase();
        const feeType =
          feeSource === 'transport'
            ? 'Transport'
            : String(feeStructure?.name || 'School Fee');

        const base = Number(studentFee?.base_amount || 0);
        const late = Number(studentFee?.late_fee || 0);
        const finalAmt = Number(studentFee?.final_amount ?? base);
        const actualAmount = base + late;
        const concession = Math.max(0, Math.round((base - finalAmt) * 100) / 100);

        const allocated = Number(alloc.allocated_amount || 0);
        const totalPaidOnFee = Number(studentFee?.paid_amount || 0);
        const lastPaid = Math.max(0, Math.round((totalPaidOnFee - allocated) * 100) / 100);

        sumActual += actualAmount;
        sumConc += concession;
        sumLast += lastPaid;
        sumPaid += allocated;

        return `
          <tr>
            <td>${escapeHtml(headName)}</td>
            <td class="text-right">₹${actualAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">₹${concession.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">₹${lastPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right"><strong>₹${allocated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
            <td>${escapeHtml(feeType)}</td>
          </tr>`;
      })
      .join('');
  }

  const installmentLabel = installmentLabelFromPayment(payment, receiptDataRaw);
  const paymentMode = String(payment.payment_mode || 'Cash').toUpperCase();

  const collector = payment.collector as Record<string, unknown> | undefined;
  const collectorLine =
    collector && (collector.full_name || collector.staff_id)
      ? `${String(collector.full_name || '')}${collector.staff_id ? ` (${String(collector.staff_id)})` : ''}`.trim()
      : '';

  return `
    <div class="copy-label-pill">${escapeHtml(copyLabel)}</div>

    <div class="receipt-card">
      <div class="header-grid">
        <div class="logo-wrap">
          ${
            logoUrl
              ? `<img src="${escapeHtml(logoUrl)}" alt="Logo"/>`
              : `<span style="font-size:7px;color:#94a3b8;">Logo</span>`
          }
        </div>
        <div class="school-center">
          <h1>${escapeHtml(String(school?.school_name || 'School Name'))}</h1>
          <div class="lines">
            ${school?.school_address ? `<div>${escapeHtml(String(school.school_address))}</div>` : ''}
            ${
              school?.city || school?.state
                ? `<div>${escapeHtml([school.city, school.state, school.zip_code].filter(Boolean).join(', '))}</div>`
                : ''
            }
            ${affiliation ? `<div>Affiliation: ${escapeHtml(affiliation)}</div>` : ''}
            ${
              websiteDisplay
                ? `<div>Website: <span style="word-break:break-all;">${escapeHtml(websiteDisplay)}</span></div>`
                : ''
            }
            ${school?.school_phone ? `<div>Contact: ${escapeHtml(String(school.school_phone))}</div>` : ''}
            ${school?.school_email ? `<div>Email: ${escapeHtml(String(school.school_email))}</div>` : ''}
          </div>
        </div>
        <div class="header-meta">
          <div class="doc-title">FEES RECEIPT</div>
          <div class="kv"><span class="k">Date:</span> <span class="v">${escapeHtml(receiptDate)}</span></div>
          <div class="kv"><span class="k">Receipt No:</span> <span class="v">${escapeHtml(receiptNo || 'N/A')}</span></div>
          <div class="kv"><span class="k">Installment:</span> <span class="v">${escapeHtml(installmentLabel)}</span></div>
        </div>
      </div>
    </div>

    <div class="two-col-info">
      <div class="receipt-card">
        <div class="info-card-title">Student information</div>
        <div class="info-line"><span class="lab">Admission No</span><span class="val">${escapeHtml(admissionNo)}</span></div>
        <div class="info-line"><span class="lab">Student name</span><span class="val">${escapeHtml(studentName)}</span></div>
        ${
          fatherName
            ? `<div class="info-line"><span class="lab">Father's name</span><span class="val">${escapeHtml(fatherName)}</span></div>`
            : ''
        }
        <div class="info-line"><span class="lab">Class</span><span class="val">${escapeHtml(cls)}</span></div>
        <div class="info-line"><span class="lab">Section</span><span class="val">${escapeHtml(section)}</span></div>
        ${
          board
            ? `<div class="info-line"><span class="lab">Board</span><span class="val">${escapeHtml(board)}</span></div>`
            : ''
        }
        ${student?.roll_number ? `<div class="info-line"><span class="lab">Roll No.</span><span class="val">${escapeHtml(String(student.roll_number))}</span></div>` : ''}
      </div>
      <div class="receipt-card">
        <div class="info-card-title">Payment details</div>
        <div class="info-line"><span class="lab">Payment date</span><span class="val">${escapeHtml(paymentDate)}</span></div>
        <div class="info-line"><span class="lab">Payment mode</span><span class="val">${escapeHtml(paymentMode)}</span></div>
        <div><span class="payment-mode-pill">${escapeHtml(paymentMode)}</span></div>
        ${
          payment.reference_no
            ? `<div class="info-line info-line-tight"><span class="lab">Reference</span><span class="val">${escapeHtml(String(payment.reference_no))}</span></div>`
            : ''
        }
        ${
          collectorLine
            ? `<div class="info-line info-line-tight"><span class="lab">Collected by</span><span class="val">${escapeHtml(collectorLine)}</span></div>`
            : ''
        }
      </div>
    </div>

    ${
      hasAnyOutstanding
        ? `<div class="partial-banner"><strong>Partial payment:</strong> Balance remains on one or more installments.</div>`
        : ''
    }

    ${
      tableRows
        ? `
    <div class="receipt-card receipt-fee-breakdown">
      <div class="info-card-title" style="margin-bottom:6px;">Fee breakdown</div>
      <table class="fees-table-pro">
        <thead>
          <tr>
            <th>Head</th>
            <th class="text-right">Actual</th>
            <th class="text-right">Conc.</th>
            <th class="text-right">Prior</th>
            <th class="text-right">Paid</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td class="text-right">₹${sumActual.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">₹${sumConc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">₹${sumLast.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">₹${sumPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>`
        : ''
    }

    <div class="total-paid-banner">
      <span class="lbl">Total amount paid (this receipt)</span>
      <span class="amt">₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>

    <div class="receipt-card amount-words">
      <strong>Amount in words:</strong> ${escapeHtml(amountWords)}
    </div>

    ${payment.remarks ? `<div class="receipt-card receipt-remarks"><strong>Remarks:</strong> ${escapeHtml(String(payment.remarks))}</div>` : ''}

    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Cashier / Accountant signature</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">School stamp</div>
        <div class="stamp-placeholder">Official stamp here</div>
      </div>
    </div>

    <div class="footer-note">
      <div><strong>Computer-generated receipt.</strong></div>
      <div>Generated on ${escapeHtml(new Date().toLocaleString('en-IN'))}</div>
      ${school?.school_name ? `<div>${escapeHtml(String(school.school_name))}</div>` : ''}
    </div>
  `;
}
