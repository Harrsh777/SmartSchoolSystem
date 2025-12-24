'use client';

import TutorialModal from '@/components/TutorialModal';
import { Users, Plus, Upload, Search, Eye, Edit } from 'lucide-react';

interface StudentsTutorialProps {
  schoolCode: string;
  onClose: () => void;
}

export default function StudentsTutorial({ schoolCode, onClose }: StudentsTutorialProps) {
  const steps = [
    {
      title: 'Understanding the Students Page',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            The Students page is your central hub for managing all student records in your school. 
            This page allows you to view, search, filter, and manage student information efficiently.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Key Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>View all students in a searchable table</li>
              <li>Filter students by class</li>
              <li>Search by name, admission number, or class</li>
              <li>See student status (active/inactive)</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Adding Students - Single & Bulk Import',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            You can add students to your system in two ways:
          </p>
          
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <Plus className="text-white" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Add Student Button</h4>
                  <p className="text-green-800 text-sm">
                    Click this button to manually add a single student. You'll fill out a form with:
                  </p>
                  <ul className="list-disc list-inside text-green-800 text-sm mt-2 space-y-1">
                    <li>Admission number, name, class, section</li>
                    <li>Date of birth, gender</li>
                    <li>Parent contact information</li>
                    <li>Address details</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-500 p-2 rounded-lg">
                  <Upload className="text-white" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-purple-900 mb-1">Bulk Import Button</h4>
                  <p className="text-purple-800 text-sm">
                    Use this for adding multiple students at once via Excel/CSV file. The process includes:
                  </p>
                  <ul className="list-disc list-inside text-purple-800 text-sm mt-2 space-y-1">
                    <li>Download a template with required fields</li>
                    <li>Upload your filled Excel/CSV file</li>
                    <li>Review and fix any validation errors</li>
                    <li>Import all valid students automatically</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Managing Student Records',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Once students are added, you can manage their records using the action buttons in the table:
          </p>
          
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Search className="text-blue-600" size={20} />
                <h4 className="font-semibold text-blue-900">Search & Filter</h4>
              </div>
              <p className="text-blue-800 text-sm">
                Use the search bar to find students by name, admission number, or class. 
                Use the class dropdown to filter students by specific class.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Eye className="text-green-600" size={20} />
                <h4 className="font-semibold text-green-900">View Button</h4>
              </div>
              <p className="text-green-800 text-sm">
                Click "View" to see complete student details including personal information, 
                parent contacts, academic details, and status.
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Edit className="text-orange-600" size={20} />
                <h4 className="font-semibold text-orange-900">Edit Button</h4>
              </div>
              <p className="text-orange-800 text-sm">
                Click "Edit" to update any student information. You can modify all fields 
                except the admission number and school code (which are system-generated).
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Pro Tips:</h4>
            <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
              <li>Use bulk import for adding 10+ students at once</li>
              <li>Search works across multiple fields simultaneously</li>
              <li>Student status helps track active vs inactive students</li>
              <li>All changes are automatically saved to your school database</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return <TutorialModal title="Students Management Tutorial" steps={steps} onClose={onClose} />;
}

