'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';

type SessionRow = {
  slotKey: string;
  active: boolean;
  valid: boolean;
  redirectTo: string | null;
  label: string;
  role?: string;
  schoolCode?: string | null;
};

export default function RoleSessionSwitcher({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/sessions', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions.filter((s: SessionRow) => s.valid && s.redirectTo));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  if (sessions.length <= 1) {
    return null;
  }

  const switchTo = async (slotKey: string, redirectTo: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/switch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.redirectTo) {
        window.location.assign(data.redirectTo as string);
        return;
      }
      window.location.assign(redirectTo);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-[#1e3a8a] bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors disabled:opacity-60"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Users size={16} className="shrink-0" />
        <span className="hidden sm:inline">Switch role</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <ul
            className="absolute right-0 mt-1 z-50 min-w-[220px] max-w-[min(320px,calc(100vw-2rem))] py-1 rounded-lg border border-[#E1E1DB] bg-white shadow-lg"
            role="listbox"
          >
            {sessions.map((s) => (
              <li key={s.slotKey}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s.active}
                  disabled={loading || s.active || !s.redirectTo}
                  onClick={() => s.redirectTo && switchTo(s.slotKey, s.redirectTo)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[#EFF6FF] disabled:opacity-50 ${
                    s.active ? 'font-semibold text-[#1e3a8a] bg-[#F0F9FF]' : 'text-[#334155]'
                  }`}
                >
                  {s.label}
                  {s.active ? ' (current)' : ''}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
