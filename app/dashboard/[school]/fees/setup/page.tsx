'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { 
  Settings, 
  Calendar,
  Users,
  ArrowLeft,
  FileText,
  GraduationCap,
  Tag
} from 'lucide-react';
import Button from '@/components/ui/Button';

export default function FeeSetupPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const setupSections = [
    {
      id: 'components',
      title: 'Fee Components',
      description: 'Create and manage fee types (Tuition, Library, Lab, Transport, etc.)',
      icon: FileText,
      path: `/dashboard/${schoolCode}/fees/setup/components`,
      color: 'from-[#5A7A95] to-[#6B9BB8]',
    },
    {
      id: 'schedules',
      title: 'Fee Schedules',
      description: 'Define installment structures (Annual, Quarterly, Monthly, etc.)',
      icon: Calendar,
      path: `/dashboard/${schoolCode}/fees/setup/schedules`,
      color: 'from-[#6B9BB8] to-[#7DB5D3]',
    },
    {
      id: 'class-assignment',
      title: 'Class Fee Assignment',
      description: 'Assign fee components to classes with amounts and schedules',
      icon: Users,
      path: `/dashboard/${schoolCode}/fees/setup/class-assignment`,
      color: 'from-[#567C8D] to-[#5A7A95]',
    },
    {
      id: 'student-assignment',
      title: 'Student Fee Assignment',
      description: 'Override class fees for individual students (scholarships, special cases)',
      icon: GraduationCap,
      path: `/dashboard/${schoolCode}/fees/setup/student-assignment`,
      color: 'from-[#5A7A95] to-[#6B9BB8]',
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
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
                <Settings className="text-white" size={28} />
              </div>
              Fee Setup
            </h1>
            <p className="text-gray-600">Configure fees, schedules, and assignments for the academic year</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Setup Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {setupSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-transparent hover:border-[#5A7A95]/30 dark:hover:border-[#6B9BB8]/30"
                  onClick={() => router.push(section.path)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-4 rounded-xl bg-gradient-to-br ${section.color} shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="text-white" size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-[#5A7A95] dark:group-hover:text-[#6B9BB8] transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        {section.description}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="group-hover:border-[#5A7A95] dark:group-hover:border-[#6B9BB8] group-hover:text-[#5A7A95] dark:group-hover:text-[#6B9BB8]"
                      >
                        Open →
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 bg-gradient-to-br from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#2F4156] border-2 border-[#5A7A95]/20 dark:border-[#6B9BB8]/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] rounded-lg shadow-lg">
              <Tag className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Setup Workflow</h3>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li><strong>Create Fee Components:</strong> Define all fee types (Tuition, Library, Lab, etc.)</li>
                <li><strong>Create Fee Schedules:</strong> Define installment structures (Annual, Quarterly, Monthly)</li>
                <li><strong>Assign Fees to Classes:</strong> Link fee components to classes with amounts and schedules</li>
                <li><strong>Optional - Student Overrides:</strong> Modify fees for individual students if needed</li>
              </ol>
              <p className="mt-4 text-sm text-gray-600">
                <strong>Note:</strong> When you assign fees to a class, installments are automatically created for all students in that class.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
