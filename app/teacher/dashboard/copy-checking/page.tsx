'use client';

import { useEffect, useState } from 'react';
import type { Staff } from '@/lib/supabase';
import CopyCheckingPage from '@/app/dashboard/[school]/copy-checking/page';
import Card from '@/components/ui/Card';
import { ClipboardCheck } from 'lucide-react';

export default function TeacherCopyCheckingWrapper() {
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      try {
        const teacher = JSON.parse(storedTeacher) as Staff & { school_code?: string };
        const code = teacher.school_code;
        if (code) {
          setSchoolCode(code);
        }
      } catch {
        setSchoolCode(null);
      }
    } else {
      setSchoolCode(null);
    }
    setChecked(true);
  }, []);

  if (!checked) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto mb-4" />
          <p className="text-emerald-700 font-medium">Loading copy checking module...</p>
        </div>
      </div>
    );
  }

  if (!schoolCode) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <ClipboardCheck className="text-emerald-700" size={40} />
            <h1 className="text-2xl font-bold text-gray-900">Copy Checking</h1>
            <p className="text-sm text-gray-600">
              Unable to determine your school. Please make sure you are logged in as a teacher.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Reuse the main dashboard copy-checking module with the teacher's school code.
  return <CopyCheckingPage schoolCodeOverride={schoolCode} />;
}

