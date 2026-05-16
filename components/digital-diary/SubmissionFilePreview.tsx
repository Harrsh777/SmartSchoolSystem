'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, ImageIcon, Loader2, ExternalLink } from 'lucide-react';
import type { DiarySubmissionFile } from './types';

function isImageFile(file: DiarySubmissionFile): boolean {
  const mime = (file.mime_type || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.file_name || '');
}

function isPdfFile(file: DiarySubmissionFile): boolean {
  const mime = (file.mime_type || '').toLowerCase();
  return mime === 'application/pdf' || /\.pdf$/i.test(file.file_name || '');
}

type Props = {
  diaryId: string;
  file: DiarySubmissionFile;
};

export function SubmissionFilePreview({ diaryId, file }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSignedUrl = useCallback(async () => {
    const res = await fetch('/api/diary/submissions/signed-url', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diary_id: diaryId, storage_path: file.storage_path }),
    });
    const json = await res.json();
    if (!res.ok || !json.url) throw new Error(json.error || 'Failed to load file');
    return json.url as string;
  }, [diaryId, file.storage_path]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void fetchSignedUrl()
      .then((url) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchSignedUrl]);

  const openInNewTab = () => {
    if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async () => {
    try {
      const url = signedUrl || (await fetchSignedUrl());
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.file_name || 'submission';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const image = isImageFile(file);
  const pdf = isPdfFile(file);

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center h-28 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="p-3 text-xs text-red-600">Could not load preview</div>
      ) : image && signedUrl ? (
        <button
          type="button"
          onClick={openInNewTab}
          className="block w-full group"
          title="Open full size"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt={file.file_name}
            className="w-full max-h-36 object-contain bg-gray-100 group-hover:opacity-95"
          />
        </button>
      ) : pdf && signedUrl ? (
        <iframe
          src={signedUrl}
          title={file.file_name}
          className="w-full h-36 bg-white border-0"
        />
      ) : (
        <div className="flex items-center justify-center h-20 bg-white">
          {pdf ? (
            <FileText className="text-red-500" size={36} />
          ) : (
            <ImageIcon className="text-gray-400" size={36} />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 p-2 border-t border-gray-100 bg-white">
        <p className="flex-1 text-xs text-gray-700 truncate" title={file.file_name}>
          {file.file_name}
        </p>
        <div className="flex shrink-0 gap-1">
          {signedUrl ? (
            <button
              type="button"
              onClick={openInNewTab}
              className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100"
              title="Open"
            >
              <ExternalLink size={14} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={loading || error}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
