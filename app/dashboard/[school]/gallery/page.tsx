'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Image, Plus, X, Loader2, Save, AlertCircle, CheckCircle, Trash2, Edit, Filter } from 'lucide-react';

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

export default function GalleryPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    file: null as File | null,
  });
  const [preview, setPreview] = useState<string | null>(null);

  const categories = ['All', 'General', 'Events', 'Sports', 'Academics', 'Cultural', 'Other'];

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, selectedCategory]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const categoryParam = selectedCategory === 'all' ? '' : `&category=${selectedCategory}`;
      const response = await fetch(`/api/gallery?school_code=${schoolCode}${categoryParam}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setImages(result.data);
      } else {
        setError(result.error || 'Failed to load images');
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Failed to load images');
    } finally {
      setLoading(false);
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

        // Get current user from session
        const storedSchool = sessionStorage.getItem('school');
        if (storedSchool) {
          try {
            JSON.parse(storedSchool);
            // You might need to get staff_id from somewhere
            // For now, we'll leave it null
          } catch {
            // Ignore
          }
        }

        const response = await fetch('/api/gallery', {
          method: 'POST',
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Image className="text-indigo-600" size={32} alt="Gallery icon" />
              Gallery
            </h1>
            <p className="text-gray-600 mt-2">
              Manage gallery images for {schoolCode}
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={18} className="mr-2" />
            Add Image
          </Button>
        </div>
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

      {/* Category Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={20} className="text-gray-600" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === 'All' ? 'all' : cat.toLowerCase())}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                (cat === 'All' && selectedCategory === 'all') ||
                (cat !== 'All' && selectedCategory === cat.toLowerCase())
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </Card>

      {/* Gallery Grid */}
      {images.length === 0 ? (
        <Card className="p-12 text-center">
          <Image className="mx-auto mb-4 text-gray-400" size={48} alt="No images icon" />
          <p className="text-gray-600 text-lg">No images found</p>
          <p className="text-gray-500 text-sm mt-2">Add your first image to get started</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-0 overflow-hidden group hover:shadow-lg transition-all">
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.image_url}
                    alt={image.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenModal(image)}
                      className="bg-white/90 hover:bg-white"
                    >
                      <Edit size={14} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(image.id)}
                      className="bg-white/90 hover:bg-white text-red-600 border-red-300"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1">{image.title}</h3>
                  {image.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{image.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                      {image.category}
                    </span>
                    <span>{new Date(image.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingImage ? 'Edit Image' : 'Add New Image'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {!editingImage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image File *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {preview ? (
                      <div className="space-y-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt="Preview"
                          className="max-h-64 mx-auto rounded-lg"
                        />
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
                          <Image className="text-gray-400 mb-2" size={48} alt="Upload icon" />
                          <p className="text-sm text-gray-600">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, GIF up to 10MB
                          </p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter image title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter image description (optional)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
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

