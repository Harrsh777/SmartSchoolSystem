'use client';

import TutorialModal from '@/components/TutorialModal';
import { Plus, Upload, Search, Eye, Edit } from 'lucide-react';

interface StaffTutorialProps {
  schoolCode: string;
  onClose: () => void;
}

export default function StaffTutorial({ 
  // schoolCode kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  schoolCode, 
  onClose 
}: StaffTutorialProps) {
  const steps = [
    {
      title: 'Understanding the Staff Page',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            The Staff page is where you manage all staff members of your school, including teachers, 
            principals, administrators, helpers, drivers, and other support staff.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Key Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>View all staff members in an organized table</li>
              <li>Filter by department or role</li>
              <li>Search by name, staff ID, or department</li>
              <li>Manage staff information and roles</li>
            </ul>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Staff Roles Include:</h4>
            <p className="text-yellow-800 text-sm">
              Principal, Teachers, Vice Principal, Administration, Helpers, Drivers, 
              Conductors, and other support staff roles.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Adding Staff Members - Single & Bulk Import',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            You can add staff members to your system in two ways:
          </p>
          
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <Plus className="text-white" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Add Staff Button</h4>
                  <p className="text-green-800 text-sm">
                    Click this button to manually add a single staff member. The form includes:
                  </p>
                  <ul className="list-disc list-inside text-green-800 text-sm mt-2 space-y-1">
                    <li>Staff ID (unique identifier)</li>
                    <li>Full name, role, department, designation</li>
                    <li>Contact information (email, phone)</li>
                    <li>Employment details (date of joining, employment type)</li>
                    <li>Qualification and experience</li>
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
                    Use this for adding multiple staff members at once. The process includes:
                  </p>
                  <ul className="list-disc list-inside text-purple-800 text-sm mt-2 space-y-1">
                    <li>Download a template with all required fields</li>
                    <li>Upload your filled Excel/CSV file</li>
                    <li>Review and fix validation errors inline</li>
                    <li>Import all valid staff records in batches</li>
                  </ul>
                  <p className="text-purple-800 text-sm mt-2 font-semibold">
                    Perfect for onboarding all staff members at the start of the academic year!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Managing Staff Records',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Once staff members are added, you can manage their records using the action buttons:
          </p>
          
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Search className="text-blue-600" size={20} />
                <h4 className="font-semibold text-blue-900">Search & Filter</h4>
              </div>
              <p className="text-blue-800 text-sm">
                Use the search bar to find staff by name, staff ID, or department. 
                Use the department dropdown to filter staff by specific departments like 
                Mathematics, Science, Administration, etc.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Eye className="text-green-600" size={20} />
                <h4 className="font-semibold text-green-900">View Button</h4>
              </div>
              <p className="text-green-800 text-sm">
                Click &quot;View&quot; to see complete staff details including personal information, 
                contact details, employment history, qualifications, and role assignments.
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Edit className="text-orange-600" size={20} />
                <h4 className="font-semibold text-orange-900">Edit Button</h4>
              </div>
              <p className="text-orange-800 text-sm">
                Click &quot;Edit&quot; to update staff information. You can modify roles, departments, 
                contact information, and other details. Staff ID and school code cannot be changed.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Pro Tips:</h4>
            <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
              <li>Use bulk import when adding 10+ staff members</li>
              <li>Staff ID must be unique within your school</li>
              <li>Teachers can be assigned as class teachers in the Classes section</li>
              <li>Filter by department to see all staff in a specific area</li>
              <li>All staff data is automatically linked to your school</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return <TutorialModal title="Staff Management Tutorial" steps={steps} onClose={onClose} />;
}

