# Subjects – Scholastic / Non-Scholastic Category (Optional)

Add an optional category to the `subjects` table so each subject can be marked as **Scholastic** or **Non-Scholastic**. Run in Supabase SQL Editor:

```sql
-- Add optional category: 'scholastic' | 'non_scholastic' (NULL = not set)
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS category TEXT NULL;

-- Optional: constrain values (comment out if you prefer no constraint)
-- ALTER TABLE public.subjects
-- ADD CONSTRAINT subjects_category_check
-- CHECK (category IS NULL OR category IN ('scholastic', 'non_scholastic'));

-- Optional index if you filter by category
CREATE INDEX IF NOT EXISTS idx_subjects_category ON public.subjects(category) WHERE category IS NOT NULL;
```

- **category** = `NULL` → not set (optional)
- **category** = `'scholastic'` → Scholastic
- **category** = `'non_scholastic'` → Non-Scholastic

Existing rows stay unchanged (category remains NULL until edited).
