# Step-by-Step Guide: Create Buckets and Save Photos

This guide will walk you through creating Supabase Storage buckets and setting up photo uploads for students, staff, and college logos.

## 📋 Prerequisites

- A Supabase account and project
- Access to your Supabase dashboard
- Your school code (e.g., SCH001)

---

## 🗂️ Step 1: Create Storage Buckets

### Option A: Using Supabase Dashboard (Recommended - Easiest)

#### 1.1. Log in to Supabase
1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your project

#### 1.2. Navigate to Storage
1. In the left sidebar, click on **"Storage"**
2. You'll see a list of existing buckets (if any)
3. Click the **"New bucket"** button (usually at the top right)

#### 1.3. Create `school-logos` Bucket
Fill in the form with these details:

- **Bucket name**: `school-logos`
- **Public bucket**: ✅ **Check this box** (Important: Must be public for images to display)
- **File size limit**: `5242880` (5 MB in bytes) or select "5 MB" from dropdown
- **Allowed MIME types**: Leave empty OR enter `image/*` to allow all image types
- Click **"Create bucket"**

#### 1.4. Create `school-media` Bucket
Click **"New bucket"** again and fill in:

- **Bucket name**: `school-media`
- **Public bucket**: ✅ **Check this box** (Important: Must be public)
- **File size limit**: `10485760` (10 MB in bytes) or select "10 MB" from dropdown
- **Allowed MIME types**: Leave empty OR enter `image/*`
- Click **"Create bucket"**

✅ **You should now have 2 buckets:**
- `school-logos` (for college/school logos)
- `school-media` (for student photos, staff photos, and gallery images)

---

### Option B: Using SQL (Alternative Method)

If you prefer using SQL, follow these steps:

1. In Supabase dashboard, go to **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Copy and paste this SQL:

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
```

4. Click **"Run"** to execute the SQL
5. You should see "Success. No rows returned" - this means the buckets were created

---

## 🔐 Step 2: Set Up Storage Policies (Security)

Storage policies control who can upload and read files. You need to set these up for security.

### 2.1. Go to SQL Editor
1. In Supabase dashboard, click **"SQL Editor"**
2. Click **"New query"**

### 2.2. Run Storage Policies SQL

Copy and paste this SQL code:

```sql
-- ============================================
-- Storage Policies for school-logos bucket
-- ============================================

-- Allow authenticated users to upload school logos
CREATE POLICY "Allow authenticated users to upload school logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'school-logos');

-- Allow public read access to school logos (so images can be displayed)
CREATE POLICY "Allow public read access to school logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'school-logos');

-- ============================================
-- Storage Policies for school-media bucket
-- ============================================

-- Allow authenticated users to upload school media
CREATE POLICY "Allow authenticated users to upload school media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'school-media');

-- Allow public read access to school media (so images can be displayed)
CREATE POLICY "Allow public read access to school media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'school-media');
```

3. Click **"Run"**
4. You should see "Success" messages

---

## 🗄️ Step 3: Update Database Schema

Add photo URL columns to your database tables so they can store the image URLs.

### 3.1. Go to SQL Editor
1. Click **"SQL Editor"** in Supabase dashboard
2. Click **"New query"**

### 3.2. Run Schema Updates

Copy and paste this SQL:

```sql
-- Add logo_url column to accepted_schools table (if not exists)
ALTER TABLE accepted_schools 
ADD COLUMN IF NOT EXISTS logo_url text;

-- Add photo_url column to students table (if not exists)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS photo_url text;

-- Add photo_url column to staff table (if not exists)
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS photo_url text;
```

3. Click **"Run"**
4. Verify success - you should see "Success" messages

---

## 📁 Step 4: Understand File Organization

Your files will be organized in the buckets like this:

### `school-logos` bucket structure:
```
school-logos/
└── SCH001/
    └── SCH001-1234567890.jpg
```

### `school-media` bucket structure:
```
school-media/
└── SCH001/
    ├── gallery/
    │   └── gallery-SCH001-1234567890.jpg
    ├── students/
    │   └── student-ADM001-1234567890.jpg
    └── staff/
        └── staff-STF001-1234567890.jpg
```

---

## 📤 Step 5: How Photos Are Saved (API Endpoints)

Your application already has API endpoints set up. Here's how they work:

### 5.1. College/School Logo Upload

**API Endpoint**: `POST /api/schools/upload-logo`

**How it works:**
1. Uploads logo to `school-logos` bucket
2. Path: `{school_code}/{school_code}-{timestamp}.{ext}`
3. Updates `accepted_schools.logo_url` in database
4. Returns the public URL

**Example usage:**
```typescript
const formData = new FormData();
formData.append('file', logoFile);
formData.append('school_code', 'SCH001');

const response = await fetch('/api/schools/upload-logo', {
  method: 'POST',
  body: formData,
});
```

---

### 5.2. Student Photo Upload

**API Endpoint**: `POST /api/students/photo`

**How it works:**
1. Uploads photo to `school-media` bucket
2. Path: `{school_code}/students/student-{admission_no}-{timestamp}.{ext}`
3. Updates `students.photo_url` in database
4. Returns the public URL

**Example usage:**
```typescript
const formData = new FormData();
formData.append('file', photoFile);
formData.append('school_code', 'SCH001');
formData.append('student_id', studentId);

const response = await fetch('/api/students/photo', {
  method: 'POST',
  body: formData,
});
```

---

### 5.3. Staff Photo Upload

**API Endpoint**: `POST /api/staff/photo`

**How it works:**
1. Uploads photo to `school-media` bucket
2. Path: `{school_code}/staff/staff-{staff_id}-{timestamp}.{ext}`
3. Updates `staff.photo_url` in database
4. Returns the public URL

**Example usage:**
```typescript
const formData = new FormData();
formData.append('file', photoFile);
formData.append('school_code', 'SCH001');
formData.append('staff_id', staffId);

const response = await fetch('/api/staff/photo', {
  method: 'POST',
  body: formData,
});
```

---

## ✅ Step 6: Verification Checklist

After setup, verify everything works:

### 6.1. Verify Buckets Exist
- [ ] Go to Storage → You should see `school-logos` bucket
- [ ] Go to Storage → You should see `school-media` bucket
- [ ] Both buckets should show "Public" status

### 6.2. Verify Database Columns
- [ ] Run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'accepted_schools' AND column_name = 'logo_url';`
- [ ] Run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'photo_url';`
- [ ] Run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'photo_url';`

### 6.3. Test Uploads
- [ ] Test school logo upload from Institute Info page
- [ ] Test student photo upload (if UI is implemented)
- [ ] Test staff photo upload (if UI is implemented)
- [ ] Verify images appear correctly after upload

---

## 🔍 Step 7: Viewing Uploaded Files

### In Supabase Dashboard:
1. Go to **Storage** → Click on a bucket name
2. You'll see folders organized by school code
3. Click into folders to see uploaded files

### In Your Application:
- Images are accessible via public URLs
- URLs are stored in database columns (`logo_url`, `photo_url`)
- Display images using: `<img src={photo_url} />`

---

## 🐛 Troubleshooting

### Issue: "Bucket not found" error
**Solution:**
- Verify buckets are created in Supabase Storage
- Check bucket names are exactly: `school-logos` and `school-media`
- Make sure you're using the correct project

### Issue: "Permission denied" error
**Solution:**
- Verify buckets are set to "Public"
- Check that storage policies are created (Step 2)
- Make sure you're authenticated when uploading

### Issue: "File too large" error
**Solution:**
- Check file size limits in bucket settings
- Student/Staff photos: Max 5MB
- Gallery images: Max 10MB
- Compress images if needed

### Issue: "Invalid file type" error
**Solution:**
- Only image files are allowed (JPG, PNG, GIF, WEBP)
- Check file extension
- Verify MIME type is `image/*`

### Issue: Images not displaying
**Solution:**
- Verify bucket is set to "Public"
- Check that public read policy is created
- Verify the URL in database is correct
- Check browser console for errors

---

## 📝 Quick Reference

| Feature | Bucket | Max Size | Path Pattern |
|---------|--------|----------|--------------|
| School Logo | `school-logos` | 5 MB | `{school_code}/{school_code}-{timestamp}.{ext}` |
| Student Photo | `school-media` | 5 MB | `{school_code}/students/student-{admission_no}-{timestamp}.{ext}` |
| Staff Photo | `school-media` | 5 MB | `{school_code}/staff/staff-{staff_id}-{timestamp}.{ext}` |
| Gallery Image | `school-media` | 10 MB | `{school_code}/gallery/gallery-{school_code}-{timestamp}.{ext}` |

---

## 🎯 Summary

You've now:
1. ✅ Created 2 storage buckets (`school-logos` and `school-media`)
2. ✅ Set up security policies for uploads and public access
3. ✅ Added database columns to store photo URLs
4. ✅ Understood how files are organized and saved
5. ✅ Learned how to use the API endpoints

Your system is now ready to save and display photos for:
- 🏫 College/School logos
- 👨‍🎓 Student photos
- 👨‍🏫 Staff photos
- 🖼️ Gallery images

---

## 🚀 Next Steps

1. **Test the uploads** using the API endpoints
2. **Integrate upload UI** into your student and staff edit forms
3. **Display photos** in profile pages and directories
4. **Monitor storage usage** in Supabase dashboard

For more details, see:
- `SUPABASE_STORAGE_SETUP.md` - Detailed storage setup
- `GALLERY_AND_PHOTO_UPLOAD_COMPLETE.md` - Complete implementation guide
- `PHOTO_UPLOAD_IMPLEMENTATION.md` - Photo upload examples

