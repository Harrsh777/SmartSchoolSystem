import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';
import { requirePermission } from '@/lib/api-permissions';

/**
 * POST /api/staff/photos/bulk
 * Bulk photo upload with batch tracking
 * 
 * Flow:
 * 1. Create batch record
 * 2. Process files and match to staff
 * 3. Upload to storage
 * 4. Update staff.profile_photo_url
 * 5. Track per-file status
 */
export async function POST(request: NextRequest) {
  try {
    // Permission check - only admins
    const permissionCheck = await requirePermission(request, 'manage_staff');
    if (permissionCheck) {
      return permissionCheck;
    }

    const formData = await request.formData();
    const schoolCode = formData.get('school_code') as string;
    const uploadedByStaffId = request.headers.get('x-staff-id') || 
                              formData.get('uploaded_by_staff_id') as string;

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get uploaded_by UUID from staff_id
    let uploadedBy: string | null = null;
    if (uploadedByStaffId) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('school_code', schoolCode)
        .eq('staff_id', uploadedByStaffId)
        .single();
      
      if (staffData) {
        uploadedBy = staffData.id;
      }
    }

    // Get all files from form data
    const files: File[] = [];
    const fileEntries = Array.from(formData.entries());
    
    for (const [key, value] of fileEntries) {
      if (key === 'file' && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate files
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    
    const invalidFiles: string[] = [];
    const validFiles = files.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        invalidFiles.push(`${file.name} (invalid type)`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name} (too large)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid files to upload', invalidFiles },
        { status: 400 }
      );
    }

    const serviceClient = getServiceRoleClient();

    // Step 1: Create batch record
    const { data: batch, error: batchError } = await serviceClient
      .from('staff_photo_batches')
      .insert({
        school_code: schoolCode,
        uploaded_by: uploadedBy,
        uploaded_by_staff_id: uploadedBy,
        total_files: validFiles.length,
        status: 'processing',
      })
      .select()
      .single();

    if (batchError || !batch) {
      console.error('Error creating batch:', batchError);
      return NextResponse.json(
        { error: 'Failed to create upload batch', details: batchError?.message },
        { status: 500 }
      );
    }

    // Step 2: Process files and create photo records
    const photoRecords: Array<{
      batch_id: string;
      school_code: string;
      staff_id: string | null;
      original_filename: string;
      file_size: number;
      mime_type: string;
      match_status: 'matched' | 'unmatched' | 'pending';
      match_method: 'auto' | null;
    }> = [];

    const matchedCount = { count: 0 };
    const unmatchedFiles: Array<{ filename: string; reason: string }> = [];

    // Get all staff for matching
    const { data: allStaff } = await serviceClient
      .from('staff')
      .select('id, staff_id, employee_code')
      .eq('school_code', schoolCode);

    // Helper function to normalize filename for matching
    const normalizeFilename = (filename: string): string => {
      return filename
        .replace(/\.[^/.]+$/, '') // Remove extension
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, ''); // Remove special chars, spaces, underscores, hyphens
    };

    // Helper function to extract staff ID patterns from filename
    const extractStaffIdPatterns = (filename: string): string[] => {
      const patterns: string[] = [];
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').toLowerCase();
      
      // Pattern 1: STF001, STF-001, STF_001, etc.
      const stfMatch = nameWithoutExt.match(/(?:stf|staff)[\s_-]?(\d+)/i);
      if (stfMatch && stfMatch[1]) {
        patterns.push(`STF${stfMatch[1].padStart(3, '0')}`);
        patterns.push(stfMatch[1]); // Also try without prefix
      }
      
      // Pattern 2: EMP001, EMP-001, etc.
      const empMatch = nameWithoutExt.match(/(?:emp|employee)[\s_-]?(\d+)/i);
      if (empMatch && empMatch[1]) {
        patterns.push(`EMP${empMatch[1].padStart(3, '0')}`);
        patterns.push(empMatch[1]);
      }
      
      // Pattern 3: Direct number match
      const numMatch = nameWithoutExt.match(/^(\d+)$/);
      if (numMatch) {
        patterns.push(numMatch[1]);
        patterns.push(numMatch[1].padStart(3, '0'));
      }
      
      // Pattern 4: Normalized filename (for name-based matching)
      patterns.push(normalizeFilename(filename));
      
      return [...new Set(patterns)]; // Remove duplicates
    };

    // Process each file
    for (const file of validFiles) {
      const normalizedName = normalizeFilename(file.name);
      const extractedPatterns = extractStaffIdPatterns(file.name);
      let matchedStaffId: string | null = null;
      let matchMethod: 'auto' | null = null;

      // Try to match by staff_id or employee_code using multiple strategies
      if (allStaff) {
        for (const staffMember of allStaff) {
          const normalizedStaffId = normalizeFilename(staffMember.staff_id || '');
          const normalizedEmployeeCode = normalizeFilename(staffMember.employee_code || '');
          const staffId = (staffMember.staff_id || '').toUpperCase();
          const employeeCode = (staffMember.employee_code || '').toUpperCase();
          
          // Try exact match with normalized names
          if (normalizedName === normalizedStaffId || normalizedName === normalizedEmployeeCode) {
            matchedStaffId = staffMember.id;
            matchMethod = 'auto';
            matchedCount.count++;
            break;
          }
          
          // Try pattern matching
          for (const pattern of extractedPatterns) {
            const normalizedPattern = normalizeFilename(pattern);
            if (
              normalizedPattern === normalizedStaffId ||
              normalizedPattern === normalizedEmployeeCode ||
              pattern === staffId ||
              pattern === employeeCode
            ) {
              matchedStaffId = staffMember.id;
              matchMethod = 'auto';
              matchedCount.count++;
              break;
            }
          }
          
          if (matchedStaffId) break;
        }
      }

      photoRecords.push({
        batch_id: batch.id,
        school_code: schoolCode,
        staff_id: matchedStaffId,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        match_status: matchedStaffId ? 'matched' : 'unmatched',
        match_method: matchMethod,
      });

      if (!matchedStaffId) {
        unmatchedFiles.push({
          filename: file.name,
          reason: 'No matching staff found. Please match manually or rename file to match staff ID (e.g., STF001.jpg)',
        });
      }
    }

    // Insert photo records
    const { data: insertedPhotos, error: photosError } = await serviceClient
      .from('staff_photos')
      .insert(photoRecords)
      .select();

    if (photosError) {
      console.error('Error inserting photo records:', photosError);
      // Update batch status to failed
      await serviceClient
        .from('staff_photo_batches')
        .update({ status: 'failed' })
        .eq('id', batch.id);
      
      return NextResponse.json(
        { error: 'Failed to create photo records', details: photosError.message },
        { status: 500 }
      );
    }

    // Step 3: Upload matched files to storage
    const uploadResults: Array<{
      photoId: string;
      filename: string;
      success: boolean;
      storagePath?: string;
      error?: string;
    }> = [];

    const matchedPhotos = insertedPhotos?.filter(p => p.match_status === 'matched') || [];

    for (const photoRecord of matchedPhotos) {
      const file = validFiles.find(f => f.name === photoRecord.original_filename);
      if (!file || !photoRecord.staff_id) continue;

      try {
        // Generate storage path: staff-photos/{staff_id}/{uuid}.{ext}
        const fileExt = file.name.split('.').pop() || 'jpg';
        const storagePath = `staff-photos/${photoRecord.staff_id}/${photoRecord.id}.${fileExt}`;

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { error: uploadError } = await serviceClient.storage
          .from('staff-photos')
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: true, // Replace if exists
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = serviceClient.storage
          .from('staff-photos')
          .getPublicUrl(storagePath);

        // Update photo record with storage path
        await serviceClient
          .from('staff_photos')
          .update({
            storage_path: storagePath,
            match_status: 'uploaded',
            uploaded_at: new Date().toISOString(),
          })
          .eq('id', photoRecord.id);

        // Update staff.photo_url
        await serviceClient
          .from('staff')
          .update({ photo_url: urlData.publicUrl })
          .eq('id', photoRecord.staff_id)
          .eq('school_code', schoolCode);

        uploadResults.push({
          photoId: photoRecord.id,
          filename: file.name,
          success: true,
          storagePath,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        
        // Update photo record with error
        await serviceClient
          .from('staff_photos')
          .update({
            match_status: 'failed',
            error_message: errorMessage,
          })
          .eq('id', photoRecord.id);

        uploadResults.push({
          photoId: photoRecord.id,
          filename: file.name,
          success: false,
          error: errorMessage,
        });
      }
    }

    // Step 4: Update batch status
    const successCount = uploadResults.filter(r => r.success).length;
    const failedCount = uploadResults.filter(r => !r.success).length;
    
    let finalStatus: 'completed' | 'partial' | 'failed' = 'completed';
    if (failedCount > 0 && successCount > 0) {
      finalStatus = 'partial';
    } else if (successCount === 0) {
      finalStatus = 'failed';
    }

    await serviceClient
      .from('staff_photo_batches')
      .update({
        matched_count: matchedCount.count,
        uploaded_count: successCount,
        failed_count: failedCount,
        status: finalStatus,
        completed_at: new Date().toISOString(),
      })
      .eq('id', batch.id);

    return NextResponse.json({
      success: true,
      data: {
        batch_id: batch.id,
        total_files: validFiles.length,
        matched: matchedCount.count,
        uploaded: successCount,
        failed: failedCount,
        unmatched: unmatchedFiles.length,
        status: finalStatus,
        unmatched_files: unmatchedFiles,
        upload_results: uploadResults,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in bulk photo upload:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/staff/photos/bulk
 * Get batch upload history
 */
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_staff');
    if (permissionCheck) {
      return permissionCheck;
    }

    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const batchId = searchParams.get('batch_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    if (batchId) {
      // Get specific batch with photos
      const { data: batch, error: batchError } = await supabase
        .from('staff_photo_batches')
        .select(`
          *,
          photos:staff_photos(*)
        `)
        .eq('id', batchId)
        .eq('school_code', schoolCode)
        .single();

      if (batchError || !batch) {
        return NextResponse.json(
          { error: 'Batch not found', details: batchError?.message },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: batch }, { status: 200 });
    }

    // Get all batches for school
    const { data: batches, error: batchesError } = await supabase
      .from('staff_photo_batches')
      .select('*')
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false })
      .limit(50);

    if (batchesError) {
      return NextResponse.json(
        { error: 'Failed to fetch batches', details: batchesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: batches || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching batch history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
