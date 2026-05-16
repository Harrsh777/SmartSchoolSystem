import type { SubmissionChip } from './types';

const STYLES: Record<SubmissionChip, string> = {
  Submitted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Late: 'bg-red-100 text-red-800 border-red-200',
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Returned: 'bg-violet-100 text-violet-800 border-violet-200',
  NONE: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function SubmissionStatusChip({ status }: { status: SubmissionChip }) {
  if (status === 'NONE') return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STYLES[status]}`}>
      {status}
    </span>
  );
}
