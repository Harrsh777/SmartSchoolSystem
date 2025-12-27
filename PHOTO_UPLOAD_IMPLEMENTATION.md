# Photo Upload Implementation Guide

This guide explains how to implement photo uploads for students and staff in the Smart School ERP system.

## Database Schema Updates

Make sure your tables have the `photo_url` column:

### Students Table
```sql
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS photo_url text;
```

### Staff Table
```sql
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS photo_url text;
```

## API Endpoints

### Student Photo Upload
- **Endpoint**: `POST /api/students/photo`
- **Body**: FormData with:
  - `file`: Image file
  - `school_code`: School code
  - `student_id`: Student UUID
- **Response**: Returns `photo_url` and updated student data

### Staff Photo Upload
- **Endpoint**: `POST /api/staff/photo`
- **Body**: FormData with:
  - `file`: Image file
  - `school_code`: School code
  - `staff_id`: Staff UUID
- **Response**: Returns `photo_url` and updated staff data

## Implementation in Forms

### Example: Student Edit Form

```typescript
const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image size should be less than 5MB');
    return;
  }

  try {
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('school_code', schoolCode);
    formData.append('student_id', studentId);

    const response = await fetch('/api/students/photo', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (response.ok && result.data?.photo_url) {
      setPhotoUrl(result.data.photo_url);
      alert('Photo uploaded successfully!');
    } else {
      alert(result.error || 'Failed to upload photo');
    }
  } catch (err) {
    console.error('Error uploading photo:', err);
    alert('Failed to upload photo. Please try again.');
  } finally {
    setUploading(false);
  }
};

// In JSX:
<input
  type="file"
  accept="image/*"
  onChange={handlePhotoUpload}
  className="hidden"
  id="photo-upload"
/>
<label htmlFor="photo-upload" className="cursor-pointer">
  {uploading ? 'Uploading...' : 'Upload Photo'}
</label>
```

### Example: Staff Edit Form

Same implementation, but use `/api/staff/photo` endpoint and `staff_id` instead of `student_id`.

## Displaying Photos

### In Student/Staff Profile Cards

```tsx
{student.photo_url ? (
  <img
    src={student.photo_url}
    alt={student.student_name}
    className="w-32 h-32 rounded-full object-cover"
  />
) : (
  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
    <User size={48} className="text-gray-400" />
  </div>
)}
```

## File Organization in Storage

Files are organized in the `school-media` bucket as follows:

```
{school_code}/
  ├── students/
  │   └── student-{admission_no}-{timestamp}.{ext}
  └── staff/
      └── staff-{staff_id}-{timestamp}.{ext}
```

## Best Practices

1. **Always validate file type and size** before upload
2. **Show loading state** during upload
3. **Handle errors gracefully** with user-friendly messages
4. **Provide preview** before upload
5. **Use consistent image dimensions** for profile photos (e.g., 200x200px)
6. **Compress images** on the client side if possible (optional)

## Testing

1. Upload a valid image (JPG, PNG, etc.)
2. Verify the image appears in the profile
3. Test with invalid file types (should show error)
4. Test with files larger than 5MB (should show error)
5. Verify the image URL is saved in the database

