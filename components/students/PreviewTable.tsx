'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import type { StudentRow } from '@/app/dashboard/[school]/students/import/page';
import { getString } from '@/lib/type-utils';

interface PreviewTableProps {
  rows: StudentRow[];
  onRowUpdate: (rowIndex: number, field: string, value: string) => void;
}

export default function PreviewTable({ rows, onRowUpdate }: PreviewTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-600" size={20} />;
      case 'error':
        return <XCircle className="text-red-600" size={20} />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'valid':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const handleCellEdit = (rowIndex: number, field: string) => {
    setEditingCell({ row: rowIndex, field });
  };

  const handleCellSave = (rowIndex: number, field: string, value: string) => {
    onRowUpdate(rowIndex, field, value);
    setEditingCell(null);
  };

  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-600">No data to preview</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Admission No*</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Name*</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Class*</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Section*</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">DOB</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Gender</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Parent Name</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Parent Phone</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Parent Email</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Address</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Issues</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.rowIndex}
                className={`border-b border-gray-100 ${
                  row.status === 'error'
                    ? 'bg-red-50'
                    : row.status === 'warning'
                    ? 'bg-yellow-50'
                    : ''
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(row.status)}
                    <span className={getStatusBadge(row.status)}>{row.status}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {editingCell?.row === row.rowIndex && editingCell?.field === 'admission_no' ? (
                    <input
                      type="text"
                      defaultValue={getString(row.data.admission_no) || ''}
                      onBlur={(e) => handleCellSave(row.rowIndex, 'admission_no', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellSave(row.rowIndex, 'admission_no', e.currentTarget.value);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellEdit(row.rowIndex, 'admission_no')}
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                    >
                      {getString(row.data.admission_no) || '-'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {editingCell?.row === row.rowIndex && editingCell?.field === 'student_name' ? (
                    <input
                      type="text"
                      defaultValue={getString(row.data.student_name) || ''}
                      onBlur={(e) => handleCellSave(row.rowIndex, 'student_name', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellSave(row.rowIndex, 'student_name', e.currentTarget.value);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellEdit(row.rowIndex, 'student_name')}
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                    >
                      {getString(row.data.student_name) || '-'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {editingCell?.row === row.rowIndex && editingCell?.field === 'class' ? (
                    <input
                      type="text"
                      defaultValue={getString(row.data.class) || ''}
                      onBlur={(e) => handleCellSave(row.rowIndex, 'class', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellSave(row.rowIndex, 'class', e.currentTarget.value);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellEdit(row.rowIndex, 'class')}
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                    >
                      {getString(row.data.class) || '-'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {editingCell?.row === row.rowIndex && editingCell?.field === 'section' ? (
                    <input
                      type="text"
                      defaultValue={getString(row.data.section) || ''}
                      onBlur={(e) => handleCellSave(row.rowIndex, 'section', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellSave(row.rowIndex, 'section', e.currentTarget.value);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellEdit(row.rowIndex, 'section')}
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                    >
                      {getString(row.data.section) || '-'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {(() => {
                    const dateOfBirth = getString(row.data.date_of_birth);
                    return dateOfBirth || '-';
                  })()}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {(() => {
                    const gender = getString(row.data.gender);
                    return gender || '-';
                  })()}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {(() => {
                    const parentName = getString(row.data.parent_name);
                    return parentName || '-';
                  })()}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {(() => {
                    const parentPhone = getString(row.data.parent_phone);
                    return parentPhone || '-';
                  })()}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {(() => {
                    const parentEmail = getString(row.data.parent_email);
                    return parentEmail || '-';
                  })()}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {(() => {
                    const address = getString(row.data.address);
                    return address || '-';
                  })()}
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1">
                    {row.errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-red-600">{error}</p>
                    ))}
                    {row.warnings.map((warning, idx) => (
                      <p key={idx} className="text-xs text-yellow-600">{warning}</p>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

