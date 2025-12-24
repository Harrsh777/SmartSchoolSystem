'use client';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Users, User, Edit, Trash2 } from 'lucide-react';
import type { ClassWithDetails } from '@/lib/supabase';

interface ClassesTableProps {
  classes: ClassWithDetails[];
  schoolCode: string;
  onAssignTeacher: (classItem: ClassWithDetails) => void;
  onDelete: (classId: string) => void;
  onStudentCountClick: (classItem: ClassWithDetails) => void;
}

export default function ClassesTable({
  classes,
  schoolCode,
  onAssignTeacher,
  onDelete,
  onStudentCountClick,
}: ClassesTableProps) {
  if (classes.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 text-lg mb-2">No classes found</p>
          <p className="text-gray-500 text-sm">
            Detect classes from your students or add a class manually
          </p>
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
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Class</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Section</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Academic Year</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Students</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Class Teacher</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((classItem) => (
              <tr
                key={classItem.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-4 font-medium text-black">{classItem.class}</td>
                <td className="py-4 px-4 text-gray-700">{classItem.section}</td>
                <td className="py-4 px-4 text-gray-700">{classItem.academic_year}</td>
                <td className="py-4 px-4">
                  <button
                    onClick={() => onStudentCountClick(classItem)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Users size={16} />
                    {classItem.student_count || 0}
                  </button>
                </td>
                <td className="py-4 px-4">
                  {classItem.class_teacher ? (
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="text-gray-700">{classItem.class_teacher.full_name}</span>
                      <button
                        onClick={() => onAssignTeacher(classItem)}
                        className="text-sm text-blue-600 hover:text-blue-800 ml-2"
                      >
                        (Change)
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAssignTeacher(classItem)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Assign Teacher
                    </button>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        // Edit functionality can be added later
                        alert('Edit functionality coming soon');
                      }}
                      className="text-gray-600 hover:text-black"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(classItem.id!)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                      disabled={(classItem.student_count || 0) > 0}
                    >
                      <Trash2 size={18} />
                    </button>
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

