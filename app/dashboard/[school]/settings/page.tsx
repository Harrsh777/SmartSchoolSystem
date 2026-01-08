'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import {
  Folder,
  Receipt,
  Lock,
  Calendar,
  Users,
  Search,
  Fingerprint,
  MessageCircle,
  Layout,
  ArrowLeft,
  X,
  Settings as SettingsIcon,
  Award,
  Shield,
  FileText,
  Globe,
  UserCog,
  Home,
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
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Header */}
      <div className="bg-orange-500 text-white px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-orange-100 text-sm mt-1">Please select any option you want to setup!</p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
          className="text-white hover:bg-orange-600 rounded-lg p-2 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Settings Grid */}
      <div className="p-6 bg-[#F5F5F0] min-h-screen">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 max-w-7xl mx-auto">
          {settingsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCardClick(card)}
                className="cursor-pointer group"
              >
                <Card className="p-4 hover:shadow-md transition-all bg-white border border-gray-200 relative h-full flex flex-col items-center justify-center cursor-pointer">
                  {/* Badge */}
                  {card.badge && (
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-semibold ${
                      card.badge === 'PRO' 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-green-500 text-white'
                    }`}>
                      {card.badge}
                    </div>
                  )}

                  {/* Icon */}
                  <div className="flex items-center justify-center mb-3">
                    {card.id === 'password-security' ? (
                      <div className="relative">
                        <Lock className="text-orange-600" size={40} />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                          <Eye className="text-white" size={10} />
                        </div>
                      </div>
                    ) : card.id === 'fee' ? (
                      <Receipt className="text-amber-700" size={40} />
                    ) : (
                      <Folder className="text-amber-700" size={40} />
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xs font-medium text-gray-800 text-center line-clamp-2">
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
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
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
