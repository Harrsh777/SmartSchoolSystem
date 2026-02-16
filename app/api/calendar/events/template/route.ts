import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * GET /api/calendar/events/template
 * Download Excel template for bulk import: Event Name, Start Date, End Date (date only; use same date for single-day, or range for multi-day e.g. Holi 20–23)
 */
export async function GET() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Event Name', 'Start Date', 'End Date'],
    ['Independence Day', '2026-08-15', '2026-08-15'],
    ['Holi', '2026-03-20', '2026-03-23'],
    ['Annual Sports Day', '2026-12-20', '2026-12-20'],
    ['', '', ''],
  ]);
  ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Events');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = 'events_holidays_import_template.xlsx';
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
