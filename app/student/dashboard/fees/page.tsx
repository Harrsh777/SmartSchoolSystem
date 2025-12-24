'use client';

import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { DollarSign } from 'lucide-react';

export default function FeesPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Fees</h1>
          <p className="text-gray-600">View your fee details and payment history</p>
        </div>
      </motion.div>

      <Card>
        <div className="text-center py-12">
          <DollarSign className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">Fee details will be updated by the school</p>
        </div>
      </Card>
    </div>
  );
}

