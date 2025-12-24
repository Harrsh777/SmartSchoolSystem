'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { Users, Mail, Phone, MapPin } from 'lucide-react';
import type { Student } from '@/lib/supabase';

export default function ParentInfoPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      setLoading(false);
    }
  }, []);

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Parent Information</h1>
          <p className="text-gray-600">Contact details of your parent/guardian</p>
        </div>
      </motion.div>

      <Card>
        {student.parent_name ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                <Users size={14} />
                Parent/Guardian Name
              </p>
              <p className="text-xl font-semibold text-black">{student.parent_name}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {student.parent_phone && (
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Phone size={14} />
                    Phone Number
                  </p>
                  <p className="text-lg font-semibold text-black">{student.parent_phone}</p>
                </div>
              )}
              {student.parent_email && (
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Mail size={14} />
                    Email Address
                  </p>
                  <p className="text-lg font-semibold text-black">{student.parent_email}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">No parent information available</p>
          </div>
        )}
      </Card>
    </div>
  );
}

