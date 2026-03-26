-- Exam Term Structure Schema (safe migration)
-- Run in Supabase SQL editor.

-- 1) Terms table (class + section specific)
create table if not exists public.exam_term_structures (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.accepted_schools(id) on delete cascade,
  school_code text not null,
  name text not null,
  normalized_name text not null,
  slug text not null,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_by uuid null references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_exam_term_structures_school_name
  on public.exam_term_structures (school_id, normalized_name)
  where is_deleted = false;

create table if not exists public.exam_term_structure_mappings (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.exam_term_structures(id) on delete cascade,
  school_code text not null,
  class_id uuid not null references public.classes(id) on delete cascade,
  section text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_exam_term_structure_mapping
  on public.exam_term_structure_mappings (structure_id, class_id, section);

create table if not exists public.exam_terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.accepted_schools(id) on delete cascade,
  school_code text not null,
  class_id uuid not null references public.classes(id) on delete cascade,
  structure_id uuid null references public.exam_term_structures(id) on delete cascade,
  section text not null,
  name text not null,
  normalized_name text not null,
  slug text not null,
  serial integer not null check (serial > 0),
  academic_year text null,
  start_date date null,
  end_date date null,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_by uuid null references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Backward compatible column additions
alter table public.exam_terms add column if not exists name text;
alter table public.exam_terms add column if not exists normalized_name text;
alter table public.exam_terms add column if not exists slug text;
alter table public.exam_terms add column if not exists serial integer;
alter table public.exam_terms add column if not exists is_deleted boolean default false;
alter table public.exam_terms add column if not exists section text;
alter table public.exam_terms add column if not exists class_id uuid references public.classes(id) on delete cascade;
alter table public.exam_terms add column if not exists structure_id uuid references public.exam_term_structures(id) on delete cascade;

-- Backfill for old rows
do $$
declare
  has_name boolean;
  has_term_name boolean;
  has_term_order boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'exam_terms' and column_name = 'name'
  ) into has_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'exam_terms' and column_name = 'term_name'
  ) into has_term_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'exam_terms' and column_name = 'term_order'
  ) into has_term_order;

  -- Fill `name` from old `term_name` when needed.
  if has_term_name then
    execute $q$
      update public.exam_terms
      set name = coalesce(nullif(trim(name), ''), nullif(trim(term_name), ''), 'Term')
      where name is null or trim(name) = ''
    $q$;
  else
    execute $q$
      update public.exam_terms
      set name = coalesce(nullif(trim(name), ''), 'Term')
      where name is null or trim(name) = ''
    $q$;
  end if;

  -- normalized_name
  execute $q$
    update public.exam_terms
    set normalized_name = lower(trim(coalesce(name, 'Term')))
    where normalized_name is null or trim(normalized_name) = ''
  $q$;

  -- slug
  execute $q$
    update public.exam_terms
    set slug = regexp_replace(coalesce(normalized_name, lower(trim(coalesce(name, 'term')))), '[^a-z0-9]+', '-', 'g')
    where slug is null or trim(slug) = ''
  $q$;

  -- serial
  if has_term_order then
    execute $q$
      update public.exam_terms
      set serial = coalesce(serial, term_order, 1)
      where serial is null
    $q$;
  else
    execute $q$
      update public.exam_terms
      set serial = coalesce(serial, 1)
      where serial is null
    $q$;
  end if;
end $$;

-- 3) Uniqueness and indexes
create unique index if not exists uq_exam_terms_school_class_section_name
  on public.exam_terms (school_id, class_id, section, normalized_name)
  where is_deleted = false;

create index if not exists idx_exam_terms_school_code_serial
  on public.exam_terms (school_code, serial);

create index if not exists idx_exam_terms_class_section
  on public.exam_terms (class_id, section);

create index if not exists idx_exam_terms_structure_serial
  on public.exam_terms (structure_id, serial);

create table if not exists public.exam_term_exams (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.exam_terms(id) on delete cascade,
  exam_name text not null,
  serial integer not null default 1,
  weightage numeric(5,2) not null default 0 check (weightage >= 0 and weightage <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.exam_term_exams
  add column if not exists weightage numeric(5,2) not null default 0;

create unique index if not exists uq_exam_term_exams_term_name
  on public.exam_term_exams (term_id, lower(exam_name));

-- 4) Link exams -> terms (nullable for old exams)
alter table public.examinations
  add column if not exists term_id uuid null references public.exam_terms(id) on delete set null;

create index if not exists idx_examinations_term_id on public.examinations(term_id);

-- Optional practical uniqueness (same exam name in same term per school)
create unique index if not exists uq_exam_name_within_term_school
  on public.examinations (school_code, term_id, lower(exam_name))
  where term_id is not null;

-- 5) Mapping / filter performance
create index if not exists idx_exam_class_mappings_exam_class
  on public.exam_class_mappings (exam_id, class_id);

create index if not exists idx_exam_subject_mappings_exam_class_subject
  on public.exam_subject_mappings (exam_id, class_id, subject_id);

-- 6) Schedule conflict helper indexes
-- Note: Strong DB overlap prevention requires class_id/section in exam_schedules.
-- Current code enforces overlap checks at application level.
create index if not exists idx_exam_schedules_exam_date_time
  on public.exam_schedules (exam_id, exam_date, start_time, end_time);

