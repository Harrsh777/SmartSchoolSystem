'use client';

import { type LucideIcon } from 'lucide-react';
import Button from '@/components/ui/Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  /** Optional smaller variant for inline use */
  compact?: boolean;
}

/**
 * Reusable empty state for list views, tables, and dashboards.
 * Use when there is no data to display so users get a clear, helpful message.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8 px-4' : 'py-12 md:py-16 px-6'
      } ${className}`}
    >
      <div
        className={`rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 ${
          compact ? 'w-14 h-14 mb-3' : 'w-20 h-20 mb-4'
        }`}
      >
        <Icon size={compact ? 28 : 40} />
      </div>
      <h3 className={`font-semibold text-gray-900 ${compact ? 'text-base' : 'text-lg md:text-xl'}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-gray-500 mt-1 max-w-sm mx-auto ${compact ? 'text-sm' : 'text-sm md:text-base'}`}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className={`mt-4 ${compact ? 'text-sm' : ''}`}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
