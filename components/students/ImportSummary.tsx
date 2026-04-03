'use client';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { simplifyValidationErrorForUser } from '@/lib/import-friendly-errors';

interface ImportSummaryProps {
  result: {
    total: number;
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  };
  onFinish: () => void;
  /** e.g. "View Students" (default) or "View staff" */
  finishButtonLabel?: string;
}

export default function ImportSummary({
  result,
  onFinish,
  finishButtonLabel = 'View Students',
}: ImportSummaryProps) {
  return (
    <Card>
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-black mb-2">Import Complete</h2>
          <p className="text-gray-600">
            Your file has been processed. Check the counts below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-gray-600" size={20} />
              <p className="text-sm text-gray-600">Total Rows</p>
            </div>
            <p className="text-2xl font-bold text-black">{result.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-green-600" size={20} />
              <p className="text-sm text-gray-600">Successfully Imported</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{result.success}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="text-red-600" size={20} />
              <p className="text-sm text-gray-600">Failed</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{result.failed}</p>
          </div>
        </div>

        {result.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">What needs attention</h3>
            <p className="text-sm text-red-800/90 mb-3">
              These spreadsheet rows were not saved. Fix the issue in your file and import again, or add the student manually.
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {result.errors.map((error, idx) => (
                <div
                  key={idx}
                  className="text-sm text-red-900 bg-white/60 rounded-md px-3 py-2 border border-red-100"
                >
                  <span className="font-semibold">Row {error.row}</span>
                  <span className="text-red-800"> — </span>
                  <span>{simplifyValidationErrorForUser(error.error)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <Button onClick={onFinish} className="w-full md:w-auto">
            {finishButtonLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}

