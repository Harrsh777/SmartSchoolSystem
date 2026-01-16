'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  Camera, 
  Upload, 
  X, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft,
  User,
  Loader2,
  FileImage,
  Search,
  Sparkles,
  Zap,
  Image as ImageIcon,
  Info,
  Check,
  AlertTriangle
} from 'lucide-react';
import type { Staff } from '@/lib/supabase';

interface PhotoFile {
  file: File;
  id: string;
  preview: string;
  matchedStaff: Staff | null;
  matchMethod: 'auto' | 'manual' | null;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  progress?: number;
}

export default function BulkPhotoPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCodeParam } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [uploading, setUploading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  // Get school code from URL param (normalized to uppercase) or sessionStorage as fallback
  const getSchoolCode = useCallback((): string => {
    // First try URL param (normalized to uppercase)
    if (schoolCodeParam) {
      const code = getString(schoolCodeParam);
      return code.toUpperCase();
    }
    
    // Fallback to sessionStorage
    try {
      const storedSchool = sessionStorage.getItem('school');
      if (storedSchool) {
        const schoolData = JSON.parse(storedSchool);
        const code = getString(schoolData.school_code);
        if (code) {
          return code.toUpperCase();
        }
      }
    } catch {
      // Ignore parse errors
    }
    
    return '';
  }, [schoolCodeParam]);

  const schoolCode = getSchoolCode();

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  const fetchStaff = useCallback(async () => {
    if (!schoolCode) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStaff(result.data);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
      showToast('Failed to load staff list', 'error');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, showToast]);

  useEffect(() => {
    if (schoolCode) {
      fetchStaff();
    }
  }, [schoolCode, fetchStaff]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Normalize filename for matching (same logic as backend)
  const normalizeFilename = (filename: string): string => {
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, ''); // Remove special chars, spaces, underscores, hyphens
  };

  // Extract staff ID patterns from filename
  const extractStaffIdPatterns = (filename: string): string[] => {
    const patterns: string[] = [];
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').toLowerCase();
    
    // Pattern 1: STF001, STF-001, STF_001, etc.
    const stfMatch = nameWithoutExt.match(/(?:stf|staff)[\s_-]?(\d+)/i);
    if (stfMatch && stfMatch[1]) {
      patterns.push(`STF${stfMatch[1].padStart(3, '0')}`);
      patterns.push(stfMatch[1]);
    }
    
    // Pattern 2: EMP001, EMP-001, etc.
    const empMatch = nameWithoutExt.match(/(?:emp|employee)[\s_-]?(\d+)/i);
    if (empMatch && empMatch[1]) {
      patterns.push(`EMP${empMatch[1].padStart(3, '0')}`);
      patterns.push(empMatch[1]);
    }
    
    // Pattern 3: Direct number match
    const numMatch = nameWithoutExt.match(/^(\d+)$/);
    if (numMatch) {
      patterns.push(numMatch[1]);
      patterns.push(numMatch[1].padStart(3, '0'));
    }
    
    // Pattern 4: Normalized filename
    patterns.push(normalizeFilename(filename));
    
    return [...new Set(patterns)]; // Remove duplicates
  };

  const extractStaffIdFromFilename = (filename: string): string | null => {
    const patterns = extractStaffIdPatterns(filename);
    const normalizedName = normalizeFilename(filename);

    // Try to match against staff
    for (const staffMember of staff) {
      const staffIdValue = getString(staffMember.staff_id);
      const employeeCodeValue = getString(staffMember.employee_code);
      const normalizedStaffId = normalizeFilename(staffIdValue);
      const normalizedEmployeeCode = normalizeFilename(employeeCodeValue);
      const staffId = staffIdValue.toUpperCase();
      const employeeCode = employeeCodeValue.toUpperCase();
      
      // Try exact match with normalized names
      if (normalizedName === normalizedStaffId || normalizedName === normalizedEmployeeCode) {
        return staffIdValue || employeeCodeValue || null;
      }
      
      // Try pattern matching
      for (const pattern of patterns) {
        const normalizedPattern = normalizeFilename(pattern);
        if (
          normalizedPattern === normalizedStaffId ||
          normalizedPattern === normalizedEmployeeCode ||
          pattern === staffId ||
          pattern === employeeCode
        ) {
          return staffIdValue || employeeCodeValue || null;
        }
      }
    }

    return null;
  };

  const autoMatchPhotos = useCallback((files: File[]) => {
    const newPhotos: PhotoFile[] = files.map((file, index) => {
      const id = `photo-${Date.now()}-${index}`;
      const preview = URL.createObjectURL(file);
      
      const extractedId = extractStaffIdFromFilename(file.name);
      let matchedStaff: Staff | null = null;
      let matchMethod: 'auto' | 'manual' | null = null;

      if (extractedId) {
        matchedStaff = staff.find(s => {
          const sStaffId = getString(s.staff_id);
          const sEmployeeCode = getString(s.employee_code);
          return sStaffId === extractedId || sEmployeeCode === extractedId;
        }) || null;
        if (matchedStaff) {
          matchMethod = 'auto';
        }
      }

      return {
        file,
        id,
        preview,
        matchedStaff,
        matchMethod,
        uploadStatus: 'pending' as const,
        progress: 0,
      };
    });

    setPhotos(prev => [...prev, ...newPhotos]);
    showToast(`${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} added`, 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalidFiles: string[] = [];
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        invalidFiles.push(`${file.name} (not an image)`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(`${file.name} (too large)`);
        return false;
      }
      return true;
    });

    if (invalidFiles.length > 0) {
      showToast(`${invalidFiles.length} file${invalidFiles.length > 1 ? 's' : ''} skipped: ${invalidFiles.slice(0, 2).join(', ')}${invalidFiles.length > 2 ? '...' : ''}`, 'error');
    }

    if (validFiles.length > 0) {
      autoMatchPhotos(validFiles);
    }

    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      autoMatchPhotos(imageFiles);
    } else {
      showToast('Please drop image files only', 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMatchPhotos]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== id);
    });
    showToast('Photo removed', 'info');
  };

  const matchPhotoToStaff = (photoId: string, staffId: string) => {
    const matchedStaff = staff.find(s => s.id === staffId);
    if (matchedStaff) {
      setPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { ...p, matchedStaff, matchMethod: 'manual' }
          : p
      ));
      showToast(`Matched to ${matchedStaff.full_name}`, 'success');
    }
    setSelectedPhotoId(null);
    setSearchQuery('');
  };

  const handleBulkUpload = async () => {
    const photosToUpload = photos.filter(p => p.matchedStaff && p.uploadStatus === 'pending');
    
    if (photosToUpload.length === 0) {
      showToast('Please match at least one photo to a staff member', 'error');
      return;
    }

    // Validate all photos before uploading
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    
    const invalidPhotos: string[] = [];
    const validPhotos = photosToUpload.filter(photo => {
      if (!ALLOWED_TYPES.includes(photo.file.type)) {
        invalidPhotos.push(`${photo.file.name} (invalid file type)`);
        return false;
      }
      if (photo.file.size > MAX_FILE_SIZE) {
        invalidPhotos.push(`${photo.file.name} (file too large, max 5MB)`);
        return false;
      }
      if (!photo.matchedStaff || !photo.matchedStaff.id) {
        invalidPhotos.push(`${photo.file.name} (no staff member matched)`);
        return false;
      }
      return true;
    });

    if (invalidPhotos.length > 0) {
      showToast(`Invalid files detected: ${invalidPhotos.slice(0, 2).join(', ')}${invalidPhotos.length > 2 ? '...' : ''}`, 'error');
      if (validPhotos.length === 0) {
        return;
      }
    }

    setUploading(true);

    // Update all photos to uploading status
    setPhotos(prev => prev.map(p => {
      const photoToUpload = validPhotos.find(vp => vp.id === p.id);
      if (photoToUpload) {
        return { ...p, uploadStatus: 'uploading' as const, progress: 0 };
      }
      return p;
    }));

    try {
      // Get current user staff ID from session storage (once, reuse for both formData and headers)
      const storedStaff = sessionStorage.getItem('staff');
      let staffId = '';
      if (storedStaff) {
        try {
          const staffData = JSON.parse(storedStaff);
          if (staffData.staff_id) {
            staffId = staffData.staff_id;
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Prepare FormData for bulk upload
      const formData = new FormData();
      
      // School code is already normalized to uppercase from getSchoolCode()
      // It should always be available since we're on a school-specific route
      if (!schoolCode) {
        showToast('School code is required. Please refresh the page.', 'error');
        setUploading(false);
        setPhotos(prev => prev.map(p => {
          const photoToUpload = validPhotos.find(vp => vp.id === p.id);
          if (photoToUpload) {
            return { ...p, uploadStatus: 'error' as const, error: 'School code is required' };
          }
          return p;
        }));
        return;
      }
      
      formData.append('school_code', schoolCode);
      if (staffId) {
        formData.append('uploaded_by_staff_id', staffId);
      }

      // Append all files - the backend will match them by filename
      // We need to ensure filenames match staff_id or employee_code for auto-matching
      validPhotos.forEach(photo => {
        // Rename file to match staff_id for better auto-matching
        // Keep original filename but backend will try to match
        formData.append('file', photo.file);
      });

      // Update progress during upload
      const progressInterval = setInterval(() => {
        setPhotos(prev => prev.map(p => {
          const photoToUpload = validPhotos.find(vp => vp.id === p.id);
          if (photoToUpload && p.uploadStatus === 'uploading' && (p.progress === undefined || p.progress < 90)) {
            return { ...p, progress: Math.min((p.progress || 0) + 5, 90) };
          }
          return p;
        }));
      }, 300);

      // Get auth headers from session storage
      const headers: Record<string, string> = {};
      if (staffId) {
        headers['x-staff-id'] = staffId;
      }

      const response = await fetch('/api/staff/photos/bulk', {
        method: 'POST',
        headers,
        body: formData,
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (response.ok && result.data) {
        const uploadData = result.data;
        
        // Map backend results to frontend photos by filename
        const uploadResultsMap = new Map(
          (uploadData.upload_results || []).map((result: { filename: string; [key: string]: unknown }) => [result.filename, result])
        );
        
        const unmatchedFilenames = new Set(
          (uploadData.unmatched_files || []).map((uf: { filename: string }) => uf.filename)
        );

        // Update photos based on backend response
        setPhotos(prev => prev.map(p => {
          const photoToUpload = validPhotos.find(vp => vp.id === p.id);
          if (!photoToUpload) return p;

          const filename = p.file.name;
          
          // Check if unmatched
          if (unmatchedFilenames.has(filename)) {
            return { 
              ...p, 
              uploadStatus: 'error' as const, 
              error: 'Photo could not be matched to staff member. Please match manually.',
              progress: 0
            };
          }

          // Check upload results for this specific file
          const uploadResult = uploadResultsMap.get(filename);
          if (uploadResult) {
            const result = uploadResult as { success?: boolean; error?: string };
            if (result.success) {
              return { 
                ...p, 
                uploadStatus: 'success' as const, 
                progress: 100,
                error: undefined
              };
            } else {
              return { 
                ...p, 
                uploadStatus: 'error' as const, 
                error: getString(result.error) || 'Upload failed',
                progress: 0
              };
            }
          }

          // If no result found but upload count suggests success, mark as success
          // This handles cases where backend matched but didn't return detailed results
          if (uploadData.uploaded > 0 && !unmatchedFilenames.has(filename)) {
            return { 
              ...p, 
              uploadStatus: 'success' as const, 
              progress: 100 
            };
          }

          return p;
        }));

        // Show success message
        const successMessage = uploadData.status === 'completed'
          ? `Successfully uploaded all ${uploadData.uploaded} photo${uploadData.uploaded !== 1 ? 's' : ''}!`
          : uploadData.status === 'partial'
          ? `Uploaded ${uploadData.uploaded} of ${uploadData.total_files} photos. ${uploadData.failed} failed.`
          : `Upload completed with ${uploadData.uploaded} successful and ${uploadData.failed} failed.`;

        showToast(successMessage, uploadData.status === 'completed' ? 'success' : 'info');

        // Show unmatched files if any
        if (uploadData.unmatched_files && uploadData.unmatched_files.length > 0) {
          const unmatchedNames = uploadData.unmatched_files.slice(0, 3).map((uf: { filename: string }) => uf.filename).join(', ');
          showToast(
            `${uploadData.unmatched_files.length} file${uploadData.unmatched_files.length > 1 ? 's' : ''} couldn't be matched: ${unmatchedNames}${uploadData.unmatched_files.length > 3 ? '...' : ''}. Please match them manually.`,
            'error'
          );
        }

        // Refresh staff list to get updated photo URLs
        await fetchStaff();
      } else {
        // Handle error response
        const errorMessage = getString(result.error) || 'Failed to upload photos';
        const errorDetails = result.details ? `: ${getString(result.details)}` : '';
        
        // Mark all as error
        setPhotos(prev => prev.map(p => {
          const photoToUpload = validPhotos.find(vp => vp.id === p.id);
          if (photoToUpload) {
            return { 
              ...p, 
              uploadStatus: 'error' as const, 
              error: errorMessage,
              progress: 0
            };
          }
          return p;
        }));

        showToast(`${errorMessage}${errorDetails}`, 'error');
      }
    } catch (error) {
      console.error('Error during bulk upload:', error);
      
      // Mark all as error
      setPhotos(prev => prev.map(p => {
        const photoToUpload = validPhotos.find(vp => vp.id === p.id);
        if (photoToUpload) {
          return { 
            ...p, 
            uploadStatus: 'error' as const, 
            error: 'Network error. Please try again.',
            progress: 0
          };
        }
        return p;
      }));

      showToast('Network error. Please check your connection and try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const filteredStaff = staff.filter(s => {
    const query = searchQuery.toLowerCase();
    const fullName = getString(s.full_name).toLowerCase();
    const staffId = getString(s.staff_id).toLowerCase();
    const employeeCode = getString(s.employee_code).toLowerCase();
    return (
      fullName.includes(query) ||
      staffId.includes(query) ||
      employeeCode.includes(query)
    );
  });

  const stats = {
    total: photos.length,
    matched: photos.filter(p => p.matchedStaff).length,
    pending: photos.filter(p => p.uploadStatus === 'pending' && p.matchedStaff).length,
    success: photos.filter(p => p.uploadStatus === 'success').length,
    error: photos.filter(p => p.uploadStatus === 'error').length,
    unmatched: photos.filter(p => !p.matchedStaff).length,
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-[#1e3a8a] text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={20} />}
            {toast.type === 'error' && <XCircle size={20} />}
            {toast.type === 'info' && <Info size={20} />}
            <span className="font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <Camera className="text-white" size={24} />
            </div>
            Bulk Photo Upload
          </h1>
          <p className="text-gray-600">Upload and match photos for multiple staff members at once</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/staff-management/directory`)}
          className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition-all"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-5 bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] text-white hover:shadow-xl transition-all cursor-default">
            <div className="flex items-center justify-between mb-2">
              <FileImage size={20} className="opacity-90" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.total}</p>
            <p className="text-xs text-blue-100">Photos Added</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-5 bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl transition-all cursor-default">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 size={20} className="opacity-90" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Matched</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.matched}</p>
            <p className="text-xs text-green-100">Ready to Upload</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-5 bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-xl transition-all cursor-default">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle size={20} className="opacity-90" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Unmatched</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.unmatched}</p>
            <p className="text-xs text-orange-100">Need Matching</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-5 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white hover:shadow-xl transition-all cursor-default">
            <div className="flex items-center justify-between mb-2">
              <Loader2 size={20} className="opacity-90" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Pending</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.pending}</p>
            <p className="text-xs text-yellow-100">Awaiting Upload</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-5 bg-gradient-to-br from-teal-500 to-teal-600 text-white hover:shadow-xl transition-all cursor-default">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 size={20} className="opacity-90" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Success</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.success}</p>
            <p className="text-xs text-teal-100">Uploaded</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-5 bg-gradient-to-br from-red-500 to-red-600 text-white hover:shadow-xl transition-all cursor-default">
            <div className="flex items-center justify-between mb-2">
              <XCircle size={20} className="opacity-90" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Errors</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.error}</p>
            <p className="text-xs text-red-100">Failed</p>
          </Card>
        </motion.div>
      </div>

      {/* Upload Area */}
      <Card className="overflow-hidden">
        <motion.div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          animate={{
            scale: isDragging ? 1.02 : 1,
            borderColor: isDragging ? '#1e3a8a' : '#E1E1DB',
          }}
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            isDragging 
              ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-[#1e3a8a]' 
              : 'bg-gradient-to-br from-gray-50 to-white hover:from-blue-50 hover:to-indigo-50'
          }`}
        >
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-[#1e3a8a]/10 rounded-xl"
            />
          )}
          
          <motion.div
            animate={{ 
              scale: isDragging ? 1.1 : 1,
              rotate: isDragging ? 5 : 0,
            }}
            className="relative z-10"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <Upload className="text-white" size={32} />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {isDragging ? 'Drop your photos here' : 'Drag & Drop Photos'}
            </h3>
            <p className="text-gray-600 mb-1">
              or click to browse from your device
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Supported: JPG, PNG, GIF • Max 5MB per file
            </p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
                <Zap size={16} className="text-[#1e3a8a]" />
                <span>Auto-match by filename</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-lg">
                <Sparkles size={16} className="text-green-600" />
                <span>Smart detection</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] hover:from-[#3B82F6] hover:to-[#1e3a8a] text-white shadow-lg hover:shadow-xl transition-all cursor-pointer px-8 py-3 text-base font-semibold"
            >
              <Upload size={20} className="mr-2" />
              Select Photos
            </Button>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Info size={14} />
                  <span>Tip: Name files with staff ID (e.g., STF001.jpg)</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </Card>

      {/* Photos Grid */}
      {photos.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ImageIcon className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Photo Gallery</h2>
                  <p className="text-sm text-blue-100">{photos.length} photo{photos.length !== 1 ? 's' : ''} ready</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {stats.unmatched > 0 && (
                  <div className="bg-orange-500/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-orange-300/30">
                    <p className="text-xs text-orange-100 mb-1">Unmatched Photos</p>
                    <p className="text-lg font-bold text-white">{stats.unmatched}</p>
                  </div>
                )}
                <Button
                  onClick={handleBulkUpload}
                  disabled={uploading || stats.matched === 0}
                  className="bg-white text-[#1e3a8a] hover:bg-gray-100 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Uploading {stats.matched}...
                    </>
                  ) : (
                    <>
                      <Upload size={18} className="mr-2" />
                      Upload {stats.matched} Photo{stats.matched !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <AnimatePresence mode="popLayout">
                {photos.map((photo, index) => (
                  <motion.div
                    key={photo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 30 }}
                    className="group relative"
                  >
                    <Card className="p-3 hover:shadow-xl transition-all duration-300 border-2 hover:border-[#1e3a8a]/30 overflow-hidden">
                      {/* Photo Preview */}
                      <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 group-hover:scale-105 transition-transform duration-300">
                        <Image
                          src={photo.preview}
                          alt={photo.file.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        
                        {/* Status Overlay */}
                        <AnimatePresence>
                          {photo.uploadStatus === 'uploading' && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm"
                            >
                              <Loader2 className="text-white animate-spin mb-2" size={28} />
                              <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-white rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${photo.progress || 0}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                              <p className="text-xs text-white mt-2">{photo.progress || 0}%</p>
                            </motion.div>
                          )}
                          
                          {photo.uploadStatus === 'success' && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute inset-0 bg-green-500/90 flex items-center justify-center backdrop-blur-sm"
                            >
                              <div className="text-center">
                                <CheckCircle2 className="text-white mx-auto mb-2" size={36} />
                                <p className="text-xs text-white font-semibold">Uploaded!</p>
                              </div>
                            </motion.div>
                          )}
                          
                          {photo.uploadStatus === 'error' && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute inset-0 bg-red-500/90 flex items-center justify-center backdrop-blur-sm"
                            >
                              <div className="text-center">
                                <XCircle className="text-white mx-auto mb-2" size={36} />
                                <p className="text-xs text-white font-semibold">Failed</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Remove Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto(photo.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg z-10"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* File Info */}
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-gray-900 truncate mb-1" title={photo.file.name}>
                          {photo.file.name}
                        </p>
                        <p className="text-xs text-gray-500">{formatFileSize(photo.file.size)}</p>
                      </div>

                      {/* Matched Staff */}
                      {photo.matchedStaff ? (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-2.5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 mb-2"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                              <User size={14} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-green-900 truncate">
                                {getString(photo.matchedStaff.full_name)}
                              </p>
                              <p className="text-xs text-green-700 font-mono">
                                {getString(photo.matchedStaff.staff_id)}
                              </p>
                            </div>
                            {photo.matchMethod === 'auto' && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                              >
                                Auto
                              </motion.span>
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <button
                          onClick={() => setSelectedPhotoId(photo.id)}
                          className="w-full p-2.5 bg-gradient-to-br from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100 rounded-lg text-xs text-orange-800 font-semibold transition-all border border-orange-200 hover:border-orange-300 flex items-center justify-center gap-2"
                        >
                          <User size={14} />
                          Match to Staff
                        </button>
                      )}

                      {/* Error Message */}
                      {photo.error && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-xs text-red-600 mt-1 truncate bg-red-50 px-2 py-1 rounded"
                          title={photo.error}
                        >
                          {photo.error}
                        </motion.p>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </Card>
      )}

      {/* Staff Matching Modal */}
      <AnimatePresence>
        {selectedPhotoId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setSelectedPhotoId(null);
              setSearchQuery('');
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-200"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Match Photo to Staff</h3>
                      <p className="text-sm text-blue-100">Select the staff member for this photo</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPhotoId(null);
                      setSearchQuery('');
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by name, staff ID, or employee code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] transition-all bg-white"
                  />
                </div>
              </div>

              {/* Staff List */}
              <div className="flex-1 overflow-y-auto p-6">
                {filteredStaff.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredStaff.map((member) => (
                      <motion.button
                        key={member.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => matchPhotoToStaff(selectedPhotoId, member.id!)}
                        className="p-4 text-left bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl border-2 border-gray-200 hover:border-[#1e3a8a] transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-110 transition-transform">
                            {(() => {
                              const fullName = getString(member.full_name);
                              return fullName ? fullName.charAt(0).toUpperCase() : '?';
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 group-hover:text-[#1e3a8a] transition-colors truncate">
                              {getString(member.full_name)}
                            </p>
                            <p className="text-sm text-gray-600 mt-0.5">
                              <span className="font-mono">{getString(member.staff_id)}</span>
                              {!!member.employee_code && (
                                <span className="text-gray-400"> • {getString(member.employee_code)}</span>
                              )}
                            </p>
                            {!!member.designation && (
                              <p className="text-xs text-gray-500 mt-1">{getString(member.designation)}</p>
                            )}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Check className="text-[#1e3a8a]" size={20} />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <User size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium">No staff found</p>
                    <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
