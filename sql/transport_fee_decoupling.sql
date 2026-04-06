-- Transport fee decoupling: MERGED (default, current behaviour) vs SEPARATE (standalone transport billing).
-- Run in Supabase SQL editor or your migration pipeline.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Per-school mode on fee configuration (toggle from Fee Configuration UI)
-- Some deployments may not have fee_configuration and/or accepted_schools in early bootstraps.
DO $$
BEGIN
  IF to_regclass('public.fee_configuration') IS NULL THEN
    IF to_regclass('public.accepted_schools') IS NOT NULL THEN
      EXECUTE '
        CREATE TABLE public.fee_configuration (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id UUID NOT NULL REFERENCES public.accepted_schools (id) ON DELETE CASCADE,
          school_code TEXT NOT NULL UNIQUE,
          transport_fee_mode TEXT NOT NULL DEFAULT ''MERGED'',
          transport_fee_mode_changed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )';
    ELSE
      EXECUTE '
        CREATE TABLE public.fee_configuration (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id UUID,
          school_code TEXT NOT NULL UNIQUE,
          transport_fee_mode TEXT NOT NULL DEFAULT ''MERGED'',
          transport_fee_mode_changed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.fee_configuration') IS NOT NULL THEN
    ALTER TABLE public.fee_configuration
      ADD COLUMN IF NOT EXISTS transport_fee_mode TEXT NOT NULL DEFAULT 'MERGED';

    ALTER TABLE public.fee_configuration
      ADD COLUMN IF NOT EXISTS transport_fee_mode_changed_at TIMESTAMPTZ;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fee_configuration_transport_fee_mode_check'
    ) THEN
      ALTER TABLE public.fee_configuration
        ADD CONSTRAINT fee_configuration_transport_fee_mode_check
        CHECK (transport_fee_mode IN ('MERGED', 'SEPARATE'));
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.fee_configuration') IS NOT NULL THEN
    COMMENT ON COLUMN public.fee_configuration.transport_fee_mode IS 'MERGED: transport on main student_fees + receipts. SEPARATE: transport_fee_payment_entries only.';
    COMMENT ON COLUMN public.fee_configuration.transport_fee_mode_changed_at IS 'Last time transport_fee_mode changed; used for auditing mode switches.';
  END IF;
END $$;

-- 2) Standalone transport payment ledger (separate from payments / student_fees)
CREATE TABLE IF NOT EXISTS public.transport_fee_payment_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.accepted_schools (id) ON DELETE CASCADE,
  school_code TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  route_id UUID REFERENCES public.transport_routes (id) ON DELETE SET NULL,
  period_month DATE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  reference_no TEXT,
  receipt_no TEXT NOT NULL,
  collected_by UUID REFERENCES public.staff (id) ON DELETE SET NULL,
  idempotency_key TEXT,
  is_manual_entry BOOLEAN NOT NULL DEFAULT false,
  transport_fee_mode_at_collection TEXT NOT NULL DEFAULT 'SEPARATE',
  remarks TEXT,
  receipt_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  period_breakdown JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT transport_fee_payment_entries_idempotency_unique UNIQUE (school_code, idempotency_key),
  CONSTRAINT transport_fee_payment_entries_receipt_unique UNIQUE (school_code, receipt_no)
);

CREATE INDEX IF NOT EXISTS idx_transport_fee_pay_student_month
  ON public.transport_fee_payment_entries (school_code, student_id, period_month);

CREATE INDEX IF NOT EXISTS idx_transport_fee_pay_school_created
  ON public.transport_fee_payment_entries (school_code, created_at DESC);

COMMENT ON TABLE public.transport_fee_payment_entries IS 'Transport fee collections when transport_fee_mode = SEPARATE; parallel to main fee payments.';

-- If the table already existed without period_breakdown:
ALTER TABLE public.transport_fee_payment_entries
  ADD COLUMN IF NOT EXISTS period_breakdown JSONB;

-- 3) Atomic transport receipt numbering (separate from academic fee receipts)
CREATE TABLE IF NOT EXISTS public.transport_receipt_counters (
  school_code TEXT NOT NULL,
  year INT NOT NULL,
  last_seq INT NOT NULL DEFAULT 0,
  PRIMARY KEY (school_code, year)
);

CREATE OR REPLACE FUNCTION public.generate_transport_receipt_number(p_school_code TEXT, p_year INT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  sc TEXT := upper(trim(p_school_code));
  seq INT;
BEGIN
  INSERT INTO public.transport_receipt_counters (school_code, year, last_seq)
  VALUES (sc, p_year, 1)
  ON CONFLICT (school_code, year) DO UPDATE
    SET last_seq = public.transport_receipt_counters.last_seq + 1
  RETURNING last_seq INTO seq;

  RETURN sc || '/TREC/' || p_year::TEXT || '/' || lpad(seq::TEXT, 5, '0');
END;
$$;
