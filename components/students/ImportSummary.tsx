'use client';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ImportSummaryProps {
  result: {
    total: number;
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  };
  onFinish: () => void;
}

export default function ImportSummary({ result, onFinish }: ImportSummaryProps) {
  return (
    <Card>
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-black mb-2">Import Complete</h2>
          <p className="text-gray-600">
            Your student import has been processed
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
            <h3 className="font-semibold text-red-800 mb-2">Errors:</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {result.errors.map((error, idx) => (
                <p key={idx} className="text-sm text-red-700">
                  Row {error.row}: {error.error}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <Button onClick={onFinish} className="w-full md:w-auto">
            View Students
          </Button>
        </div>
      </div>
    </Card>
  );
}

