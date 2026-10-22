// Rebuilds the filters' unique/set star lists and the staff mod block from the tier sheets in docs/tiers.
//   node scripts/build-tiers.mjs          write the filters and docs/tiers/applied.json
//   node scripts/build-tiers.mjs --check  only report what would change
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILTERS = ["Roofoo.filter", "RoofooMystery.filter", "RoofooMysteryBETA.filter"];
const TIERS = { "3 Star Pick-up": "TP", "3 Star": "TS", "1 Star": "OS", "No Star": "NS" };
const STAFF_HEADER = "// NMAG skill weapon bases (every filter level)";
const check = process.argv.includes("--check");

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cur += '"'), i++;
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") row.push(cur), (cur = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur), (cur = "");
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((x) => x.trim())) rows.push(row);
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const read = (f) => parseCsv(fs.readFileSync(path.join(ROOT, "docs/tiers", f), "utf8"));
const problems = [];

// Star lists: {"NSUNI": [codes], "NSUNIETH": [...], ...}
const items = read("items.csv");
const lists = {};
for (const r of items) {
  const q = r.Rarity === "Unique" ? "UNI" : r.Rarity === "Set" ? "SET" : null;
  if (!q || !/^[a-z0-9]{3,4}$/.test(r.Code)) {
    problems.push(`items.csv: row "${r.Code}" has an unknown code or rarity`);
    continue;
  }
  for (const [col, eth] of [["Normal", ""], ["Ethereal", "ETH"]]) {
    const v = r[col];
    if (!v || v === "Default" || v === "—" || v === "-") continue;
    const t = TIERS[v];
    if (!t) problems.push(`items.csv: ${r.Code} ${r.Rarity} ${col} "${v}" isn't one of: ${Object.keys(TIERS).join(", ")}, Default`);
    else (lists[`${t}${q}${eth}`] ??= []).push(r.Code);
  }
}

// Staff mod rules, in order.
const staff = read("staff-mods.csv")
  .filter((r) => !/^no$/i.test(r.Show))
  .map((r) => {
    const lines = r.Note ? r.Note.split(/\s*\|\s*/) : [];
    const note = lines.length ? `%TAN%Note%WHITE%: ${lines[0]}${lines.slice(1).map((l) => `%CL%%WHITE%${l}`).join("")}%CL%` : "";
    if (!r.Condition) problems.push(`staff-mods.csv: a row has no Condition`);
    return `ItemDisplay[${r.Condition}]: %DOT-D6%%NAME%{${note}%NAME%}`;
  });

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const ALIAS = /^Alias\[((NS|OS|TS|TP)(UNI|SET)(ETH)?)(\d+)\]: (.*)$/;
// Single-item clauses after the list, e.g. OSSET1's "OR (rin SET !ID FL9_MARKER_OK)".
const extrasOf = (body, q) => [...body.matchAll(new RegExp(String.raw` OR \(([a-z0-9]{2,5}) ${q} [^()]*\)`, "g"))].map((m) => ({ code: m[1], text: m[0] }));
function starLine(name, q, eth, codes, extras) {
  const list = codes.length ? `((${codes.join(" OR ")}) ${q} ${eth ? "ETH" : "!ETH"} !ID)` : "(CLVL>999)";
  return extras.length ? `Alias[${name}]: (${list}${extras.map((x) => x.text).join("")})` : `Alias[${name}]: ${list}`;
}

const report = [];
for (const file of FILTERS) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) continue;
  const text = fs.readFileSync(p, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(eol);
  // Every list's alias slots (NSUNI1, NSUNI2…) in the order they appear.
  const slots = {};
  lines.forEach((l, i) => {
    const m = l.match(ALIAS);
    if (m) (slots[m[1]] ??= []).push(i);
  });
  for (const k of Object.keys(lists)) if (!slots[k]) problems.push(`${file}: no Alias[${k}1] to put the ${k} list in`);
  let changed = 0;
  for (const [key, idx] of Object.entries(slots)) {
    const [, , , q, eth] = key.match(/^((NS|OS|TS|TP)(UNI|SET)(ETH)?)$/);
    // An extra clause stays while the sheet keeps its item on this tier; the item then isn't listed again.
    const extras = idx.map((i) => extrasOf(lines[i].match(ALIAS)[6], q).filter((x) => !eth && (lists[key] ?? []).includes(x.code)));
    const inExtras = new Set(extras.flat().map((x) => x.code));
    const codes = [...new Set(lists[key] ?? [])].filter((c) => !inExtras.has(c)).sort();
    const per = Math.ceil(codes.length / idx.length);
    idx.forEach((i, n) => {
      const name = lines[i].match(/^Alias\[(\w+)\]/)[1];
      const next = starLine(name, q, !!eth, codes.slice(n * per, (n + 1) * per), extras[n]);
      if (next !== lines[i]) (lines[i] = next), changed++;
    });
  }
  // Staff mod block: the rules right under the header.
  const h = lines.findIndex((l) => l.trim() === STAFF_HEADER);
  let staffNote = "no staff mod block";
  if (h >= 0) {
    let end = h + 1;
    while (end < lines.length && lines[end].startsWith("ItemDisplay[")) end++;
    const old = lines.slice(h + 1, end);
    if (old.join("\n") !== staff.join("\n")) {
      lines.splice(h + 1, end - h - 1, ...staff);
      changed++;
    }
    staffNote = `${staff.length} staff mod rules (was ${old.length})`;
  }
  report.push(`${file}: ${changed ? `${changed} line(s) changed` : "up to date"}, ${staffNote}`);
  if (!check && changed) fs.writeFileSync(p, lines.join(eol));
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

if (!check) {
  const applied = {
    items: Object.fromEntries(items.map((r) => [`${r.Rarity}|${r.Code}`, [r.Normal, r.Ethereal]])),
    staff: read("staff-mods.csv").map((r) => [r.Show, r.Condition, r.Note]),
  };
  fs.writeFileSync(path.join(ROOT, "docs/tiers/applied.json"), JSON.stringify(applied));
}
console.log(report.join("\n"));
