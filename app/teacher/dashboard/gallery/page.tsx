'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loader2, Filter, Images, X, Download, ZoomIn } from 'lucide-react';

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  created_at: string;
}

export default function TeacherGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [schoolCode, setSchoolCode] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<GalleryImage | null>(null);

  const categories = ['All', 'General', 'Events', 'Sports', 'Academics', 'Cultural', 'Other'];

  const openViewer = (image: GalleryImage) => {
    setViewerImage(image);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerImage(null);
  };

  const handleDownload = (image: GalleryImage) => {
    const fetchAndDownload = async () => {
      try {
        const response = await fetch(image.image_url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const extension = blob.type.split('/')[1] || 'jpg';
        const safeTitle = image.title.replace(/[^a-z0-9]/gi, '_') || 'gallery-image';
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `${safeTitle}.${extension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      } catch {
        window.open(image.image_url, '_blank', 'noopener,noreferrer');
      }
    };

    void fetchAndDownload();
  };

  const openFullSizeInNewTab = () => {
    if (!viewerImage) return;
    window.open(viewerImage.image_url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    // Get school code from session
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      try {
        const teacher = JSON.parse(storedTeacher);
        setSchoolCode(teacher.school_code || '');
      } catch {
        // Ignore
      }
    }
  }, []);

  useEffect(() => {
    if (schoolCode) {
      fetchImages();
    }
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
      }
    } catch (err) {
      console.error('Error fetching images:', err);
    } finally {
      setLoading(false);
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Images className="text-indigo-600" size={32} />
            Gallery
          </h1>
          <p className="text-gray-600 mt-2">View school gallery images</p>
        </div>
      </motion.div>

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
          <Images className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">No images found</p>
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
              <Card
                className="p-0 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => openViewer(image)}
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <Image
                    src={image.image_url}
                    alt={image.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized={image.image_url.startsWith('http')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3 pointer-events-none">
                    <span className="flex items-center gap-1.5 text-white text-sm font-medium">
                      <ZoomIn size={16} />
                      View full size
                    </span>
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
              className="relative max-w-5xl w-full max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 truncate pr-2 min-w-0">{viewerImage.title}</h2>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(viewerImage)}>
                    <Download size={16} className="mr-1" />
                    Download
                  </Button>
                  <button
                    type="button"
                    onClick={closeViewer}
                    className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden">
                <div className="relative flex-1 min-h-[280px] sm:min-h-[min(70vh,560px)] bg-gray-900">
                  <Image
                    src={viewerImage.image_url}
                    alt={viewerImage.title}
                    fill
                    className="object-contain"
                    unoptimized={viewerImage.image_url.startsWith('http')}
                    sizes="100vw"
                    priority
                  />
                </div>
                <div className="w-full sm:w-72 p-4 border-t sm:border-t-0 sm:border-l border-gray-200 flex flex-col gap-3 overflow-y-auto max-h-[40vh] sm:max-h-none">
                  <Button variant="outline" size="sm" onClick={openFullSizeInNewTab} className="w-full sm:w-auto">
                    <ZoomIn size={16} className="mr-1" />
                    Open full size in new tab
                  </Button>
                  {viewerImage.description && (
                    <p className="text-sm text-gray-600 leading-relaxed">{viewerImage.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 items-center text-xs text-gray-500">
                    <span className="px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 font-medium">
                      {viewerImage.category}
                    </span>
                    <span>{new Date(viewerImage.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

