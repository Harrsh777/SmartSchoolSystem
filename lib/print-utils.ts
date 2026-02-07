/**
 * Print and download HTML utilities for expense reports, gate passes, etc.
 */

export function printHtml(html: string, title?: string): void {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to print.');
    return;
  }
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title ?? 'Print'}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 16px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
          th { background: #f8fafc; font-weight: 600; }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 250);
}

export function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`], {
    type: 'text/html;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ExpenseEntryForPrint {
  id: string;
  category?: string;
  amount?: number;
  entry_date?: string;
  paid_to?: string;
  payment_mode?: string;
  notes?: string;
}

export function getExpensesPrintHtml(entries: ExpenseEntryForPrint[], title: string): string {
  const rows = entries
    .map(
      (e) => `
    <tr>
      <td>${escapeHtml(e.entry_date ?? '-')}</td>
      <td>${escapeHtml(e.category ?? '-')}</td>
      <td>${escapeHtml(e.paid_to ?? '-')}</td>
      <td>${escapeHtml(e.payment_mode ?? '-')}</td>
      <td style="text-align:right">${typeof e.amount === 'number' ? e.amount.toLocaleString('en-IN') : '-'}</td>
      <td>${escapeHtml(e.notes ?? '-')}</td>
    </tr>
  `
    )
    .join('');
  return `
    <h2>${escapeHtml(title)}</h2>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Category</th>
          <th>Paid To</th>
          <th>Payment Mode</th>
          <th>Amount</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

interface GatePassForPrint {
  id?: string;
  person_type?: string;
  person_name?: string;
  class?: string;
  section?: string;
  pass_type?: string;
  reason?: string;
  date?: string;
  time_out?: string;
  expected_return_time?: string;
  actual_return_time?: string;
  approved_by_name?: string;
  status?: string;
}

export function getGatePassSlipHtml(pass: GatePassForPrint): string {
  return `
    <div style="max-width:400px; border:1px solid #e5e7eb; padding:16px; margin:8px 0;">
      <h3 style="margin:0 0 12px 0;">Gate Pass</h3>
      <p><strong>Name:</strong> ${escapeHtml(pass.person_name ?? '-')}</p>
      <p><strong>Type:</strong> ${escapeHtml(pass.person_type ?? '-')}</p>
      ${pass.class != null ? `<p><strong>Class / Section:</strong> ${escapeHtml(String(pass.class))} / ${escapeHtml(String(pass.section ?? '-'))}</p>` : ''}
      <p><strong>Pass Type:</strong> ${escapeHtml(pass.pass_type ?? '-')}</p>
      <p><strong>Reason:</strong> ${escapeHtml(pass.reason ?? '-')}</p>
      <p><strong>Date:</strong> ${escapeHtml(pass.date ?? '-')}</p>
      <p><strong>Time Out:</strong> ${escapeHtml(pass.time_out ?? '-')}</p>
      <p><strong>Expected Return:</strong> ${escapeHtml(pass.expected_return_time ?? '-')}</p>
      ${pass.approved_by_name != null ? `<p><strong>Approved By:</strong> ${escapeHtml(pass.approved_by_name)}</p>` : ''}
      <p><strong>Status:</strong> ${escapeHtml(pass.status ?? '-')}</p>
    </div>
  `;
}

export function getGatePassPrintHtml(passes: GatePassForPrint[]): string {
  const slips = passes.map((p) => getGatePassSlipHtml(p)).join('');
  return `<div style="padding:8px;">${slips}</div>`;
}

function escapeHtml(s: string | undefined | null): string {
  const str = s ?? '';
  if (typeof document === 'undefined') {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}
