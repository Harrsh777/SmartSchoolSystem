/**
 * Utilities for printing and downloading gate passes and expense reports.
 */

export interface GatePassPrintItem {
  id: string;
  person_type: string;
  person_name: string;
  class?: string;
  section?: string;
  pass_type: string;
  reason: string;
  date: string;
  time_out: string;
  expected_return_time?: string;
  actual_return_time?: string;
  approved_by_name?: string;
  status: string;
}

export interface ExpensePrintItem {
  id: string;
  category: string;
  amount: number;
  entry_date: string;
  paid_to: string;
  payment_mode: string;
  notes: string | null;
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(timeStr: string) {
  if (!timeStr) return 'N/A';
  return String(timeStr).substring(0, 5);
}

function passTypeLabel(type: string) {
  switch (type) {
    case 'early_leave': return 'Early Leave';
    case 'late_entry': return 'Late Entry';
    case 'half_day': return 'Half Day';
    default: return (type || '').replace(/_/g, ' ');
  }
}

export function getGatePassPrintHtml(passes: GatePassPrintItem[], title = 'Gate Pass'): string {
  const rows = passes.map((p) => `
    <tr>
      <td style="border:1px solid #ddd;padding:8px">${escapeHtml(p.person_name)}</td>
      <td style="border:1px solid #ddd;padding:8px">${escapeHtml(p.person_type)}</td>
      <td style="border:1px solid #ddd;padding:8px">${passTypeLabel(p.pass_type)}</td>
      <td style="border:1px solid #ddd;padding:8px">${escapeHtml(p.reason || '-')}</td>
      <td style="border:1px solid #ddd;padding:8px">${formatDate(p.date)}</td>
      <td style="border:1px solid #ddd;padding:8px">${formatTime(p.time_out)}</td>
      <td style="border:1px solid #ddd;padding:8px">${escapeHtml(p.expected_return_time ? formatTime(p.expected_return_time) : '-')}</td>
      <td style="border:1px solid #ddd;padding:8px">${escapeHtml(p.approved_by_name || '-')}</td>
      <td style="border:1px solid #ddd;padding:8px">${escapeHtml(p.status)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { font-size: 1.5rem; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #1e3a8a; color: white; padding: 10px 8px; text-align: left; font-size: 12px; }
    .meta { margin-bottom: 16px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Generated on ${new Date().toLocaleString('en-GB')} | Total: ${passes.length}</div>
  <table>
    <thead>
      <tr>
        <th>Person Name</th>
        <th>Type</th>
        <th>Pass Type</th>
        <th>Reason</th>
        <th>Date</th>
        <th>Time Out</th>
        <th>Expected Return</th>
        <th>Approved By</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

/** Single gate pass as a slip (one per page for print). */
export function getGatePassSlipHtml(pass: GatePassPrintItem): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gate Pass - ${escapeHtml(pass.person_name)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; max-width: 400px; }
    .slip { border: 2px solid #1e3a8a; padding: 20px; border-radius: 8px; }
    h2 { margin: 0 0 16px 0; font-size: 1.25rem; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; }
    .row { margin-bottom: 10px; }
    .label { font-size: 11px; color: #666; text-transform: uppercase; }
    .value { font-weight: 600; }
  </style>
</head>
<body>
  <div class="slip">
    <h2>Gate Pass</h2>
    <div class="row"><div class="label">Name</div><div class="value">${escapeHtml(pass.person_name)}</div></div>
    <div class="row"><div class="label">Type</div><div class="value">${escapeHtml(pass.person_type)}</div></div>
    ${(pass.class || pass.section) ? `<div class="row"><div class="label">Class / Section</div><div class="value">${escapeHtml([pass.class, pass.section].filter(Boolean).join(' - '))}</div></div>` : ''}
    <div class="row"><div class="label">Pass Type</div><div class="value">${passTypeLabel(pass.pass_type)}</div></div>
    <div class="row"><div class="label">Reason</div><div class="value">${escapeHtml(pass.reason || '-')}</div></div>
    <div class="row"><div class="label">Date</div><div class="value">${formatDate(pass.date)}</div></div>
    <div class="row"><div class="label">Time Out</div><div class="value">${formatTime(pass.time_out)}</div></div>
    ${pass.expected_return_time ? `<div class="row"><div class="label">Expected Return</div><div class="value">${formatTime(pass.expected_return_time)}</div></div>` : ''}
    <div class="row"><div class="label">Approved By</div><div class="value">${escapeHtml(pass.approved_by_name || '-')}</div></div>
    <div class="row"><div class="label">Status</div><div class="value">${escapeHtml(pass.status)}</div></div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s).replace(/[&<>"']/g, (c) => map[c] ?? c);
}

export function getExpensesPrintHtml(entries: ExpensePrintItem[], title = 'Expense Report'): string {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  const fmtDate = (d: string) => (!d ? 'N/A' : new Date(d).toLocaleDateString('en-GB'));

  const rows = entries.map((e) => `
    <tr>
      <td style="border:1px solid #ddd;padding:8px">${fmtDate(e.entry_date)}</td>
      <td style="border:1px solid #ddd;padding:8px">${escapeHtml(e.category)}</td>
      <td style="border:1px solid #ddd;padding:8px">${formatCurrency(e.amount)}</td>
      <td style="border:1px solid #ddd;padding:8px">${escapeHtml(e.paid_to)}</td>
      <td style="border:1px solid #ddd;padding:8px">${escapeHtml(e.payment_mode)}</td>
      <td style="border:1px solid #ddd;padding:8px">${escapeHtml(e.notes || '-')}</td>
    </tr>
  `).join('');

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { font-size: 1.5rem; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #0d9488; color: white; padding: 10px 8px; text-align: left; font-size: 12px; }
    .meta { margin-bottom: 16px; color: #666; font-size: 12px; }
    .total { margin-top: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Generated on ${new Date().toLocaleString('en-GB')} | Entries: ${entries.length}</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Category</th>
        <th>Amount</th>
        <th>Paid To</th>
        <th>Payment Mode</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Total: ${formatCurrency(total)}</div>
</body>
</html>`;
}

export function printHtml(html: string, title?: string): void {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow popups to print.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 300);
}

export function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
