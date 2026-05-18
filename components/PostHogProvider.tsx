'use client';
import { useEffect } from 'react';
import posthog from 'posthog-js';

/**
 * Initialises PostHog on the client if NEXT_PUBLIC_POSTHOG_KEY is set.
 * Gracefully no-ops when the env var is missing (e.g. before analytics is configured).
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === 'undefined') return;
    if ((posthog as any).__loaded) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: 'identified_only',
    });
  }, []);
  return <>{children}</>;
}
