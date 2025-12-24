'use client';

import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { CalendarDays } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Academic Calendar</h1>
          <p className="text-gray-600">View important dates and events</p>
        </div>
      </motion.div>

      <Card>
        <div className="text-center py-12">
          <CalendarDays className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">Academic calendar will be available soon</p>
        </div>
      </Card>
    </div>
  );
}

