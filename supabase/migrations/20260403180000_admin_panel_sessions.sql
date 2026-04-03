-- Opaque sessions for the super-admin /admin UI (separate from school ERP sessions).
CREATE TABLE IF NOT EXISTS public.admin_panel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_panel_sessions_token ON public.admin_panel_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_admin_panel_sessions_expires ON public.admin_panel_sessions (expires_at);

COMMENT ON TABLE public.admin_panel_sessions IS 'HttpOnly-cookie backed sessions for /admin panel only; use service role from API routes.';
