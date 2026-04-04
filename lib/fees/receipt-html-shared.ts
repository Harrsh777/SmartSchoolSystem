import { escapeHtml } from '@/lib/fees/receipt-html-escape';

export { escapeHtml };

/** Shared print-optimized styles for fee receipts (payment + statement). */
export function receiptSharedStyles(): string {
  return `
    .no-print { }
    @media print {
      .no-print { display: none !important; }
    }
    .receipt-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: #fff;
      border-radius: 10px;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(30, 58, 138, 0.25);
    }
    .receipt-toolbar-title {
      font-weight: 700;
      font-size: 14px;
      margin-right: auto;
    }
    .receipt-toolbar button {
      cursor: pointer;
      border: none;
      background: #fff;
      color: #1e3a8a;
      font-weight: 600;
      font-size: 12px;
      padding: 8px 14px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    .receipt-toolbar button:hover {
      background: #f1f5f9;
    }
    .receipt-toolbar-hint {
      font-size: 11px;
      opacity: 0.9;
      width: 100%;
      margin-top: 2px;
    }
    .receipt-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }
    .copy-label-pill {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #1e40af;
      padding: 6px 12px;
      background: #eff6ff;
      border-radius: 999px;
      margin-bottom: 12px;
      border: 1px solid #bfdbfe;
    }
    .header-grid {
      display: grid;
      grid-template-columns: 72px 1fr minmax(140px, 200px);
      gap: 14px;
      align-items: start;
    }
    @media (max-width: 640px) {
      .header-grid {
        grid-template-columns: 1fr;
        text-align: center;
      }
      .header-meta { text-align: center; }
      .logo-wrap { margin: 0 auto; }
    }
    .logo-wrap {
      width: 72px;
      height: 72px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #f8fafc;
    }
    .logo-wrap img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .school-center {
      text-align: center;
    }
    .school-center h1 {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      line-height: 1.25;
    }
    .school-center .lines {
      font-size: 10px;
      color: #475569;
      line-height: 1.55;
    }
    .header-meta {
      text-align: right;
      font-size: 10px;
      color: #334155;
      line-height: 1.5;
      border-left: 1px solid #e2e8f0;
      padding-left: 12px;
    }
    .header-meta .doc-title {
      font-size: 13px;
      font-weight: 800;
      color: #1e3a8a;
      margin-bottom: 8px;
      letter-spacing: 0.04em;
    }
    .header-meta .kv {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      margin-bottom: 4px;
    }
    .header-meta .k { color: #64748b; font-weight: 600; }
    .header-meta .v { font-weight: 700; color: #0f172a; }
    .two-col-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 640px) {
      .two-col-info { grid-template-columns: 1fr; }
    }
    .info-card-title {
      font-size: 11px;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-line {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 10px;
      margin-bottom: 5px;
    }
    .info-line .lab { color: #64748b; font-weight: 600; flex-shrink: 0; }
    .info-line .val { color: #0f172a; font-weight: 600; text-align: right; }
    .fees-table-pro {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin: 0;
    }
    .fees-table-pro th {
      background: #1e3a8a;
      color: #fff;
      padding: 8px 6px;
      text-align: left;
      font-weight: 700;
      border: 1px solid #1e3a8a;
    }
    .fees-table-pro th.text-right { text-align: right; }
    .fees-table-pro td {
      padding: 7px 6px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .fees-table-pro tbody tr:nth-child(even) { background: #f8fafc; }
    .fees-table-pro tbody tr:nth-child(odd) { background: #fff; }
    .fees-table-pro .text-right { text-align: right; }
    .fees-table-pro tfoot td {
      font-weight: 800;
      background: #eff6ff !important;
      border-top: 2px solid #1e3a8a;
      font-size: 10px;
    }
    .total-paid-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #fff;
      border-radius: 10px;
      margin-top: 4px;
    }
    .total-paid-banner .lbl { font-size: 11px; opacity: 0.95; font-weight: 600; }
    .total-paid-banner .amt { font-size: 20px; font-weight: 800; letter-spacing: 0.02em; }
    .amount-words {
      font-size: 10px;
      color: #0f172a;
      line-height: 1.55;
      padding: 12px 14px;
      background: #f1f5f9;
      border-radius: 10px;
      border: 1px dashed #94a3b8;
    }
    .amount-words strong { color: #1e3a8a; }
    .payment-mode-pill {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #6ee7b7;
      margin-top: 6px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 16px;
      padding-top: 12px;
    }
    .signature-box {
      text-align: center;
      min-height: 72px;
      padding-top: 8px;
    }
    .signature-line {
      height: 1px;
      background: #0f172a;
      margin: 28px auto 6px;
      max-width: 85%;
      opacity: 0.85;
    }
    .signature-label {
      font-size: 9px;
      font-weight: 700;
      color: #475569;
    }
    .stamp-placeholder {
      margin-top: 6px;
      font-size: 8px;
      color: #94a3b8;
    }
    .footer-note {
      text-align: center;
      font-size: 9px;
      color: #64748b;
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }
    .partial-banner {
      font-size: 10px;
      padding: 8px 12px;
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      color: #92400e;
      margin-bottom: 10px;
    }
  `;
}

export function receiptToolbarHtml(docTitle: string): string {
  return `
  <div class="no-print receipt-toolbar">
    <span class="receipt-toolbar-title">${escapeHtml(docTitle)}</span>
    <button type="button" onclick="window.print()">Print</button>
    <button type="button" onclick="window.print()">Save as PDF</button>
    <span class="receipt-toolbar-hint">Tip: In the print dialog, choose &quot;Save as PDF&quot; or &quot;Microsoft Print to PDF&quot; to download.</span>
  </div>`;
}
