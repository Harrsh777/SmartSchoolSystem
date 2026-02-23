'use client';

import { use, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, X, Loader2, Save, AlertCircle, CheckCircle, Trash2, Edit, Filter, Images, ChevronDown, Download, ZoomIn } from 'lucide-react';

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  uploaded_by: string | null;
  uploaded_by_staff?: {
    full_name: string;
  };
  created_at: string;
}

const CATEGORIES = ['All', 'General', 'Events', 'Sports', 'Academics', 'Cultural', 'Other'] as const;

export default function GalleryPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<GalleryImage | null>(null);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    file: null as File | null,
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const categories = CATEGORIES;

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, selectedCategory]);

  useEffect(() => {
    // Check if user is admin/principal
    const storedStaff = sessionStorage.getItem('staff');
    if (storedStaff) {
      try {
        const staff = JSON.parse(storedStaff);
        const role = (staff.role || '').toLowerCase();
        const designation = (staff.designation || '').toLowerCase();
        setIsAdmin(
          role.includes('admin') ||
          role.includes('principal') ||
          designation.includes('admin') ||
          designation.includes('principal')
        );
      } catch {
        // If no staff in session, assume admin (main dashboard)
        setIsAdmin(true);
      }
    } else {
      // If no staff in session, assume admin (main dashboard)
      setIsAdmin(true);
    }
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError('');
      const categoryParam = selectedCategory === 'all' || !selectedCategory ? '' : `&category=${encodeURIComponent(selectedCategory)}`;
      const response = await fetch(`/api/gallery?school_code=${schoolCode}${categoryParam}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setImages(Array.isArray(result.data) ? result.data : []);
      } else {
        setError(result.error || 'Failed to load images');
        setImages([]);
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Failed to load images');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const openViewer = (image: GalleryImage) => {
    setViewerImage(image);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerImage(null);
  };

  const handleDownload = (image: GalleryImage) => {
    try {
      const link = document.createElement('a');
      link.href = image.image_url;
      link.download = `${image.title.replace(/[^a-z0-9]/gi, '_')}.jpg` || 'gallery-image.jpg';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } catch {
      window.open(image.image_url, '_blank');
    }
  };

  const handleOpenModal = (image?: GalleryImage) => {
    if (image) {
      setEditingImage(image);
      setFormData({
        title: image.title,
        description: image.description || '',
        category: image.category,
        file: null,
      });
      setPreview(image.image_url);
    } else {
      setEditingImage(null);
      setFormData({
        title: '',
        description: '',
        category: 'General',
        file: null,
      });
      setPreview(null);
    }
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB');
        return;
      }
      setFormData({ ...formData, file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (editingImage) {
      // Update existing image
      try {
        setSaving(true);
        setError('');
        setSuccess('');

        const response = await fetch(`/api/gallery/${editingImage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            title: formData.title,
            description: formData.description || null,
            category: formData.category,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          setSuccess('Image updated successfully!');
          setModalOpen(false);
          fetchImages();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(result.error || 'Failed to update image');
        }
      } catch (err) {
        console.error('Error updating image:', err);
        setError('Failed to update image');
      } finally {
        setSaving(false);
      }
    } else {
      // Upload new image
      if (!formData.file) {
        setError('Please select an image file');
        return;
      }

      try {
        setUploading(true);
        setError('');
        setSuccess('');

        const uploadFormData = new FormData();
        uploadFormData.append('file', formData.file);
        uploadFormData.append('school_code', schoolCode);
        uploadFormData.append('title', formData.title);
        uploadFormData.append('description', formData.description);
        uploadFormData.append('category', formData.category);

        // Get staff ID from session if available
        const storedStaff = sessionStorage.getItem('staff');
        let staffId: string | null = null;
        if (storedStaff) {
          try {
            const staff = JSON.parse(storedStaff);
            staffId = staff.id || staff.staff_id || null;
          } catch {
            // Ignore
          }
        }

        const response = await fetch('/api/gallery', {
          method: 'POST',
          headers: staffId ? { 'x-staff-id': staffId } : {},
          body: uploadFormData,
        });

        const result = await response.json();

        if (response.ok) {
          setSuccess('Image uploaded successfully!');
          setModalOpen(false);
          fetchImages();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(result.error || 'Failed to upload image');
        }
      } catch (err) {
        console.error('Error uploading image:', err);
        setError('Failed to upload image');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const response = await fetch(`/api/gallery/${imageId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Image deleted successfully!');
        fetchImages();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete image');
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Failed to delete image');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#5A7A95] dark:text-[#6B9BB8]" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] shadow-sm">
              <Images className="text-white" size={26} />
            </div>
            Gallery
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm sm:text-base">
            View and manage gallery images by category
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto shrink-0">
            <Plus size={18} className="mr-2" />
            Add Image
          </Button>
        )}
      </motion.div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <CheckCircle size={20} />
          {success}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}

      {/* Category Filter - compact, collapsible */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setFilterExpanded((e) => !e)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <Filter size={18} className="text-[#5A7A95]" />
            Category: <span className="text-[#5A7A95] dark:text-[#6B9BB8]">{selectedCategory === 'all' ? 'All' : selectedCategory}</span>
          </span>
          <ChevronDown size={20} className={`text-gray-500 transition-transform ${filterExpanded ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {filterExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-100 dark:border-gray-700/50 overflow-hidden"
            >
              <div className="p-3 flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const value = cat === 'All' ? 'all' : cat;
                  const isActive = selectedCategory === value;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(value);
                        setFilterExpanded(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#5A7A95] text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gallery Grid */}
      {images.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border border-gray-200 dark:border-gray-700">
          <Images className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
          <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">No images in this category</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {selectedCategory === 'all' ? 'Add your first image to get started' : `Try "All" or add images in ${selectedCategory}.`}
          </p>
          {selectedCategory !== 'all' && (
            <Button variant="outline" className="mt-4" onClick={() => setSelectedCategory('all')}>
              Show all categories
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="group"
            >
              <Card
                className="p-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-[#5A7A95]/30 dark:hover:border-[#6B9BB8]/30 transition-all cursor-pointer"
                onClick={() => openViewer(image)}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={image.image_url}
                    alt={image.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized={image.image_url.startsWith('http')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                    <span className="flex items-center gap-1.5 text-white text-sm font-medium">
                      <ZoomIn size={16} />
                      Click to view
                    </span>
                  </div>
                  {isAdmin && (
                    <div
                      className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(image); }}
                        className="bg-white/95 hover:bg-white shadow border-0 h-8 w-8 p-0"
                        aria-label="Edit"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleDelete(image.id); }}
                        className="bg-white/95 hover:bg-white text-red-600 border-0 h-8 w-8 p-0 shadow"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-tight line-clamp-2">{image.title}</h3>
                  {image.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-snug">{image.description}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-[#5A7A95]/10 dark:bg-[#6B9BB8]/20 text-[#5A7A95] dark:text-[#6B9BB8] text-xs font-medium">
                      {image.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      {new Date(image.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Image Viewer Modal - click to open full size & download */}
      <AnimatePresence>
        {viewerOpen && viewerImage && (
          <motion.div
            key={viewerImage.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={closeViewer}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-4">{viewerImage.title}</h2>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(viewerImage)}>
                    <Download size={16} className="mr-1" />
                    Download
                  </Button>
                  {isAdmin && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => { closeViewer(); handleOpenModal(viewerImage); }}>
                        <Edit size={16} className="mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(viewerImage.id)} className="text-red-600 border-red-200">
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={closeViewer}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
                <div className="relative flex-1 min-h-[240px] sm:min-h-[400px] bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={viewerImage.image_url}
                    alt={viewerImage.title}
                    fill
                    className="object-contain"
                    unoptimized={viewerImage.image_url.startsWith('http')}
                    sizes="100vw"
                  />
                </div>
                <div className="w-full sm:w-72 p-4 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-700 flex flex-col gap-3 overflow-y-auto">
                  {viewerImage.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{viewerImage.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-md bg-[#5A7A95]/10 text-[#5A7A95] dark:text-[#6B9BB8] text-xs font-medium">
                      {viewerImage.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(viewerImage.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {viewerImage.uploaded_by_staff?.full_name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Uploaded by {viewerImage.uploaded_by_staff.full_name}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingImage ? 'Edit Image' : 'Add New Image'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg"
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {!editingImage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Image File *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                    {preview ? (
                      <div className="space-y-4">
                        <div className="relative max-h-64 mx-auto rounded-lg aspect-video">
                          <Image
                            src={preview}
                            alt="Preview"
                            fill
                            className="object-contain rounded-lg"
                            unoptimized
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData({ ...formData, file: null });
                            setPreview(null);
                          }}
                        >
                          Change Image
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Images className="text-gray-400 mb-2" size={48} />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            PNG, JPG, GIF up to 10MB
                          </p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter image title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter image description (optional)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A95] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A95] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="General">General</option>
                  <option value="Events">Events</option>
                  <option value="Sports">Sports</option>
                  <option value="Academics">Academics</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={uploading || saving || !formData.title.trim()}
              >
                {uploading || saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    {uploading ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    {editingImage ? 'Update' : 'Upload'}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

