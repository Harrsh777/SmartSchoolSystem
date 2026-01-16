'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import {
  Folder,
  Receipt,
  Lock,
  Fingerprint,
  MessageCircle,
  X,
  Eye,
} from 'lucide-react';

interface SettingCard {
  id: string;
  title: string;
  icon: typeof Folder;
  badge?: 'PRO' | 'PREMIUM';
  onClick?: () => void;
}

export default function SettingsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const settingsCards: SettingCard[] = [
    {
      id: 'academic-year',
      title: 'Default academic year settings',
      icon: Folder,
    },
    {
      id: 'admission',
      title: 'Admission Settings',
      icon: Folder,
      badge: 'PRO',
    },
    {
      id: 'fee',
      title: 'Fee Settings',
      icon: Receipt,
      badge: 'PRO',
    },
    {
      id: 'employee-id',
      title: 'Employee ID Automation',
      icon: Folder,
      badge: 'PRO',
    },
    {
      id: 'module-reorder',
      title: 'Module Re-Ordering',
      icon: Folder,
    },
    {
      id: 'calendar-language',
      title: 'Change Calendar Language',
      icon: Folder,
    },
    {
      id: 'student-sorting',
      title: 'Student Sorting',
      icon: Folder,
    },
    {
      id: 'password-security',
      title: 'Password & Security',
      icon: Lock,
    },
    {
      id: 'dashboard-settings',
      title: 'Home Dashboard Settings',
      icon: Folder,
    },
    {
      id: 'search-student',
      title: 'Search student settings',
      icon: Folder,
    },
    {
      id: 'biometric',
      title: 'Biometric ID Settings',
      icon: Fingerprint,
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp number settings',
      icon: MessageCircle,
    },
    {
      id: 'mis-report',
      title: 'MIS Report',
      icon: Folder,
      badge: 'PREMIUM',
    },
    {
      id: 'chat-settings',
      title: 'Chat settings',
      icon: MessageCircle,
    },
    {
      id: 'leave-management',
      title: 'Leave Management Settings',
      icon: Folder,
    },
  ];

  const handleCardClick = (card: SettingCard) => {
    // Handle different settings based on card ID
    switch (card.id) {
      case 'password-security':
        router.push(`/dashboard/${schoolCode}/password`);
        break;
      case 'academic-year':
        // Open academic year settings modal/page
        setShowModal(true);
        break;
      default:
        // For PRO/PREMIUM features, show upgrade modal or handle accordingly
        if (card.badge) {
          alert(`${card.title} is a ${card.badge} feature. Please upgrade to access.`);
        } else {
          // Open respective settings modal/page
          setShowModal(true);
        }
        break;
    }
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
              <Folder className="text-white" size={28} />
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 max-w-7xl mx-auto">
          {settingsCards.map((card, index) => {
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5, scale: 1.05 }}
                onClick={() => handleCardClick(card)}
                className="cursor-pointer group"
              >
                <Card className="p-4 hover:shadow-xl transition-all bg-white dark:bg-[#1e293b] border-2 border-gray-200 dark:border-gray-700 hover:border-[#5A7A95]/30 dark:hover:border-[#6B9BB8]/30 relative h-full flex flex-col items-center justify-center cursor-pointer">
                  {/* Badge */}
                  {card.badge && (
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-semibold ${
                      card.badge === 'PRO' 
                        ? 'bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] text-white' 
                        : 'bg-gradient-to-r from-[#6B9BB8] to-[#7DB5D3] text-white'
                    }`}>
                      {card.badge}
                    </div>
                  )}

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
                    ) : card.id === 'fee' ? (
                      <div className="p-3 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
                        <Receipt className="text-white" size={24} />
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
                        <Folder className="text-white" size={24} />
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xs font-medium text-gray-800 dark:text-gray-200 text-center line-clamp-2">
                    {card.title}
                  </h3>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Settings Modal Placeholder */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#1e293b] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-[#5A7A95]/20 dark:border-[#6B9BB8]/20"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600">Settings configuration will be implemented here.</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
