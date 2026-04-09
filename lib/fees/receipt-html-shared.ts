import { escapeHtml } from '@/lib/fees/receipt-html-escape';

export { escapeHtml };

/**
 * @page + shell for fee receipts: ISO A5 portrait (148×210mm).
 * Use with body.compact-receipt for screen preview and print.
 */
export function receiptA5PageStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A5 portrait; margin: 4mm; }
    html, body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
    }
    body {
      padding: 8px;
      background: #e2e8f0;
      color: #0f172a;
    }
    .page-shell {
      width: 148mm;
      max-width: 100%;
      margin: 0 auto;
      background: #f1f5f9;
      padding: 6px;
      border-radius: 8px;
      box-sizing: border-box;
    }
    .receipt-sheet {
      background: #fff;
      width: 148mm;
      max-width: 100%;
      min-height: 210mm;
      box-sizing: border-box;
      border-radius: 8px;
      padding: 3.5mm 4mm 4mm;
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
      max-width: 62%;
      max-height: 48%;
      object-fit: contain;
      opacity: 0.05;
      filter: grayscale(1);
      transform: rotate(-12deg);
    }
    .receipt-inner { position: relative; z-index: 1; }
    @media print {
      body { background: #fff; padding: 0; margin: 0; }
      .page-shell {
        max-width: none;
        width: 100%;
        margin: 0;
        padding: 0;
        background: #fff;
        border-radius: 0;
      }
      .receipt-sheet {
        width: 100%;
        min-height: 0;
        border: none;
        border-radius: 0;
        padding: 0;
        box-shadow: none;
        page-break-after: always;
      }
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  `;
}

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
    .compact-receipt .receipt-card {
      border-radius: 6px;
      padding: 4px 6px !important;
      margin-bottom: 4px !important;
    }
    .compact-receipt .receipt-card.amount-words {
      padding: 5px 6px !important;
      margin-top: 5px !important;
    }
    .compact-receipt .copy-label-pill {
      font-size: 8px;
      padding: 3px 7px;
      margin-bottom: 5px;
    }
    .compact-receipt .header-grid {
      grid-template-columns: 48px 1fr minmax(92px, 128px);
      gap: 5px;
    }
    .compact-receipt .logo-wrap {
      width: 48px;
      height: 48px;
      border-radius: 6px;
    }
    .compact-receipt .school-center h1 {
      font-size: 11px;
      margin-bottom: 2px;
      line-height: 1.2;
    }
    .compact-receipt .school-center .lines,
    .compact-receipt .header-meta,
    .compact-receipt .info-line,
    .compact-receipt .amount-words,
    .compact-receipt .footer-note {
      font-size: 7px;
      line-height: 1.3;
    }
    .compact-receipt .header-meta {
      padding-left: 6px;
    }
    .compact-receipt .header-meta .doc-title {
      font-size: 9px;
      margin-bottom: 3px;
    }
    .compact-receipt .info-card-title {
      font-size: 8px;
      margin-bottom: 4px;
      padding-bottom: 3px;
    }
    .compact-receipt .two-col-info {
      gap: 5px;
    }
    .compact-receipt .info-line {
      margin-bottom: 2px;
    }
    .compact-receipt .info-line-tight {
      margin-top: 3px !important;
    }
    .compact-receipt .fees-table-pro {
      font-size: 6px;
    }
    .compact-receipt .fees-table-pro th,
    .compact-receipt .fees-table-pro td {
      padding: 2px 2px;
    }
    .compact-receipt .fees-table-pro tfoot td {
      font-size: 7px;
    }
    .compact-receipt .total-paid-banner {
      padding: 5px 8px;
      border-radius: 6px;
      margin-top: 2px;
    }
    .compact-receipt .total-paid-banner .lbl {
      font-size: 7px;
      max-width: 62%;
      line-height: 1.25;
    }
    .compact-receipt .total-paid-banner .amt {
      font-size: 11px;
    }
    .compact-receipt .payment-mode-pill {
      font-size: 7px;
      padding: 2px 6px;
      margin-top: 2px;
    }
    .compact-receipt .partial-banner {
      font-size: 7px;
      padding: 4px 7px;
      margin-bottom: 5px;
      line-height: 1.3;
    }
    .compact-receipt .signature-grid {
      margin-top: 5px;
      padding-top: 4px;
      gap: 8px;
    }
    .compact-receipt .signature-box {
      min-height: 34px;
      padding-top: 2px;
    }
    .compact-receipt .signature-line {
      margin: 10px auto 3px;
    }
    .compact-receipt .signature-label,
    .compact-receipt .stamp-placeholder {
      font-size: 6px;
    }
    .compact-receipt .footer-note {
      margin-top: 6px;
      padding-top: 5px;
    }
    /* Statement-style fee blocks (large inline styles in HTML) */
    .compact-receipt .receipt-fee-section .rfs-top {
      margin-bottom: 4px !important;
      gap: 4px !important;
    }
    .compact-receipt .receipt-fee-section .rfs-head {
      font-size: 9px !important;
      margin-bottom: 0 !important;
    }
    .compact-receipt .receipt-fee-section .rfs-sub {
      font-size: 6.5px !important;
      margin-top: 2px !important;
    }
    .compact-receipt .receipt-fee-section .rfs-badge {
      font-size: 7px !important;
      padding: 2px 6px !important;
    }
    .compact-receipt .receipt-fee-section .rfs-grid-wrap {
      margin-top: 4px !important;
      padding: 5px !important;
    }
    .compact-receipt .receipt-fee-section .rfs-grid {
      gap: 4px !important;
      font-size: 6.5px !important;
    }
    .compact-receipt .receipt-fee-section td .rf-line1 {
      font-size: 6.5px !important;
    }
    .compact-receipt .receipt-fee-section td .rf-line2 {
      font-size: 6px !important;
      margin-top: 1px !important;
    }
    .compact-receipt .receipt-fee-section td .rf-opt {
      font-size: 6px !important;
    }
    .compact-receipt .receipt-remarks {
      font-size: 7px !important;
      padding: 4px 6px !important;
    }
    .compact-receipt .receipt-pay-history {
      font-size: 7px !important;
    }
    @media print {
      .compact-receipt .receipt-card {
        break-inside: avoid-page;
      }
      .compact-receipt .two-col-info {
        break-inside: avoid-page;
      }
      .compact-receipt .fees-table-pro tr {
        break-inside: avoid-page;
      }
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
