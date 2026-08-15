"use client";
import Link from "next/link";
import { Chain, chainById, chains, Prefs, Observation, freshness, confidenceLabel, needsCard, fmtEur, CHAIN_TYPE_LABEL } from "@/lib/data";

export function ChainBadge({ id, size = "sm" }: { id: string; size?: "sm" | "md" }) {
  const c: Chain | undefined = chainById[id];
  if (!c) return <span className="badge">{id}</span>;
  const cls = size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center rounded-md font-semibold text-white ${cls}`} style={{ background: c.color }} title={`${c.name} (${CHAIN_TYPE_LABEL[c.type]})`}>
      {c.short}
    </span>
  );
}

export function ChainPicker({ prefs, update }: { prefs: Prefs; update: (p: Partial<Prefs>) => void }) {
  const groups: { label: string; type: Chain["type"] }[] = [
    { label: "Supermarkets", type: "supermarkt" },
    { label: "Drugstores", type: "drogist" },
    { label: "Discounters", type: "discounter" },
  ];
  const toggle = (id: string) => update({ chains: prefs.chains.includes(id) ? prefs.chains.filter((x) => x !== id) : [...prefs.chains, id] });
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div key={g.type} className="flex flex-wrap items-center gap-1.5">
          <span className="w-28 shrink-0 text-xs uppercase tracking-wide text-slate-500">{g.label}</span>
          {chains
            .filter((c) => c.type === g.type)
            .map((c) => {
              const on = prefs.chains.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"}`}
                  title={c.n_obs ? `${c.n_obs} observations` : "no data yet — scout needed"}
                >
                  {c.short}
                  {!c.n_obs && <span className="ml-1 text-[10px] opacity-70">·0</span>}
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}

export function Toggles({ prefs, update }: { prefs: Prefs; update: (p: Partial<Prefs>) => void }) {
  const T = ({ k, label, hint }: { k: keyof Prefs; label: string; hint: string }) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm" title={hint}>
      <input type="checkbox" checked={!!prefs[k]} onChange={(e) => update({ [k]: e.target.checked } as Partial<Prefs>)} className="h-4 w-4 accent-emerald-600" />
      <span>{label}</span>
    </label>
  );
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      <T k="includePromos" label="Count promotions (1+1, 2nd free…)" hint="Treat multibuys and Bonus deals as the effective price per item" />
      <T k="cardOk" label="I have loyalty cards/apps" hint="Turn off to see only prices that need no Bonuskaart/Club card" />
      <T k="showStale" label="Show stale data" hint="Sources that have not changed since March 2026 (Dirk, PLUS, Hoogvliet, Deka)" />
    </div>
  );
}

export function FreshBadge({ o }: { o: Observation }) {
  const f = freshness(o);
  const tone = { good: "bg-emerald-50 text-emerald-700 border-emerald-200", ok: "bg-amber-50 text-amber-700 border-amber-200", bad: "bg-rose-50 text-rose-700 border-rose-200" }[f.tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] ${tone}`} title={o.source}>
      {f.label}
    </span>
  );
}

export function ConfDots({ c }: { c: number }) {
  const n = c >= 0.8 ? 4 : c >= 0.6 ? 3 : c >= 0.45 ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-0.5" title={`confidence ${confidenceLabel(c)} (${Math.round(c * 100)}%)`}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < n ? "bg-slate-700" : "bg-slate-200"}`} />
      ))}
    </span>
  );
}

export function MechChips({ o }: { o: Observation }) {
  const chips: { t: string; cls: string; title?: string }[] = [];
  if (o.mech && !o.upcoming_only) chips.push({ t: o.mech.label, cls: "bg-orange-100 text-orange-800", title: o.mechanic ?? undefined });
  if (o.regular_price) chips.push({ t: `was ${fmtEur(o.regular_price)}`, cls: "bg-orange-50 text-orange-700 line-through" });
  if (needsCard(o)) chips.push({ t: "card/app required", cls: "bg-violet-100 text-violet-800", title: (o.conditions ?? []).join("; ") });
  if (o.upcoming) chips.push({ t: `from Mon: ${o.upcoming.mechanic}`, cls: "bg-sky-100 text-sky-800", title: o.upcoming.note });
  if (o.variant_note) chips.push({ t: "≈ variant", cls: "bg-slate-100 text-slate-700", title: o.variant_note });
  if (o.price == null) chips.push({ t: "price unknown", cls: "bg-slate-100 text-slate-500" });
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span key={i} className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${c.cls}`} title={c.title}>
          {c.t}
        </span>
      ))}
    </span>
  );
}

export function Sparkline({ points, width = 140, height = 36 }: { points: [string, number][]; width?: number; height?: number }) {
  if (!points || points.length < 2) return null;
  const ys = points.map((p) => p[1]);
  const min = Math.min(...ys), max = Math.max(...ys);
  const span = max - min || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * (width - 4) + 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)},${(height - 4 - ((p[1] - min) / span) * (height - 8) + 2).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible" aria-label="price history">
      <path d={d} fill="none" stroke="#0f766e" strokeWidth={1.5} />
      <circle cx={xs[xs.length - 1]} cy={height - 4 - ((ys[ys.length - 1] - min) / span) * (height - 8) + 2} r={2.5} fill="#0f766e" />
    </svg>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">{children}</div>;
}

export function ScoutCta({ pid }: { pid?: string }) {
  return (
    <Link href={pid ? `/scout?pid=${pid}` : "/scout"} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
      📸 Report a shelf price
    </Link>
  );
}
