# Supabase Storage Bucket Setup Guide

This guide will help you set up all the necessary storage buckets for the Smart School ERP system.

## Required Buckets

You need to create the following buckets in Supabase Storage:

1. **`school-logos`** - For school logo uploads
2. **`school-media`** - For gallery images, student photos, staff photos, and other media

## Step-by-Step Setup

### Method 1: Using Supabase Dashboard (Recommended)

1. **Log in to Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Click "New bucket"

3. **Create `school-logos` Bucket**
   - **Bucket name**: `school-logos`
   - **Public bucket**: ✅ **YES** (Check this box)
   - **File size limit**: 5 MB (or leave default)
   - **Allowed MIME types**: `image/*` (or leave empty for all)
   - Click "Create bucket"

4. **Create `school-media` Bucket**
   - **Bucket name**: `school-media`
   - **Public bucket**: ✅ **YES** (Check this box)
   - **File size limit**: 10 MB (or leave default)
   - **Allowed MIME types**: `image/*` (or leave empty for all)
   - Click "Create bucket"

5. **Set Up Storage Policies (RLS)**

   For each bucket, you need to set up Row Level Security policies:

   **For `school-logos` bucket:**
   ```sql
   -- Allow authenticated users to upload logos for their school
   CREATE POLICY "Allow authenticated users to upload school logos"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'school-logos' AND
     (storage.foldername(name))[1] = (SELECT school_code FROM accepted_schools WHERE id = auth.uid()::uuid LIMIT 1)
   );

   -- Allow public read access
   CREATE POLICY "Allow public read access to school logos"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'school-logos');
   ```

   **For `school-media` bucket:**
   ```sql
   -- Allow authenticated users to upload media for their school
   CREATE POLICY "Allow authenticated users to upload school media"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'school-media' AND
     (storage.foldername(name))[1] = (SELECT school_code FROM accepted_schools WHERE id = auth.uid()::uuid LIMIT 1)
   );

   -- Allow public read access
   CREATE POLICY "Allow public read access to school media"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'school-media');
   ```

### Method 2: Using SQL (Alternative)

Run this SQL in your Supabase SQL Editor:

```sql
-- Create school-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-logos',
  'school-logos',
  true,
  5242880, -- 5 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create school-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-media',
  'school-media',
  true,
  10485760, -- 10 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for school-logos
CREATE POLICY "Allow authenticated users to upload school logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'school-logos');

CREATE POLICY "Allow public read access to school logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'school-logos');

-- Storage Policies for school-media
CREATE POLICY "Allow authenticated users to upload school media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'school-media');

CREATE POLICY "Allow public read access to school media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'school-media');
```

## Folder Structure

The buckets will organize files as follows:

### `school-logos` bucket:
```
SCH001/
  └── SCH001-1234567890.jpg
```

### `school-media` bucket:
```
SCH001/
  ├── gallery/
  │   └── gallery-SCH001-1234567890.jpg
  ├── students/
  │   └── student-ADM001-1234567890.jpg
  └── staff/
      └── staff-STF001-1234567890.jpg
```

## Features Using Storage

### 1. School Logo Upload
- **Bucket**: `school-logos`
- **API**: `/api/schools/upload-logo`
- **Location**: Institute Info page
- **Max Size**: 5MB

### 2. Gallery Images
- **Bucket**: `school-media`
- **API**: `/api/gallery`
- **Location**: Gallery page (Principal dashboard)
- **Max Size**: 10MB
- **Path**: `{school_code}/gallery/{filename}`

### 3. Student Photos
- **Bucket**: `school-media`
- **API**: `/api/students/photo`
- **Location**: Student profile/edit pages
- **Max Size**: 5MB
- **Path**: `{school_code}/students/{filename}`

### 4. Staff Photos
- **Bucket**: `school-media`
- **API**: `/api/staff/photo`
- **Location**: Staff profile/edit pages
- **Max Size**: 5MB
- **Path**: `{school_code}/staff/{filename}`

## Database Schema Updates

Make sure you have the following columns in your tables:

### `accepted_schools` table:
```sql
ALTER TABLE accepted_schools 
ADD COLUMN IF NOT EXISTS logo_url text;
```

### `students` table:
```sql
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS photo_url text;
```

### `staff` table:
```sql
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS photo_url text;
```

## Testing

After setup, test the uploads:

1. **Test School Logo Upload**:
   - Go to Institute Info page
   - Upload a logo
   - Verify it appears

2. **Test Gallery Upload**:
   - Go to Gallery page (Principal dashboard)
   - Upload an image
   - Verify it appears in the gallery

3. **Test Student Photo Upload**:
   - Go to Student edit page
   - Upload a photo
   - Verify it appears

4. **Test Staff Photo Upload**:
   - Go to Staff edit page
   - Upload a photo
   - Verify it appears

## Troubleshooting

### Issue: "Bucket not found"
- **Solution**: Make sure you've created the buckets in Supabase Storage

### Issue: "Permission denied"
- **Solution**: Check that the buckets are set to "Public" and RLS policies are set correctly

### Issue: "File too large"
- **Solution**: Check file size limits in bucket settings

### Issue: "Invalid file type"
- **Solution**: Check allowed MIME types in bucket settings

## Security Notes

1. **Public Buckets**: Both buckets are public for read access, which allows images to be displayed without authentication
2. **Upload Restrictions**: Only authenticated users can upload files
3. **File Validation**: The API routes validate file types and sizes before upload
4. **School Isolation**: Files are organized by school code to prevent cross-school access

## Next Steps

1. Create the buckets using Method 1 or Method 2 above
2. Run the database schema updates if needed
3. Test each upload feature
4. Verify images are accessible from student and staff dashboards

