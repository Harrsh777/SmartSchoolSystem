/**
 * Merge multiple full HTML report card documents for bulk print or PDF.
 * Saved cards use `.print-page` + A4 landscape print CSS that pins `body` to one
 * sheet; overrides here unlock height/overflow so each student gets a new page.
 */

export type ReportCardBulkMergeMode = 'browser-print' | 'server-pdf';

/** Appended last in <head> so it wins over embedded report-card styles. */
const BULK_MERGE_OVERRIDES_CSS = `
@media print {
  @page {
    size: A4 landscape;
    margin: 0;
  }
  html, body {
    width: auto !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
    display: block !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .bulk-rc-page {
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid-page;
    box-sizing: border-box;
  }
  .bulk-rc-page:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
  .bulk-rc-page > .print-page {
    width: 11.69in !important;
    height: 8.27in !important;
    max-width: 11.69in !important;
    max-height: 8.27in !important;
    overflow: hidden !important;
    margin: 0 auto !important;
    box-sizing: border-box !important;
    page-break-inside: avoid !important;
    break-inside: avoid-page !important;
  }
  /* Legacy portrait template: body was .report-card only */
  .bulk-rc-page > .report-card {
    page-break-inside: avoid !important;
    break-inside: avoid-page !important;
  }
}
@media screen {
  html, body {
    width: auto !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: auto !important;
    background: #e5e5e5;
  }
  .bulk-rc-page {
    margin: 12px auto;
  }
  .bulk-rc-page .print-page {
    box-shadow: 0 2px 16px rgba(0,0,0,0.12);
  }
}
`;

export function mergeReportCardHtmlDocuments(
  htmlParts: string[],
  _mode: ReportCardBulkMergeMode,
  baseHref?: string
): string {
  void _mode; // reserved if server vs browser ever diverge
  if (htmlParts.length === 0) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body></body></html>';
  }
  const first = htmlParts[0];
  const headMatch = first.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headInner = headMatch ? headMatch[1] : '';
  const extraCss = `<style data-bulk-report-card-merge="1">${BULK_MERGE_OVERRIDES_CSS}</style>`;
  const baseTag =
    baseHref && baseHref.trim() ? `<base href="${baseHref.replace(/\/$/, '')}/">` : '';
  const bodies = htmlParts.map((html) => {
    const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return m ? m[1].trim() : html.trim();
  });
  const bodyInner = bodies.map((b) => `<div class="bulk-rc-page">${b}</div>`).join('\n');
  const openHtml = first.match(/<html[^>]*>/i);
  const htmlOpen = openHtml ? openHtml[0] : '<html>';
  return `<!DOCTYPE html>${htmlOpen}<head><meta charset="utf-8"/>${baseTag}${headInner}${extraCss}</head><body>${bodyInner}</body></html>`;
}
