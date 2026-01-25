import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { markUserInteraction } from '@/lib/api-interceptor';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onLogout?: () => void;
  loginPath?: string;
}

const LAST_ACTIVITY_KEY = 'lastActivity';
const SESSION_LIMIT_MS = 20 * 60 * 1000; // 20 minutes
const WARNING_LIMIT_MS = 19 * 60 * 1000; // 19 minutes (1 minute before timeout)
const MIN_ACTIVITY_INTERVAL_MS = 5 * 1000; // Only update activity if 5+ seconds have passed

/**
 * Updates the last activity timestamp in localStorage
 * This is called on user activity (click, keydown, successful API calls)
 * Throttled to prevent rapid resets from background API calls
 */
export function updateActivity(): void {
  if (typeof window === 'undefined') return;
  
  const lastActivity = getLastActivity();
  const now = Date.now();
  
  // If no last activity recorded, set it now
  if (lastActivity === null) {
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    return;
  }
  
  const timeSinceLastActivity = now - lastActivity;
  
  // Only update if enough time has passed (throttle rapid updates)
  // This prevents background API calls from constantly resetting the timer
  if (timeSinceLastActivity >= MIN_ACTIVITY_INTERVAL_MS) {
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  }
}

/**
 * Gets the last activity timestamp from localStorage
 * Returns null if no activity has been recorded
 */
function getLastActivity(): number | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
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
}: UseSessionTimeoutOptions = {}) {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkSessionRef = useRef<(() => void) | null>(null);
  const resetTimerRef = useRef<(() => void) | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeoutMinutes * 60);
  
  const sessionLimitMs = timeoutMinutes * 60 * 1000;
  const warningLimitMs = warningMinutes * 60 * 1000;

  const handleLogout = useCallback(() => {
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setShowWarning(false);
    
    // Clear storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      sessionStorage.clear();
    }
    
    // Call custom logout handler if provided
    if (onLogout) {
      onLogout();
    }
    
    // Redirect to login
    router.push(loginPath);
  }, [onLogout, loginPath, router]);

  const resetTimer = useCallback(() => {
    // Update last activity timestamp (with throttling)
    updateActivity();
    setShowWarning(false);
  }, []);

  // Check session status based on timestamp
  const checkSession = useCallback(() => {
    const lastActivity = getLastActivity();
    
    // If no activity recorded, initialize it now
    if (!lastActivity) {
      updateActivity();
      setTimeRemaining(timeoutMinutes * 60);
      setShowWarning(false);
      return;
    }
    
    const elapsed = Date.now() - lastActivity;
    const remaining = sessionLimitMs - elapsed;
    const secondsRemaining = Math.max(0, Math.floor(remaining / 1000));
    
    setTimeRemaining(secondsRemaining);

    // Show warning when 1 minute or less remaining
    if (secondsRemaining <= 60 && secondsRemaining > 0) {
      setShowWarning(true);
    } else if (secondsRemaining > 60) {
      setShowWarning(false);
    }

    // Logout when time expires
    if (elapsed >= sessionLimitMs) {
      handleLogout();
    }
  }, [sessionLimitMs, handleLogout, timeoutMinutes]);

  // Store latest callbacks in refs
  checkSessionRef.current = checkSession;
  resetTimerRef.current = resetTimer;

  useEffect(() => {
    // Initialize: set last activity if not exists or expired
    if (typeof window !== 'undefined') {
      const lastActivity = getLastActivity();
      const now = Date.now();
      
      // If no activity recorded or session expired, initialize fresh
      if (!lastActivity || (lastActivity && (now - lastActivity) > sessionLimitMs)) {
        updateActivity();
      }
    }

    // Check session status every second
    // Use ref to access latest checkSession without re-running effect
    const checkSessionWrapper = () => {
      if (checkSessionRef.current) {
        checkSessionRef.current();
      }
    };
    
    checkSessionWrapper(); // Initial check
    intervalRef.current = setInterval(checkSessionWrapper, 1000);

    // Track basic user activity: click and keydown only
    const handleClick = () => {
      markUserInteraction(); // Mark for API interceptor
      if (resetTimerRef.current) {
        resetTimerRef.current();
      }
    };

    const handleKeydown = () => {
      markUserInteraction(); // Mark for API interceptor
      if (resetTimerRef.current) {
        resetTimerRef.current();
      }
    };

    window.addEventListener('click', handleClick, { passive: true });
    window.addEventListener('keydown', handleKeydown, { passive: true });

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeydown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - we only want this to run once on mount

  return {
    showWarning,
    timeRemaining,
    handleLogout,
    resetTimer,
  };
}
