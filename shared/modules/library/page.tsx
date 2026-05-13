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
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-6 soft-shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#2C3E50] dark:bg-[#4A707A] flex items-center justify-center soft-shadow">
              <BookOpen className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Library Management</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage library system for {schoolCode}</p>
            </div>
          </div>
        </motion.div>

        {/* Library Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {librarySections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <Card
                  className="cursor-pointer group p-6"
                  onClick={() => router.push(section.path)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-4 rounded-xl bg-[#2C3E50] dark:bg-[#4A707A] soft-shadow group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="text-white" size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-[#2C3E50] dark:group-hover:text-[#5A879A] transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {section.description}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#2C3E50]/30 text-[#2C3E50] hover:bg-[#2C3E50]/10 dark:border-[#4A707A]/30 dark:text-[#5A879A] dark:hover:bg-[#4A707A]/10 group-hover:border-[#2C3E50] group-hover:text-[#2C3E50] dark:group-hover:border-[#5A879A] dark:group-hover:text-[#5A879A]"
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
    </div>
  );
}
