"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { chains, fmtEur, products } from "@/lib/data";
import { Report, useReports } from "@/lib/store";
import { ChainBadge } from "./ui";

export function ScoutView() {
  const sp = useSearchParams();
  const [reports, addReport] = useReports();
  const [pid, setPid] = useState<string>(sp.get("pid") ?? "");
  const [productText, setProductText] = useState("");
  const [chain, setChain] = useState("kruidvat");
  const [store, setStore] = useState("");
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState("schap");
  const [mechanic, setMechanic] = useState("");
  const [size, setSize] = useState("");
  const [ean, setEan] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const body = {
      pid: pid || null,
      product_text: pid ? `${products.find((p) => p.id === pid)?.brand} ${products.find((p) => p.id === pid)?.name}` : productText,
      chain, store, price: price ? parseFloat(price.replace(",", ".")) : null, price_type: priceType, mechanic, size, ean, note,
      photo_name: photo?.name ?? null,
      observed_at: new Date().toISOString(),
    };
    let persisted = false;
    let serverMsg = "";
    try {
      const r = await fetch("/api/observations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      persisted = !!j.persisted;
      serverMsg = j.message ?? "";
    } catch {
      serverMsg = "Server unreachable; saved locally.";
    }
    const rep: Report = { id: `r${Date.now()}`, created_at: body.observed_at, ...body, persisted } as Report;
    addReport(rep);
    setMsg(persisted ? `Thanks! Saved to the shared database. ${serverMsg}` : `Thanks! Saved locally in your browser (demo mode: shared storage not configured yet). ${serverMsg}`);
    setBusy(false);
    setPrice(""); setMechanic(""); setNote(""); setPhoto(null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Become a price scout</h1>
        <p className="text-sm text-slate-600">
          Spotted a shelf price, member price or promotion we do not have (right)? Report it in 20 seconds. A photo of the shelf label or your receipt makes the report &quot;verified&quot;.
          Chains we are still missing entirely: {chains.filter((c) => !c.n_obs).map((c) => <ChainBadge key={c.id} id={c.id} />)}.
        </p>
      </header>

      <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2 [&>label]:min-w-0 [&>div]:min-w-0">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Product</span>
          <select value={pid} onChange={(e) => setPid(e.target.value)}>
            <option value="">— other product (type below) —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.brand} · {p.name}</option>
            ))}
          </select>
          {!pid && <input value={productText} onChange={(e) => setProductText(e.target.value)} placeholder="Brand + product + variant, e.g. Nivea Fresh Natural deo spray" />}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Store</span>
          <select value={chain} onChange={(e) => setChain(e.target.value)}>
            {chains.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Branch / city (optional)</span>
          <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="e.g. Amsterdam Kinkerstraat" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Price per item (€)</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="4.99" required={!mechanic} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Price type</span>
          <select value={priceType} onChange={(e) => setPriceType(e.target.value)}>
            <option value="schap">Shelf price (everyone)</option>
            <option value="actie">Promotion price (flyer/shelf)</option>
            <option value="leden">Member price (card/app required)</option>
            <option value="persoonlijk">Personal offer (only me)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Promotion mechanic (optional)</span>
          <input value={mechanic} onChange={(e) => setMechanic(e.target.value)} placeholder="1+1 free, 2nd half price, 3 for 10, 25% off" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Pack size</span>
          <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="150 ml / 12 washes / 6 rolls" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">EAN / barcode (optional)</span>
          <input value={ean} onChange={(e) => setEan(e.target.value)} inputMode="numeric" placeholder="8710… (13 digits)" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Photo of shelf label or receipt (optional)</span>
          <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-xs" />
          <span className="text-[11px] text-slate-500">In this MVP the photo is not uploaded yet; only the file name is sent.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. only with Kruidvat Club card; valid until Sunday" />
        </label>
        <div className="flex items-center justify-between sm:col-span-2">
          <span className="text-xs text-slate-500">By reporting you agree that the price (without personal data) is shared publicly.</span>
          <button disabled={busy} className="btn-primary">{busy ? "Sending…" : "Report price"}</button>
        </div>
        {msg && <div className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-800 sm:col-span-2">{msg}</div>}
      </form>

      <section>
        <h2 className="font-semibold">My reports ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">No reports from this device yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <ChainBadge id={r.chain} />
                <span className="font-medium">{r.product_text}</span>
                <span>{r.price != null ? fmtEur(r.price) : ""} {r.mechanic}</span>
                <span className="text-xs text-slate-500">{r.price_type} · {r.store || "chain"} · {new Date(r.created_at).toLocaleString("en-GB")}</span>
                <span className={`ml-auto rounded px-1.5 text-[11px] ${r.persisted ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{r.persisted ? "shared" : "local"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
