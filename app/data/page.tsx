import Link from "next/link";
import { chains, meta, observations, products } from "@/lib/data";
import { ChainBadge } from "@/components/ui";

export const metadata = { title: "Data & method — PriceTruth" };

export default function Page() {
  const byChain = chains.map((c) => ({
    c,
    n: observations.filter((o) => o.chain === c.id).length,
    promos: observations.filter((o) => o.chain === c.id && o.mech && !o.upcoming_only).length,
  }));
  const nProductsFresh = products.filter((p) => observations.some((o) => o.pid === p.id && !o.stale && o.unit_price != null)).length;

  return (
    <div className="prose-sm max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Data, freshness and method</h1>
        <p className="text-slate-600">
          PriceTruth does not show &quot;the price&quot; but <b>observations</b>: chain, item, price, price type (shelf/promotion/member), conditions, source, date and confidence. You see not only what something costs, but also how sure we are.
        </p>
      </header>

      <section className="card">
        <h2 className="font-semibold">State of the data</h2>
        <ul className="mt-1 text-sm text-slate-700">
          <li>{meta.n_products} products (exact branded items), {meta.n_observations} observations, built on {meta.built_at}.</li>
          <li>{nProductsFresh} products have at least one fresh observation with a unit price.</li>
          <li>History: {meta.snapshots.length} snapshots of the open supermarket dataset ({meta.snapshots[0]} to {meta.snapshots[meta.snapshots.length - 1]}).</li>
        </ul>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="py-1">Chain</th><th>Source</th><th className="text-right">Obs.</th><th className="text-right">with promo</th><th>Last change</th><th>Status</th></tr>
          </thead>
          <tbody>
            {byChain.map(({ c, n, promos }) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="py-1.5"><ChainBadge id={c.id} /> <span className="ml-1">{c.name}</span></td>
                <td className="text-xs text-slate-600">{c.source}{c.note ? ` — ${c.note}` : ""}</td>
                <td className="text-right">{n}</td>
                <td className="text-right">{promos}</td>
                <td className="text-xs">{c.last_change ?? "–"}</td>
                <td className="text-xs">{!n ? <span className="rounded bg-slate-100 px-1.5 py-0.5">no data — scout needed</span> : c.stale ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-800">stale</span> : <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">fresh</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card space-y-2 text-sm text-slate-700">
        <h2 className="font-semibold">What we discovered while building</h2>
        <p>
          The well-known open supermarket dataset (Checkjebon, MIT) turns out to be <b>frozen for AH, Dirk, PLUS, Hoogvliet and DekaMarkt since at least 16 March 2026</b> — not a single price change in five months — while Jumbo, SPAR, Lidl (receipt data), Poiesz and Vomar do move. Whoever shows that data blindly shows old prices. So we read the AH prices of all {observations.filter((o) => o.chain === "ah" && !o.stale).length} items live from ah.nl on 15 August 2026 (including Bonus mechanics and &quot;from Monday&quot; deals) and mark the four other chains as <i>stale</i> (hidden by default).
        </p>
        <p>
          Kruidvat, Etos, Action and Normal publish no usable product feed. Action prices come from the public category pages of action.com (uniform nationwide); Kruidvat and Etos promotions come from the weekly flyer (via Folderz) and are often <i>range-wide</i> (&quot;all Nivea 1+1&quot;) with no regular price per item — exactly the gap that scouts fill with a shelf photo.
        </p>
      </section>

      <section className="card space-y-2 text-sm text-slate-700">
        <h2 className="font-semibold">How we calculate</h2>
        <p><b>Price per unit.</b> Everything is converted to per liter, kg, unit, wash or roll. Liquid detergent in ml is converted to washes using the manufacturer&apos;s dose for that product (e.g. Ariel 45 ml, Robijn Klein &amp; Krachtig 35 ml, Omo 50 ml per wash).</p>
        <p><b>Promotions.</b> 1+1 and &quot;2nd free&quot; = 50% per item when buying 2; 2+1 = 33%; 2nd at half price = 25%; &quot;x for y&quot; = y/x. AH Bonus always requires a Bonuskaart; we show that as a condition. Deals that only start on Monday do not count as today&apos;s price, but do feed the &quot;buy or wait&quot; advice.</p>
        <p><b>Confidence.</b> Live product page 85%, moving open data 60–70%, receipt data 50%, range-wide flyer offer 40–55%, stale source 35%. Scout reports with a photo get 70% and become &quot;verified&quot; after review.</p>
        <p><b>What we do not know (yet).</b> The price in your specific branch (AH and PLUS say themselves it may differ slightly; SPAR differs per format), stock, personal offers (Bonus Box, Jumbo Extra&apos;s), and history longer than three months.</p>
      </section>

      <section className="card space-y-2 text-sm text-slate-700">
        <h2 className="font-semibold">Sources &amp; licences</h2>
        <ul className="list-disc pl-5">
          {meta.sources.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <p className="text-xs text-slate-500">
          Brand and store names belong to their respective owners and are used for identification only. PriceTruth is not affiliated with any retailer. Observations are facts with source and date; we do not copy catalogues and we respect access restrictions. Report errors via the <Link href="/scout" className="underline">scout page</Link>.
        </p>
      </section>

      <section className="card space-y-2 text-sm text-slate-700">
        <h2 className="font-semibold">Roadmap (short)</h2>
        <ol className="list-decimal pl-5">
          <li>Weekly shelf photos at Kruidvat, Etos, Action, Normal, Lidl and Aldi in one city (Stage 0) → verify instead of estimate.</li>
          <li>Photo upload + OCR for scouts, moderation queue, EAN linking.</li>
          <li>Build price history per chain → &quot;is this offer real?&quot; with 30/90-day lows and promo cycles.</li>
          <li>WhatsApp bot: send a photo or brand, get the answer back.</li>
          <li>Travel time in the 2-stop plan; alerts on your list.</li>
        </ol>
      </section>
    </div>
  );
}
