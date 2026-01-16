'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { Bell } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

interface NoticeData {
  publish_at?: string | null;
  [key: string]: unknown;
}

export default function CommunicationPage() {
  // student kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [student, setStudent] = useState<Student | null>(null);
  const [notices, setNotices] = useState<NoticeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchNotices(studentData);
    }
  }, []);

  const fetchNotices = async (studentData: Student) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/communication/notices?school_code=${studentData.school_code}&status=Active`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        // Filter to show only published notices (publish_at is in the past or null)
        const now = new Date();
        const publishedNotices = result.data.filter((notice: NoticeData) => {
          if (!notice.publish_at) return true; // If no publish_at, show immediately
          return new Date(notice.publish_at) <= now;
        });
        setNotices(publishedNotices);
      } else {
        console.error('Error fetching notices:', result.error);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold text-black mb-2">Communication</h1>
          <p className="text-gray-600">Notices and announcements from your school</p>
        </div>
      </motion.div>

      {notices.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Bell className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">No notices available</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((notice, index) => {
            const noticeId = getString(notice.id) || `notice-${index}`;
            const title = getString(notice.title);
            const priority = getString(notice.priority);
            const category = getString(notice.category);
            const content = getString(notice.content);
            const createdAt = getString(notice.created_at);
            return (
              <Card key={noticeId} hover>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-black">{title || 'Notice'}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      priority === 'high' ? 'bg-red-100 text-red-800' :
                      priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {priority || 'normal'}
                    </span>
                    {category ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        {category}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap mb-3">{content || 'No content'}</p>
                {createdAt ? (
                  <p className="text-xs text-gray-500">
                    Posted on {new Date(createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

