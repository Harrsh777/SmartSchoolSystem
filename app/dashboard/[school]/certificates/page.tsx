'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CertificateManagementPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  // Redirect to dashboard by default
  useEffect(() => {
    router.replace(`/dashboard/${schoolCode}/certificates/dashboard`);
  }, [schoolCode, router]);

  return null;
}
