// Decodes data/*.json.gz.b64 (optionally split into *.gz.b64.partNN files) into data/*.json.
// Runs automatically via `npm run prebuild`/`predev`. Large data files are stored gzip+base64 in git so they can be
// committed through size-limited tooling. data/checksums.json (sha256 of the decoded JSON) guards against corruption.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { join } from "node:path";
const dir = join(process.cwd(), "data");
const files = readdirSync(dir);
const sums = existsSync(join(dir, "checksums.json")) ? JSON.parse(readFileSync(join(dir, "checksums.json"), "utf8")) : {};
const groups = {};
for (const f of files) {
  const m = /^(.+\.json)\.gz\.b64(?:\.part(\d+))?$/.exec(f);
  if (!m) continue;
  (groups[m[1]] ??= []).push({ f, part: m[2] ? parseInt(m[2]) : 0 });
}
for (const [out, allParts] of Object.entries(groups)) {
  const parts = allParts.some((p) => p.part > 0) ? allParts.filter((p) => p.part > 0) : allParts; // parts supersede a single file
  parts.sort((a, b) => a.part - b.part);
  const b64 = parts.map((p) => readFileSync(join(dir, p.f), "utf8")).join("").replace(/\s+/g, "");
  let json;
  try {
    json = gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
    JSON.parse(json);
  } catch (e) {
    throw new Error(`decode failed for ${out} (${parts.length} part(s)): ${e.message}`);
  }
  const sha = createHash("sha256").update(json).digest("hex");
  if (sums[out] && sums[out] !== sha) throw new Error(`checksum mismatch for ${out}: expected ${sums[out]} got ${sha}`);
  writeFileSync(join(dir, out), json);
  console.log(`decoded ${out} from ${parts.length} part(s) (${json.length} bytes) sha256=${sha.slice(0, 12)}`);
}
if (!existsSync(join(dir, "observations.json"))) throw new Error("data/observations.json missing after decode");
