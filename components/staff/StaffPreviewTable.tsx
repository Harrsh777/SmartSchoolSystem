'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import type { StaffRow } from '@/app/dashboard/[school]/staff/import/page';

interface StaffPreviewTableProps {
  rows: StaffRow[];
  onRowUpdate: (rowIndex: number, field: string, value: string) => void;
}

export default function StaffPreviewTable({ rows, onRowUpdate }: StaffPreviewTableProps) {
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
              <th className="text-left py-3 px-4 font-semibold text-gray-700 sticky left-0 bg-white z-10">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Staff ID*</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Full Name*</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Role*</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Designation</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone*</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Date of Joining*</th>
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
                <td className="py-3 px-4 sticky left-0 bg-inherit z-10">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(row.status)}
                    <span className={getStatusBadge(row.status)}>{row.status}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {editingCell?.row === row.rowIndex && editingCell?.field === 'staff_id' ? (
                    <input
                      type="text"
                      defaultValue={row.data.staff_id || ''}
                      onBlur={(e) => handleCellSave(row.rowIndex, 'staff_id', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellSave(row.rowIndex, 'staff_id', e.currentTarget.value);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellEdit(row.rowIndex, 'staff_id')}
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                    >
                      {row.data.staff_id || '-'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {editingCell?.row === row.rowIndex && editingCell?.field === 'full_name' ? (
                    <input
                      type="text"
                      defaultValue={row.data.full_name || ''}
                      onBlur={(e) => handleCellSave(row.rowIndex, 'full_name', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellSave(row.rowIndex, 'full_name', e.currentTarget.value);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellEdit(row.rowIndex, 'full_name')}
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                    >
                      {row.data.full_name || '-'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {editingCell?.row === row.rowIndex && editingCell?.field === 'role' ? (
                    <input
                      type="text"
                      defaultValue={row.data.role || ''}
                      onBlur={(e) => handleCellSave(row.rowIndex, 'role', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellSave(row.rowIndex, 'role', e.currentTarget.value);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellEdit(row.rowIndex, 'role')}
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                    >
                      {row.data.role || '-'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {row.data.department || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {row.data.designation || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {row.data.email || '-'}
                </td>
                <td className="py-3 px-4">
                  {editingCell?.row === row.rowIndex && editingCell?.field === 'phone' ? (
                    <input
                      type="text"
                      defaultValue={row.data.phone || ''}
                      onBlur={(e) => handleCellSave(row.rowIndex, 'phone', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellSave(row.rowIndex, 'phone', e.currentTarget.value);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellEdit(row.rowIndex, 'phone')}
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                    >
                      {row.data.phone || '-'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {row.data.date_of_joining || '-'}
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

