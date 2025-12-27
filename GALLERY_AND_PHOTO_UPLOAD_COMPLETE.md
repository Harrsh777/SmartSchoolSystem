# Gallery & Photo Upload System - Complete Implementation

## ✅ What Has Been Implemented

### 1. Gallery Feature
- **Principal Dashboard**: Full gallery management page at `/dashboard/[school]/gallery`
  - Upload images with title, description, and category
  - Edit image details
  - Delete images
  - Filter by category (General, Events, Sports, Academics, Cultural, Other)
  - Beautiful grid layout with hover effects

- **Student Dashboard**: Gallery view at `/student/dashboard/gallery`
  - View all gallery images
  - Filter by category
  - Read-only access

- **Teacher/Staff Dashboard**: Gallery view at `/teacher/dashboard/gallery`
  - View all gallery images
  - Filter by category
  - Read-only access

### 2. Photo Upload APIs
- **Student Photo Upload**: `/api/students/photo`
- **Staff Photo Upload**: `/api/staff/photo`
- **School Logo Upload**: `/api/schools/upload-logo` (already existed)

### 3. Database Schema
- **Gallery table**: Created with `supabase_gallery_schema.sql`
- **Photo URL columns**: Need to be added to `students` and `staff` tables

## 📋 Setup Instructions

### Step 1: Create Supabase Storage Buckets

**Option A: Using Supabase Dashboard (Easiest)**

1. Go to your Supabase project → Storage
2. Click "New bucket"
3. Create these buckets:

   **Bucket 1: `school-logos`**
   - Name: `school-logos`
   - Public: ✅ Yes
   - File size limit: 5 MB
   - Allowed MIME types: `image/*`

   **Bucket 2: `school-media`**
   - Name: `school-media`
   - Public: ✅ Yes
   - File size limit: 10 MB
   - Allowed MIME types: `image/*`

**Option B: Using SQL**

Run this in Supabase SQL Editor:

```sql
-- Create school-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-logos',
  'school-logos',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create school-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-media',
  'school-media',
  true,
  10485760, -- 10 MB
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

### Step 2: Run Database Schema

Run `supabase_gallery_schema.sql` in your Supabase SQL Editor.

### Step 3: Add Photo URL Columns (If Not Exists)

```sql
-- Add photo_url to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS photo_url text;

-- Add photo_url to staff table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS photo_url text;
```

## 🎯 Features Overview

### Gallery Management (Principal Only)
- ✅ Upload multiple images
- ✅ Add title, description, and category
- ✅ Edit image details
- ✅ Delete images
- ✅ Filter by category
- ✅ Beautiful grid layout
- ✅ Image preview before upload

### Gallery View (Students & Staff)
- ✅ View all gallery images
- ✅ Filter by category
- ✅ Responsive grid layout
- ✅ Image details display

### Photo Uploads
- ✅ Student photo upload API
- ✅ Staff photo upload API
- ✅ School logo upload (already working)
- ✅ File validation (type and size)
- ✅ Automatic URL generation
- ✅ Database updates

## 📁 File Structure

```
app/
├── dashboard/[school]/
│   └── gallery/
│       └── page.tsx          # Principal gallery management
├── student/dashboard/
│   └── gallery/
│       └── page.tsx          # Student gallery view
├── teacher/dashboard/
│   └── gallery/
│       └── page.tsx          # Teacher gallery view
└── api/
    ├── gallery/
    │   ├── route.ts          # GET, POST gallery
    │   └── [id]/
    │       └── route.ts      # DELETE, PATCH gallery
    ├── students/
    │   └── photo/
    │       └── route.ts      # Student photo upload
    └── staff/
        └── photo/
            └── route.ts      # Staff photo upload
```

## 🔗 Navigation

### Principal Dashboard
- Gallery button added to sidebar
- Path: `/dashboard/[school]/gallery`
- Full CRUD operations

### Student Dashboard
- Gallery menu item added
- Path: `/student/dashboard/gallery`
- Read-only view

### Teacher Dashboard
- Gallery menu item added
- Path: `/teacher/dashboard/gallery`
- Read-only view

## 📝 Usage Examples

### Upload Student Photo

```typescript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('school_code', 'SCH001');
formData.append('student_id', studentId);

const response = await fetch('/api/students/photo', {
  method: 'POST',
  body: formData,
});
```

### Upload Staff Photo

```typescript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('school_code', 'SCH001');
formData.append('staff_id', staffId);

const response = await fetch('/api/staff/photo', {
  method: 'POST',
  body: formData,
});
```

### Upload Gallery Image

```typescript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('school_code', 'SCH001');
formData.append('title', 'School Event');
formData.append('description', 'Annual day celebration');
formData.append('category', 'Events');

const response = await fetch('/api/gallery', {
  method: 'POST',
  body: formData,
});
```

## 🎨 UI Features

- **Responsive Design**: Works on all screen sizes
- **Image Grid**: Beautiful masonry-style grid layout
- **Category Filters**: Easy filtering by category
- **Hover Effects**: Smooth animations on hover
- **Loading States**: Clear feedback during uploads
- **Error Handling**: User-friendly error messages
- **Success Notifications**: Confirmation messages

## 🔒 Security

- File type validation (images only)
- File size limits (5MB for photos, 10MB for gallery)
- School code validation
- RLS policies on gallery table
- Public read access for images
- Authenticated upload only

## 📊 Storage Organization

```
school-logos/
└── {school_code}/
    └── {school_code}-{timestamp}.{ext}

school-media/
└── {school_code}/
    ├── gallery/
    │   └── gallery-{school_code}-{timestamp}.{ext}
    ├── students/
    │   └── student-{admission_no}-{timestamp}.{ext}
    └── staff/
        └── staff-{staff_id}-{timestamp}.{ext}
```

## ✅ Testing Checklist

- [ ] Create Supabase storage buckets
- [ ] Run gallery schema SQL
- [ ] Add photo_url columns to students and staff tables
- [ ] Test gallery upload from principal dashboard
- [ ] Test gallery view from student dashboard
- [ ] Test gallery view from teacher dashboard
- [ ] Test student photo upload
- [ ] Test staff photo upload
- [ ] Test school logo upload
- [ ] Verify images are accessible
- [ ] Test category filtering
- [ ] Test image deletion

## 🚀 Next Steps

1. **Implement photo upload in student edit form**
   - Add photo upload button
   - Display current photo
   - Update on upload

2. **Implement photo upload in staff edit form**
   - Add photo upload button
   - Display current photo
   - Update on upload

3. **Add photo display in profile views**
   - Show student photo in student profile
   - Show staff photo in staff profile
   - Show school logo in institute info

All APIs are ready - you just need to integrate the upload UI into your existing edit forms!

