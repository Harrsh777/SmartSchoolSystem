'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Bell } from 'lucide-react';
import NoticeStats from '@/components/communication/NoticeStats';
import NoticeFilters from '@/components/communication/NoticeFilters';
import NoticeCard from '@/components/communication/NoticeCard';
import CreateNoticeModal from '@/components/communication/CreateNoticeModal';
import EditNoticeModal from '@/components/communication/EditNoticeModal';
import type { Notice } from '@/lib/supabase';

export default function CommunicationPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    priority: 'all',
    status: 'all',
  });

  useEffect(() => {
    fetchNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, filters]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
        ...(filters.category !== 'all' && { category: filters.category }),
        ...(filters.priority !== 'all' && { priority: filters.priority }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/communication/notices?${params}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setNotices(result.data);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (notice: Notice) => {
    setSelectedNotice(notice);
    setShowEditModal(true);
  };

  const handleArchive = async (noticeId: string) => {
    if (!confirm('Are you sure you want to archive this notice? It will be moved to archived status.')) {
      return;
    }

    try {
      const response = await fetch(`/api/communication/notices/${noticeId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        fetchNotices();
      } else {
        alert(result.error || 'Failed to archive notice');
      }
    } catch (error) {
      console.error('Error archiving notice:', error);
      alert('Failed to archive notice. Please try again.');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A7A95] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5A7A95] dark:text-[#6B9BB8] font-medium">Loading notices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
              <Bell className="text-white" size={28} />
            </div>
            Communication Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage notices, announcements, and messages</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} className="mr-2" />
          New Notice
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <NoticeStats notices={notices} onStatClick={handleFilterChange} />

      {/* Filters */}
      <NoticeFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Notices List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {notices.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Bell className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg mb-2">No notices found</p>
              <p className="text-gray-500 text-sm mb-6">
                {filters.search || filters.category !== 'all' || filters.priority !== 'all' || filters.status !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first notice to get started'}
              </p>
              {!filters.search && filters.category === 'all' && filters.priority === 'all' && filters.status === 'all' && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus size={18} className="mr-2" />
                  Create First Notice
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                onEdit={() => handleEdit(notice)}
                onArchive={() => handleArchive(notice.id!)}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      {showCreateModal && (
        <CreateNoticeModal
          schoolCode={schoolCode}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchNotices();
          }}
        />
      )}

      {showEditModal && selectedNotice && (
        <EditNoticeModal
          schoolCode={schoolCode}
          notice={selectedNotice}
          onClose={() => {
            setShowEditModal(false);
            setSelectedNotice(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedNotice(null);
            fetchNotices();
          }}
        />
      )}
    </div>
  );
}
