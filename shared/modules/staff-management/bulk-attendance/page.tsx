'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { FileCheck } from 'lucide-react';

export default function BulkAttendancePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  // schoolCode kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { school: schoolCode } = use(params);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <FileCheck size={32} />
            Staff Mark Bulk Attendance
          </h1>
          <p className="text-gray-600">Mark attendance for multiple staff members at once</p>
        </div>
      </motion.div>

      <Card>
        <div className="text-center py-12">
          <FileCheck className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">This feature will be available soon</p>
          <p className="text-gray-500 text-sm mt-2">Bulk attendance marking coming soon</p>
        </div>
      </Card>
    </div>
  );
}

