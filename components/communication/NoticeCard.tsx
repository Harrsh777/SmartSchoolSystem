'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { Edit2, Archive, Calendar } from 'lucide-react';
import type { Notice } from '@/lib/supabase';

interface NoticeCardProps {
  notice: Notice;
  onEdit: () => void;
  onArchive: () => void;
}

export default function NoticeCard({ notice, onEdit, onArchive }: NoticeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const contentPreview = notice.content.length > 200;
  const displayContent = expanded || !contentPreview
    ? notice.content
    : notice.content.substring(0, 200) + '...';

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Examination':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Holiday':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Event':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not published';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card hover>
      <div className="space-y-4">
        {/* Header with Badges */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(
                  notice.priority
                )}`}
              >
                {notice.priority} Priority
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(
                  notice.category
                )}`}
              >
                {notice.category}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  notice.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : notice.status === 'Draft'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {notice.status}
              </span>
            </div>
            <h3 className="text-xl font-bold text-black mb-2">{notice.title}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="text-gray-700 whitespace-pre-wrap">
          {displayContent}
          {contentPreview && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 hover:text-blue-800 font-medium ml-2"
            >
              {expanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={16} />
            <span>
              {notice.status === 'Active' && notice.publish_at
                ? `Published: ${formatDate(notice.publish_at)}`
                : notice.status === 'Draft'
                ? 'Draft - Not published'
                : `Archived: ${formatDate(notice.updated_at)}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {notice.status !== 'Archived' && (
              <>
                <button
                  onClick={onEdit}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={onArchive}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Archive size={16} />
                  Archive
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

