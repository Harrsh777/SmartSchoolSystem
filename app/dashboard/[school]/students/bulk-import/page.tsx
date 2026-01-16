'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Download, Upload, CheckCircle, AlertCircle, XCircle, ArrowRight, ArrowLeft, FileCheck } from 'lucide-react';

interface ValidatedRow {
  rowIndex: number;
  data: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
  passwords?: Array<{ admission_no: string; password: string }>;
}

type Step = 1 | 2 | 3 | 4;

export default function BulkImportPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [validationSummary, setValidationSummary] = useState<{
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/students/template');
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const validExtensions = ['.xlsx', '.xls', '.csv'];

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(fileExtension) && !validTypes.includes(file.type)) {
      alert('Please upload a valid Excel file (.xlsx, .xls) or CSV file (.csv)');
      return;
    }

    setUploadedFile(file);
    setCurrentStep(2);
  };

  const handleValidate = async () => {
    if (!uploadedFile) return;

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('school_code', schoolCode);

      const response = await fetch('/api/students/validate', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setValidatedRows(result.data);
        setValidationSummary({
          total: result.total,
          valid: result.valid,
          invalid: result.invalid,
          warnings: result.warnings,
        });
        setCurrentStep(3);
      } else {
        alert(result.error || 'Failed to validate file');
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Error validating file:', error);
      alert('Failed to validate file. Please check the format and try again.');
      setCurrentStep(2);
    }
  };

  const handleImport = async () => {
    if (validatedRows.filter(r => r.errors.length === 0).length === 0) {
      alert('No valid rows to import. Please fix the errors first.');
      return;
    }

    setImporting(true);

    try {
      // Prepare valid student data
      const validStudents = validatedRows
        .filter(row => row.errors.length === 0)
        .map(row => row.data);

      const response = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          students: validStudents,
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

  const handleReset = () => {
    setCurrentStep(1);
    setUploadedFile(null);
    setValidatedRows([]);
    setValidationSummary(null);
    setImportResult(null);
  };

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  const validRows = validatedRows.filter(r => r.errors.length === 0);
  const invalidRows = validatedRows.filter(r => r.errors.length > 0);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Bulk Student Import</h1>
          <p className="text-gray-600">Import multiple students from an Excel file</p>
        </div>
      </motion.div>

      {/* Step Indicator */}
      <Card>
        <div className="flex items-center justify-center gap-4 py-4">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-orange-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-200'
            }`}>
              {currentStep > 1 ? <CheckCircle size={20} /> : '1'}
            </div>
            <span className="font-medium">Download Template</span>
          </div>
          <ArrowRight className="text-gray-400" size={20} />
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-orange-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-200'
            }`}>
              {currentStep > 2 ? <CheckCircle size={20} /> : '2'}
            </div>
            <span className="font-medium">Upload File</span>
          </div>
          <ArrowRight className="text-gray-400" size={20} />
          <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-orange-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 3 ? 'bg-orange-600 text-white' : 'bg-gray-200'
            }`}>
              {currentStep > 3 ? <CheckCircle size={20} /> : '3'}
            </div>
            <span className="font-medium">Validate</span>
          </div>
          <ArrowRight className="text-gray-400" size={20} />
          <div className={`flex items-center gap-2 ${currentStep >= 4 ? 'text-orange-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 4 ? 'bg-orange-600 text-white' : 'bg-gray-200'
            }`}>
              4
            </div>
            <span className="font-medium">Import</span>
          </div>
        </div>
      </Card>

      <AnimatePresence mode="wait">
        {/* Step 1: Download Template */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Card>
              <div className="text-center py-12">
                <Download className="mx-auto mb-6 text-orange-600" size={64} />
                <h2 className="text-2xl font-bold text-black mb-4">Step 1: Download Excel Template</h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Download the Excel template file, fill it with your student information, and then upload it in the next step.
                  The template includes example rows and detailed instructions.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="bg-gray-50 rounded-lg p-6 max-w-2xl mx-auto text-left">
                    <h3 className="font-semibold text-black mb-3">Important Notes:</h3>
                    <ul className="space-y-2 text-gray-700 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Admission No must be unique for each student</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Passwords will be auto-generated for each student</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Required fields: Admission No, Student Name, Class, Section</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Remove example rows before uploading your data</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <Button onClick={handleDownloadTemplate} className="bg-orange-600 hover:bg-orange-700">
                  <Download size={20} className="mr-2" />
                  Download Excel Template
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Upload File */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Card>
              <div className="py-8">
                <div className="text-center mb-8">
                  <Upload className="mx-auto mb-4 text-orange-600" size={48} />
                  <h2 className="text-2xl font-bold text-black mb-2">Step 2: Upload File</h2>
                  <p className="text-gray-600">Upload your filled Excel file</p>
                </div>

                <div className="max-w-2xl mx-auto">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload size={48} className="text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Excel files (.xlsx, .xls) or CSV files (.csv)
                      </p>
                      {uploadedFile && (
                        <div className="mt-4 flex items-center gap-2 text-green-600">
                          <FileCheck size={20} />
                          <span className="font-medium">{uploadedFile.name}</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="mt-8 flex justify-center gap-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft size={18} className="mr-2" />
                    Back
                  </Button>
                  {uploadedFile && (
                    <Button onClick={handleValidate} className="bg-orange-600 hover:bg-orange-700">
                      Validate File
                      <ArrowRight size={18} className="ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Review & Validate */}
        {currentStep === 3 && !importResult && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Card>
              <div className="py-8">
                <div className="text-center mb-8">
                  <FileCheck className="mx-auto mb-4 text-orange-600" size={48} />
                  <h2 className="text-2xl font-bold text-black mb-2">Step 3: Review & Validate</h2>
                  <p className="text-gray-600">Review validation results before importing</p>
                </div>

                {validationSummary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{validationSummary.total}</p>
                      <p className="text-sm text-gray-600">Total Rows</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{validationSummary.valid}</p>
                      <p className="text-sm text-gray-600">Valid Rows</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{validationSummary.invalid}</p>
                      <p className="text-sm text-gray-600">Invalid Rows</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-600">{validationSummary.warnings}</p>
                      <p className="text-sm text-gray-600">Warnings</p>
                    </div>
                  </div>
                )}

                {invalidRows.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-semibold text-black mb-4 flex items-center gap-2">
                      <XCircle size={20} className="text-red-600" />
                      Invalid Rows ({invalidRows.length})
                    </h3>
                    <div className="bg-red-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      {invalidRows.map((row) => (
                        <div key={row.rowIndex} className="mb-3 pb-3 border-b border-red-200 last:border-0">
                          <p className="font-medium text-red-800 mb-1">Row {row.rowIndex}:</p>
                          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                            {row.errors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validRows.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-semibold text-black mb-4 flex items-center gap-2">
                      <CheckCircle size={20} className="text-green-600" />
                      Valid Rows ({validRows.length})
                    </h3>
                    <div className="bg-green-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="space-y-2">
                        {validRows.slice(0, 10).map((row) => {
                          const studentName = getString(row.data.student_name);
                          const admissionNo = getString(row.data.admission_no);
                          const className = getString(row.data.class);
                          const section = getString(row.data.section);
                          return (
                            <div key={row.rowIndex} className="text-sm text-green-800">
                              Row {row.rowIndex}: {studentName} - {admissionNo} ({className}-{section})
                              {row.warnings.length > 0 && (
                                <span className="text-yellow-700 ml-2">
                                  (⚠ {row.warnings.length} warning{row.warnings.length > 1 ? 's' : ''})
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {validRows.length > 10 && (
                          <p className="text-sm text-gray-600 mt-2">
                            ... and {validRows.length - 10} more valid rows
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-4 mt-8">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft size={18} className="mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importing || validRows.length === 0}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {importing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        Import {validRows.length} Student{validRows.length !== 1 ? 's' : ''}
                        <ArrowRight size={18} className="ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Import Result */}
        {currentStep === 4 && importResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card>
              <div className="py-8">
                <div className="text-center mb-8">
                  {importResult.failed === 0 ? (
                    <CheckCircle className="mx-auto mb-4 text-green-600" size={64} />
                  ) : (
                    <AlertCircle className="mx-auto mb-4 text-yellow-600" size={64} />
                  )}
                  <h2 className="text-2xl font-bold text-black mb-2">Import Complete</h2>
                  <p className="text-gray-600">Student import has been processed</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
                  <div className="bg-blue-50 rounded-lg p-6 text-center">
                    <p className="text-3xl font-bold text-blue-600">{importResult.total}</p>
                    <p className="text-sm text-gray-600 mt-2">Total Processed</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 text-center">
                    <p className="text-3xl font-bold text-green-600">{importResult.success}</p>
                    <p className="text-sm text-gray-600 mt-2">Successfully Imported</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-6 text-center">
                    <p className="text-3xl font-bold text-red-600">{importResult.failed}</p>
                    <p className="text-sm text-gray-600 mt-2">Failed</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mb-8 max-w-3xl mx-auto">
                    <h3 className="font-semibold text-black mb-4">Errors:</h3>
                    <div className="bg-red-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      {importResult.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-700 mb-2">
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importResult.passwords && importResult.passwords.length > 0 && (
                  <div className="mb-8 max-w-3xl mx-auto">
                    <h3 className="font-semibold text-black mb-4">Generated Passwords:</h3>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <p className="text-sm text-gray-600 mb-2">
                        Passwords have been auto-generated for all imported students.
                        You can view and manage passwords in the Password Manager section.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-4 mt-8">
                  <Button variant="outline" onClick={handleReset}>
                    Import Another File
                  </Button>
                  <Button
                    onClick={() => router.push(`/dashboard/${schoolCode}/students/directory`)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    View Student Directory
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
