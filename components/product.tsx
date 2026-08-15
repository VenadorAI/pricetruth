"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { applicableUnitPrice, bestPerChain, buyOrWait, chainById, fmtDate, fmtEur, fmtUnit, history, obsForProduct, offerReality, productById, rankProduct, needsCard, CATEGORY_LABEL } from "@/lib/data";
import { usePrefs, useWatchlist } from "@/lib/store";
import { ChainBadge, ChainPicker, ConfDots, FreshBadge, MechChips, Sparkline, Toggles, ScoutCta } from "./ui";

export function ProductView({ pid }: { pid: string }) {
  const p = productById[pid];
  const [prefs, update, ready] = usePrefs();
  const [showPrefs, setShowPrefs] = useState(false);
  const [, toggle, has] = useWatchlist();
  const all = obsForProduct(pid);
  const ranked = useMemo(() => bestPerChain(pid, prefs), [pid, prefs]);
  const advice = useMemo(() => buyOrWait(pid, prefs), [pid, prefs]);
  const best = ranked[0];
  const bestNoPromo = useMemo(() => bestPerChain(pid, { ...prefs, includePromos: false })[0], [pid, prefs]);
  const bestNoCard = useMemo(() => bestPerChain(pid, { ...prefs, cardOk: false })[0], [pid, prefs]);
  const hidden = all.filter((o) => !prefs.chains.includes(o.chain));
  const staleHidden = all.filter((o) => prefs.chains.includes(o.chain) && o.stale && !prefs.showStale);
  const noPrice = all.filter((o) => prefs.chains.includes(o.chain) && (!o.stale || prefs.showStale) && applicableUnitPrice(o, prefs) == null);

  if (!ready) return null;

  return (
    <div className="space-y-5">
      <nav className="text-xs text-slate-500">
        <Link href="/" className="underline">← all products</Link>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{p.brand} · {CATEGORY_LABEL[p.category]}</div>
          <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
          <p className="text-sm text-slate-600">Compared {p.cu_label}. Pack sizes differ between stores — that is why we always show the price per unit.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toggle(pid)} className={has(pid) ? "btn border-emerald-600 bg-emerald-50 text-emerald-700" : "btn"}>
            {has(pid) ? "✓ On my list" : "+ Add to my list"}
          </button>
          <button onClick={() => setShowPrefs((v) => !v)} className="btn">🏪 Stores ({prefs.chains.length})</button>
        </div>
      </header>

      {showPrefs && (
        <div className="card space-y-3">
          <ChainPicker prefs={prefs} update={update} />
          <Toggles prefs={prefs} update={update} />
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="card border-emerald-200 bg-emerald-50/60">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Cheapest now</div>
          {best ? (
            <>
              <div className="mt-1 flex items-center gap-2 text-lg font-bold">
                <ChainBadge id={best.obs.chain} size="md" /> {fmtEur(best.item)}
              </div>
              <div className="text-sm text-slate-700">{fmtUnit(best.unit, p.cu)} · {best.obs.name} {best.obs.size ? `(${best.obs.size})` : ""}</div>
              <div className="mt-1 flex flex-wrap gap-1"><MechChips o={best.obs} /></div>
              <div className="mt-1 text-xs text-slate-600"><FreshBadge o={best.obs} /> · <ConfDots c={best.obs.confidence} /></div>
            </>
          ) : (
            <div className="mt-1 text-sm text-slate-600">No usable price at your stores.</div>
          )}
        </div>
        <div className="card">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Without promotion or card</div>
          {bestNoCard ? (
            <>
              <div className="mt-1 flex items-center gap-2 text-lg font-bold">
                <ChainBadge id={bestNoCard.obs.chain} size="md" /> {fmtEur(bestNoCard.item)}
              </div>
              <div className="text-sm text-slate-700">{fmtUnit(bestNoCard.unit, p.cu)} · regular price, everyone pays this</div>
            </>
          ) : (
            <div className="mt-1 text-sm text-slate-600">–</div>
          )}
          {bestNoPromo && bestNoPromo.obs.chain !== bestNoCard?.obs.chain && (
            <div className="mt-1 text-xs text-slate-500">Without promotions but with card: {chainById[bestNoPromo.obs.chain].short} {fmtEur(bestNoPromo.item)}</div>
          )}
        </div>
        <div className={`card ${advice.verdict === "koop" ? "border-emerald-200" : advice.verdict === "wacht" ? "border-sky-200 bg-sky-50/50" : ""}`}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {advice.verdict === "koop" ? "🟢 Buy now" : advice.verdict === "wacht" ? "🔵 Wait" : "⚪ No rush"}
          </div>
          <p className="mt-1 text-sm text-slate-800">{advice.text}</p>
        </div>
      </section>

      <section className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Store</th>
              <th className="px-3 py-2">Item as the store names it</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2">Promotion / conditions</th>
              <th className="px-3 py-2 text-right">{p.cu_label}</th>
              <th className="px-3 py-2">Freshness · source</th>
              <th className="px-3 py-2">History</th>
            </tr>
          </thead>
          <tbody>
            {rankProduct(pid, prefs).map((r, i) => {
              const o = r.obs;
              const h = history[pid]?.[o.chain];
              const isBestOfChain = ranked.some((b) => b.obs.id === o.id);
              return (
                <tr key={o.id} className={`border-t border-slate-100 ${i === 0 ? "bg-emerald-50/50" : ""} ${!isBestOfChain ? "text-slate-500" : ""}`}>
                  <td className="px-3 py-2 align-top"><ChainBadge id={o.chain} /></td>
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium leading-snug">{o.name}</div>
                    <div className="text-xs text-slate-500">{o.size ?? "size unknown"}{o.variant_note ? ` · ${o.variant_note}` : ""}</div>
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <div className="font-semibold">{fmtEur(o.price)}</div>
                    {r.item != null && o.price != null && Math.abs(r.item - o.price) > 0.001 && <div className="text-xs text-emerald-700">→ {fmtEur(r.item)} each</div>}
                  </td>
                  <td className="px-3 py-2 align-top"><MechChips o={o} /></td>
                  <td className="px-3 py-2 text-right align-top font-semibold">{fmtUnit(r.unit, p.cu)}</td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1"><FreshBadge o={o} /><span className="text-[11px] text-slate-500"><ConfDots c={o.confidence} /> {o.source}</span></div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {h && h.length >= 3 ? (
                      <div title={`${h.length} observations ${fmtDate(h[0][0])} – ${fmtDate(h[h.length - 1][0])}`}>
                        <Sparkline points={h} />
                        <div className="text-[11px] text-slate-500">min {fmtEur(Math.min(...h.map((x) => x[1])))} · max {fmtEur(Math.max(...h.map((x) => x[1])))}</div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">no series yet</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {noPrice.map((o) => (
              <tr key={o.id} className="border-t border-slate-100 text-slate-500">
                <td className="px-3 py-2 align-top"><ChainBadge id={o.chain} /></td>
                <td className="px-3 py-2 align-top">
                  <div className="font-medium leading-snug">{o.name}</div>
                  <div className="text-xs">{o.size ?? "size unknown"}{o.variant_note ? ` · ${o.variant_note}` : ""}</div>
                </td>
                <td className="px-3 py-2 text-right align-top">{fmtEur(o.price)}</td>
                <td className="px-3 py-2 align-top"><MechChips o={o} /></td>
                <td className="px-3 py-2 text-right align-top text-xs">cannot be computed</td>
                <td className="px-3 py-2 align-top"><FreshBadge o={o} /></td>
                <td className="px-3 py-2 align-top text-[11px]">—</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(staleHidden.length > 0 || hidden.length > 0) && (
          <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
            {staleHidden.length > 0 && <span>{staleHidden.length} stale observation(s) hidden ({staleHidden.map((o) => chainById[o.chain].short).join(", ")}) — enable &quot;show stale data&quot;. </span>}
            {hidden.length > 0 && <span>{hidden.length} observation(s) from stores you did not select ({Array.from(new Set(hidden.map((o) => chainById[o.chain].short))).join(", ")}).</span>}
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span>No observation yet from:</span>
        {prefs.chains.filter((c) => !all.some((o) => o.chain === c)).map((c) => <ChainBadge key={c} id={c} />)}
        {prefs.chains.filter((c) => !all.some((o) => o.chain === c)).length === 0 && <span className="text-slate-400">— all selected stores have data</span>}
        <ScoutCta pid={pid} />
      </section>

      <section className="card">
        <h2 className="font-semibold">Is the offer real?</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {ranked.filter((r) => r.obs.mech && !r.obs.upcoming_only).map((r) => (
            <li key={r.obs.id} className="flex gap-2">
              <ChainBadge id={r.obs.chain} />
              <span>
                <b>{r.obs.mech!.label}</b>{needsCard(r.obs) ? " (with card/app)" : ""}: {offerReality(r.obs, pid, prefs)}
              </span>
            </li>
          ))}
          {ranked.filter((r) => r.obs.mech && !r.obs.upcoming_only).length === 0 && <li className="text-slate-500">No running promotion with a usable price at your stores.</li>}
          {all.filter((o) => o.upcoming && prefs.chains.includes(o.chain)).map((o) => (
            <li key={o.id + "u"} className="flex gap-2 text-sky-800">
              <ChainBadge id={o.chain} />
              <span>
                From {fmtDate(o.upcoming!.from_date)}: <b>{o.upcoming!.mechanic}</b>{o.upcoming!.price ? ` → ${fmtEur(o.upcoming!.price)}` : ""} ({o.upcoming!.note}).
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          By law, &quot;was/now&quot; prices must use the lowest price of the previous 30 days as reference; we additionally show the lowest regular price elsewhere. History is still short (open data since May 2026; AH live only since today) — this gets more reliable the longer we measure.
        </p>
      </section>
    </div>
  );
}
