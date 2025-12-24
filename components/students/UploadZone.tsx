'use client';

import { useState, useRef } from 'react';
import { Upload, File, X } from 'lucide-react';
import Card from '@/components/ui/Card';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  acceptedTypes: string[];
}

export default function UploadZone({ onFileSelect, acceptedTypes }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && isValidFileType(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      alert(`Please upload a file with one of these extensions: ${acceptedTypes.join(', ')}`);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFileType(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      alert(`Please upload a file with one of these extensions: ${acceptedTypes.join(', ')}`);
    }
  };

  const isValidFileType = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return acceptedTypes.includes(extension);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-black bg-gray-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <Upload
            className={`mx-auto mb-4 ${isDragging ? 'text-black' : 'text-gray-400'}`}
            size={48}
          />
          <p className="text-lg font-semibold text-black mb-2">
            Drag and drop your file here
          </p>
          <p className="text-sm text-gray-600 mb-4">or click to browse</p>
          <p className="text-xs text-gray-500">
            Accepted formats: {acceptedTypes.join(', ')}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      ) : (
        <Card>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <File className="text-gray-400" size={24} />
              <div>
                <p className="font-medium text-black">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="text-gray-400 hover:text-red-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

