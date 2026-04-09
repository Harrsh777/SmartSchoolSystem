'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CreateNoticeModal from '@/components/communication/CreateNoticeModal';
import { Bell, Plus, Paperclip } from 'lucide-react';
import { parseNoticeAttachmentUrls, type Staff, type Notice } from '@/lib/supabase';

export default function CommunicationPage() {
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchNotices(teacherData);
    }
  }, []);

  const fetchNotices = async (teacherData: Staff) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/communication/notices?school_code=${teacherData.school_code}&status=Active&category=all&priority=all`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        interface NoticeData {
          publish_at?: string | null;
          [key: string]: unknown;
        }
        const now = new Date();
        const publishedNotices = result.data.filter((notice: NoticeData) => {
          if (!notice.publish_at) return true;
          return new Date(notice.publish_at) <= now;
        });
        setNotices(publishedNotices);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Bell className="text-yellow-600" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Communication</h1>
              <p className="text-gray-600">
                Notices and announcements from your school. Creating a notice supports optional PDF and image
                attachments.
              </p>
            </div>
          </div>
          {teacher?.school_code ? (
            <Button onClick={() => setShowCreateModal(true)} className="shrink-0 w-full sm:w-auto">
              <Plus size={18} className="mr-2" />
              New notice / upload
            </Button>
          ) : null}
        </div>
      </motion.div>

      {notices.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Bell className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No notices available</p>
            {teacher?.school_code ? (
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus size={18} className="mr-2" />
                Post a notice
              </Button>
            ) : null}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card key={notice.id} hover>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-bold text-black">{notice.title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notice.priority || 'Low')}`}>
                    {notice.priority}
                  </span>
                  {notice.category && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                      {notice.category}
                    </span>
                  )}
                </div>
              </div>
              {(() => {
                const attachmentUrls = parseNoticeAttachmentUrls(notice.attachment_url);
                if (attachmentUrls.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {attachmentUrls.map((url, idx) => (
                      <a
                        key={`${url}-${idx}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
                      >
                        <Paperclip size={16} />
                        {attachmentUrls.length > 1 ? `Attachment ${idx + 1}` : 'View attachment'}
                      </a>
                    ))}
                  </div>
                );
              })()}
              <p className="text-gray-700 whitespace-pre-wrap mb-3">{notice.content}</p>
              <p className="text-xs text-gray-500">
                Posted on {new Date(notice.created_at || '').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && teacher?.school_code && (
        <CreateNoticeModal
          schoolCode={teacher.school_code}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            if (teacher) fetchNotices(teacher);
          }}
        />
      )}
    </div>
  );
}

