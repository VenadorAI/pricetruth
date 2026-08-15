import productsJson from "@/data/products.json";
import observationsJson from "@/data/observations.json";
import chainsJson from "@/data/chains.json";
import historyJson from "@/data/history.json";
import metaJson from "@/data/meta.json";

export type CompareUnit = "l" | "kg" | "st" | "wb" | "rol";

export interface Product {
  id: string;
  brand: string;
  name: string;
  category: "verzorging" | "huishouden" | "eten-drinken";
  cu: CompareUnit;
  cu_label: string;
  note?: string | null;
  n_obs: number;
  chains: string[];
}

export interface Mech {
  type: string;
  label: string;
  buy: number;
  pay: number;
  factor: number | null;
  total?: number;
}

export interface Upcoming {
  mechanic: string;
  from_date: string;
  price: number | null;
  note: string;
}

export interface Observation {
  id: string;
  pid: string;
  chain: string;
  store?: string | null;
  name: string;
  size?: string | null;
  price?: number | null;
  regular_price?: number | null;
  price_type: string;
  mechanic?: string | null;
  mech?: Mech | null;
  conditions?: string[];
  upcoming?: Upcoming | null;
  upcoming_only?: boolean;
  source: string;
  source_url?: string | null;
  observed_at: string;
  valid_from?: string | null;
  valid_to?: string | null;
  confidence: number;
  stale?: boolean;
  verified?: boolean;
  variant_note?: string | null;
  qty?: number | null;
  effective_price?: number | null;
  unit_price?: number | null;
  unit_price_regular?: number | null;
  cu?: CompareUnit;
}

export interface Chain {
  id: string;
  name: string;
  short: string;
  type: "supermarkt" | "drogist" | "discounter";
  color: string;
  n_obs: number;
  source: string;
  stale: boolean;
  last_change: string | null;
  note: string | null;
}

export const products = productsJson as Product[];
export const observations = observationsJson as unknown as Observation[];
export const chains = chainsJson as Chain[];
export const history = historyJson as unknown as Record<string, Record<string, [string, number][]>>;
export const meta = metaJson as { built_at: string; n_products: number; n_observations: number; snapshots: string[]; sources: string[] };

export const chainById = Object.fromEntries(chains.map((c) => [c.id, c])) as Record<string, Chain>;
export const productById = Object.fromEntries(products.map((p) => [p.id, p])) as Record<string, Product>;

export const CATEGORIES: { id: Product["category"]; label: string; emoji: string }[] = [
  { id: "verzorging", label: "Personal care", emoji: "🧴" },
  { id: "huishouden", label: "Household", emoji: "🧺" },
  { id: "eten-drinken", label: "Food & drinks", emoji: "🥤" },
];
export const CATEGORY_LABEL: Record<Product["category"], string> = { verzorging: "personal care", huishouden: "household", "eten-drinken": "food & drinks" };
export const CHAIN_TYPE_LABEL: Record<Chain["type"], string> = { supermarkt: "supermarket", drogist: "drugstore", discounter: "discounter" };

export const DEFAULT_CHAINS = ["ah", "jumbo", "lidl", "kruidvat", "etos", "action"];

export interface Prefs {
  chains: string[];
  includePromos: boolean; // count multibuys / Bonus etc.
  cardOk: boolean; // allow prices that need a loyalty card
  showStale: boolean;
}

export const DEFAULT_PREFS: Prefs = { chains: DEFAULT_CHAINS, includePromos: true, cardOk: true, showStale: false };

export function obsForProduct(pid: string): Observation[] {
  return observations.filter((o) => o.pid === pid);
}

export function needsCard(o: Observation): boolean {
  return (o.conditions || []).some((c) => /kaart|card|club|bonus|premium|app/i.test(c));
}

/** The price per compare unit that applies under the given preferences (or null). */
export function applicableUnitPrice(o: Observation, prefs: Prefs): number | null {
  if (o.unit_price == null && o.unit_price_regular == null) return null;
  const promoActive = !!o.mech && !o.upcoming_only && o.price != null;
  if (promoActive) {
    if (!prefs.includePromos) return o.unit_price_regular ?? null;
    if (!prefs.cardOk && needsCard(o)) return o.unit_price_regular ?? null;
    return o.unit_price ?? null;
  }
  return o.unit_price ?? o.unit_price_regular ?? null;
}

export function applicableItemPrice(o: Observation, prefs: Prefs): number | null {
  const promoActive = !!o.mech && !o.upcoming_only && o.price != null;
  if (promoActive) {
    if (!prefs.includePromos) return o.price ?? null;
    if (!prefs.cardOk && needsCard(o)) return o.price ?? null;
    return o.effective_price ?? null;
  }
  return o.price ?? null;
}

export function isUsable(o: Observation, prefs: Prefs): boolean {
  if (!prefs.chains.includes(o.chain)) return false;
  if (o.stale && !prefs.showStale) return false;
  return applicableUnitPrice(o, prefs) != null;
}

export interface Ranked {
  obs: Observation;
  unit: number;
  item: number | null;
}

/** Rank the usable observations of a product from cheapest to most expensive per compare unit. */
export function rankProduct(pid: string, prefs: Prefs): Ranked[] {
  const rows: Ranked[] = [];
  for (const o of obsForProduct(pid)) {
    if (!isUsable(o, prefs)) continue;
    const unit = applicableUnitPrice(o, prefs);
    if (unit == null) continue;
    rows.push({ obs: o, unit, item: applicableItemPrice(o, prefs) });
  }
  rows.sort((a, b) => a.unit - b.unit);
  return rows;
}

/** Best per chain (cheapest usable observation of each chain). */
export function bestPerChain(pid: string, prefs: Prefs): Ranked[] {
  const seen = new Set<string>();
  const out: Ranked[] = [];
  for (const r of rankProduct(pid, prefs)) {
    if (seen.has(r.obs.chain)) continue;
    seen.add(r.obs.chain);
    out.push(r);
  }
  return out;
}

export interface Summary {
  best: Ranked | null;
  worst: Ranked | null;
  savingPct: number | null;
  nChains: number;
}

export function summarize(pid: string, prefs: Prefs): Summary {
  const rows = bestPerChain(pid, prefs);
  if (!rows.length) return { best: null, worst: null, savingPct: null, nChains: 0 };
  const best = rows[0];
  const worst = rows[rows.length - 1];
  const savingPct = worst.unit > 0 ? Math.round((1 - best.unit / worst.unit) * 100) : null;
  return { best, worst, savingPct, nChains: rows.length };
}

export function fmtEur(x: number | null | undefined, digits = 2): string {
  if (x == null || Number.isNaN(x)) return "–";
  return "€" + x.toFixed(digits);
}

export function fmtUnit(x: number | null | undefined, cu: CompareUnit): string {
  if (x == null) return "–";
  const label = { l: "/l", kg: "/kg", st: "/unit", wb: "/wash", rol: "/roll" }[cu];
  const digits = x < 1 ? 3 : 2;
  return "€" + x.toFixed(digits) + label;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(m[3])} ${months[parseInt(m[2]) - 1]} ${m[1]}`;
}

export function searchProducts(q: string, cat?: string | null): Product[] {
  const t = q.trim().toLowerCase();
  return products.filter((p) => {
    if (cat && p.category !== cat) return false;
    if (!t) return true;
    const hay = `${p.brand} ${p.name} ${p.id}`.toLowerCase();
    return t.split(/\s+/).every((w) => hay.includes(w));
  });
}

/** Freshness label for an observation. */
export function freshness(o: Observation): { label: string; tone: "good" | "ok" | "bad" } {
  if (o.stale) return { label: `stale (${fmtDate(o.observed_at)} or earlier)`, tone: "bad" };
  if (o.observed_at === meta.built_at) return { label: `checked ${fmtDate(o.observed_at)}`, tone: "good" };
  return { label: `seen ${fmtDate(o.observed_at)}`, tone: "ok" };
}

export function confidenceLabel(c: number): string {
  if (c >= 0.8) return "high";
  if (c >= 0.6) return "fair";
  if (c >= 0.45) return "moderate";
  return "low";
}

/** Advice: buy now or wait? */
export function buyOrWait(pid: string, prefs: Prefs): { verdict: "koop" | "wacht" | "geen-haast"; text: string } {
  const rows = bestPerChain(pid, prefs);
  const p = productById[pid];
  if (!rows.length) return { verdict: "geen-haast", text: "Not enough usable prices for advice yet. Add stores or become a scout." };
  const best = rows[0];
  const bestChain = chainById[best.obs.chain];
  const upcoming = obsForProduct(pid)
    .filter((o) => prefs.chains.includes(o.chain) && o.upcoming && o.price != null && o.qty)
    .map((o) => {
      const mechFactor = mechFactorFromText(o.upcoming!.mechanic, o.price!);
      const price = o.upcoming!.price ?? (mechFactor != null ? o.price! * mechFactor : null);
      return { o, price, unit: price != null && o.qty ? price / o.qty : null };
    })
    .filter((x) => x.unit != null && x.unit < best.unit)
    .sort((a, b) => a.unit! - b.unit!);
  if (upcoming.length) {
    const u = upcoming[0];
    return {
      verdict: "wacht",
      text: `Waiting may pay off: from ${fmtDate(u.o.upcoming!.from_date)} ${chainById[u.o.chain].name} runs "${u.o.upcoming!.mechanic}" → about ${fmtEur(u.price)} per item (${fmtUnit(u.unit, p.cu)}), cheaper than today's best (${fmtEur(best.item)} at ${bestChain.name}). Note: Bonus requires a Bonuskaart.`,
    };
  }
  const promo = !!best.obs.mech && !best.obs.upcoming_only;
  if (bestChain.type === "discounter" && !promo) {
    return { verdict: "koop", text: `Buy now at ${bestChain.name}: everyday low price (${fmtEur(best.item)}), no promotion or card needed. Stock in your local store is unknown.` };
  }
  if (promo) {
    const until = best.obs.valid_to ? ` until ${fmtDate(best.obs.valid_to)}` : "";
    const buyN = best.obs.mech!.buy > 1 ? ` (buy ${best.obs.mech!.buy})` : "";
    return { verdict: "koop", text: `Buy now at ${bestChain.name}: "${best.obs.mech!.label}"${until}${buyN} → ${fmtEur(best.item)} per item. ${needsCard(best.obs) ? "Loyalty card/app required." : ""}` };
  }
  const promoProne = p.category !== "eten-drinken";
  return {
    verdict: "geen-haast",
    text: promoProne
      ? `No promotion at your stores right now. Branded personal-care and laundry products are very often on 1+1 or 2nd-half-price deals (Consumentenbond, 2026) — if you have stock, waiting is usually smart. Cheapest regular price now: ${bestChain.name} ${fmtEur(best.item)}.`
      : `No promotion at your stores right now. Cheapest regular price: ${bestChain.name} ${fmtEur(best.item)} (${fmtUnit(best.unit, p.cu)}).`,
  };
}

export function mechFactorFromText(txt: string, price: number): number | null {
  const t = txt.toLowerCase().replace(",", ".");
  if (/1\s*\+\s*1|2e gratis|2nd free/.test(t)) return 0.5;
  if (/2\s*\+\s*2/.test(t)) return 0.5;
  if (/2\s*\+\s*1/.test(t)) return 2 / 3;
  if (/2e halve|half price/.test(t)) return 0.75;
  const m = /(\d+)\s*(?:voor|for)\s*(\d+(?:\.\d+)?)/.exec(t);
  if (m) return parseFloat(m[2]) / parseInt(m[1]) / price;
  const k = /(\d+)\s*%/.exec(t);
  if (k) return 1 - parseInt(k[1]) / 100;
  return null;
}

/** "Is this offer real?" — compare a promo to the regular prices elsewhere and to the chain's own history. */
export function offerReality(o: Observation, pid: string, prefs: Prefs): string | null {
  if (!o.mech || o.upcoming_only || o.unit_price == null) return null;
  const others = bestPerChain(pid, { ...prefs, includePromos: false, chains: prefs.chains.filter((c) => c !== o.chain) });
  const cheapestRegular = others[0];
  const p = productById[pid];
  const parts: string[] = [];
  if (o.unit_price_regular != null) {
    const pct = Math.round((1 - o.unit_price / o.unit_price_regular) * 100);
    parts.push(`Effectively ${pct}% off this chain's own shelf price (${fmtEur(o.price)} → ${fmtEur(o.effective_price)} per item${o.mech.buy > 1 ? ` when buying ${o.mech.buy}` : ""}).`);
  }
  if (cheapestRegular) {
    const c = chainById[cheapestRegular.obs.chain];
    if (cheapestRegular.unit <= o.unit_price) {
      parts.push(`But: ${c.name} is already cheaper or equal without any promotion (${fmtUnit(cheapestRegular.unit, p.cu)} vs ${fmtUnit(o.unit_price, p.cu)}). This offer is no reason to go there.`);
    } else {
      const pct = Math.round((1 - o.unit_price / cheapestRegular.unit) * 100);
      parts.push(`With this offer you pay ${pct}% less than the lowest regular price elsewhere (${c.name} ${fmtUnit(cheapestRegular.unit, p.cu)}).`);
    }
  }
  const h = history[pid]?.[o.chain];
  if (h && h.length >= 3) {
    const min = Math.min(...h.map((x) => x[1]));
    if (o.effective_price != null && o.effective_price <= min + 0.001) parts.push(`Lowest price we have seen at ${chainById[o.chain].name} since ${fmtDate(h[0][0])}.`);
  }
  return parts.join(" ");
}

/** Watchlist optimisation: 1-stop and 2-stop plans. */
export interface Plan {
  chains: string[];
  total: number;
  covered: number;
  items: { pid: string; chain: string; price: number }[];
}

export function planForList(pids: string[], prefs: Prefs): { one: Plan | null; two: Plan | null; ideal: number; perItemBest: Record<string, Ranked | null>; ahTotal: number | null } {
  const per: Record<string, Ranked[]> = {};
  const perItemBest: Record<string, Ranked | null> = {};
  for (const pid of pids) {
    per[pid] = bestPerChain(pid, prefs).filter((r) => r.item != null);
    perItemBest[pid] = per[pid][0] ?? null;
  }
  const chainsAvail = Array.from(new Set(pids.flatMap((pid) => per[pid].map((r) => r.obs.chain))));
  const ideal = pids.reduce((s, pid) => s + (perItemBest[pid]?.item ?? 0), 0);
  function evalPlan(cs: string[]): Plan {
    let total = 0, covered = 0;
    const items: Plan["items"] = [];
    for (const pid of pids) {
      const cands = per[pid].filter((r) => cs.includes(r.obs.chain));
      if (!cands.length) continue;
      const b = cands[0];
      total += b.item!;
      covered++;
      items.push({ pid, chain: b.obs.chain, price: b.item! });
    }
    return { chains: cs, total, covered, items };
  }
  let one: Plan | null = null, two: Plan | null = null;
  for (const c of chainsAvail) {
    const pl = evalPlan([c]);
    if (!one || pl.covered > one.covered || (pl.covered === one.covered && pl.total < one.total)) one = pl;
  }
  for (let i = 0; i < chainsAvail.length; i++)
    for (let j = i + 1; j < chainsAvail.length; j++) {
      const pl = evalPlan([chainsAvail[i], chainsAvail[j]]);
      if (!two || pl.covered > two.covered || (pl.covered === two.covered && pl.total < two.total)) two = pl;
    }
  let ahTotal: number | null = 0;
  for (const pid of pids) {
    const ah = obsForProduct(pid).find((o) => o.chain === "ah" && o.price != null && !o.stale);
    if (!ah) { ahTotal = null; break; }
    ahTotal += ah.price!;
  }
  return { one, two, ideal, perItemBest, ahTotal };
}
