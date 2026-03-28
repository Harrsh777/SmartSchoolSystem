-- Non-scholastic (co-scholastic) grades per term, per student, per subject.
-- Subjects must have category = 'non_scholastic' and be assigned via class_subjects.
-- Run in Supabase SQL Editor.

create table if not exists public.non_scholastic_marks (
  id uuid primary key default gen_random_uuid(),
  school_code text not null,
  term_id uuid not null,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  grade text null,
  added_by uuid null references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (term_id, student_id, subject_id)
);

create index if not exists idx_non_scholastic_marks_lookup
  on public.non_scholastic_marks (school_code, class_id, term_id);

create index if not exists idx_non_scholastic_marks_student
  on public.non_scholastic_marks (school_code, student_id);

comment on table public.non_scholastic_marks is 'Grades for non-scholastic subjects; report card Part II Term-I / Term-II columns.';
