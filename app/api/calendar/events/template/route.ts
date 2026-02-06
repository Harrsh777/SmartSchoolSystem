import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * GET /api/calendar/events/template
 * Download Excel template for bulk import: columns "Event Name" and "Date"
 */
export async function GET() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Event Name', 'Date'],
    ['Independence Day', '2026-08-15'],
    ['Annual Sports Day', '2026-12-20'],
    ['', ''],
  ]);
  ws['!cols'] = [{ wch: 30 }, { wch: 14 }];
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
