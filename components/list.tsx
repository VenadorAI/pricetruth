"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fmtEur, fmtUnit, planForList, productById, products } from "@/lib/data";
import { usePrefs, useWatchlist } from "@/lib/store";
import { ChainBadge, ChainPicker, Toggles, EmptyHint } from "./ui";

export function ListView() {
  const [prefs, update, ready] = usePrefs();
  const [list, toggle] = useWatchlist();
  const [showPrefs, setShowPrefs] = useState(false);
  const plan = useMemo(() => planForList(list, prefs), [list, prefs]);

  if (!ready) return null;
  const starter = ["nivea-fresh-natural-deo", "andrelon-classic-iedere-dag", "colgate-caries-protection", "ariel-4in1-pods", "page-toiletpapier", "coca-cola-zero", "douwe-egberts-aroma-rood-500", "dreft-afwasmiddel-original"];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My list</h1>
          <p className="text-sm text-slate-600">Your everyday products. We work out where to buy them cheapest with one or two store stops.</p>
        </div>
        <button onClick={() => setShowPrefs((v) => !v)} className="btn">🏪 Stores ({prefs.chains.length})</button>
      </header>
      {showPrefs && (
        <div className="card space-y-3">
          <ChainPicker prefs={prefs} update={update} />
          <Toggles prefs={prefs} update={update} />
        </div>
      )}

      {list.length === 0 ? (
        <EmptyHint>
          Your list is empty. Add products from the search page, or{" "}
          <button className="underline" onClick={() => starter.forEach((pid) => toggle(pid))}>
            load a sample student list
          </button>{" "}
          (deodorant, shampoo, toothpaste, pods, toilet paper, cola, coffee, dish soap).
        </EmptyHint>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <div className="card">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Everything in 1 store</div>
              {plan.one ? (
                <>
                  <div className="mt-1 flex items-center gap-2 text-lg font-bold"><ChainBadge id={plan.one.chains[0]} size="md" /> {fmtEur(plan.one.total)}</div>
                  <div className="text-xs text-slate-600">{plan.one.covered} of {list.length} products available with a price</div>
                </>
              ) : <div className="text-sm text-slate-500">–</div>}
            </div>
            <div className="card border-emerald-200 bg-emerald-50/50">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Best plan with 2 stops</div>
              {plan.two ? (
                <>
                  <div className="mt-1 flex items-center gap-2 text-lg font-bold">
                    {plan.two.chains.map((c) => <ChainBadge key={c} id={c} size="md" />)} {fmtEur(plan.two.total)}
                  </div>
                  <div className="text-xs text-slate-600">
                    {plan.two.covered} of {list.length} with a price · ideal (each product at its cheapest store): {fmtEur(plan.ideal)}
                  </div>
                </>
              ) : <div className="text-sm text-slate-500">Add more stores or products.</div>}
            </div>
            <div className="card">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Reference: everything at AH (shelf price)</div>
              <div className="mt-1 text-lg font-bold">{plan.ahTotal != null ? fmtEur(plan.ahTotal) : "n/a"}</div>
              {plan.ahTotal != null && plan.two && (
                <div className="text-xs text-slate-600">
                  Saving with 2 stops: <b className="text-emerald-700">{fmtEur(plan.ahTotal - plan.two.total)}</b>
                  {plan.two.covered < list.length ? " (not all products comparable)" : ""}
                </div>
              )}
            </div>
          </section>

          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Cheapest</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2">In 2-stop plan</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((pid) => {
                  const p = productById[pid];
                  const b = plan.perItemBest[pid];
                  const inPlan = plan.two?.items.find((i) => i.pid === pid);
                  return (
                    <tr key={pid} className="border-t border-slate-100">
                      <td className="px-3 py-2"><Link href={`/p/${pid}`} className="font-medium hover:underline">{p.brand} {p.name}</Link></td>
                      <td className="px-3 py-2">{b ? <span className="flex items-center gap-1"><ChainBadge id={b.obs.chain} /> <span className="text-xs text-slate-500">{fmtUnit(b.unit, p.cu)}{b.obs.mech && !b.obs.upcoming_only ? ` · ${b.obs.mech.label}` : ""}</span></span> : <span className="text-xs text-slate-400">no price at your stores</span>}</td>
                      <td className="px-3 py-2 text-right font-semibold">{b ? fmtEur(b.item) : "–"}</td>
                      <td className="px-3 py-2">{inPlan ? <span className="flex items-center gap-1"><ChainBadge id={inPlan.chain} /> {fmtEur(inPlan.price)}</span> : <span className="text-xs text-slate-400">–</span>}</td>
                      <td className="px-3 py-2 text-right"><button onClick={() => toggle(pid)} className="text-xs text-slate-500 hover:text-rose-600">remove</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <p className="text-xs text-slate-500">
            Prices per item incl. running promotions (when &quot;count promotions&quot; is on; multibuys require buying the stated quantity). Travel time/cost is not included yet — that is the next step.
          </p>
        </>
      )}
      <section className="text-xs text-slate-500">
        All products: {products.length}. <Link href="/" className="underline">Search and add →</Link>
      </section>
    </div>
  );
}
