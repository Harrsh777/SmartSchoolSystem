'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { BookOpen, Settings, Book, FileText, BarChart3 } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function LibraryPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const librarySections = [
    {
      id: 'basics',
      title: 'Library Basics',
      description: 'Configure library rules, sections, and material types',
      icon: Settings,
      path: `/dashboard/${schoolCode}/library/basics`,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'catalogue',
      title: 'Catalogue',
      description: 'Manage book inventory and catalogue',
      icon: Book,
      path: `/dashboard/${schoolCode}/library/catalogue`,
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'transactions',
      title: 'Transactions',
      description: 'Issue and return books for students and staff',
      icon: FileText,
      path: `/dashboard/${schoolCode}/library/transactions`,
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'dashboard',
      title: 'Library Dashboard',
      description: 'View library analytics and statistics',
      icon: BarChart3,
      path: `/dashboard/${schoolCode}/library/dashboard`,
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpen className="text-indigo-600" size={32} />
              Library Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage library system for {schoolCode}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Library Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {librarySections.map((section, index) => {
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
                    <Icon className="text-white" size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {section.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="group-hover:border-indigo-600 group-hover:text-indigo-600"
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
    </div>
  );
}
