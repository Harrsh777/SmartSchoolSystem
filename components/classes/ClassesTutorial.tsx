'use client';

import TutorialModal from '@/components/TutorialModal';
import { BookOpen, Plus, Users, UserCheck, Edit, Trash2 } from 'lucide-react';

interface ClassesTutorialProps {
  schoolCode: string;
  onClose: () => void;
}

export default function ClassesTutorial({ schoolCode, onClose }: ClassesTutorialProps) {
  const steps = [
    {
      title: 'Understanding the Classes Page',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            The Classes page helps you manage your school's class structure. Classes are automatically 
            detected from your student data, but you can also create them manually.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Key Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>View all classes with live student counts</li>
              <li>Automatically detect classes from student data</li>
              <li>Manually create new classes</li>
              <li>Assign class teachers to each class</li>
              <li>Navigate to filtered student lists</li>
            </ul>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">✨ Automatic Detection:</h4>
            <p className="text-green-800 text-sm">
              When you visit this page, the system automatically detects all unique class combinations 
              from your students table and creates class records for you. No manual work needed!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Creating and Managing Classes',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            You can manage classes using the buttons and actions available:
          </p>
          
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <Plus className="text-white" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Add Class Button</h4>
                  <p className="text-green-800 text-sm">
                    Click this to manually create a new class. You'll specify:
                  </p>
                  <ul className="list-disc list-inside text-green-800 text-sm mt-2 space-y-1">
                    <li>Class name (e.g., 10, 9, 8)</li>
                    <li>Section (e.g., A, B, C)</li>
                    <li>Academic Year (defaults to current year)</li>
                  </ul>
                  <p className="text-green-800 text-sm mt-2">
                    <strong>Note:</strong> Classes are automatically detected from students, 
                    so you usually don't need to create them manually.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Users className="text-white" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Student Count (Clickable)</h4>
                  <p className="text-blue-800 text-sm">
                    The student count shows how many students are in each class. 
                    Click on the count to navigate to the Students page with that class pre-filtered, 
                    so you can see all students in that specific class and section.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-500 p-2 rounded-lg">
                  <UserCheck className="text-white" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-purple-900 mb-1">Assign Teacher Button</h4>
                  <p className="text-purple-800 text-sm">
                    Click "Assign Teacher" to assign a class teacher to a class. You can:
                  </p>
                  <ul className="list-disc list-inside text-purple-800 text-sm mt-2 space-y-1">
                    <li>Search and select from available teachers</li>
                    <li>Change or remove an assigned teacher</li>
                    <li>Only teachers from your staff list are available</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Class Actions and Best Practices',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Additional actions and tips for managing classes:
          </p>
          
          <div className="space-y-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Edit className="text-orange-600" size={20} />
                <h4 className="font-semibold text-orange-900">Edit Button</h4>
              </div>
              <p className="text-orange-800 text-sm">
                Click "Edit" to modify class details like section or academic year. 
                Note that you cannot change the class name once created.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Trash2 className="text-red-600" size={20} />
                <h4 className="font-semibold text-red-900">Delete Button</h4>
              </div>
              <p className="text-red-800 text-sm">
                You can only delete a class if it has no students. This prevents accidental 
                deletion of classes with active student records. If a class has students, 
                the delete button will be disabled.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-blue-600" size={20} />
                <h4 className="font-semibold text-blue-900">Live Student Count</h4>
              </div>
              <p className="text-blue-800 text-sm">
                Student counts are calculated dynamically from your students table. 
                They update automatically as you add or remove students - no manual refresh needed!
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Pro Tips:</h4>
            <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
              <li>Classes are auto-detected from students - usually no manual creation needed</li>
              <li>Assign class teachers to help organize your school structure</li>
              <li>Click student counts to quickly view all students in a class</li>
              <li>Each class must have a unique combination of class, section, and academic year</li>
              <li>You can't delete classes with students - remove students first if needed</li>
              <li>Use the search bar to quickly find specific classes</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return <TutorialModal title="Classes Management Tutorial" steps={steps} onClose={onClose} />;
}

