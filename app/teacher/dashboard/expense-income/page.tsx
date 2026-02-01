'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the admin Expense/Income component
const ExpenseIncomeContent = dynamic(
  () => import('@/app/dashboard/[school]/expense-income/page').then(mod => {
    return function ExpenseIncomeWrapper() {
      const teacherData = typeof window !== 'undefined' ? sessionStorage.getItem('teacher') : null;
      const teacher = teacherData ? JSON.parse(teacherData) : null;
      const schoolCode = teacher?.school_code || 'SCH001';
      
      const Component = mod.default;
      return <Component params={Promise.resolve({ school: schoolCode })} />;
    };
  }),
  { 
    loading: () => (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    ),
    ssr: false 
  }
);

export default function TeacherExpenseIncomePage() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      const teacherData = sessionStorage.getItem('teacher');
      if (!teacherData) {
        router.push('/login');
        return;
      }

      const teacher = JSON.parse(teacherData);
      
      try {
        const response = await fetch(`/api/staff/${teacher.id}/menu`);
        const result = await response.json();
        
        if (response.ok && result.data) {
          const hasAccess = result.data.some((module: { module_key: string }) => 
            module.module_key === 'expense_income'
          );
          setHasPermission(hasAccess);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
      
      setLoading(false);
    };

    checkPermission();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access Expense/Income.</p>
        </div>
      </div>
    );
  }

  return <ExpenseIncomeContent />;
}
