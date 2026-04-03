'use client';

import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Lock, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (t: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const render = () => {
      if (!window.turnstile || !containerRef.current) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* noop */
        }
        widgetIdRef.current = null;
      }
      containerRef.current.innerHTML = '';
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        'error-callback': () => onToken(null),
        'expired-callback': () => onToken(null),
      });
    };

    if (window.turnstile) {
      render();
      return () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            /* noop */
          }
        }
        widgetIdRef.current = null;
        if (containerRef.current) containerRef.current.innerHTML = '';
      };
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = render;
    document.body.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* noop */
        }
      }
      widgetIdRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
      script.remove();
    };
  }, [siteKey, onToken]);

  return <div ref={containerRef} className="flex justify-center min-h-[65px]" />;
}

export default function AdminPasswordModal({ isOpen, onSuccess }: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(TURNSTILE_SITE_KEY ? null : '');
  const [turnstileReset, setTurnstileReset] = useState(0);

  const onTsToken = useCallback((t: string | null) => {
    setTurnstileToken(t);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Please complete the verification challenge.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          password,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        retryAfterSec?: number;
      };

      if (res.ok) {
        setPassword('');
        setTurnstileToken(TURNSTILE_SITE_KEY ? null : '');
        setTurnstileReset((n) => n + 1);
        onSuccess();
      } else {
        if (res.status === 429) {
          setError(
            data.retryAfterSec
              ? `Too many attempts. Retry after about ${Math.ceil(data.retryAfterSec / 60)} minutes.`
              : 'Too many attempts. Please try again later.'
          );
        } else if (res.status === 503) {
          setError(data.error || 'Admin login is not configured on the server.');
        } else {
          setError(data.error || 'Invalid credentials.');
        }
        setTurnstileToken(TURNSTILE_SITE_KEY ? null : '');
        setTurnstileReset((n) => n + 1);
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999]"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 glass-card border border-white/20 dark:border-white/10">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#2C3E50] dark:bg-[#3D5A80] flex items-center justify-center soft-shadow-lg">
                  <Shield className="text-white" size={28} />
                </div>
              </div>

              <h2 className="text-2xl font-serif font-bold text-center text-foreground mb-2">
                Admin Access Required
              </h2>
              <p className="text-sm text-center text-muted-foreground mb-6">
                Sign in with your super-admin password. Verification happens on the server only.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <Lock className="text-muted-foreground" size={18} />
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Password"
                    required
                    autoComplete="current-password"
                    className={`pl-12 pr-12 py-3 bg-card border-input text-foreground placeholder:text-muted-foreground focus:ring-primary/20 dark:focus:ring-accent/30 ${
                      error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                    }`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-20"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {TURNSTILE_SITE_KEY ? (
                  <TurnstileWidget
                    key={turnstileReset}
                    siteKey={TURNSTILE_SITE_KEY}
                    onToken={onTsToken}
                  />
                ) : null}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    >
                      <AlertCircle className="text-red-600 dark:text-red-400" size={18} />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={
                    loading || !password.trim() || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)
                  }
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="mr-2"
                      >
                        <Lock size={18} />
                      </motion.div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Lock size={18} className="mr-2" />
                      Access Admin Panel
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground mt-6 pt-6 border-t border-input">
                This is a secure area. Unauthorized access is prohibited.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
