'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  timeRemaining: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutModal({
  isOpen,
  timeRemaining,
  onStayLoggedIn,
  onLogout,
}: SessionTimeoutModalProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  useEffect(() => {
    if (isOpen && timeRemaining === 0) {
      // Auto-logout when timer reaches 0
      onLogout();
    }
  }, [isOpen, timeRemaining, onLogout]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9999]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-yellow-600" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Session Timeout Warning
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Your session will expire due to inactivity. Please click &quot;Stay Logged In&quot; to continue.
                  </p>
                  
                  {/* Countdown Timer */}
                  <div className="flex items-center gap-2 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <Clock className="text-red-600" size={20} />
                    <div className="flex-1">
                      <p className="text-sm text-red-700 font-medium mb-1">
                        Time remaining:
                      </p>
                      <p className="text-2xl font-bold text-red-600 font-mono">
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={onStayLoggedIn}
                  className="flex-1"
                >
                  Stay Logged In
                </Button>
                <Button
                  variant="outline"
                  onClick={onLogout}
                  className="flex-1"
                >
                  Logout Now
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

