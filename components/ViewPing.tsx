'use client';

import { useEffect } from 'react';

const STORAGE_KEY_PREFIX = 'realm:viewed:';
const TTL_MS = 30 * 60 * 1000; // 30 min — same listing only counts once per half-hour per browser

export function ViewPing({ id }: { id: string | null | undefined }) {
  useEffect(() => {
    if (!id) return;
    const key = STORAGE_KEY_PREFIX + id;
    try {
      const last = window.sessionStorage.getItem(key);
      if (last && Date.now() - Number(last) < TTL_MS) return;
      window.sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // session storage blocked — still send, but won't dedup
    }
    // fire-and-forget
    fetch(`/api/listing/${id}/view`, { method: 'POST', keepalive: true }).catch(() => {});
  }, [id]);
  return null;
}
