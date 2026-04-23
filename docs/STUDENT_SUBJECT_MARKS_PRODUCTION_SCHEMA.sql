
begin;

update public.student_subject_marks
set marks_obtained = round(marks_obtained::numeric)::integer
where marks_obtained::text like '%.%';

update public.student_subject_marks
set max_marks = round(max_marks::numeric)::integer
where max_marks::text like '%.%';

-- ----------------------------------------
-- B) Enforce canonical columns and defaults
-- ----------------------------------------
alter table public.student_subject_marks
  alter column exam_id set not null,
  alter column student_id set not null,
  alter column subject_id set not null,
  alter column class_id set not null,
  alter column school_id set not null,
  alter column school_code set not null,
  alter column max_marks set not null,
  alter column marks_obtained set not null,
  alter column entered_by set not null,
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now(),
  alter column status set not null,
  alter column status set default 'draft';

-- ----------------------------------------
-- C) Drop known duplicate/redundant constraints
-- ----------------------------------------
alter table public.student_subject_marks
  drop constraint if exists student_subject_marks_unique,
  drop constraint if exists student_subject_marks_exam_id_fkey,
  drop constraint if exists student_subject_marks_student_id_fkey,
  drop constraint if exists student_subject_marks_subject_id_fkey,
  drop constraint if exists student_subject_marks_class_id_fkey,
  drop constraint if exists student_subject_marks_school_id_fkey,
  drop constraint if exists student_subject_marks_entered_by_fkey,
  drop constraint if exists student_subject_marks_max_check,
  drop constraint if exists student_subject_marks_obtained_check,
  drop constraint if exists ssm_marks_non_negative_without_absent_code_chk,
  drop constraint if exists ssm_absent_code_zero_marks_chk;

-- ----------------------------------------
-- D) Add canonical constraints (if missing)
-- ----------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ssm_exam_student_subject_uniq') then
    alter table public.student_subject_marks
      add constraint ssm_exam_student_subject_uniq
      unique (exam_id, student_id, subject_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ssm_max_marks_positive_chk') then
    alter table public.student_subject_marks
      add constraint ssm_max_marks_positive_chk
      check (max_marks > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ssm_marks_non_negative_chk') then
    alter table public.student_subject_marks
      add constraint ssm_marks_non_negative_chk
      check (marks_obtained >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ssm_marks_within_max_chk') then
    alter table public.student_subject_marks
      add constraint ssm_marks_within_max_chk
      check (marks_obtained <= max_marks);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ssm_status_chk') then
    alter table public.student_subject_marks
      add constraint ssm_status_chk
      check (status in ('draft', 'submitted', 'approved', 'rejected'));
  end if;
end $$;

-- ----------------------------------------
-- E) Canonical foreign keys (single relation each)
-- ----------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ssm_exam_fk') then
    alter table public.student_subject_marks
      add constraint ssm_exam_fk
      foreign key (exam_id) references public.examinations(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ssm_student_fk') then
    alter table public.student_subject_marks
      add constraint ssm_student_fk
      foreign key (student_id) references public.students(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ssm_subject_fk') then
    alter table public.student_subject_marks
      add constraint ssm_subject_fk
      foreign key (subject_id) references public.subjects(id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ssm_class_fk') then
    alter table public.student_subject_marks
      add constraint ssm_class_fk
      foreign key (class_id) references public.classes(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ssm_school_fk') then
    alter table public.student_subject_marks
      add constraint ssm_school_fk
      foreign key (school_id) references public.accepted_schools(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ssm_entered_by_fk') then
    alter table public.student_subject_marks
      add constraint ssm_entered_by_fk
      foreign key (entered_by) references public.staff(id) on delete restrict;
  end if;
end $$;

-- ----------------------------------------
-- F) Keep only canonical indexes
-- ----------------------------------------
drop index if exists public.idx_student_subject_marks_exam_id;
drop index if exists public.idx_student_subject_marks_student_id;
drop index if exists public.idx_student_subject_marks_subject_id;
drop index if exists public.idx_student_subject_marks_school_code;

create index if not exists idx_ssm_school_exam_class
  on public.student_subject_marks (school_code, exam_id, class_id);

create index if not exists idx_ssm_exam_student
  on public.student_subject_marks (exam_id, student_id);

create index if not exists idx_ssm_exam_subject
  on public.student_subject_marks (exam_id, subject_id);

create index if not exists idx_ssm_school_exam_status
  on public.student_subject_marks (school_code, exam_id, status);

-- ----------------------------------------
-- G) Keep single updated_at trigger
-- ----------------------------------------
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_student_subject_marks_updated_at on public.student_subject_marks;
drop trigger if exists trg_ssm_set_updated_at on public.student_subject_marks;
create trigger trg_ssm_set_updated_at
before update on public.student_subject_marks
for each row
execute function public.set_updated_at_timestamp();

commit;
