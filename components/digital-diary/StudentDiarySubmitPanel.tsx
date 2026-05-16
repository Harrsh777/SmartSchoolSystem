'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Paperclip,
  FileArchive,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import type { SubmissionChip } from './types';
import { SubmissionStatusChip } from './SubmissionStatusChip';

export type StudentDiaryItem = {
  id: string;
  title: string;
  content: string | null;
  type: string;
  created_by?: string;
  created_at?: string;
  due_at?: string | null;
  instructions?: string | null;
  submissions_allowed?: boolean;
  allow_late_submission?: boolean;
  max_submission_attempts?: number;
  attachments: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type?: string | null;
    file_size?: number | null;
  }>;
  submission?: {
    id: string;
    status: string;
    submitted_at?: string | null;
    is_late: boolean;
    attempt_count: number;
    student_comment?: string | null;
    files?: Array<{ id: string; file_name: string; storage_path?: string }>;
  } | null;
  submission_chip?: SubmissionChip;
};

function dueCountdown(dueAt: string | null | undefined): { label: string; urgent: boolean } {
  if (!dueAt) return { label: 'No due date', urgent: false };
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff < 0) return { label: 'Past due', urgent: true };
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return { label: `${d}d ${h % 24}h left`, urgent: d < 2 };
  if (h > 0) return { label: `${h}h left`, urgent: h < 24 };
  const m = Math.floor(diff / 60000);
  return { label: `${m}m left`, urgent: true };
}

type Props = {
  diary: StudentDiaryItem;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
};

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type PreviewKind = 'image' | 'pdf' | 'none';

function attachmentPreviewKind(att: {
  file_name: string;
  file_type?: string | null;
}): PreviewKind {
  const type = (att.file_type || '').toUpperCase();
  if (type === 'IMAGE') return 'image';
  if (type === 'PDF') return 'pdf';
  const ext = att.file_name.includes('.')
    ? att.file_name.split('.').pop()?.toLowerCase()
    : '';
  if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'none';
}

async function fetchStudentAttachmentUrl(
  diaryId: string,
  attachmentId: string
): Promise<{ url: string; file_name: string } | null> {
  const res = await fetch('/api/student/diary/attachment-url', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diary_id: diaryId, attachment_id: attachmentId }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    file_name?: string;
    error?: string;
    details?: string;
  };
  if (!res.ok || !json.url) {
    throw new Error(
      [json.error, json.details].filter(Boolean).join('\n\n') ||
        (res.status === 401
          ? 'Please sign in again at the student portal to open attachments.'
          : 'Could not load attachment')
    );
  }
  return { url: json.url, file_name: json.file_name || '' };
}

async function downloadAttachmentFile(url: string, fileName: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

function TeacherAttachmentPreview({
  url,
  kind,
  fileName,
}: {
  url: string;
  kind: PreviewKind;
  fileName: string;
}) {
  if (kind === 'image') {
    return (
      <div className="rounded-lg border border-input bg-black/5 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={fileName}
          className="w-full max-h-52 object-contain mx-auto"
        />
      </div>
    );
  }
  if (kind === 'pdf') {
    return (
      <iframe
        src={url}
        title={`Preview: ${fileName}`}
        className="w-full h-56 rounded-lg border border-input bg-white"
      />
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-dashed border-input bg-muted/30 text-muted-foreground">
      <FileArchive size={28} className="opacity-60" />
      <p className="text-xs text-center px-4">Preview not available for this file type</p>
    </div>
  );
}

export function StudentDiarySubmitPanel({ diary, open, onClose, onSubmitted }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [attachmentUrlErrors, setAttachmentUrlErrors] = useState<Record<string, string>>({});
  const [loadingAttachmentUrls, setLoadingAttachmentUrls] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);

  const canSubmit =
    (diary.type === 'HOMEWORK' || diary.type === 'ASSIGNMENT') &&
    diary.submissions_allowed !== false;

  const chip = diary.submission_chip || 'NONE';
  const countdown = dueCountdown(diary.due_at);
  const alreadyDone = chip === 'Submitted' || chip === 'Late';
  const attemptsLeft =
    (diary.max_submission_attempts || 3) - (diary.submission?.attempt_count || 0);

  useEffect(() => {
    if (open) {
      setFiles([]);
      setComment(diary.submission?.student_comment || '');
      setConfirmOpen(false);
    }
  }, [open, diary]);

  const attachmentIdsKey = diary.attachments?.map((a) => a.id).join(',') ?? '';

  useEffect(() => {
    if (!open || !diary.attachments?.length) {
      setAttachmentUrls({});
      setAttachmentUrlErrors({});
      setLoadingAttachmentUrls(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingAttachmentUrls(true);
      setAttachmentUrlErrors({});
      const nextUrls: Record<string, string> = {};
      const nextErrors: Record<string, string> = {};

      await Promise.all(
        diary.attachments.map(async (att) => {
          try {
            const result = await fetchStudentAttachmentUrl(diary.id, att.id);
            if (result) nextUrls[att.id] = result.url;
          } catch (e) {
            nextErrors[att.id] = (e as Error).message;
          }
        })
      );

      if (!cancelled) {
        setAttachmentUrls(nextUrls);
        setAttachmentUrlErrors(nextErrors);
        setLoadingAttachmentUrls(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, diary.id, attachmentIdsKey]);

  const handleDownloadAttachment = useCallback(
    async (attachmentId: string, fileName: string) => {
      setDownloadingAttachmentId(attachmentId);
      try {
        let url = attachmentUrls[attachmentId];
        if (!url) {
          const result = await fetchStudentAttachmentUrl(diary.id, attachmentId);
          if (!result) return;
          url = result.url;
          setAttachmentUrls((prev) => ({ ...prev, [attachmentId]: url }));
        }
        await downloadAttachmentFile(url, fileName);
      } catch (e) {
        alert((e as Error).message);
      } finally {
        setDownloadingAttachmentId(null);
      }
    },
    [attachmentUrls, diary.id]
  );

  const addFiles = (list: FileList | File[]) => {
    const next = [...files, ...Array.from(list)];
    setFiles(next);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadDraft = useCallback(async () => {
    if (!files.length) return;
    setUploading(true);
    setUploadPct(10);
    const fd = new FormData();
    fd.append('diary_id', diary.id);
    fd.append('finalize', '0');
    if (comment.trim()) fd.append('comment', comment.trim());
    files.forEach((f) => fd.append('file', f));
    setUploadPct(50);
    const res = await fetch('/api/student/diary/submit', {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    setUploadPct(100);
    setUploading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const body = j as { error?: string; details?: string; hint?: string };
      alert(
        [body.error, body.details, body.hint].filter(Boolean).join('\n\n') ||
          (res.status === 401
            ? 'Please sign in again at the student portal to upload work.'
            : 'Upload failed')
      );
      return;
    }
    setFiles([]);
    onSubmitted();
  }, [files, comment, diary.id, onSubmitted]);

  const finalizeSubmit = async () => {
    setConfirmOpen(false);
    setUploading(true);
    setUploadPct(15);
    const fd = new FormData();
    fd.append('diary_id', diary.id);
    fd.append('finalize', '1');
    if (comment.trim()) fd.append('comment', comment.trim());
    files.forEach((f) => fd.append('file', f));
    setUploadPct(60);
    const res = await fetch('/api/student/diary/submit', {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    setUploadPct(100);
    setUploading(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const body = j as { error?: string; details?: string; hint?: string };
      const msg =
        [body.error, body.details, body.hint].filter(Boolean).join('\n\n') ||
        (res.status === 401
          ? 'Please sign in again at the student portal to submit work.'
          : 'Submission failed');
      alert(msg);
      return;
    }
    onSubmitted();
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
          >
            <motion.div className="p-5 border-b flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">{diary.type}</p>
                <h2 className="text-xl font-bold text-foreground">{diary.title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <SubmissionStatusChip status={chip} />
                  {diary.due_at ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        countdown.urgent ? 'bg-orange-100 text-orange-800' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Clock size={12} />
                      {countdown.label}
                    </span>
                  ) : null}
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
                <X size={20} />
              </button>
            </motion.div>

            <div className="p-5 space-y-4">
              {diary.content ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{diary.content}</p>
              ) : null}
              {diary.instructions ? (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-900">
                  <p className="font-semibold text-xs uppercase mb-1">Instructions</p>
                  {diary.instructions}
                </div>
              ) : null}

              {diary.attachments?.length ? (
                <motion.div className="rounded-xl border border-input bg-muted/40 p-3 space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <Paperclip size={14} />
                    Teacher attachments
                  </p>
                  <ul className="space-y-4">
                    {diary.attachments.map((att) => {
                      const sizeLabel = formatFileSize(att.file_size);
                      const previewKind = attachmentPreviewKind(att);
                      const signedUrl = attachmentUrls[att.id];
                      const loadError = attachmentUrlErrors[att.id];
                      const isDownloading = downloadingAttachmentId === att.id;

                      return (
                        <li
                          key={att.id}
                          className="rounded-lg bg-background border border-input overflow-hidden"
                        >
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-input text-sm">
                            <FileText size={16} className="text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{att.file_name}</p>
                              {sizeLabel ? (
                                <p className="text-xs text-muted-foreground">{sizeLabel}</p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              disabled={isDownloading || loadingAttachmentUrls}
                              onClick={() => void handleDownloadAttachment(att.id, att.file_name)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-muted text-xs font-medium disabled:opacity-60 shrink-0"
                            >
                              {isDownloading ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Download size={14} />
                              )}
                              Download
                            </button>
                          </div>

                          <div className="p-3">
                            <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">
                              Preview
                            </p>
                            {loadingAttachmentUrls && !signedUrl && !loadError ? (
                              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
                                <Loader2 size={18} className="animate-spin" />
                                Loading preview…
                              </div>
                            ) : null}
                            {loadError ? (
                              <p className="text-xs text-red-600 py-4 text-center">{loadError}</p>
                            ) : null}
                            {signedUrl ? (
                              <TeacherAttachmentPreview
                                url={signedUrl}
                                kind={previewKind}
                                fileName={att.file_name}
                              />
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              ) : null}

              {canSubmit ? (
                <>
                  <motion.div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      dragOver ? 'border-primary bg-primary/5' : 'border-input'
                    }`}
                  >
                    <Upload className="mx-auto mb-2 text-muted-foreground" size={28} />
                    <p className="text-sm text-muted-foreground mb-2">Drag & drop or tap to add files</p>
                    <p className="text-xs text-muted-foreground mb-3">PDF, images, DOCX, ZIP (max 25MB each)</p>
                    <label className="inline-block">
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.zip"
                        onChange={(e) => e.target.files && addFiles(e.target.files)}
                      />
                      <span className="inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer">
                        Choose files
                      </span>
                    </label>
                  </motion.div>

                  {files.length > 0 ? (
                    <ul className="space-y-2">
                      {files.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted text-sm"
                        >
                          <FileText size={16} className="text-primary shrink-0" />
                          <span className="flex-1 truncate">{f.name}</span>
                          <button type="button" onClick={() => removeFile(i)} className="text-red-600">
                            <X size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Optional note for your teacher..."
                    rows={3}
                    className="w-full px-3 py-2 border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />

                  {uploading ? (
                    <div>
                      <motion.div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${uploadPct}%` }}
                        />
                      </motion.div>
                      <p className="text-xs text-muted-foreground mt-1 text-center">Uploading…</p>
                    </div>
                  ) : null}

                  <div className="flex flex-col sm:flex-row gap-2">
                    {files.length > 0 && !alreadyDone ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={uploading}
                        onClick={() => void uploadDraft()}
                      >
                        Save draft
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={uploading || (alreadyDone && attemptsLeft <= 0)}
                      onClick={() => {
                        if (files.length === 0 && !diary.submission?.files?.length) {
                          alert('Add at least one file before submitting.');
                          return;
                        }
                        setConfirmOpen(true);
                      }}
                    >
                      {alreadyDone ? 'Resubmit work' : 'Submit assignment'}
                    </Button>
                 </div>
                  {alreadyDone && attemptsLeft > 0 ? (
                    <p className="text-xs text-muted-foreground text-center">
                      {attemptsLeft} resubmit attempt(s) remaining
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle size={16} />
                  This entry is view-only (no submission required).
                </p>
              )}
            </div>

            <AnimatePresence>
              {confirmOpen ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center p-6 rounded-2xl"
                >
                  <motion.div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
                    <CheckCircle2 className="text-primary mx-auto mb-3" size={40} />
                    <h3 className="text-lg font-bold text-center mb-2">Confirm submission?</h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      You cannot edit files after final submit unless you use a resubmit attempt.
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="button" className="flex-1" disabled={uploading} onClick={() => void finalizeSubmit()}>
                        {uploading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Confirm'}
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
