'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { 
  DollarSign, 
  FileText,
  Settings,
  BarChart3,
  CreditCard,
  Receipt,
  Tag
} from 'lucide-react';
import Button from '@/components/ui/Button';

export default function FeesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const feesSections = [
    {
      id: 'v2-dashboard',
      title: 'Fee Dashboard',
      description: 'Overview of collections and pending dues',
      icon: BarChart3,
      path: `/dashboard/${schoolCode}/fees/v2/dashboard`,
      color: 'from-indigo-600 to-indigo-800',
    },
    {
      id: 'v2-fee-heads',
      title: 'Fee Heads',
      description: 'Manage fee types (Tuition, Transport, etc.)',
      icon: Tag,
      path: `/dashboard/${schoolCode}/fees/v2/fee-heads`,
      color: 'from-blue-600 to-blue-800',
    },
    {
      id: 'v2-structures',
      title: 'Fee Structures',
      description: 'Create and manage fee structures',
      icon: FileText,
      path: `/dashboard/${schoolCode}/fees/v2/fee-structures`,
      color: 'from-purple-600 to-purple-800',
    },
    {
      id: 'v2-collection',
      title: 'Collect Payment',
      description: 'Collect fees from students',
      icon: CreditCard,
      path: `/dashboard/${schoolCode}/fees/v2/collection`,
      color: 'from-green-600 to-green-800',
    },
    {
      id: 'setup',
      title: 'Fee Setup (Legacy)',
      description: 'Configure fee components, schedules, and assignments',
      icon: Settings,
      path: `/dashboard/${schoolCode}/fees/setup`,
      color: 'from-[#1E3A8A] to-[#2F6FED]',
      subsections: [
        { label: 'Fee Components', path: '/components' },
        { label: 'Fee Schedules', path: '/schedules' },
        { label: 'Class Fee Assignment', path: '/class-assignment' },
      ],
    },
    {
      id: 'collection',
      title: 'Fee Collection (Legacy)',
      description: 'Collect fees from students and generate receipts',
      icon: CreditCard,
      path: `/dashboard/${schoolCode}/fees/collection`,
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'statements',
      title: 'Student Fee Statements',
      description: 'View individual student fee history and pending amounts',
      icon: Receipt,
      path: `/dashboard/${schoolCode}/fees/statements`,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'discounts',
      title: 'Discounts & Fines',
      description: 'Manage fee discounts and late fee rules',
      icon: Tag,
      path: `/dashboard/${schoolCode}/fees/discounts-fines`,
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'reports',
      title: 'Fee Reports',
      description: 'View collection reports and analytics',
      icon: BarChart3,
      path: `/dashboard/${schoolCode}/fees/reports`,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      id: 'configuration',
      title: 'Fee Configuration',
      description: 'Configure receipt settings and payment modes',
      icon: FileText,
      path: `/dashboard/${schoolCode}/fees/configuration`,
      color: 'from-[#3B82F6] to-[#60A5FA]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
              <DollarSign className="text-[#2F6FED]" size={32} />
              Fees Management
            </h1>
            <p className="text-gray-600">Manage fees, collections, and reports</p>
          </div>
        </div>
      </motion.div>

      {/* Fees Sections Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feesSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={() => router.push(section.path)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-4 rounded-xl bg-gradient-to-br ${section.color} shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="text-white" size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#2F6FED] transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {section.description}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="group-hover:border-[#2F6FED] group-hover:text-[#2F6FED]"
                      >
                        Open →
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
