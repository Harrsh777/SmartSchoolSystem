import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import {
  enrichStudentFeesWithAdjustments,
  type FeeWithStructure,
} from '@/lib/fees/enrich-student-fees';
import { escapeHtml } from '@/lib/fees/receipt-html-escape';
import { rupeesToWords } from '@/lib/fees/receipt-amount-words';
import { receiptSharedStyles, receiptToolbarHtml } from '@/lib/fees/receipt-html-shared';

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
          section,
          academic_year,
          late_fee_type,
          late_fee_value,
          grace_period_days
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

    const studentCtx = {
      id: String(student.id),
      class: String(student.class ?? ''),
      section: (student.section as string | null | undefined) ?? null,
    };
    const enrichedFees = await enrichStudentFeesWithAdjustments(
      supabase,
      normalizedSchoolCode,
      studentCtx,
      fees as FeeWithStructure[]
    );
    const orderMap = new Map(
      fee_ids.map((id: unknown, i: number) => [String(id), i])
    );
    enrichedFees.sort(
      (a, b) => (orderMap.get(String(a.id)) ?? 0) - (orderMap.get(String(b.id)) ?? 0)
    );

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

    // Generate HTML receipt (enriched totals include misc/class line adjustments)
    const receiptHtml = generateReceiptHTML(
      school,
      student,
      enrichedFees as Record<string, unknown>[],
      payments || [],
      itemsByStructure
    );

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

  const grossBillable = (fee: Record<string, unknown>) => {
    const finalAmt = fee.final_amount;
    const late = fee.late_fee;
    if (finalAmt != null && late != null) {
      return Number(finalAmt) + Number(late);
    }
    return Number(fee.base_amount || 0) + Number(fee.adjustment_amount || 0);
  };

  const totalAmount = fees.reduce((sum, fee) => sum + grossBillable(fee), 0);
  const totalPaid = fees.reduce((sum, fee) => sum + Number(fee.paid_amount || 0), 0);
  const totalDue = fees.reduce((sum, fee) => {
    if (fee.total_due != null) return sum + Number(fee.total_due);
    return sum + (grossBillable(fee) - Number(fee.paid_amount || 0));
  }, 0);

  const logoUrl = String((school as { logo_url?: unknown } | null)?.logo_url ?? '').trim();

  // Find payments related to these fees
  const feeIds = new Set(fees.map((f: Record<string, unknown>) => f.id as string));
  const relevantPayments = payments.filter((payment: Record<string, unknown>) => {
    const allocations = payment.allocations as Record<string, unknown>[] | undefined;
    return allocations?.some((alloc: Record<string, unknown>) => feeIds.has(alloc.student_fee_id as string));
  });

  const receiptContentSchool = generateReceiptContent(
    school,
    student,
    fees,
    relevantPayments,
    itemsByStructure,
    currentDate,
    totalAmount,
    totalPaid,
    totalDue,
    'SCHOOL COPY'
  );
  const receiptContentStudent = generateReceiptContent(
    school,
    student,
    fees,
    relevantPayments,
    itemsByStructure,
    currentDate,
    totalAmount,
    totalPaid,
    totalDue,
    'STUDENT COPY'
  );

  const shared = receiptSharedStyles();
  const schoolNameEsc = escapeHtml(String(school.school_name || 'School'));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fee Receipt - ${schoolNameEsc}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 15cm 20cm; margin: 6mm; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
      padding: 10px;
      background: #e2e8f0;
      color: #0f172a;
    }
    .page-shell {
      width: 15cm;
      max-width: 15cm;
      margin: 0 auto;
      background: #f1f5f9;
      padding: 8px;
      border-radius: 10px;
    }
    .receipt-sheet {
      background: #fff;
      width: 15cm;
      min-height: 20cm;
      border-radius: 10px;
      padding: 8mm 8mm 9mm;
      border: 1px solid #cbd5e1;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    .receipt-watermark {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 0;
    }
    .receipt-watermark img {
      max-width: 70%;
      max-height: 55%;
      object-fit: contain;
      opacity: 0.05;
      filter: grayscale(1);
      transform: rotate(-12deg);
    }
    .receipt-inner { position: relative; z-index: 1; }
    @media print {
      body { background: #fff; padding: 0; }
      .page-shell { max-width: none; padding: 0; background: #fff; border-radius: 0; }
      .receipt-sheet {
        width: auto;
        min-height: auto;
        border: none;
        border-radius: 0;
        page-break-after: always;
      }
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    ${shared}
  </style>
</head>
<body class="compact-receipt">
  <div class="page-shell">
    ${receiptToolbarHtml('Fee receipt (statement)')}
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

function statementInstallmentLabel(fees: Record<string, unknown>[]): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const fee of fees) {
    const dm = fee.due_month;
    if (dm == null || dm === '') continue;
    const key = String(dm).slice(0, 10);
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      labels.push(
        new Date(String(dm)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      );
    } catch {
      labels.push(String(dm));
    }
  }
  return labels.length ? labels.join(' · ') : '—';
}

function statementReceiptNos(payments: Record<string, unknown>[]): string {
  const nos: string[] = [];
  const seen = new Set<string>();
  for (const p of payments) {
    const r = p.receipt as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const row = Array.isArray(r) ? r[0] : r;
    const n = row && row.receipt_no != null ? String(row.receipt_no) : '';
    if (!n || seen.has(n)) continue;
    seen.add(n);
    nos.push(n);
  }
  if (nos.length === 0) return '—';
  if (nos.length <= 3) return nos.join(', ');
  return `${nos.slice(0, 3).join(', ')} +${nos.length - 3} more`;
}

function statementPaymentModes(payments: Record<string, unknown>[]): string {
  const modes = [...new Set(payments.map((p) => String(p.payment_mode || 'Cash').toUpperCase()))];
  return modes.length ? modes.join(', ') : '—';
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
  totalDue: number,
  copyLabel: string
): string {
  const logoUrl = String((school as { logo_url?: unknown } | null)?.logo_url ?? '').trim();
  const websiteRaw = String(
    school.website ?? school.school_website ?? school.school_url ?? ''
  ).trim();
  const websiteDisplay = websiteRaw ? websiteRaw.replace(/^https?:\/\//i, '') : '';
  const affiliation = String(school.affiliation || '').trim();
  const receiptNos = statementReceiptNos(relevantPayments);
  const installmentLabel = statementInstallmentLabel(fees);
  const modesLabel = statementPaymentModes(relevantPayments);

  const studentName = String(student.student_name || student.full_name || 'N/A');
  const admissionNo = String(student.admission_no || 'N/A');
  const cls = String(student.class || 'N/A');
  const section = String(student.section || 'N/A');
  const fatherName = String(student.father_name || student.parent_name || '').trim();
  const board = String(student.medium || student.schooling_type || '').trim();

  const amountWords = rupeesToWords(totalPaid);

  const feeSectionsHtml = fees
    .map((fee: Record<string, unknown>) => {
      const balance =
        fee.total_due != null
          ? Number(fee.total_due)
          : Number((fee.base_amount as number) || 0) +
            Number((fee.adjustment_amount as number) || 0) -
            Number((fee.paid_amount as number) || 0);
      const status = balance <= 0 ? 'Paid' : (fee.status as string) === 'overdue' ? 'Overdue' : 'Pending';
      const effectiveAdj =
        fee.effective_adjustment_amount != null
          ? Number(fee.effective_adjustment_amount)
          : Number(fee.adjustment_amount || 0);
      const lateFee = fee.late_fee != null ? Number(fee.late_fee) : 0;
      const manualLines =
        (fee.installment_manual_lines as Array<{
          label: string;
          amount: number;
          kind: string;
          source?: string;
        }>) || [];
      const structureItems = itemsByStructure[fee.fee_structure_id as string] || [];
      const feeStructure = fee.fee_structure as Record<string, unknown> | undefined;
      const feeTypeDefault =
        String(fee.fee_source || '').toLowerCase() === 'transport'
          ? 'Transport'
          : String(feeStructure?.name || 'School Fee');

      const dueMonth = fee.due_month
        ? new Date(String(fee.due_month)).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
          })
        : 'N/A';
      const dueDate = fee.due_date
        ? new Date(String(fee.due_date)).toLocaleDateString('en-IN')
        : 'N/A';

      const totalStructureAmount = structureItems.reduce(
        (sum: number, i: Record<string, unknown>) => sum + Number((i.amount as number) || 0),
        0
      );
      const paidPortion = Number(fee.paid_amount || 0);

      let bodyRows = '';
      if (structureItems.length > 0) {
        bodyRows += structureItems
          .map((item: Record<string, unknown>) => {
            const headAmount = Number((item.amount as number) || 0);
            const proportionalAmount =
              totalStructureAmount > 0 ? (headAmount / totalStructureAmount) * paidPortion : 0;
            const feeHead = item.fee_head as Record<string, unknown> | undefined;
            const headName = feeHead?.name as string | undefined;
            const headDescription = feeHead?.description as string | undefined;
            const isOptional = feeHead?.is_optional as boolean | undefined;
            const nm = escapeHtml(headName || 'Fee head');
            const desc = headDescription ? escapeHtml(String(headDescription)) : '';
            return `
              <tr>
                <td>
                  <div style="font-weight:700;font-size:9px;">${nm}</div>
                  ${desc ? `<div style="font-size:8px;color:#64748b;margin-top:2px;">${desc}</div>` : ''}
                  ${isOptional ? `<span style="font-size:8px;color:#2563eb;">(Optional)</span>` : ''}
                </td>
                <td class="text-right">₹${headAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right">₹0.00</td>
                <td class="text-right">₹0.00</td>
                <td class="text-right"><strong>₹${proportionalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                <td>${escapeHtml(feeTypeDefault)}</td>
              </tr>`;
          })
          .join('');
      }

      for (const line of manualLines) {
        const amt = Number(line.amount);
        const isDisc = line.kind === 'discount';
        bodyRows += `
              <tr>
                <td>
                  <div style="font-weight:700;font-size:9px;">${escapeHtml(line.label)}</div>
                  <div style="font-size:8px;color:#64748b;margin-top:2px;">${line.kind === 'discount' ? 'Discount' : 'Misc'}${line.source ? ` · ${escapeHtml(line.source)}` : ''}</div>
                </td>
                <td class="text-right">${isDisc ? '₹0.00' : `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                <td class="text-right">${isDisc ? `₹${Math.abs(amt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}</td>
                <td class="text-right">₹0.00</td>
                <td class="text-right">${isDisc ? '₹0.00' : `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                <td>${escapeHtml(feeTypeDefault)}</td>
              </tr>`;
      }

      if (!bodyRows) {
        bodyRows = `<tr><td colspan="6" style="text-align:center;color:#64748b;">No line breakdown for this installment.</td></tr>`;
      }

      return `
      <div class="receipt-card" style="margin-bottom:12px;padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
          <div>
            <div style="font-size:12px;font-weight:800;color:#0f172a;">${escapeHtml(String(feeStructure?.name || 'Fee'))}</div>
            <div style="font-size:9px;color:#64748b;margin-top:4px;">Due: ${escapeHtml(dueMonth)} · Due date: ${escapeHtml(dueDate)}</div>
          </div>
          <div style="font-size:10px;font-weight:800;padding:4px 10px;border-radius:999px;background:${balance <= 0 ? '#ecfdf5' : '#fff7ed'};color:${balance <= 0 ? '#047857' : '#c2410c'};border:1px solid ${balance <= 0 ? '#6ee7b7' : '#fdba74'};">${escapeHtml(status)}</div>
        </div>
        <table class="fees-table-pro">
          <thead>
            <tr>
              <th>Head name</th>
              <th class="text-right">Actual amount</th>
              <th class="text-right">Concession</th>
              <th class="text-right">Last paid</th>
              <th class="text-right">Paid amount</th>
              <th>Fee type</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <div style="margin-top:10px;padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;font-size:9px;">
            <div><div style="color:#64748b;margin-bottom:2px;">Base</div><div style="font-weight:800;">₹${Number(fee.base_amount || 0).toLocaleString('en-IN')}</div></div>
            <div><div style="color:#64748b;margin-bottom:2px;">Adjustments</div><div style="font-weight:800;color:${effectiveAdj < 0 ? '#dc2626' : effectiveAdj > 0 ? '#059669' : '#0f172a'};">${effectiveAdj !== 0 ? `${effectiveAdj > 0 ? '+' : ''}₹${effectiveAdj.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0'}</div></div>
            <div><div style="color:#64748b;margin-bottom:2px;">Paid</div><div style="font-weight:800;color:#059669;">₹${Number(fee.paid_amount || 0).toLocaleString('en-IN')}</div></div>
            <div><div style="color:#64748b;margin-bottom:2px;">Balance</div><div style="font-weight:800;color:${balance > 0 ? '#dc2626' : '#059669'};">₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>${lateFee > 0 ? `<div style="font-size:7px;color:#94a3b8;margin-top:2px;">incl. late ₹${lateFee.toLocaleString('en-IN')}</div>` : ''}</div>
          </div>
        </div>
      </div>`;
    })
    .join('');

  const payHistory =
    relevantPayments.length > 0
      ? `<div class="receipt-card" style="font-size:10px;">
          <div class="info-card-title">Payment history (linked)</div>
          ${relevantPayments
            .map((payment: Record<string, unknown>) => {
              const receipt = payment.receipt as Record<string, unknown> | undefined;
              const receiptNo = receipt ? (receipt.receipt_no as string | undefined) : undefined;
              const paymentDateStr = payment.payment_date ? String(payment.payment_date) : null;
              const paymentDate = paymentDateStr
                ? new Date(paymentDateStr).toLocaleDateString('en-IN')
                : 'N/A';
              const paymentMode = String(payment.payment_mode || 'Cash');
              return `<div class="info-line"><span class="lab">${escapeHtml(receiptNo || 'N/A')} · ${escapeHtml(paymentDate)} · ${escapeHtml(paymentMode)}</span><span class="val">₹${Number(payment.amount || 0).toLocaleString('en-IN')}</span></div>`;
            })
            .join('')}
        </div>`
      : '';

  return `
    <div class="copy-label-pill">${escapeHtml(copyLabel)}</div>

    <div class="receipt-card" style="margin-bottom:14px;">
      <div class="header-grid">
        <div class="logo-wrap">
          ${
            logoUrl
              ? `<img src="${escapeHtml(logoUrl)}" alt="Logo"/>`
              : `<span style="font-size:9px;color:#94a3b8;">Logo</span>`
          }
        </div>
        <div class="school-center">
          <h1>${escapeHtml(String(school.school_name || 'School Name'))}</h1>
          <div class="lines">
            ${school.school_address ? `<div>${escapeHtml(String(school.school_address))}</div>` : ''}
            ${
              school.city || school.state
                ? `<div>${escapeHtml([school.city, school.state, school.zip_code].filter(Boolean).join(', '))}</div>`
                : ''
            }
            ${affiliation ? `<div>Affiliation: ${escapeHtml(affiliation)}</div>` : ''}
            ${
              websiteDisplay
                ? `<div>Website: <span style="word-break:break-all;">${escapeHtml(websiteDisplay)}</span></div>`
                : ''
            }
            ${school.school_phone ? `<div>Contact: ${escapeHtml(String(school.school_phone))}</div>` : ''}
            ${school.school_email ? `<div>Email: ${escapeHtml(String(school.school_email))}</div>` : ''}
          </div>
        </div>
        <div class="header-meta">
          <div class="doc-title">FEES RECEIPT</div>
          <div class="kv"><span class="k">Date:</span> <span class="v">${escapeHtml(currentDate)}</span></div>
          <div class="kv"><span class="k">Receipt No:</span> <span class="v">${escapeHtml(receiptNos)}</span></div>
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
        ${
          student.roll_number
            ? `<div class="info-line"><span class="lab">Roll No.</span><span class="val">${escapeHtml(String(student.roll_number))}</span></div>`
            : ''
        }
      </div>
      <div class="receipt-card">
        <div class="info-card-title">Receipt summary</div>
        <div class="info-line"><span class="lab">Payment mode(s)</span><span class="val">${escapeHtml(modesLabel)}</span></div>
        <div><span class="payment-mode-pill">${escapeHtml(modesLabel)}</span></div>
        <div class="info-line" style="margin-top:10px;"><span class="lab">Total billable (selected)</span><span class="val">₹${totalAmount.toLocaleString('en-IN')}</span></div>
        <div class="info-line"><span class="lab">Total paid (selected)</span><span class="val" style="color:#059669;">₹${totalPaid.toLocaleString('en-IN')}</span></div>
        <div class="info-line"><span class="lab">Balance due</span><span class="val" style="color:${totalDue > 0 ? '#dc2626' : '#059669'};">₹${totalDue.toLocaleString('en-IN')}</span></div>
      </div>
    </div>

    <div class="info-card-title" style="margin:4px 0 8px 2px;">Fee breakdown</div>
    ${feeSectionsHtml}

    <div class="total-paid-banner">
      <span class="lbl">Total paid (selected installments)</span>
      <span class="amt">₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>

    <div class="receipt-card amount-words" style="margin-top:12px;">
      <strong>Amount in words:</strong> ${escapeHtml(amountWords)}
    </div>

    ${payHistory}

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
      ${school.school_name ? `<div>${escapeHtml(String(school.school_name))}</div>` : ''}
    </div>
  `;
}
