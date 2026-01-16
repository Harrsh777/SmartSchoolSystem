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
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'schedules',
      title: 'Fee Schedules',
      description: 'Define installment structures (Annual, Quarterly, Monthly, etc.)',
      icon: Calendar,
      path: `/dashboard/${schoolCode}/fees/setup/schedules`,
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'class-assignment',
      title: 'Class Fee Assignment',
      description: 'Assign fee components to classes with amounts and schedules',
      icon: Users,
      path: `/dashboard/${schoolCode}/fees/setup/class-assignment`,
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'student-assignment',
      title: 'Student Fee Assignment',
      description: 'Override class fees for individual students (scholarships, special cases)',
      icon: GraduationCap,
      path: `/dashboard/${schoolCode}/fees/setup/student-assignment`,
      color: 'from-[#1E3A8A] to-[#2F6FED]',
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
              <Settings className="text-[#2F6FED]" size={32} />
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

      {/* Quick Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#2F6FED] rounded-lg">
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
