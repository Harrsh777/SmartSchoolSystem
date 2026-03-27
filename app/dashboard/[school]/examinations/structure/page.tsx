'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExamStructurePage({ params }: { params: Promise<{ school: string }> }) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/${schoolCode}/examinations/dashboard`);
  }, [schoolCode]);

  return (
    <div className="p-6">
      <p className="text-sm text-gray-500">Redirecting to Examination Dashboard...</p>
    </div>
  );
}

