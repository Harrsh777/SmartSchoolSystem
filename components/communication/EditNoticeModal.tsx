'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Paperclip, ExternalLink } from 'lucide-react';
import { parseNoticeAttachmentUrls, type Notice } from '@/lib/supabase';

interface EditNoticeModalProps {
  schoolCode: string;
  notice: Notice;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditNoticeModal({
  schoolCode,
  notice,
  onClose,
  onSuccess,
}: EditNoticeModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: notice.title,
    content: notice.content,
    category: notice.category,
    priority: notice.priority,
    status: notice.status,
    publish_at: notice.publish_at ? new Date(notice.publish_at).toISOString().slice(0, 16) : '',
    scheduleForLater: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keptAttachmentUrls, setKeptAttachmentUrls] = useState<string[]>(() =>
    parseNoticeAttachmentUrls(notice.attachment_url)
  );
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_ATTACHMENTS = 10;

  useEffect(() => {
    setKeptAttachmentUrls(parseNoticeAttachmentUrls(notice.attachment_url));
    setNewAttachmentFiles([]);
  }, [notice.id, notice.attachment_url]);

  useEffect(() => {
    if (notice.publish_at) {
      setFormData(prev => ({
        ...prev,
        publish_at: new Date(notice.publish_at!).toISOString().slice(0, 16),
        scheduleForLater: notice.status === 'Draft',
      }));
    }
  }, [notice.publish_at, notice.status]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    const trimmed = formData.content.trim();
    const attachmentCount = keptAttachmentUrls.length + newAttachmentFiles.length;
    if (!trimmed) {
      newErrors.content = 'Content is required';
    } else if (attachmentCount === 0 && trimmed.length < 10) {
      newErrors.content = 'Content must be at least 10 characters (or keep/add a PDF/image attachment)';
    } else if (attachmentCount > 0 && trimmed.length < 5) {
      newErrors.content = 'Add at least 5 characters describing the notice or attachment.';
    }

    if (keptAttachmentUrls.length + newAttachmentFiles.length > MAX_ATTACHMENTS) {
      newErrors.attachments = `At most ${MAX_ATTACHMENTS} attachments per notice`;
    }

    if (formData.scheduleForLater && !formData.publish_at) {
      newErrors.publish_at = 'Please select a publish date and time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadNewAttachments = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of newAttachmentFiles) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('school_code', schoolCode);
      const res = await fetch('/api/communication/notices/attachment', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : 'Upload failed');
      }
      if (typeof json.url === 'string') urls.push(json.url);
    }
    return urls;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const uploadedUrls = newAttachmentFiles.length > 0 ? await uploadNewAttachments() : [];
      const allUrls = [...keptAttachmentUrls, ...uploadedUrls];
      const attachment_url = allUrls.length > 0 ? allUrls.join('\n') : null;

      interface UpdateData {
        title: string;
        content: string;
        category: string;
        priority: string;
        status?: string;
        publish_at?: string | null;
        attachment_url?: string | null;
        [key: string]: unknown;
      }
      const updateData: UpdateData = {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        attachment_url,
      };

      if (formData.status === 'Active' && !notice.publish_at) {
        updateData.publish_at = formData.scheduleForLater && formData.publish_at
          ? new Date(formData.publish_at).toISOString()
          : new Date().toISOString();
      } else if (formData.scheduleForLater && formData.publish_at) {
        updateData.publish_at = new Date(formData.publish_at).toISOString();
      }

      const response = await fetch(`/api/communication/notices/${notice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...updateData,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        alert(result.error || 'Failed to update notice');
      }
    } catch (error) {
      console.error('Error updating notice:', error);
      alert('Failed to update notice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">Edit Notice</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Section 1: Basic Info */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Enter notice title"
                    required
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    >
                      <option value="General">General</option>
                      <option value="Examination">Examination</option>
                      <option value="Holiday">Holiday</option>
                      <option value="Event">Event</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleChange('priority', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value as 'Active' | 'Inactive' | 'Archived')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    disabled={notice.status === 'Archived'}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    {notice.status === 'Archived' && (
                      <option value="Archived">Archived</option>
                    )}
                  </select>
                  {notice.status === 'Archived' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Archived notices cannot be edited
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Content */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">Content</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notice Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Write the notice exactly as you want parents and students to read it."
                  required
                  disabled={notice.status === 'Archived'}
                />
                <div className="flex justify-between items-center mt-2">
                  {errors.content && (
                    <p className="text-red-600 text-sm">{errors.content}</p>
                  )}
                  <p className="text-sm text-gray-500 ml-auto">
                    {formData.content.length} characters
                  </p>
                </div>
              </div>

              {notice.status !== 'Archived' && (
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Attachments
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    PDF and images (JPEG, PNG, WebP, GIF, HEIC). Stored in Supabase bucket{' '}
                    <span className="font-mono">school-media</span>. Up to {MAX_ATTACHMENTS} files total, 10MB each.
                  </p>
                  {keptAttachmentUrls.length > 0 ? (
                    <ul className="space-y-2 mb-4">
                      {keptAttachmentUrls.map((url) => (
                        <li
                          key={url}
                          className="flex flex-wrap items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2"
                        >
                          <Paperclip size={14} className="text-gray-500 shrink-0" />
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:underline truncate flex-1 min-w-0 inline-flex items-center gap-1"
                          >
                            {url.split('/').pop() || 'File'}
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                          <button
                            type="button"
                            className="text-red-600 hover:underline shrink-0"
                            onClick={() =>
                              setKeptAttachmentUrls((prev) => prev.filter((u) => u !== url))
                            }
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3">No attachments on this notice yet.</p>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
                    className="hidden"
                    onChange={(e) => {
                      const picked = e.target.files ? Array.from(e.target.files) : [];
                      const room = MAX_ATTACHMENTS - keptAttachmentUrls.length;
                      if (picked.length > room) {
                        setNewAttachmentFiles([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        setErrors((prev) => ({
                          ...prev,
                          attachments:
                            room <= 0
                              ? `This notice already has ${MAX_ATTACHMENTS} attachments. Remove one to add more.`
                              : `You can add at most ${room} more file(s) (${MAX_ATTACHMENTS} total per notice).`,
                        }));
                        return;
                      }
                      setNewAttachmentFiles(picked);
                      if (errors.attachments) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.attachments;
                          return next;
                        });
                      }
                    }}
                  />
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        Add files
                      </Button>
                      {newAttachmentFiles.length > 0 ? (
                        <button
                          type="button"
                          className="text-sm text-red-600 hover:underline"
                          onClick={() => {
                            setNewAttachmentFiles([]);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          Clear new files
                        </button>
                      ) : null}
                    </div>
                    {errors.attachments ? (
                      <p className="text-red-600 text-sm">{errors.attachments}</p>
                    ) : null}
                    {newAttachmentFiles.length > 0 ? (
                      <ul className="text-sm text-gray-700 list-disc pl-5 space-y-0.5 max-h-28 overflow-y-auto">
                        {newAttachmentFiles.map((f) => (
                          <li key={`${f.name}-${f.size}`} className="truncate">
                            New: {f.name}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Publishing */}
            {notice.status !== 'Archived' && (
              <div>
                <h3 className="text-lg font-semibold text-black mb-4">Publishing</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="scheduleForLater"
                      checked={formData.scheduleForLater}
                      onChange={(e) => handleChange('scheduleForLater', e.target.checked)}
                      className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                    />
                    <label htmlFor="scheduleForLater" className="text-sm font-medium text-gray-700">
                      Schedule for later
                    </label>
                  </div>

                  {formData.scheduleForLater && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Publish Date & Time <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="datetime-local"
                        value={formData.publish_at}
                        onChange={(e) => handleChange('publish_at', e.target.value)}
                        required={formData.scheduleForLater}
                      />
                      {errors.publish_at && (
                        <p className="text-red-600 text-sm mt-1">{errors.publish_at}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {notice.status !== 'Archived' && (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

