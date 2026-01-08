import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onLogout?: () => void;
  loginPath?: string;
}

export function useSessionTimeout({
  timeoutMinutes = 10,
  warningMinutes = 9,
  onLogout,
  loginPath = '/login',
}: UseSessionTimeoutOptions = {}) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeoutMinutes * 60);

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

  const resetTimer = () => {
    clearTimeouts();
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setTimeRemaining(timeoutMinutes * 60); // Initialize with full time

    // Update countdown every second from the start
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = timeoutMinutes * 60 * 1000 - elapsed;
      const secondsRemaining = Math.max(0, Math.floor(remaining / 1000));
      setTimeRemaining(secondsRemaining);

      // Show warning when 1 minute remaining
      if (secondsRemaining <= 60 && secondsRemaining > 0) {
        setShowWarning(true);
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
    const logoutDelay = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, logoutDelay);
  };

  const handleLogout = () => {
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
  };

  const handleActivity = () => {
    resetTimer();
  };

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
  }, []);

  return {
    showWarning,
    timeRemaining,
    handleLogout,
    resetTimer,
  };
}

