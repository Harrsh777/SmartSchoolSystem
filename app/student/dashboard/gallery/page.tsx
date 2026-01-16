'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import { Loader2, Filter, Images } from 'lucide-react';

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  created_at: string;
}

export default function StudentGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [schoolCode, setSchoolCode] = useState('');

  const categories = ['All', 'General', 'Events', 'Sports', 'Academics', 'Cultural', 'Other'];

  useEffect(() => {
    // Get school code from session
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      try {
        const student = JSON.parse(storedStudent);
        setSchoolCode(student.school_code || '');
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
              <Card className="p-0 overflow-hidden">
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <Image
                    src={image.image_url}
                    alt={image.title}
                    fill
                    className="object-cover"
                  />
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
    </div>
  );
}

