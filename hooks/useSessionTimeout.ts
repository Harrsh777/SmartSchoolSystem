import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { markUserInteraction } from '@/lib/api-interceptor';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onLogout?: () => void;
  loginPath?: string;
  /** e.g. 'teacher' or 'admin' – uses lastActivity_<prefix> so timers don't cross-reset */
  storageKeyPrefix?: string;
}

const LAST_ACTIVITY_KEY_BASE = 'lastActivity';
const MIN_ACTIVITY_INTERVAL_MS = 5 * 1000; // Only update activity if 5+ seconds have passed

function getStorageKey(prefix?: string): string {
  return prefix ? `${LAST_ACTIVITY_KEY_BASE}_${prefix}` : LAST_ACTIVITY_KEY_BASE;
}

/**
 * Updates the last activity timestamp in localStorage.
 * Use the same prefix as the hook so teacher/admin timers don't cross-reset.
 * Throttled to prevent rapid resets from background API calls.
 * @param force - when true (e.g. from click/keydown), always update so session stays alive
 */
export function updateActivity(storageKeyPrefix?: string, force?: boolean): void {
  if (typeof window === 'undefined') return;
  const key = getStorageKey(storageKeyPrefix);

  const lastActivity = getLastActivity(key);
  const now = Date.now();

  if (lastActivity === null) {
    localStorage.setItem(key, now.toString());
    return;
  }

  if (force) {
    localStorage.setItem(key, now.toString());
    return;
  }

  const timeSinceLastActivity = now - lastActivity;
  if (timeSinceLastActivity >= MIN_ACTIVITY_INTERVAL_MS) {
    localStorage.setItem(key, now.toString());
  }
}

/** Extension window: only in the last 2 minutes can activity extend the session (by 2 min). */
const EXTEND_WINDOW_SECONDS = 2 * 60;

/**
 * Extends the session by 2 minutes. Call only when remaining time is <= 2 min.
 * Sets lastActivity so that remaining = 2 min (not full 20 min).
 */
export function extendSessionBy2Min(storageKeyPrefix?: string, timeoutMinutes: number = 20): void {
  if (typeof window === 'undefined') return;
  const key = getStorageKey(storageKeyPrefix);
  const sessionLimitMs = timeoutMinutes * 60 * 1000;
  const extendWindowMs = EXTEND_WINDOW_SECONDS * 1000;
  const now = Date.now();
  const lastActivity = now - (sessionLimitMs - extendWindowMs);
  localStorage.setItem(key, lastActivity.toString());
}

/**
 * Gets the last activity timestamp from localStorage.
 * Returns null if no activity has been recorded.
 */
export function getLastActivity(storageKey?: string): number | null {
  if (typeof window === 'undefined') return null;
  const key = storageKey ?? LAST_ACTIVITY_KEY_BASE;
  const stored = localStorage.getItem(key);
  return stored ? Number(stored) : null;
}

/**
 * Simple, accurate session timeout hook
 * Uses timestamp-based calculation to avoid drift
 * Tracks: click, keydown, and successful API calls
 */
export function useSessionTimeout({
  timeoutMinutes = 20,
  warningMinutes = 19,
  onLogout,
  loginPath = '/login',
  storageKeyPrefix,
}: UseSessionTimeoutOptions = {}) {
  const router = useRouter();
  const key = getStorageKey(storageKeyPrefix);
  const sessionLimitMs = timeoutMinutes * 60 * 1000;

  // Initialize timeRemaining from actual remaining time in localStorage so the timer
  // never "resets" to 20:00 on remount (e.g. navigation or Strict Mode).
  // If no activity or expired, show full 20:00; useEffect will set activity or logout.
  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (typeof window === 'undefined') return timeoutMinutes * 60;
    const last = getLastActivity(key);
    if (!last) return timeoutMinutes * 60;
    const elapsed = Date.now() - last;
    const remaining = sessionLimitMs - elapsed;
    const seconds = Math.max(0, Math.floor(remaining / 1000));
    // If already expired, show full time so we don't flash 00:00; useEffect will logout
    if (seconds <= 0) return timeoutMinutes * 60;
    return seconds;
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkSessionRef = useRef<(() => void) | null>(null);
  const resetTimerRef = useRef<(() => void) | null>(null);
  const loggingOutRef = useRef(false);
  const [showWarning, setShowWarning] = useState(false);
  const warningThresholdSeconds = Math.max(1, EXTEND_WINDOW_SECONDS); // Show warning when <= 2 min left
  const timeRemainingRef = useRef(timeoutMinutes * 60); // Keep current remaining for activity handlers

  const handleLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setShowWarning(false);
    if (typeof window !== 'undefined') {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      localStorage.removeItem(key);
      sessionStorage.clear();
    }
    if (onLogout) onLogout();
    router.push(loginPath);
  }, [onLogout, loginPath, router, key]);

  const resetTimer = useCallback(() => {
    extendSessionBy2Min(storageKeyPrefix, timeoutMinutes);
    setShowWarning(false);
  }, [storageKeyPrefix, timeoutMinutes]);

  // Only when <= 2 min left: on user interaction, extend session by 2 min (don't reset on every cursor move before that)
  const tryExtendInLast2Min = useCallback(() => {
    if (timeRemainingRef.current <= EXTEND_WINDOW_SECONDS && timeRemainingRef.current > 0) {
      extendSessionBy2Min(storageKeyPrefix, timeoutMinutes);
      setShowWarning(false);
    }
  }, [storageKeyPrefix, timeoutMinutes]);

  const checkSession = useCallback(() => {
    if (loggingOutRef.current) return;
    const lastActivity = getLastActivity(key);
    if (!lastActivity) {
      updateActivity(storageKeyPrefix);
      setTimeRemaining(timeoutMinutes * 60);
      setShowWarning(false);
      return;
    }
    const elapsed = Date.now() - lastActivity;
    const remaining = sessionLimitMs - elapsed;
    const secondsRemaining = Math.max(0, Math.floor(remaining / 1000));
    timeRemainingRef.current = secondsRemaining;
    setTimeRemaining(secondsRemaining);
    if (secondsRemaining <= warningThresholdSeconds && secondsRemaining > 0) {
      setShowWarning(true);
    } else if (secondsRemaining > warningThresholdSeconds) {
      setShowWarning(false);
    }
    if (elapsed >= sessionLimitMs) {
      handleLogout();
    }
  }, [sessionLimitMs, handleLogout, timeoutMinutes, key, storageKeyPrefix]);

  checkSessionRef.current = checkSession;
  resetTimerRef.current = tryExtendInLast2Min;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lastActivity = getLastActivity(key);
    const elapsed = lastActivity ? Date.now() - lastActivity : sessionLimitMs + 1;
    const expired = elapsed >= sessionLimitMs;
    // Set last activity when none exists so timer starts at 20:00
    if (!lastActivity) {
      updateActivity(storageKeyPrefix);
    }
    // If already expired on load, run checkSession once (will trigger handleLogout) and skip setting interval
    if (expired) {
      if (checkSessionRef.current) checkSessionRef.current();
      return () => {};
    }

    // Check session status every second
    const checkSessionWrapper = () => {
      if (checkSessionRef.current) {
        checkSessionRef.current();
      }
    };
    checkSessionWrapper(); // Initial check
    intervalRef.current = setInterval(checkSessionWrapper, 1000);

    // Only in the last 2 min: extend session by 2 min on interaction (fixed 20 min otherwise)
    const onActivity = () => {
      markUserInteraction();
      if (resetTimerRef.current) resetTimerRef.current();
    };

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let mouseTimeout: ReturnType<typeof setTimeout> | null = null;
    const throttleMs = 3000;
    const onScroll = () => {
      if (!scrollTimeout) {
        if (resetTimerRef.current) resetTimerRef.current();
        scrollTimeout = setTimeout(() => { scrollTimeout = null; }, throttleMs);
      }
    };
    const onMouseMove = () => {
      if (!mouseTimeout) {
        if (resetTimerRef.current) resetTimerRef.current();
        mouseTimeout = setTimeout(() => { mouseTimeout = null; }, throttleMs);
      }
    };

    window.addEventListener('click', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (mouseTimeout) clearTimeout(mouseTimeout);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run once on mount

  return {
    showWarning,
    timeRemaining,
    handleLogout,
    resetTimer,
  };
}
