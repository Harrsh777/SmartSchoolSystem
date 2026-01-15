'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, ExternalLink, BarChart3, Tag, FileText, CreditCard, Settings, Receipt, AlertCircle } from 'lucide-react';

interface FeeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolCode: string;
}

const menuItems = [
  { 
    id: 'dashboard', 
    label: 'Fee Dashboard', 
    icon: BarChart3, 
    path: '/fees/v2/dashboard',
    description: 'Overview of collections and pending dues',
    color: 'from-indigo-500 to-indigo-600'
  },
  { 
    id: 'fee-heads', 
    label: 'Fee Heads', 
    icon: Tag, 
    path: '/fees/v2/fee-heads',
    description: 'Manage fee types (Tuition, Transport, etc.)',
    color: 'from-blue-500 to-blue-600'
  },
  { 
    id: 'fee-structures', 
    label: 'Fee Structures', 
    icon: FileText, 
    path: '/fees/v2/fee-structures',
    description: 'Create and manage fee structures',
    color: 'from-purple-500 to-purple-600'
  },
  { 
    id: 'collect-payment', 
    label: 'Collect Payment', 
    icon: CreditCard, 
    path: '/fees/v2/collection',
    description: 'Collect fees from students',
    color: 'from-green-500 to-green-600'
  },
  { 
    id: 'fee-setup', 
    label: 'Fee Setup (Legacy)', 
    icon: Settings, 
    path: '/fees/setup',
    description: 'Configure fee components, schedules, and assignments',
    color: 'from-blue-500 to-cyan-500'
  },
  { 
    id: 'fee-collection-legacy', 
    label: 'Fee Collection (Legacy)', 
    icon: CreditCard, 
    path: '/fees/collection',
    description: 'Collect fees from students and generate receipts',
    color: 'from-green-500 to-emerald-500'
  },
  { 
    id: 'statements', 
    label: 'Student Fee Statements', 
    icon: Receipt, 
    path: '/fees/statements',
    description: 'View individual student fee history and pending amounts',
    color: 'from-blue-500 to-cyan-500'
  },
  { 
    id: 'discounts-fines', 
    label: 'Discounts & Fines', 
    icon: AlertCircle, 
    path: '/fees/discounts-fines',
    description: 'Manage fee discounts and late fee rules',
    color: 'from-purple-500 to-pink-500'
  },
  { 
    id: 'reports', 
    label: 'Fee Reports', 
    icon: BarChart3, 
    path: '/fees/reports',
    description: 'View collection reports and analytics',
    color: 'from-indigo-500 to-purple-500'
  },
  { 
    id: 'configuration', 
    label: 'Fee Configuration', 
    icon: Settings, 
    path: '/fees/configuration',
    description: 'Configure receipt settings and payment modes',
    color: 'from-blue-500 to-indigo-500'
  },
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-pink-500/20">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Fee Management</h2>
                  <p className="text-white/70 text-sm">Choose a module to manage fees</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group"
                >
                  <X size={20} className="text-white group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => handleMenuItemClick(item.path)}
                        className="group relative p-5 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/10 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/20 text-left"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                            <Icon size={24} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-base mb-1 group-hover:text-pink-200 transition-colors">
                              {item.label}
                            </h3>
                            <p className="text-white/60 text-sm leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md">
                              <ExternalLink size={16} className="text-white" />
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
