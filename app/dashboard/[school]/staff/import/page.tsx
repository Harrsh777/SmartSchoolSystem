'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Download, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import Stepper from '@/components/students/Stepper';
import UploadZone from '@/components/students/UploadZone';
import StaffPreviewTable from '@/components/staff/StaffPreviewTable';
import ImportSummary from '@/components/students/ImportSummary';
import type { Staff } from '@/lib/supabase';
import { validateStaffImportCore } from '@/lib/staff/import-validation';

type ValidationStatus = 'valid' | 'warning' | 'error';

export interface StaffRow {
  rowIndex: number;
  data: Partial<Staff>;
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
}

type Step = 1 | 2 | 3 | 4;

export default function ImportStaffPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const [subjectNames, setSubjectNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/timetable/subjects?school_code=${encodeURIComponent(schoolCode)}`
        );
        const json = await res.json();
        if (res.ok && json.data) {
          setSubjectNames(
            new Set(
              (json.data as Array<{ name: string }>).map((s) => s.name).filter(Boolean)
            )
          );
        }
      } catch {
        // preview validation still runs; designation subject check may be skipped
      }
    };
    load();
  }, [schoolCode]);

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

      const response = await fetch('/api/staff/parse', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok && result.data) {
        setStaffRows(result.data);
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
    setStaffRows(prev => {
      const updated = prev.map(row => {
        if (row.rowIndex === rowIndex) {
          const newData = { ...row.data, [field]: value };
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
      
      const phoneDigits = (v: unknown) =>
        String(v ?? '')
          .replace(/\D/g, '')
          .slice(0, 10);

      return updated.map((row) => {
        const staffId =
          typeof row.data.staff_id === 'string' ? row.data.staff_id.trim() : '';
        const dupStaff = updated.filter((r) => {
          const rs =
            typeof r.data.staff_id === 'string' ? r.data.staff_id.trim() : '';
          return rs === staffId && r.rowIndex !== row.rowIndex && staffId.length > 0;
        }).length;

        const p = phoneDigits(row.data.phone);
        const dupPhone =
          p.length === 10
            ? updated.filter(
                (r) =>
                  phoneDigits(r.data.phone) === p &&
                  r.rowIndex !== row.rowIndex
              ).length
            : 0;

            const errors = [
              ...row.errors.filter(
                (e) => e !== 'Duplicate staff ID in file' && e !== 'Duplicate phone in file'
              ),
              ...(dupStaff > 0 ? ['Duplicate staff ID in file'] : []),
              ...(dupPhone > 0 ? ['Duplicate phone in file'] : []),
            ];

        const status: ValidationStatus =
          errors.length > 0
            ? 'error'
            : row.warnings.length > 0
              ? 'warning'
              : 'valid';

        return { ...row, errors, status };
      });
    });
  };

  const validateRow = (
    data: Partial<Staff>,
    rowIndex: number,
    allRows: StaffRow[]
  ): {
    status: ValidationStatus;
    errors: string[];
    warnings: string[];
  } => {
    const getString = (value: unknown): string =>
      typeof value === 'string' ? value : '';

    const core = validateStaffImportCore(
      {
        full_name: getString(data.full_name).trim(),
        role: getString(data.role).trim(),
        department: getString(data.department).trim(),
        designation: getString(data.designation).trim(),
        phone: data.phone,
        contact1: data.contact1,
        date_of_joining: getString(data.date_of_joining).trim(),
        dob: getString(data.dob).trim(),
        gender: data.gender,
        adhar_no: data.adhar_no,
        category: getString(data.category).trim(),
        email: getString(data.email).trim(),
        contact2: data.contact2,
      },
      { validSubjects: subjectNames }
    );

    const errors = [...core.errors];
    const staffId = getString(data.staff_id).trim();
    if (staffId) {
      const dup = allRows.some(
        (r) =>
          getString(r.data.staff_id).trim() === staffId &&
          r.rowIndex !== rowIndex
      );
      if (dup) errors.push('Duplicate staff ID in file');
    }

    const p = getString(data.phone).replace(/\D/g, '');
    if (p.length === 10) {
      const dupP = allRows.some(
        (r) =>
          getString(r.data.phone).replace(/\D/g, '') === p &&
          r.rowIndex !== rowIndex
      );
      if (dupP) errors.push('Duplicate phone in file');
    }

    return {
      status:
        errors.length > 0
          ? 'error'
          : core.warnings.length > 0
            ? 'warning'
            : 'valid',
      errors,
      warnings: core.warnings,
    };
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'staff_id',
      'full_name',
      'role',
      'department',
      'designation',
      'email',
      'phone',
      'primary_contact',
      'date_of_joining',
      'dob',
      'gender',
      'adhar_no',
      'category',
      'employment_type',
      'qualification',
      'experience_years',
      'address',
    ];

    const csvContent = [
      headers.join(','),
      'STF001,Dr. Anjali Mehta,Principal,Administration,Mathematics,anjali@school.com,9876543001,9876543001,2020-01-15,1985-05-10,Female,123456789012,General,Full-time,PhD,10,123 Main St',
      'STF002,Prof. Rajesh Singh,Teacher,Science,Physics,rajesh@school.com,9876543002,9876543002,2019-06-01,1990-08-20,Male,234567890123,OBC,Full-time,MSc,8,456 Oak Ave',
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadErrors = () => {
    const errorRows = staffRows.filter(row => row.status === 'error');
    if (errorRows.length === 0) return;

    const headers = [
      'staff_id',
      'full_name',
      'role',
      'department',
      'designation',
      'email',
      'phone',
      'primary_contact',
      'date_of_joining',
      'dob',
      'gender',
      'adhar_no',
      'category',
      'employment_type',
      'qualification',
      'experience_years',
      'address',
      'errors',
    ];

    const csvContent = [
      headers.join(','),
      ...errorRows.map(row => [
        row.data.staff_id || '',
        row.data.full_name || '',
        row.data.role || '',
        row.data.department || '',
        row.data.designation || '',
        row.data.email || '',
        row.data.phone || '',
        row.data.contact1 || '',
        row.data.date_of_joining || '',
        row.data.dob || '',
        row.data.gender || '',
        row.data.adhar_no || '',
        row.data.category || '',
        row.data.employment_type || '',
        row.data.qualification || '',
        row.data.experience_years || '',
        row.data.address || '',
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
    const validRows = staffRows.filter(row => row.status !== 'error');
    
    if (validRows.length === 0) {
      alert('No valid rows to import. Please fix errors first.');
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/api/staff/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          staff: validRows.map(row => row.data),
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setImportResult(result);
        setCurrentStep(4);
      } else {
        alert(result.error || 'Failed to import staff');
      }
    } catch (error) {
      console.error('Error importing staff:', error);
      alert('Failed to import staff. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const validCount = staffRows.filter(r => r.status === 'valid').length;
  const warningCount = staffRows.filter(r => r.status === 'warning').length;
  const errorCount = staffRows.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/staff`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Bulk Import Staff</h1>
            <p className="text-gray-600">Import multiple staff members using a CSV or Excel file</p>
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
                <h2 className="text-2xl font-bold text-black mb-2">Step 1: Download Staff Template</h2>
                <p className="text-gray-600">
                  Use this template to upload all staff roles including teachers, drivers, helpers, and administration.
                  Required fields are marked with an asterisk (*).
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-black mb-3">Required columns:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><span className="font-medium">full_name</span> — Full name</li>
                  <li><span className="font-medium">role</span> — e.g. Teacher, Principal</li>
                  <li><span className="font-medium">department</span> — e.g. Mathematics, Administration</li>
                  <li><span className="font-medium">designation</span> — Must match a timetable subject</li>
                  <li><span className="font-medium">phone</span> — 10 digits</li>
                  <li><span className="font-medium">primary_contact</span> — 10 digits (can match phone)</li>
                  <li><span className="font-medium">date_of_joining</span> — YYYY-MM-DD or DD-MM-YYYY</li>
                  <li><span className="font-medium">dob</span> — Date of birth (before joining)</li>
                  <li><span className="font-medium">gender</span> — Male, Female, Other</li>
                  <li><span className="font-medium">adhar_no</span> — 12 digits</li>
                  <li><span className="font-medium">category</span> — e.g. General, OBC</li>
                  <li><span className="font-medium">email</span> — Valid email</li>
                </ul>
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">staff_id</span> is optional; re-imports with the same phone or staff_id update empty fields only.
                </p>
                <h3 className="font-semibold text-black mt-4 mb-3">Optional columns:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><span className="font-medium">employment_type</span>, <span className="font-medium">qualification</span>, <span className="font-medium">experience_years</span>, <span className="font-medium">address</span>, and other personal fields</li>
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
                  Upload your filled template file. You can review and fix all errors before importing. Nothing is saved yet.
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
                      setStaffRows([]);
                      setCurrentStep(2);
                    }}
                  >
                    Re-upload File
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <StaffPreviewTable
            rows={staffRows}
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
              {importing ? 'Importing...' : 'Import Staff'}
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
            onFinish={() => router.push(`/dashboard/${schoolCode}/staff`)}
          />
        </motion.div>
      )}
    </div>
  );
}

