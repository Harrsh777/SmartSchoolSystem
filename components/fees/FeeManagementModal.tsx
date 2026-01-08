'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Users, User, AlertCircle, ExternalLink, Settings, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FeeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolCode: string;
}

const menuItems = [
  { id: 'configuration', label: 'Fee Configuration', icon: Settings, path: '/fees/configuration' },
  { id: 'basics', label: 'Fee Basics', icon: Calendar, path: '/fees/basics', description: 'Fee Schedule' },
  { id: 'class-wise', label: 'Class-wise Fee', icon: Users, path: '/fees/class-wise' },
  { id: 'student-wise', label: 'Student-wise Fee', icon: User, path: '/fees/student-wise' },
  { id: 'mapper', label: 'Student Class & Fee Schedule Mapper', icon: AlertCircle, path: '/fees/mapper' },
  { id: 'pending-cheque', label: 'Pending cheque', icon: CreditCard, path: '/fees/pending-cheque' },
];

export default function FeeManagementModal({ isOpen, onClose, schoolCode }: FeeManagementModalProps) {
  const router = useRouter();

  const handleMenuItemClick = (path: string) => {
    router.push(`/dashboard/${schoolCode}${path}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Modal - Slides from left */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-96 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white uppercase tracking-wide bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">Fee Configuration</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:text-pink-400"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Menu Items */}
              <div className="space-y-3">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuItemClick(item.path)}
                      className="w-full flex items-center justify-between p-4 text-left bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 group border border-white/10 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center group-hover:from-pink-400 group-hover:to-rose-400 transition-all shadow-lg group-hover:scale-110">
                          <Icon size={20} className="text-white" />
                        </div>
                        <div>
                          <span className="text-white font-semibold text-sm uppercase tracking-wide block">{item.label}</span>
                          {item.description && (
                            <span className="text-xs text-white/70 mt-0.5">{item.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                        <ExternalLink size={14} className="text-white" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

