"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, chainById, chains, fmtEur, fmtUnit, meta, searchProducts, summarize } from "@/lib/data";
import { usePrefs, useWatchlist } from "@/lib/store";
import { ChainBadge, ChainPicker, Toggles, EmptyHint, ScoutCta } from "./ui";

export function HomeView() {
  const [prefs, update, ready] = usePrefs();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [, toggle, has] = useWatchlist();

  const rows = useMemo(() => {
    const ps = searchProducts(q, cat);
    return ps.map((p) => ({ p, s: summarize(p.id, prefs) })).sort((a, b) => (b.s.savingPct ?? -1) - (a.s.savingPct ?? -1));
  }, [q, cat, prefs]);

  const nSelected = prefs.chains.length;
  const fresh = chains.filter((c) => c.n_obs && !c.stale).map((c) => c.short);

  return (
    <div className="space-y-5">
      <section className="card bg-gradient-to-br from-emerald-50 to-white">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Where is your everyday product really cheapest?</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Exact branded products compared across Dutch supermarkets, drugstores and discounters — shelf price, promotion, loyalty card, price per unit, and how fresh and reliable each
          observation is. No &quot;best match&quot; guessing with different pack sizes.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: nivea, ariel pods, colgate, cola, toilet paper…" className="w-full text-base" autoFocus />
          <button onClick={() => setShowPrefs((v) => !v)} className="btn whitespace-nowrap">
            🏪 Stores near me ({nSelected}) {showPrefs ? "▲" : "▼"}
          </button>
        </div>
        {showPrefs && (
          <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
            <ChainPicker prefs={prefs} update={update} />
            <Toggles prefs={prefs} update={update} />
            <p className="text-xs text-slate-500">Your selection is stored locally in your browser. Stores marked ·0 have no price data yet — become a scout.</p>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button onClick={() => setCat(null)} className={`rounded-full px-3 py-1 text-sm ${cat === null ? "bg-slate-900 text-white" : "bg-white border border-slate-300"}`}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCat(cat === c.id ? null : c.id)} className={`rounded-full px-3 py-1 text-sm ${cat === c.id ? "bg-slate-900 text-white" : "bg-white border border-slate-300"}`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span>
          {meta.n_products} products · {meta.n_observations} observations · fresh sources: {fresh.join(", ")} · built {meta.built_at}
        </span>
        <span className="flex items-center gap-2">
          <Link href="/data" className="underline">how reliable is this?</Link>
          <ScoutCta />
        </span>
      </section>

      {!ready ? null : rows.length === 0 ? (
        <EmptyHint>Nothing found. Try a brand (Nivea, Ariel, Colgate…) or submit your product via the scout page.</EmptyHint>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ p, s }) => (
            <li key={p.id} className="card flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/p/${p.id}`} className="group">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{p.brand}</div>
                  <div className="font-semibold leading-snug group-hover:underline">{p.name}</div>
                </Link>
                <button
                  onClick={() => toggle(p.id)}
                  className={`shrink-0 rounded-md border px-2 py-1 text-xs ${has(p.id) ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600"}`}
                  title="Add to my list"
                >
                  {has(p.id) ? "✓ on list" : "+ list"}
                </button>
              </div>
              {s.best ? (
                <div className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <ChainBadge id={s.best.obs.chain} />
                    <span className="font-semibold">{fmtEur(s.best.item)}</span>
                    <span className="text-slate-500">{fmtUnit(s.best.unit, p.cu)}</span>
                    {s.best.obs.mech && !s.best.obs.upcoming_only && <span className="rounded bg-orange-100 px-1.5 text-[11px] text-orange-800">{s.best.obs.mech.label}</span>}
                    {s.best.obs.variant_note && <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-600" title={s.best.obs.variant_note}>≈ variant</span>}
                  </div>
                  {s.worst && s.worst.obs.chain !== s.best.obs.chain && (
                    <div className="mt-1 text-xs text-slate-600">
                      most expensive at your stores: <ChainBadge id={s.worst.obs.chain} /> {fmtUnit(s.worst.unit, p.cu)}
                      {s.savingPct != null && s.savingPct > 0 && <span className="ml-1 rounded bg-emerald-100 px-1.5 font-semibold text-emerald-800">−{s.savingPct}%</span>}
                      <span className="ml-1 text-slate-400">· {s.nChains} stores</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">No usable price at your selected stores yet. {p.chains.length ? `Data exists for: ${p.chains.map((c) => chainById[c]?.short ?? c).join(", ")}.` : ""}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
