'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, ArrowRight, Download, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import Stepper from '@/components/students/Stepper';
import UploadZone from '@/components/students/UploadZone';
import PreviewTable from '@/components/students/PreviewTable';
import ImportSummary from '@/components/students/ImportSummary';
import type { Student } from '@/lib/supabase';

type ValidationStatus = 'valid' | 'warning' | 'error';

export interface StudentRow {
  rowIndex: number;
  data: Partial<Student>;
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
}

type Step = 1 | 2 | 3 | 4;

export default function ImportStudentsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setCurrentStep(2);
    parseFile(file);
  };

  const parseFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('school_code', schoolCode);

      const response = await fetch('/api/students/parse', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok && result.data) {
        setStudentRows(result.data);
        setCurrentStep(3);
      } else {
        alert(result.error || 'Failed to parse file');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Failed to parse file. Please check the format.');
    }
  };

  const handleRowUpdate = (rowIndex: number, field: string, value: string) => {
    setStudentRows(prev => {
      const updated = prev.map(row => {
        if (row.rowIndex === rowIndex) {
          const newData = { ...row.data, [field]: value };
          // Re-validate the row with updated data
          const validation = validateRow(newData, rowIndex, prev);
          return {
            ...row,
            data: newData,
            status: validation.status,
            errors: validation.errors,
            warnings: validation.warnings,
          };
        }
        return row;
      });
      
      // Re-check duplicates for all rows after update
      return updated.map(row => {
        const rowAdmissionNo = getString(row.data.admission_no);
        const duplicateCount = updated.filter(
          (r) => {
            const rAdmissionNo = getString(r.data.admission_no);
            return rAdmissionNo === rowAdmissionNo && 
                   r.rowIndex !== row.rowIndex &&
                   rowAdmissionNo.trim().length > 0;
          }
        ).length;
        
        if (duplicateCount > 0 && !row.errors.includes('Duplicate admission number in file')) {
          return {
            ...row,
            status: 'error' as ValidationStatus,
            errors: [...row.errors.filter(e => e !== 'Duplicate admission number in file'), 'Duplicate admission number in file'],
          };
        } else if (duplicateCount === 0) {
          const errors = row.errors.filter(e => e !== 'Duplicate admission number in file');
          return {
            ...row,
            errors,
            status: errors.length > 0 ? 'error' : row.warnings.length > 0 ? 'warning' : 'valid',
          };
        }
        return row;
      });
    });
  };

  const validateRow = (data: Partial<Student>, rowIndex: number, allRows: StudentRow[]): {
    status: ValidationStatus;
    errors: string[];
    warnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    const admissionNo = getString(data.admission_no);
    const studentName = getString(data.student_name);
    const className = getString(data.class);
    const section = getString(data.section);

    if (!admissionNo.trim()) errors.push('Admission number is required');
    if (!studentName.trim()) errors.push('Student name is required');
    if (!className.trim()) errors.push('Class is required');
    if (!section.trim()) errors.push('Section is required');

    // Check for duplicate admission numbers within the file
    const duplicateCount = allRows.filter(
      (row) => {
        const rowAdmissionNo = getString(row.data.admission_no);
        return rowAdmissionNo === admissionNo && 
               row.rowIndex !== rowIndex &&
               admissionNo.trim().length > 0;
      }
    ).length;
    if (duplicateCount > 0) errors.push('Duplicate admission number in file');

    // Warnings
    const dateOfBirth = getString(data.date_of_birth);
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (!isNaN(dob.getTime())) {
        const age = new Date().getFullYear() - dob.getFullYear();
        if (age < 3 || age > 25) warnings.push('Unusual age detected');
      } else {
        warnings.push('Invalid date format');
      }
    }

    const parentEmail = getString(data.parent_email);
    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      warnings.push('Invalid email format');
    }

    return {
      status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
      errors,
      warnings,
    };
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'admission_no',
      'student_name',
      'class',
      'section',
      'date_of_birth',
      'gender',
      'parent_name',
      'parent_phone',
      'parent_email',
      'address'
    ];

    const csvContent = [
      headers.join(','),
      'STU001,John Doe,10,A,2010-05-15,Male,John Parent,1234567890,parent@example.com,123 Main St',
      'STU002,Jane Smith,10,B,2010-08-20,Female,Jane Parent,0987654321,parent2@example.com,456 Oak Ave'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadErrors = () => {
    const errorRows = studentRows.filter(row => row.status === 'error');
    if (errorRows.length === 0) return;

    const headers = [
      'admission_no',
      'student_name',
      'class',
      'section',
      'date_of_birth',
      'gender',
      'parent_name',
      'parent_phone',
      'parent_email',
      'address',
      'errors'
    ];

    const csvContent = [
      headers.join(','),
      ...errorRows.map(row => [
        getString(row.data.admission_no) || '',
        getString(row.data.student_name) || '',
        getString(row.data.class) || '',
        getString(row.data.section) || '',
        getString(row.data.date_of_birth) || '',
        getString(row.data.gender) || '',
        getString(row.data.parent_name) || '',
        getString(row.data.parent_phone) || '',
        getString(row.data.parent_email) || '',
        getString(row.data.address) || '',
        row.errors.join('; ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'error_rows.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const validRows = studentRows.filter(row => row.status !== 'error');
    
    if (validRows.length === 0) {
      alert('No valid rows to import. Please fix errors first.');
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          students: validRows.map(row => row.data),
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setImportResult(result);
        setCurrentStep(4);
      } else {
        alert(result.error || 'Failed to import students');
      }
    } catch (error) {
      console.error('Error importing students:', error);
      alert('Failed to import students. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const validCount = studentRows.filter(r => r.status === 'valid').length;
  const warningCount = studentRows.filter(r => r.status === 'warning').length;
  const errorCount = studentRows.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/students`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Bulk Import Students</h1>
            <p className="text-gray-600">Import multiple students using a CSV or Excel file</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <Stepper currentStep={currentStep} />

      {/* Step 1: Download Template */}
      {currentStep === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-black mb-2">Step 1: Download Student Template</h2>
                <p className="text-gray-600">
                  Download the template file and fill it with your student information. 
                  Required fields are marked with an asterisk (*).
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-black mb-3">Required Fields:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><span className="font-medium">admission_no*</span> - Unique admission number</li>
                  <li><span className="font-medium">student_name*</span> - Full name of the student</li>
                  <li><span className="font-medium">class*</span> - Class (e.g., 10, 9, 8)</li>
                  <li><span className="font-medium">section*</span> - Section (e.g., A, B, C)</li>
                </ul>
                <h3 className="font-semibold text-black mt-4 mb-3">Optional Fields:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><span className="font-medium">date_of_birth</span> - Format: YYYY-MM-DD</li>
                  <li><span className="font-medium">gender</span> - Male, Female, or Other</li>
                  <li><span className="font-medium">parent_name</span> - Parent/Guardian name</li>
                  <li><span className="font-medium">parent_phone</span> - Contact number</li>
                  <li><span className="font-medium">parent_email</span> - Email address</li>
                  <li><span className="font-medium">address</span> - Full address</li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleDownloadTemplate} variant="outline" className="w-full sm:w-auto">
                  <Download size={18} className="mr-2" />
                  Download Excel Template
                </Button>
                <Button 
                  onClick={() => setCurrentStep(2)} 
                  className="w-full sm:w-auto"
                >
                  Continue to Upload
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Step 2: File Upload */}
      {currentStep === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-black mb-2">Step 2: Upload File</h2>
                <p className="text-gray-600">
                  Upload your filled template file. Don&apos;t worry — you&apos;ll be able to review 
                  and fix errors before importing.
                </p>
              </div>
              <UploadZone
                onFileSelect={handleFileUpload}
                acceptedTypes={['.csv', '.xlsx']}
              />
              {uploadedFile && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">File:</span> {uploadedFile.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Size:</span> {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Step 3: Preview & Validate */}
      {currentStep === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-black mb-2">Step 3: Review & Fix</h2>
                <p className="text-gray-600 mb-4">
                  Review your data below. Fix any errors before importing.
                </p>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <span className="text-sm text-gray-700">
                      Valid: <span className="font-semibold">{validCount}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-yellow-600" size={20} />
                    <span className="text-sm text-gray-700">
                      Warnings: <span className="font-semibold">{warningCount}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="text-red-600" size={20} />
                    <span className="text-sm text-gray-700">
                      Errors: <span className="font-semibold">{errorCount}</span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  {errorCount > 0 && (
                    <Button variant="outline" onClick={handleDownloadErrors}>
                      Download Error Rows
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadedFile(null);
                      setStudentRows([]);
                      setCurrentStep(2);
                    }}
                  >
                    Re-upload File
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <PreviewTable
            rows={studentRows}
            onRowUpdate={handleRowUpdate}
          />

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(2)}
            >
              Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={errorCount > 0 || validCount === 0 || importing}
            >
              {importing ? 'Importing...' : 'Import Students'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 4: Import Complete */}
      {currentStep === 4 && importResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ImportSummary
            result={importResult}
            onFinish={() => router.push(`/dashboard/${schoolCode}/students`)}
          />
        </motion.div>
      )}
    </div>
  );
}

