'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FeesPage() {
  const router = useRouter();

  // Redirect to the production-ready fees UI
  useEffect(() => {
    router.replace('/student/dashboard/fees/v2');
  }, [router]);

  return (
    null
  );
}

