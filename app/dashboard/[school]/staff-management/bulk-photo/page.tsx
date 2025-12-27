'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { Camera } from 'lucide-react';

export default function BulkPhotoPage({
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
            <Camera size={32} />
            Bulk Photo Upload
          </h1>
          <p className="text-gray-600">Upload photos for multiple staff members</p>
        </div>
      </motion.div>

      <Card>
        <div className="text-center py-12">
          <Camera className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">This feature will be available soon</p>
          <p className="text-gray-500 text-sm mt-2">Bulk photo upload functionality coming soon</p>
        </div>
      </Card>
    </div>
  );
}

