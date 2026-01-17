import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onLogout?: () => void;
  loginPath?: string;
}

export function useSessionTimeout({
  timeoutMinutes = 15,
  warningMinutes = 14,
  onLogout,
  loginPath = '/login',
}: UseSessionTimeoutOptions = {}) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutMinutesRef = useRef(timeoutMinutes);
  const warningMinutesRef = useRef(warningMinutes);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeoutMinutes * 60);

  // Update refs when props change
  timeoutMinutesRef.current = timeoutMinutes;
  warningMinutesRef.current = warningMinutes;

  const clearTimeouts = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const handleLogout = useCallback(() => {
    clearTimeouts();
    setShowWarning(false);
    
    // Clear session storage
    sessionStorage.clear();
    
    // Call custom logout handler if provided
    if (onLogout) {
      onLogout();
    }
    
    // Redirect to login
    router.push(loginPath);
  }, [onLogout, loginPath, router]);

  const resetTimer = useCallback(() => {
    clearTimeouts();
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    const currentTimeout = timeoutMinutesRef.current;
    const currentWarning = warningMinutesRef.current;
    setTimeRemaining(currentTimeout * 60); // Initialize with full time

    // Calculate warning threshold in seconds (1 minute before timeout)
    const warningThresholdSeconds = (currentTimeout - currentWarning) * 60;

    // Update countdown every second from the start
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = currentTimeout * 60 * 1000 - elapsed;
      const secondsRemaining = Math.max(0, Math.floor(remaining / 1000));
      setTimeRemaining(secondsRemaining);

      // Show warning when threshold is reached (e.g., 1 minute before timeout)
      if (secondsRemaining <= warningThresholdSeconds && secondsRemaining > 0) {
        setShowWarning(true);
      } else if (secondsRemaining > warningThresholdSeconds) {
        // Hide warning if time increases (user was active)
        setShowWarning(false);
      }

      if (secondsRemaining === 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        handleLogout();
      }
    }, 1000);

    // Set logout timer (logout at timeoutMinutes)
    const logoutDelay = currentTimeout * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, logoutDelay);
  }, [handleLogout]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Initialize timer
    resetTimer();

    // Track various user activities
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
      'focus',
    ];

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Also track window focus
    const handleFocus = () => {
      resetTimer();
    };
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearTimeouts();
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('focus', handleFocus);
    };
  }, [handleActivity, resetTimer]);

  return {
    showWarning,
    timeRemaining,
    handleLogout,
    resetTimer,
  };
}

