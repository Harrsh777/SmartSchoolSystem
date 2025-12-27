# Troubleshooting: Logo Upload Failed

If you're getting "Failed to upload logo" error, follow these steps:

## 🔍 Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Try uploading the logo again
4. Look for any error messages - they will show the exact issue

## ✅ Step 2: Verify Bucket Exists

The most common issue is that the `school-logos` bucket doesn't exist.

### Check in Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in the left sidebar
4. Look for a bucket named `school-logos`

### If it doesn't exist, create it:
1. Click **"New bucket"**
2. **Bucket name**: `school-logos` (exactly this name)
3. **Public bucket**: ✅ Check this box (IMPORTANT!)
4. **File size limit**: 5 MB
5. Click **"Create bucket"**

## 🔐 Step 3: Verify Storage Policies

Storage policies control who can upload files. Run this SQL in Supabase SQL Editor:

```sql
-- Check if policies exist
SELECT * FROM storage.policies 
WHERE bucket_id = 'school-logos';

-- If no policies exist, create them:
CREATE POLICY "Allow authenticated users to upload school logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'school-logos');

CREATE POLICY "Allow public read access to school logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'school-logos');
```

## 🔑 Step 4: Check Environment Variables

The API uses a service role key for server-side uploads. Verify these are set:

1. Check your `.env.local` file (in the project root)
2. Make sure you have:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **To find your service role key:**
   - Go to Supabase Dashboard → Your Project
   - Click **Settings** (gear icon) → **API**
   - Scroll down to find **service_role** key
   - Copy it and add to `.env.local`

4. **Restart your development server** after adding environment variables:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

## 📋 Step 5: Check Database Column

Make sure the `logo_url` column exists in the `accepted_schools` table:

```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'accepted_schools' 
AND column_name = 'logo_url';

-- If it doesn't exist, add it:
ALTER TABLE accepted_schools 
ADD COLUMN IF NOT EXISTS logo_url text;
```

## 🧪 Step 6: Test Upload Manually

Test if the bucket works by uploading a file manually in Supabase:

1. Go to Supabase Dashboard → Storage
2. Click on `school-logos` bucket
3. Click **"Upload file"**
4. Upload a test image
5. If this works, the bucket is set up correctly

## 🐛 Common Error Messages & Solutions

### Error: "Bucket not found" or "The resource was not found"
**Solution**: Create the `school-logos` bucket (see Step 2)

### Error: "new row violates row-level security policy" or "permission denied"
**Solution**: 
- Set bucket to **Public**
- Create storage policies (see Step 3)
- Make sure you're using service role key in API

### Error: "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
**Solution**: Add the service role key to `.env.local` (see Step 4)

### Error: "School not found"
**Solution**: 
- Verify the school code is correct
- Check that the school exists in `accepted_schools` table

### Error: "File size must be less than 5MB"
**Solution**: Compress your image or use a smaller file

### Error: "File must be an image"
**Solution**: Use image files only (JPG, PNG, GIF, WEBP)

## 🔄 Step 7: Clear Cache and Retry

1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh the page (Ctrl+F5)
3. Try uploading again

## 📞 Still Not Working?

If none of the above works:

1. **Check the server logs** (terminal where you run `npm run dev`)
   - Look for error messages when you try to upload
   - Copy the full error message

2. **Check Network tab** in browser DevTools:
   - Go to **Network** tab
   - Try uploading
   - Click on the `/api/schools/upload-logo` request
   - Check the **Response** tab for error details

3. **Verify Supabase connection**:
   - Make sure your Supabase project is active
   - Check that your API keys are correct
   - Verify you have internet connection

## ✅ Quick Checklist

Before reporting an issue, verify:

- [ ] `school-logos` bucket exists in Supabase Storage
- [ ] Bucket is set to **Public**
- [ ] Storage policies are created
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local`
- [ ] Development server was restarted after adding env vars
- [ ] `logo_url` column exists in `accepted_schools` table
- [ ] File is an image and less than 5MB
- [ ] School code is correct

## 🎯 Expected Behavior

When working correctly:
1. Click "Upload Logo" button
2. Select an image file
3. Button shows "Uploading..." with spinner
4. Success message appears: "Logo uploaded successfully!"
5. Logo image appears in the preview area
6. Logo persists after page refresh

---

**Need more help?** Check the detailed setup guide: `BUCKET_SETUP_STEP_BY_STEP.md`

