'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect from old examinations/report-card to new report-card module
 */
export default function ReportCardRedirectPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/${schoolCode}/report-card`);
  }, [router, schoolCode]);

  return (
    <div className="flex items-center justify-center py-24">
      <p className="text-gray-500">Redirecting to Report Card...</p>
    </div>
  );
}
