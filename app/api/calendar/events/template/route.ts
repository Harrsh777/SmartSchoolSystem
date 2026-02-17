import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * GET /api/calendar/events/template
 * Download Excel template for bulk import: Event Name, Start Date, End Date, Type (event/holiday), Applicable For (ALL/students/staff/specific_class), Description
 */
export async function GET() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Event Name', 'Start Date', 'End Date', 'Type', 'Applicable For', 'Description'],
    ['Independence Day', '2026-08-15', '2026-08-15', 'holiday', 'ALL', ''],
    ['Holi', '2026-03-20', '2026-03-23', 'holiday', 'ALL', ''],
    ['Annual Sports Day', '2026-12-20', '2026-12-20', 'event', 'ALL', ''],
    ['Valentines Day', '2026-02-14', '2026-02-14', 'event', '12, 10', ''],
    ['', '', '', '', '', ''],
  ]);
  ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 24 }];
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
