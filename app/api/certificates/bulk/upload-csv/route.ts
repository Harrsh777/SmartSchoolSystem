import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import Papa from 'papaparse';

/**
 * POST /api/certificates/bulk/upload-csv
 * Parse and validate CSV file for bulk certificate generation
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;

    if (!file || !schoolCode) {
      return NextResponse.json(
        { error: 'File and school code are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only CSV files are allowed' },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();

    // Parse CSV
    return new Promise<NextResponse>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            resolve(
              NextResponse.json(
                { error: 'CSV parsing error', details: results.errors },
                { status: 400 }
              )
            );
            return;
          }

          const rows = results.data as Record<string, string>[];
          
          if (rows.length === 0) {
            resolve(
              NextResponse.json(
                { error: 'CSV file is empty' },
                { status: 400 }
              )
            );
            return;
          }

          // Get column names
          const columns = Object.keys(rows[0] || {});
          
          // Validate that we have at least one data row
          const validRows = rows.filter(row => {
            // Check if row has at least one non-empty value
            return Object.values(row).some(val => val && val.trim() !== '');
          });

          if (validRows.length === 0) {
            resolve(
              NextResponse.json(
                { error: 'CSV file contains no valid data rows' },
                { status: 400 }
              )
            );
            return;
          }

          resolve(
            NextResponse.json({
              data: {
                columns,
                rows: validRows.slice(0, 100), // Limit preview to 100 rows
                total_rows: validRows.length,
                preview_rows: Math.min(100, validRows.length),
              },
            }, { status: 200 })
          );
        },
        error: (error: Error) => {
          resolve(
            NextResponse.json(
              { error: 'Failed to parse CSV', details: error.message },
              { status: 400 }
            )
          );
        },
      });
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/certificates/bulk/upload-csv:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
