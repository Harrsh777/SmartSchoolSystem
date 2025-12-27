'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { FileCheck } from 'lucide-react';

export default function StudentAttendanceReportPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  use(params); // schoolCode available if needed

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
            Student Attendance Marking Report
          </h1>
          <p className="text-gray-600">View student attendance marking reports</p>
        </div>
        <span className="px-3 py-1 bg-orange-100 text-orange-600 text-sm font-semibold rounded">
          PRO
        </span>
      </motion.div>

      <Card>
        <div className="text-center py-12">
          <FileCheck className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">This feature will be available soon</p>
          <p className="text-gray-500 text-sm mt-2">Student attendance marking report coming soon</p>
        </div>
      </Card>
    </div>
  );
}

