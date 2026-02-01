'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Map of teacher dashboard paths to admin dashboard paths
const PATH_MAPPINGS: Record<string, string> = {
  // Fees
  'fees': '/fees/v2/dashboard',
  'fees/v2/dashboard': '/fees/v2/dashboard',
  'fees/v2/fee-heads': '/fees/v2/fee-heads',
  'fees/v2/fee-structures': '/fees/v2/fee-structures',
  'fees/v2/collection': '/fees/v2/collection',
  'fees/statements': '/fees/statements',
  'fees/discounts-fines': '/fees/discounts-fines',
  'fees/reports': '/fees/reports',
  
  // Timetable
  'timetable': '/timetable/class',
  'timetable/class': '/timetable/class',
  'timetable/teacher': '/timetable/teacher',
  'timetable/group-wise': '/timetable/group-wise',
  
  // Expense/Income
  'expense-income': '/expense-income',
  
  // Transport
  'transport': '/transport/dashboard',
  'transport/dashboard': '/transport/dashboard',
  'transport/vehicles': '/transport/vehicles',
  'transport/stops': '/transport/stops',
  'transport/routes': '/transport/routes',
  'transport/route-students': '/transport/route-students',
  
  // Leave Management
  'leave': '/leave/dashboard',
  'leave/dashboard': '/leave/dashboard',
  'leave/student-leave': '/leave/student-leave',
  'leave/staff-leave': '/leave/staff-leave',
  'leave/basics': '/leave/basics',
  
  // Reports
  'reports': '/reports',
  
  // Front Office
  'front-office': '/front-office',
  'gate-pass': '/gate-pass',
  'visitor-management': '/visitor-management',
};

export default function DynamicTeacherPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [slugPath, setSlugPath] = useState('');

  useEffect(() => {
    const checkPermissionAndRedirect = async () => {
      const resolvedParams = await params;
      const slug = resolvedParams.slug.join('/');
      setSlugPath(slug);
      
      // Get teacher data from session storage
      const teacherData = sessionStorage.getItem('teacher');
      if (!teacherData) {
        router.push('/login');
        return;
      }

      const teacher = JSON.parse(teacherData);
      
      // Check if teacher has permission for this route
      try {
        const response = await fetch(`/api/staff/${teacher.id}/menu`);
        const result = await response.json();
        
        if (response.ok && result.data) {
          // Check if any module's sub-module route matches
          const hasAccess = result.data.some((module: {
            sub_modules: Array<{ route: string; has_view_access: boolean }>;
          }) => 
            module.sub_modules.some(sm => {
              const smRoute = sm.route.replace('/teacher/dashboard/', '');
              return smRoute === slug || slug.startsWith(smRoute) || smRoute.startsWith(slug);
            })
          );
          
          setHasPermission(hasAccess);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
      
      setLoading(false);
    };

    checkPermissionAndRedirect();
  }, [params, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don&apos;t have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <Link
            href="/teacher/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // If has permission, show the feature coming soon message
  // In a full implementation, you would dynamically render the admin page component here
  const adminPath = PATH_MAPPINGS[slugPath];
  
  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            {slugPath.split('/').map(part => 
              part.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')
            ).join(' - ')}
          </h1>
          
          <p className="text-gray-600 mb-6">
            You have access to view this module. This feature is being integrated into the teacher portal.
          </p>
          
          {adminPath && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Tip:</strong> This module is available in the admin dashboard. Ask your administrator for full access if needed.
              </p>
            </div>
          )}
          
          <div className="flex justify-center gap-4">
            <Link
              href="/teacher/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
