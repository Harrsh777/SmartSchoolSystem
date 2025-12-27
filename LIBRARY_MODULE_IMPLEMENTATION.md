# Library Management Module - Implementation Guide

## ✅ Completed Components

### 1. Database Schema
- ✅ `supabase_library_schema.sql` - Complete schema with all tables
- ✅ RLS policies for security
- ✅ Indexes for performance
- ✅ Triggers for updated_at

### 2. API Routes Created
- ✅ `/api/library/settings` - GET, POST (library configuration)
- ✅ `/api/library/sections` - GET, POST (sections management)
- ✅ `/api/library/sections/[id]` - PATCH, DELETE
- ✅ `/api/library/material-types` - GET, POST (material types)
- ✅ `/api/library/material-types/[id]` - PATCH, DELETE
- ✅ `/api/library/books` - GET, POST (book catalogue)
- ✅ `/api/library/books/[id]` - GET, PATCH, DELETE
- ✅ `/api/library/books/available` - GET (available copies)
- ✅ `/api/library/transactions` - GET, POST (issue/return)
- ✅ `/api/library/transactions/[id]/return` - POST (return book)
- ✅ `/api/library/borrower/check` - GET (check eligibility)
- ✅ `/api/library/stats` - GET (analytics)

### 3. UI Pages Created
- ✅ `/dashboard/[school]/library/page.tsx` - Main library page with 4 sections
- ✅ `/dashboard/[school]/library/basics/page.tsx` - Library Basics (Configuration)

### 4. Dashboard Integration
- ✅ Library button already in dashboard sidebar
- ✅ Permission check: `manage_library`

## 📋 Remaining Pages to Create

### 1. Catalogue Page (`/dashboard/[school]/library/catalogue/page.tsx`)
**Features needed:**
- Book table with search and filters
- Add/Edit book modal
- Bulk upload/download
- Generate barcode
- Show available/total copies

**Key components:**
- Book list table
- Add book form
- Edit book form
- Bulk upload modal
- Barcode generator

### 2. Transactions Page (`/dashboard/[school]/library/transactions/page.tsx`)
**Features needed:**
- Filters (academic year, class, section, date range, type)
- Tabs for Students and Staff
- Issue book flow
- Return book flow
- Transaction table
- Fine calculation

**Key components:**
- Transaction table
- Issue book modal
- Return book modal
- Borrower search
- Fine calculator

### 3. Library Dashboard (`/dashboard/[school]/library/dashboard/page.tsx`)
**Features needed:**
- Statistics cards (Total Books, Available, Issued, Overdue)
- Charts (Issue frequency, Section usage, Student vs Staff)
- Most issued books list
- Monthly trend chart

**Key components:**
- Stats cards
- Charts (using recharts)
- Data tables

## 🗄️ Database Setup

### Step 1: Run Schema
```sql
-- Run supabase_library_schema.sql in Supabase SQL Editor
```

### Step 2: Verify Tables
- `library_settings`
- `library_sections`
- `library_material_types`
- `library_books`
- `library_book_copies`
- `library_transactions`

## 🔐 Permission Setup

Ensure `manage_library` permission exists in your `permissions` table:

```sql
INSERT INTO permissions (key, description) 
VALUES ('manage_library', 'Manage library books, transactions, and settings')
ON CONFLICT (key) DO NOTHING;
```

## 📝 API Usage Examples

### Get Library Settings
```typescript
const response = await fetch(`/api/library/settings?school_code=${schoolCode}`);
const { data } = await response.json();
```

### Create Book
```typescript
const response = await fetch('/api/library/books', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    school_code: 'SCH001',
    title: 'Introduction to Physics',
    author: 'John Doe',
    publisher: 'ABC Publishers',
    isbn: '978-1234567890',
    edition: '3rd',
    section_id: sectionId,
    material_type_id: materialTypeId,
    total_copies: 5,
  }),
});
```

### Issue Book
```typescript
const response = await fetch('/api/library/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    school_code: 'SCH001',
    borrower_type: 'student',
    borrower_id: studentId,
    book_copy_id: copyId,
    book_id: bookId,
    issued_by: staffId,
  }),
});
```

### Return Book
```typescript
const response = await fetch(`/api/library/transactions/${transactionId}/return`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    school_code: 'SCH001',
    fine_amount: 0, // Auto-calculated if not provided
    fine_reason: null, // 'late', 'lost', 'damaged'
    returned_by: staffId,
  }),
});
```

### Check Borrower Eligibility
```typescript
const response = await fetch(
  `/api/library/borrower/check?school_code=${schoolCode}&borrower_type=student&borrower_id=${studentId}`
);
const { data } = await response.json();
// data.canBorrow, data.currentBooksCount, data.maxBooksAllowed
```

## 🎨 UI Components Needed

### Reusable Components to Create:
1. **BookTable** - Display books with filters
2. **TransactionTable** - Display transactions
3. **IssueBookModal** - Issue book form
4. **ReturnBookModal** - Return book form
5. **BorrowerSearch** - Search students/staff
6. **FineCalculator** - Calculate fines
7. **StatsCard** - Display statistics
8. **LibraryChart** - Display charts

## 🔄 Business Logic

### Issue Book Flow:
1. Search borrower (student/staff)
2. Check eligibility (max books limit)
3. Select book from catalogue
4. Check available copies
5. Select specific copy
6. Auto-calculate due date
7. Create transaction
8. Update copy status

### Return Book Flow:
1. Find active transaction
2. Calculate fine (if overdue)
3. Check for damage/loss
4. Update transaction status
5. Update copy status to available
6. Record fine amount

### Fine Calculation:
- **Late Fine**: Days overdue × per-day rate OR fixed amount
- **Lost Book**: Lost book fine from settings
- **Damaged Book**: Damaged book fine from settings

## 🧪 Testing Checklist

- [ ] Library Basics: Save settings, add/edit/delete sections and types
- [ ] Catalogue: Add book, create copies, search/filter
- [ ] Transactions: Issue book, return book, calculate fines
- [ ] Dashboard: View stats, charts, most issued books
- [ ] Permissions: Verify only authorized users can access
- [ ] Edge cases: Max books limit, no available copies, overdue calculation

## 📚 Next Steps

1. **Create Catalogue Page** - Full book management UI
2. **Create Transactions Page** - Issue/return functionality
3. **Create Library Dashboard** - Analytics and charts
4. **Add Bulk Upload** - Excel import for books
5. **Add Barcode Generation** - Generate barcodes for copies
6. **Add Reports** - Generate library reports

## 🐛 Common Issues & Solutions

### Issue: "Permission denied"
- **Solution**: Ensure user has `manage_library` permission assigned

### Issue: "Book copy not available"
- **Solution**: Check copy status before issuing

### Issue: "Maximum books reached"
- **Solution**: Check borrower's active transactions count

### Issue: "Fine calculation incorrect"
- **Solution**: Verify library settings (per-day vs fixed fine)

## 📖 Documentation

All API routes include:
- Permission checks
- Error handling
- Input validation
- Proper status codes

All UI pages include:
- Loading states
- Error messages
- Success notifications
- Form validation

---

**Status**: Core infrastructure complete. Remaining: Catalogue, Transactions, and Dashboard UI pages.

