'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import {
  Settings,
  Receipt,
  Lock,
  X,
  Eye,
  Building2,
  Shield,
  BookOpen,
  Calendar,
} from 'lucide-react';

interface SettingCard {
  id: string;
  title: string;
  icon: typeof Lock;
  path: string;
  description?: string;
}

export default function SettingsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const settingsCards: SettingCard[] = [
    {
      id: 'password-security',
      title: 'Password & Security',
      icon: Lock,
      path: '/password',
      description: 'Manage student & staff passwords',
    },
    {
      id: 'role-management',
      title: 'Role Management',
      icon: Shield,
      path: '/settings/roles',
      description: 'Staff permissions & module access',
    },
    {
      id: 'institute-info',
      title: 'Institute Info',
      icon: Building2,
      path: '/institute-info',
      description: 'School details, logo, working days',
    },
    {
      id: 'fee-settings',
      title: 'Fee Settings',
      icon: Receipt,
      path: '/fees/configuration',
      description: 'Receipt layout & payment modes',
    },
    {
      id: 'leave-management',
      title: 'Leave Management',
      icon: Calendar,
      path: '/leave/basics',
      description: 'Leave types & configuration',
    },
    {
      id: 'library-settings',
      title: 'Library Settings',
      icon: BookOpen,
      path: '/library/basics',
      description: 'Library rules & fine settings',
    },
  ];

  const handleCardClick = (card: SettingCard) => {
    router.push(`/dashboard/${schoolCode}${card.path}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFEB] via-[#F0F5F9] to-[#EBF2F7] dark:bg-[#0f172a]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white px-6 py-5 flex items-center justify-between shadow-lg"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <Settings className="text-white" size={28} />
            </div>
            Settings
          </h1>
          <p className="text-[#C8D9E6] text-sm mt-1">Please select any option you want to setup!</p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
          className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
        >
          <X size={24} />
        </button>
      </motion.div>

      {/* Settings Grid */}
      <div className="p-6 min-h-screen">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 max-w-7xl mx-auto">
          {settingsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5, scale: 1.03 }}
                onClick={() => handleCardClick(card)}
                className="cursor-pointer group"
              >
                <Card className="p-5 hover:shadow-xl transition-all bg-white dark:bg-[#1e293b] border-2 border-gray-200 dark:border-gray-700 hover:border-[#5A7A95]/30 dark:hover:border-[#6B9BB8]/30 h-full flex flex-col items-center justify-center cursor-pointer">
                  {/* Icon */}
                  <div className="flex items-center justify-center mb-3">
                    {card.id === 'password-security' ? (
                      <div className="relative">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
                          <Lock className="text-white" size={24} />
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] rounded-full border-2 border-white flex items-center justify-center">
                          <Eye className="text-white" size={10} />
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
                        <Icon className="text-white" size={24} />
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-center line-clamp-2">
                    {card.title}
                  </h3>
                  {card.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1 line-clamp-2">
                      {card.description}
                    </p>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
