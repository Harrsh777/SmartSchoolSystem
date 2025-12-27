'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bus, 
  Settings, 
  Truck, 
  Route,
  Users,
  X,
  ExternalLink
} from 'lucide-react';

interface TransportManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolCode: string;
}

const menuItems = [
  { id: 'basics', label: 'Transport Basics', icon: Settings, path: '/transport/basics' },
  { id: 'vehicles', label: 'Vehicles', icon: Truck, path: '/transport/vehicles' },
  { id: 'routes', label: 'Routes', icon: Route, path: '/transport/routes' },
  { id: 'route-students', label: 'Route Students', icon: Users, path: '/transport/route-students' },
];

export default function TransportManagementModal({ isOpen, onClose, schoolCode }: TransportManagementModalProps) {
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
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
                    <Bus size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Transport Management</h2>
                    <p className="text-white/60 text-xs">Manage transportation system</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X size={18} className="text-white" />
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
                        <span className="text-white font-semibold text-sm uppercase tracking-wide">{item.label}</span>
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

