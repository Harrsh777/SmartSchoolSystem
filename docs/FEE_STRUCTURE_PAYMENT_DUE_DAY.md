# Fee Structure: Payment Due Day & Late Fees

## Schema

If your `fee_structures` table does not have a `payment_due_day` column yet, run in Supabase SQL Editor:

```sql
ALTER TABLE public.fee_structures
  ADD COLUMN IF NOT EXISTS payment_due_day integer DEFAULT 15;

COMMENT ON COLUMN public.fee_structures.payment_due_day IS 'Day of month (1-31) by which payment is due; after this + grace period, late fee applies.';
```

## Behavior

- **Create / Edit structure:** Admin can set "Last date of payment (day of month)" (1–31). Default is 15.
- **Generate fees:** Each generated `student_fees` row gets a `due_date` set to that day in the corresponding period month (e.g. 10th of month). If the month has fewer days (e.g. February), the last day of the month is used.
- **Late fee:** After `due_date` + `grace_period_days`, late fee is calculated (flat / per_day / percentage) and included in pending amounts on the fees dashboard and in student fee views.

## Dashboard

- **Pending fees list** (Fee Management Dashboard): Includes late fee in the "Pending Amount" per student.
- **Due date:** Shown per student; overdue is highlighted when past due date.
