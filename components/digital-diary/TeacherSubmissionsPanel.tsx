'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Loader2, Search, Clock } from 'lucide-react';
import type { StudentSubmissionRow } from './types';
import { SubmissionStatusChip } from './SubmissionStatusChip';
import { SubmissionFilePreview } from './SubmissionFilePreview';

function formatSubmissionTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type Props = {
  diaryId: string;
  diaryTitle: string;
  open: boolean;
  onClose: () => void;
};

const emptySummary = { eligible: 0, submitted: 0, pending: 0, late: 0, submission_rate_pct: 0 };

export function TeacherSubmissionsPanel({ diaryId, diaryTitle, open, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StudentSubmissionRow[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'Pending' | 'Submitted' | 'Late'>('all');

  const load = useCallback(async () => {
    if (!diaryId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/diary/${diaryId}/submissions`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.data) {
        setRows(json.data.students || []);
        setSummary(json.data.summary || emptySummary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [diaryId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const filtered = rows.filter((r) => {
    if (filter !== 'all' && r.submission_chip !== filter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = String(r.student.name || '').toLowerCase();
    const adm = String(r.student.admission_no || '').toLowerCase();
    return name.includes(q) || adm.includes(q);
  });

  const progress = summary.eligible > 0 ? Math.round((summary.submitted / summary.eligible) * 100) : 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"
      >
        <motion.div className="p-5 border-b bg-gradient-to-r from-emerald-50 to-white">
          <motion.div className="flex justify-between gap-3">
            <motion.div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Submissions</p>
              <h2 className="text-lg font-bold line-clamp-2">{diaryTitle}</h2>
            </motion.div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </motion.div>
          <motion.div className="mt-4">
            <motion.div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{summary.submitted} / {summary.eligible} submitted</span>
              <span>{progress}%</span>
            </motion.div>
            <motion.div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <motion.div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
            </motion.div>
            <p className="text-xs text-gray-500 mt-2">Pending: {summary.pending} · Late: {summary.late}</p>
          </motion.div>
        </motion.div>

        <motion.div className="p-4 border-b space-y-3 sticky top-0 bg-white z-10">
          <motion.div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl"
            />
          </motion.div>
          <motion.div className="flex gap-2 flex-wrap">
            {(['all', 'Pending', 'Submitted', 'Late'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs ${filter === f ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </motion.div>
        </motion.div>

        <motion.div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <motion.div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div className="text-center py-12 text-gray-500">
              <Users className="mx-auto mb-2 opacity-40" size={40} />
              <p>No students match this filter.</p>
            </motion.div>
          ) : (
            filtered.map((row) => {
              const submittedAt = formatSubmissionTimestamp(row.submission?.submitted_at);
              const updatedAt =
                !submittedAt && row.submission?.updated_at
                  ? formatSubmissionTimestamp(row.submission.updated_at)
                  : null;

              return (
                <motion.div key={row.student.id} className="rounded-xl border p-4 bg-white shadow-sm">
                  <motion.div className="flex justify-between gap-2 items-start">
                    <motion.div className="min-w-0">
                      <p className="font-semibold">{row.student.name || 'Student'}</p>
                      <p className="text-xs text-gray-500">
                        {row.student.class}
                        {row.student.section ? `-${row.student.section}` : ''}
                      </p>
                      {(submittedAt || updatedAt) && (
                        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                          <Clock size={12} className="shrink-0" />
                          <span>
                            {submittedAt ? `Submitted ${submittedAt}` : `Updated ${updatedAt}`}
                          </span>
                        </p>
                      )}
                      {row.submission?.student_comment ? (
                        <p className="text-xs text-gray-600 mt-2 italic line-clamp-2">
                          &ldquo;{row.submission.student_comment}&rdquo;
                        </p>
                      ) : null}
                    </motion.div>
                    <SubmissionStatusChip status={row.submission_chip} />
                  </motion.div>
                  {row.submission?.files?.length ? (
                    <motion.div className="mt-3 space-y-2">
                      {row.submission.files.map((f) => (
                        <SubmissionFilePreview key={f.id} diaryId={diaryId} file={f} />
                      ))}
                    </motion.div>
                  ) : null}
                </motion.div>
              );
            })
          )}
        </motion.div>
      </motion.aside>
    </AnimatePresence>
  );
}
