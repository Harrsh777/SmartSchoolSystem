'use client';

import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;

function getBrowserSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}

/** Refetch when student submissions change for a diary (or any diary row updates). */
export function useDiaryRealtime(diaryIds: string[], onRefresh: () => void) {
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || diaryIds.length === 0) return;

    const channel = supabase
      .channel(`diary-live-${diaryIds.slice(0, 3).join('-')}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'diary_student_submissions' },
        () => onRefresh()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diaries' }, () => onRefresh())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [diaryIds.join(','), onRefresh]);
}
