# PriceTruth — context for Claude Code

Consumer MVP for the Dutch market (UI in English): "Where is your everyday product really cheapest?" Compares exact A‑brand products (personal care, household, branded food staples) across supermarkets, drugstores and discounters, showing shelf price, promo mechanics (1+1, 2nd free, x for y), loyalty‑card conditions, price per compare unit, data freshness/confidence and a "buy now or wait" verdict. UI, code and docs are English; retailer item names are kept as the stores print them (Dutch).

## Stack
- Next.js 14 (App Router, TypeScript), Tailwind. No database in the MVP: `data/*.json` is bundled at build time. Client state (chain selection, watchlist, own reports) lives in localStorage (`lib/store.ts`).
- `lib/data.ts` holds the domain logic: unit-price selection under user prefs (`applicableUnitPrice`), ranking (`rankProduct`, `bestPerChain`), summaries, `buyOrWait`, `offerReality`, `planForList` (1‑ and 2‑stop plans).
- Pages: `/` (search + overview), `/p/[id]` (comparison), `/lijst` (watchlist + trip plan), `/scout` (report a shelf price), `/data` (sources, freshness, method), `/api/observations` (POST; persists to GitHub if `OBS_GITHUB_TOKEN` + `OBS_GITHUB_REPO` are set, else demo mode).

## Data model (see `data/observations.json`)
An observation = one price seen for one chain product: `pid` (canonical product), `chain`, `name`/`size` as the chain names it, `price` (per item as displayed), `mechanic` + parsed `mech` (`factor` = effective price multiplier), `effective_price`, `qty` in compare unit, `unit_price` (effective per l/kg/unit/wash/roll), `unit_price_regular`, `conditions` (e.g. "Bonus: Bonuskaart (loyalty card) required"), `upcoming` (promo that starts later, e.g. AH "from Monday"), `source`, `observed_at`, `valid_to`, `confidence` 0–1, `stale` (source frozen), `variant_note` (when the chain item is a near‑variant, not the exact SKU).

## Data files in git
`data/*.json.gz.b64.partNN` (gzip + base64, split in ~1.2 KB parts) are decoded to `data/*.json` by `scripts/decode-data.mjs` on `predev`/`prebuild`; `data/checksums.json` holds the sha256 of each decoded file. Never edit the decoded JSON by hand — rebuild with the pipeline and re-encode (`gzip -9 | base64 -w100 | split -l12`).

## Data pipeline (`scripts/pipeline/`, Python 3.11)
1. `snap.py <sha> <date>` — downloads a Checkjebon `supermarkets.json` snapshot (MIT open data, github.com/supermarkt/checkjebon) and filters brand products into `data/snap_<date>.json`.
2. `seed_defs.py` — the 53 canonical products with regex rules per chain; `match.py` prints candidates; `build_picks.py` writes `inputs/picks.json` (not committed; regenerate from the 2026‑08‑15 snapshot).
3. `inputs/ah_live.json` — AH prices read from ah.nl product pages on 2026‑08‑15 (the open dataset's AH/Dirk/PLUS/Hoogvliet/DekaMarkt feeds are frozen since ≤ 2026‑03‑16 — always check freshness before trusting a source).
4. `inputs/manual_obs.json` — Action prices from action.com category pages and Kruidvat/Etos folder offers via folderz.nl (both 2026‑08‑15).
5. `build_data.py` → `app-data/*.json`; copy into `data/` and rebuild.
Run from the repo root: `cd scripts/pipeline && python3 build_data.py && cp app-data/*.json ../../data/`.

## Conventions
- Never show a price without date, source and confidence. Stale sources are hidden by default (`showStale`).
- Compare per unit; liquid detergent ml→washes via `ML_PER_WB` in `build_data.py`. Mechanic labels are English (`EN_MECH`), retailer item names stay as printed (`NAME_EN` holds the canonical English product names).
- AH Bonus always requires a Bonuskaart → condition "Bonus: Bonuskaart (loyalty card) required"; "from Monday" promos are `upcoming`, not current.
- Legal posture: open data + own observations; no circumvention of access controls; rate‑limit any fetching; keep source URLs. See the second‑opinion report (docs/00, see docs/README.md) for the legal summary.

## Next steps (in order)
1. Stage 0 field test (docs/01) — weekly shelf photos in one city, WhatsApp broadcast, 5 buyer calls.
2. Photo upload for scouts (Vercel Blob or S3) + moderation queue + EAN linking; ingest `data/inbox/*.json` from scout reports into observations.
3. Nightly job: refresh Jumbo/Lidl/SPAR from Checkjebon, AH from product pages (respect robots/terms), Action from category pages; keep history per chain.
4. Better "is this offer real?" once ≥ 8 weeks of own history exist; promo‑cycle estimate per SKU/chain.
5. WhatsApp bot (Twilio/Meta Cloud API) answering "where is X cheapest?".
6. B2B sample export (CSV/API) for the buyer conversations.

## Commands
`npm run dev` · `npm run build` · `npm start`. Deploy: Vercel (project linked to this repo; every push to `main` deploys).
