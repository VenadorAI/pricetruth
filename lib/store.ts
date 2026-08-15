"use client";
import { useEffect, useState, useCallback } from "react";
import { DEFAULT_PREFS, Prefs } from "./data";

const KEY_PREFS = "pw.prefs.v1";
const KEY_LIST = "pw.list.v1";
const KEY_REPORTS = "pw.reports.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("pw-storage"));
  } catch {}
}

export function usePrefs(): [Prefs, (p: Partial<Prefs>) => void, boolean] {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setPrefs({ ...DEFAULT_PREFS, ...read<Partial<Prefs>>(KEY_PREFS, {}) });
    setReady(true);
    const h = () => setPrefs({ ...DEFAULT_PREFS, ...read<Partial<Prefs>>(KEY_PREFS, {}) });
    window.addEventListener("pw-storage", h);
    return () => window.removeEventListener("pw-storage", h);
  }, []);
  const update = useCallback((p: Partial<Prefs>) => {
    setPrefs((old) => {
      const n = { ...old, ...p };
      write(KEY_PREFS, n);
      return n;
    });
  }, []);
  return [prefs, update, ready];
}

export function useWatchlist(): [string[], (pid: string) => void, (pid: string) => boolean] {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    setList(read<string[]>(KEY_LIST, []));
    const h = () => setList(read<string[]>(KEY_LIST, []));
    window.addEventListener("pw-storage", h);
    return () => window.removeEventListener("pw-storage", h);
  }, []);
  const toggle = useCallback((pid: string) => {
    setList((old) => {
      const n = old.includes(pid) ? old.filter((x) => x !== pid) : [...old, pid];
      write(KEY_LIST, n);
      return n;
    });
  }, []);
  const has = useCallback((pid: string) => list.includes(pid), [list]);
  return [list, toggle, has];
}

export interface Report {
  id: string;
  created_at: string;
  pid: string | null;
  product_text: string;
  chain: string;
  store: string;
  price: number | null;
  price_type: string;
  mechanic: string;
  size: string;
  ean: string;
  note: string;
  photo_name: string | null;
  persisted: boolean;
}

export function useReports(): [Report[], (r: Report) => void] {
  const [reports, setReports] = useState<Report[]>([]);
  useEffect(() => {
    setReports(read<Report[]>(KEY_REPORTS, []));
  }, []);
  const add = useCallback((r: Report) => {
    setReports((old) => {
      const n = [r, ...old].slice(0, 50);
      write(KEY_REPORTS, n);
      return n;
    });
  }, []);
  return [reports, add];
}
