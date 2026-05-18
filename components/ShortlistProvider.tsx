'use client';

/**
 * CROSS-7 · Shortlist provider.
 *
 * A tiny client-side comparison list. Backed by localStorage so it survives
 * reloads without requiring an account. Items are stored as compact records
 * (just enough to render the drawer offline) so we don't have to refetch by
 * id when the user opens the drawer.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ShortlistItem = {
  id: string;
  title: string;
  href?: string;
  source_url?: string | null;
  source_name?: string | null;
  state?: string | null;
  category?: string | null;
  price_text?: string | null;
  sale_date?: string | null;
  realm_take?: string | null;
  image?: string | null;
};

type Ctx = {
  items: ShortlistItem[];
  add: (item: ShortlistItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const ShortlistCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = 'realm:shortlist:v1';
const MAX_ITEMS = 6;

export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Load on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.slice(0, MAX_ITEMS));
      }
    } catch {}
    setReady(true);
  }, []);

  // Persist on change. Skip the first render so we don't overwrite stored state.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const add = useCallback((item: ShortlistItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      if (prev.length >= MAX_ITEMS) {
        // Drop the oldest to make room rather than refusing — gentler UX.
        return [...prev.slice(1), item];
      }
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const value = useMemo(
    () => ({ items, add, remove, clear, has, open, setOpen }),
    [items, add, remove, clear, has, open],
  );

  return <ShortlistCtx.Provider value={value}>{children}</ShortlistCtx.Provider>;
}

export function useShortlist(): Ctx {
  const ctx = useContext(ShortlistCtx);
  if (!ctx) {
    // Defensive fallback so a stray import outside the provider doesn't crash
    // the whole page. Returns an inert shortlist.
    return {
      items: [],
      add: () => {},
      remove: () => {},
      clear: () => {},
      has: () => false,
      open: false,
      setOpen: () => {},
    };
  }
  return ctx;
}
