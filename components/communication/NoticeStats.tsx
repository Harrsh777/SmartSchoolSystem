'use client';

import Card from '@/components/ui/Card';
import { Bell, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import type { Notice } from '@/lib/supabase';

interface NoticeStatsProps {
  notices: Notice[];
  onStatClick: (key: string, value: string) => void;
}

export default function NoticeStats({ notices, onStatClick }: NoticeStatsProps) {
  const stats = [
    {
      title: 'Total Notices',
      value: notices.length,
      icon: Bell,
      color: 'bg-blue-500',
      onClick: () => onStatClick('status', 'all'),
    },
    {
      title: 'Active Notices',
      value: notices.filter(n => n.status === 'Active').length,
      icon: CheckCircle,
      color: 'bg-green-500',
      onClick: () => onStatClick('status', 'Active'),
    },
    {
      title: 'High Priority',
      value: notices.filter(n => n.priority === 'High').length,
      icon: AlertTriangle,
      color: 'bg-red-500',
      onClick: () => onStatClick('priority', 'High'),
    },
    {
      title: 'Draft Notices',
      value: notices.filter(n => n.status === 'Draft').length,
      icon: FileText,
      color: 'bg-gray-500',
      onClick: () => onStatClick('status', 'Draft'),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            hover
            className="cursor-pointer"
            onClick={stat.onClick}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-black">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon className="text-white" size={24} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

