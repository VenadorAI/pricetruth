import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/observations — receive a scout observation.
 * MVP persistence strategy: if OBS_GITHUB_TOKEN + OBS_GITHUB_REPO (owner/name) are configured, the observation is committed as
 * a JSON file under data/inbox/ in that repo (GitHub acts as the database; a redeploy picks new files up).
 * Without configuration the observation is validated and echoed back (the client keeps it locally = demo mode).
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }
  const b = body as { [k: string]: unknown };
  const errors: string[] = [];
  const price = typeof b.price === "number" ? b.price : b.price == null ? null : Number(b.price);
  if (!b.chain) errors.push("store missing");
  if (!b.pid && !b.product_text) errors.push("product missing");
  if (price == null && !b.mechanic) errors.push("price or promotion missing");
  if (price != null && (Number.isNaN(price) || price < 0 || price > 500)) errors.push("price unrealistic");
  if (errors.length) return NextResponse.json({ ok: false, message: errors.join(", ") }, { status: 422 });

  const obs = {
    id: `scout_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    received_at: new Date().toISOString(),
    pid: (b.pid as string | null) ?? null,
    product_text: String(b.product_text ?? "").slice(0, 200),
    chain: String(b.chain).slice(0, 40),
    store: String(b.store ?? "").slice(0, 120),
    price: price,
    price_type: String(b.price_type ?? "schap").slice(0, 20),
    mechanic: String(b.mechanic ?? "").slice(0, 80),
    size: String(b.size ?? "").slice(0, 60),
    ean: String(b.ean ?? "").replace(/\D/g, "").slice(0, 14),
    note: String(b.note ?? "").slice(0, 300),
    photo_name: b.photo_name ? String(b.photo_name).slice(0, 120) : null,
    source: "scout",
    verified: false,
    confidence: b.photo_name ? 0.7 : 0.55,
  };

  const token = process.env.OBS_GITHUB_TOKEN;
  const repo = process.env.OBS_GITHUB_REPO; // "owner/name"
  const branch = process.env.OBS_GITHUB_BRANCH || "main";
  if (token && repo) {
    try {
      const path = `data/inbox/${obs.received_at.slice(0, 10)}/${obs.id}.json`;
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "content-type": "application/json", "User-Agent": "pricetruth-mvp" },
        body: JSON.stringify({ message: `scout: ${obs.chain} ${obs.product_text || obs.pid} ${obs.price ?? obs.mechanic}`, content: Buffer.from(JSON.stringify(obs, null, 2)).toString("base64"), branch }),
      });
      if (r.ok) return NextResponse.json({ ok: true, persisted: true, id: obs.id, message: "Saved to the shared inbox." });
      const t = await r.text();
      return NextResponse.json({ ok: true, persisted: false, id: obs.id, message: `Shared storage failed (${r.status}); saved locally.`, detail: t.slice(0, 200) });
    } catch {
      return NextResponse.json({ ok: true, persisted: false, id: obs.id, message: "Shared storage unreachable; saved locally." });
    }
  }
  return NextResponse.json({ ok: true, persisted: false, id: obs.id, message: "Demo mode: set OBS_GITHUB_TOKEN and OBS_GITHUB_REPO as environment variables to store reports centrally." });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "POST an observation: {pid|product_text, chain, price|mechanic, price_type, size, store, ean, note, photo_name}" });
}
