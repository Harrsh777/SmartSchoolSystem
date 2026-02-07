'use client';

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Lock, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

const ADMIN_PASSWORD = 'educorerp@123';

export default function AdminPasswordModal({ isOpen, onSuccess }: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));

    const success = password === ADMIN_PASSWORD;

    // Record login attempt in audit log (works with /api/auth/log-login)
    await fetch('/api/auth/log-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: null,
        name: 'Admin Panel',
        role: 'Super Admin',
        loginType: 'admin-panel',
        status: success ? 'success' : 'failed',
      }),
    }).catch(() => {});

    if (success) {
      setLoading(false);
      onSuccess();
      setPassword('');
    } else {
      setLoading(false);
      setError('Incorrect password. Please try again.');
      setPassword('');
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 glass-card border border-white/20 dark:border-white/10">
              {/* Header */}
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#2C3E50] dark:bg-[#3D5A80] flex items-center justify-center soft-shadow-lg">
                  <Shield className="text-white" size={28} />
                </div>
              </div>

              <h2 className="text-2xl font-serif font-bold text-center text-foreground mb-2">
                Admin Access Required
              </h2>
              <p className="text-sm text-center text-muted-foreground mb-6">
                Please enter the admin password to continue
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password Field */}
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
                    placeholder="Enter admin password"
                    required
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

                {/* Error Message */}
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

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={loading || !password.trim()}
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

              {/* Security Note */}
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
