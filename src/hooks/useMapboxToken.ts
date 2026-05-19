import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

let cached: string | null = null;
let inflight: Promise<string> | null = null;

async function fetchToken(): Promise<string> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    if (error) throw error;
    const token = (data as { token?: string })?.token ?? '';
    cached = token;
    return token;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function useMapboxToken() {
  const [token, setToken] = useState<string>(cached ?? '');
  const [loading, setLoading] = useState<boolean>(!cached);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    if (cached) return;
    fetchToken()
      .then((t) => { if (active) { setToken(t); setLoading(false); } })
      .catch((e) => { if (active) { setError(e); setLoading(false); } });
    return () => { active = false; };
  }, []);

  return { token, loading, error };
}
