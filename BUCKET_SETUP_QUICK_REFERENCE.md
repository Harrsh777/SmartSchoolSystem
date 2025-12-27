# Quick Reference: Bucket Setup & Photo Uploads

## 🎯 Quick Setup (5 Minutes)

### 1. Create Buckets in Supabase Dashboard
```
Storage → New Bucket
├── school-logos (Public, 5MB)
└── school-media (Public, 10MB)
```

### 2. Run SQL Policies
```sql
-- Copy from BUCKET_SETUP_STEP_BY_STEP.md Step 2
```

### 3. Update Database
```sql
ALTER TABLE accepted_schools ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url text;
```

---

## 📤 Upload Endpoints

| Type | Endpoint | Bucket | Required Fields |
|------|----------|--------|----------------|
| **School Logo** | `POST /api/schools/upload-logo` | `school-logos` | `file`, `school_code` |
| **Student Photo** | `POST /api/students/photo` | `school-media` | `file`, `school_code`, `student_id` |
| **Staff Photo** | `POST /api/staff/photo` | `school-media` | `file`, `school_code`, `staff_id` |

---

## 📁 File Structure

```
school-logos/
└── SCH001/SCH001-1234567890.jpg

school-media/
└── SCH001/
    ├── students/student-ADM001-1234567890.jpg
    ├── staff/staff-STF001-1234567890.jpg
    └── gallery/gallery-SCH001-1234567890.jpg
```

---

## 💻 Code Examples

### Upload School Logo
```typescript
const formData = new FormData();
formData.append('file', logoFile);
formData.append('school_code', 'SCH001');

const res = await fetch('/api/schools/upload-logo', {
  method: 'POST',
  body: formData,
});
const data = await res.json();
// data.data.logo_url contains the image URL
```

### Upload Student Photo
```typescript
const formData = new FormData();
formData.append('file', photoFile);
formData.append('school_code', 'SCH001');
formData.append('student_id', studentId);

const res = await fetch('/api/students/photo', {
  method: 'POST',
  body: formData,
});
const data = await res.json();
// data.data.photo_url contains the image URL
```

### Upload Staff Photo
```typescript
const formData = new FormData();
formData.append('file', photoFile);
formData.append('school_code', 'SCH001');
formData.append('staff_id', staffId);

const res = await fetch('/api/staff/photo', {
  method: 'POST',
  body: formData,
});
const data = await res.json();
// data.data.photo_url contains the image URL
```

---

## ✅ Validation Rules

- **File Type**: Images only (`image/*`)
- **School Logo**: Max 5MB
- **Student Photo**: Max 5MB
- **Staff Photo**: Max 5MB
- **Gallery**: Max 10MB

---

## 🔍 Verify Setup

1. **Buckets**: Storage → See `school-logos` and `school-media`
2. **Policies**: SQL Editor → Check policies exist
3. **Columns**: Table Editor → Verify `logo_url`, `photo_url` columns exist
4. **Test**: Upload a file and check it appears in Storage

---

## 🐛 Common Issues

| Error | Solution |
|-------|----------|
| "Bucket not found" | Create buckets in Storage |
| "Permission denied" | Set buckets to Public, add policies |
| "File too large" | Compress image or check size limit |
| "Invalid file type" | Use image files only (JPG, PNG, etc.) |

---

For detailed instructions, see: `BUCKET_SETUP_STEP_BY_STEP.md`

