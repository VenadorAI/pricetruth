"use client";
import Link from "next/link";
import { useWatchlist } from "@/lib/store";

export function NavList() {
  const [list] = useWatchlist();
  return (
    <Link href="/lijst" className="relative rounded px-1.5 py-1 hover:bg-slate-100 sm:px-2">
      My list
      {list.length > 0 && (
        <span className="ml-1 rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold text-white">{list.length}</span>
      )}
    </Link>
  );
}
