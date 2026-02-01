'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { FileText, Plus, BarChart3, Settings2 } from 'lucide-react';

const submodules = [
  {
    id: 'generate',
    title: 'Generate Report Card',
    description: 'Step-by-step: select class, exam(s), and students to generate HTML report cards. Combine Half Yearly + Final for term-wise report.',
    icon: Plus,
    path: 'generate',
    color: 'from-[#1e3a8a] to-[#3B82F6]',
  },
  {
    id: 'dashboard',
    title: 'Report Card Dashboard',
    description: 'View, download, and print all generated report cards',
    icon: BarChart3,
    path: 'dashboard',
    color: 'from-[#3B82F6] to-[#60A5FA]',
  },
  {
    id: 'templates',
    title: 'Customize Template',
    description: 'Customize report card design: logos, colors, sections, labels, layout, and more',
    icon: Settings2,
    path: 'templates',
    color: 'from-[#6366f1] to-[#8B5CF6]',
  },
];

export default function ReportCardModulePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
            <FileText className="text-white" size={28} />
          </div>
          Report Card
        </h1>
        <p className="text-gray-600">Generate, manage, and customize student report cards</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {submodules.map((module, index) => {
          const Icon = module.icon;
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-transparent hover:border-[#1e3a8a]/30"
                  onClick={() => router.push(`/dashboard/${schoolCode}/report-card/${module.path}`)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-4 rounded-xl bg-gradient-to-br ${module.color} shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="text-white" size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#1e3a8a] transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {module.description}
                      </p>
                      <span className="inline-block mt-3 text-sm font-medium text-[#1e3a8a] group-hover:underline">
                        Open →
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
