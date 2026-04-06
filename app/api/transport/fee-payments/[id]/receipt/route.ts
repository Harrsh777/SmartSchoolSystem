import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { escapeHtml } from '@/lib/fees/receipt-html-escape';
import { rupeesToWords } from '@/lib/fees/receipt-amount-words';

/**
 * GET /api/transport/fee-payments/[id]/receipt
 * Printable HTML receipt for a transport fee payment entry (TRANSPORT_RECEIPT).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const block = await requirePermission(request, 'view_fees');
    if (block) return block;

    const { id } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }
    const code = schoolCode.toUpperCase().trim();

    const supabase = getServiceRoleClient();
    const { data: row, error } = await supabase
      .from('transport_fee_payment_entries')
      .select(
        `
        *,
        student:student_id (student_name, admission_no, class, section),
        collector:collected_by (full_name, staff_id)
      `
      )
      .eq('id', id)
      .eq('school_code', code)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: 'Transport payment not found' }, { status: 404 });
    }

    const { data: school } = await supabase.from('accepted_schools').select('*').eq('school_code', code).maybeSingle();

    const payload = (row.receipt_payload || {}) as Record<string, unknown>;
    const st = row.student as { student_name?: string; admission_no?: string; class?: string; section?: string } | null;
    const coll = row.collector as { full_name?: string; staff_id?: string } | null;

    const amount = Number(row.amount || 0);
    const words = rupeesToWords(amount);
    const sch = school as Record<string, unknown> | null;
    const schoolNameRaw =
      (sch?.school_name as string) ||
      (sch?.name as string) ||
      (sch?.institute_name as string) ||
      code;
    const schoolName = escapeHtml(String(schoolNameRaw));
    const schoolAddr = escapeHtml(
      String((sch?.address as string) || (sch?.school_address as string) || '')
    );
    const title = escapeHtml(String(payload.fee_label || 'Transport fee'));

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Transport receipt ${escapeHtml(String(row.receipt_no))}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #0f172a; }
    .wrap { max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    h1 { font-size: 1.25rem; margin: 0 0 4px; }
    h2 { font-size: 1rem; margin: 16px 0 12px; color: #334155; }
    .muted { color: #64748b; font-size: 0.875rem; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    th { width: 38%; color: #64748b; font-weight: 600; }
    .strong { font-weight: 700; font-size: 1.05rem; }
    .words { margin-top: 16px; font-size: 0.85rem; color: #475569; }
    .footer { margin-top: 20px; font-size: 0.85rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${schoolName}</h1>
    <p class="muted">${schoolAddr}</p>
    <h2>Transport fee receipt</h2>
    <table>
      <tr><th>Receipt no.</th><td>${escapeHtml(String(row.receipt_no))}</td></tr>
      <tr><th>Date</th><td>${escapeHtml(String(row.payment_date))}</td></tr>
      <tr><th>Payment mode</th><td>${escapeHtml(String(row.payment_mode))}</td></tr>
      <tr><th>Student</th><td>${escapeHtml(String(st?.student_name || ''))} (${escapeHtml(String(st?.admission_no || ''))})</td></tr>
      <tr><th>Class</th><td>${escapeHtml(String(st?.class || ''))} ${escapeHtml(String(st?.section || ''))}</td></tr>
      <tr><th>Period</th><td>${escapeHtml(String(payload.period_month || row.period_month))}</td></tr>
      <tr><th>Particulars</th><td>${title}</td></tr>
      <tr><th>Monthly fee</th><td>₹${Number(payload.monthly_fee || 0).toLocaleString('en-IN')}</td></tr>
      <tr><th>Amount paid</th><td class="strong">₹${amount.toLocaleString('en-IN')}</td></tr>
      <tr><th>Balance</th><td>₹${Number(payload.balance_after ?? 0).toLocaleString('en-IN')}</td></tr>
      <tr><th>Status</th><td>${escapeHtml(String(payload.line_status || ''))}</td></tr>
    </table>
    <p class="words">${escapeHtml(words)}</p>
    <p class="footer">Collected by: ${escapeHtml(String(coll?.full_name || coll?.staff_id || '—'))}</p>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (e) {
    console.error('transport receipt', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
