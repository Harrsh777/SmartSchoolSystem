-- Admin Employees (Super Admin & Internal Staff)
-- This schema defines internal admin employees who can manage one or more schools.

create table if not exists public.admin_employees (
  id uuid primary key default gen_random_uuid(),
  emp_id text unique not null,
  full_name text not null,
  email text null,
  password_hash text not null,
  created_at timestamp with time zone default now()
);

comment on table public.admin_employees is 'Internal admin employees who can manage one or more schools.';

create table if not exists public.employee_schools (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references admin_employees(id) on delete cascade,
  school_id uuid references accepted_schools(id) on delete cascade,
  unique (employee_id, school_id)
);

comment on table public.employee_schools is 'Mapping between admin employees and schools they can manage.';

-- Indexes
create index if not exists idx_admin_employees_emp_id on public.admin_employees(emp_id);
create index if not exists idx_employee_schools_employee on public.employee_schools(employee_id);
create index if not exists idx_employee_schools_school on public.employee_schools(school_id);

-- RLS (optional – enable and refine based on your auth model)
-- alter table public.admin_employees enable row level security;
-- alter table public.employee_schools enable row level security;


