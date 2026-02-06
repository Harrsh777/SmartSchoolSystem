import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

function parseDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // DD/MM/YYYY or D/M/YYYY
    const d = trimmed.split(/[/-]/);
    if (d.length === 3) {
      const day = d[0].padStart(2, '0');
      const month = d[1].padStart(2, '0');
      const year = d[2].length === 4 ? d[2] : d[2].length === 2 ? '20' + d[2] : '';
      if (year && month && day) return `${year}-${month}-${day}`;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  }
  if (typeof value === 'number') {
    const d = new Date((value - 25569) * 86400 * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

/**
 * POST /api/calendar/events/bulk-import
 * Body: FormData with file (Excel) and school_code
 * Excel columns: "Event Name" (or "Name"), "Date" (YYYY-MM-DD or DD/MM/YYYY)
 * Validates each row and creates events (event_type: event, applicable_for: all)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const schoolCode = formData.get('school_code') as string | null;

    if (!schoolCode?.trim()) {
      return NextResponse.json(
        { error: 'school_code is required' },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Excel file is required' },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    if (!firstSheet) {
      return NextResponse.json(
        { error: 'Excel file has no sheets' },
        { status: 400 }
      );
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { header: 1, defval: '' }) as unknown as unknown[][];
    if (!rows.length) {
      return NextResponse.json(
        { error: 'Excel file is empty' },
        { status: 400 }
      );
    }

    const headerRow = rows[0] as string[];
    const nameCol = headerRow.findIndex((h) => /event\s*name|name/i.test(String(h).trim()));
    const dateCol = headerRow.findIndex((h) => /date/i.test(String(h).trim()));

    if (nameCol === -1 || dateCol === -1) {
      return NextResponse.json(
        { error: 'Excel must have columns "Event Name" (or "Name") and "Date". Download the template and use the same headers.' },
        { status: 400 }
      );
    }

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode.trim())
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const toInsert: { school_id: string; school_code: string; event_date: string; title: string; event_type: string; applicable_for: string }[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      const nameVal = row[nameCol];
      const dateVal = row[dateCol];
      const title = typeof nameVal === 'string' ? nameVal.trim() : String(nameVal ?? '').trim();
      const dateStr = parseDate(dateVal);

      if (!title) {
        errors.push(`Row ${i + 1}: Event name is empty. Skipped.`);
        continue;
      }
      if (!dateStr) {
        errors.push(`Row ${i + 1}: Invalid or missing date for "${title}". Use YYYY-MM-DD or DD/MM/YYYY.`);
        continue;
      }
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        errors.push(`Row ${i + 1}: Invalid date "${dateStr}" for "${title}".`);
        continue;
      }

      toInsert.push({
        school_id: schoolData.id,
        school_code: schoolCode.trim(),
        event_date: dateStr,
        title,
        event_type: 'event',
        applicable_for: 'all',
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({
        data: { created: 0, errors },
        message: errors.length ? 'No valid rows to import.' : 'No data rows found.',
      }, { status: 200 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('events')
      .insert(toInsert.map(({ school_id, school_code, event_date, title, event_type, applicable_for }) => ({
        school_id,
        school_code,
        event_date,
        title,
        description: null,
        event_type,
        applicable_for,
        applicable_classes: null,
      })))
      .select('id');

    if (insertError) {
      console.error('Bulk import error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save events', details: insertError.message },
        { status: 500 }
      );
    }

    const created = inserted?.length ?? 0;
    return NextResponse.json({
      data: { created, errors },
      message: `Successfully imported ${created} event(s).${errors.length ? ` ${errors.length} row(s) had validation issues.` : ''}`,
    }, { status: 200 });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
