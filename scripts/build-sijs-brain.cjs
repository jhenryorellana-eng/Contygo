// Exporta a la landing lo que el Cerebro (el recolector SIJS, en ~/Documents/Trabajo/Cerebro/taller/recolector) reunió de
// cada estado en sus fuentes oficiales: las vías judiciales con su edad límite y su ley, los requisitos y tasas de
// presentación, los formularios y la corte de cada condado. Lo usa el asistente del equipo (lib/agent/sijs-brain.ts).
// De cada estado se toma el paquete más nuevo: la fábrica v3 si existe; si no, la corrida nacional del 28-09-2026.
// Solo datos de fuentes oficiales: los paquetes no llevan nada de clientes, y lo aprendido en casos reales no se toca.
// uso: node scripts/build-sijs-brain.cjs [carpeta del recolector]
const fs = require("fs"), path = require("path");
const SRC = process.argv[2] || path.join(process.env.HOME, "Documents/Trabajo/Cerebro/taller/recolector");
const OUT = path.join(__dirname, "../lib/agent/data/sijs-brain.json");
const NAMES = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Distrito de Columbia", FL: "Florida", GA: "Georgia", HI: "Hawái", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Luisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Míchigan", MN: "Minnesota", MS: "Misisipi", MO: "Misuri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "Nuevo Hampshire", NJ: "Nueva Jersey", NM: "Nuevo México", NY: "Nueva York", NC: "Carolina del Norte", ND: "Dakota del Norte", OH: "Ohio", OK: "Oklahoma", OR: "Oregón", PA: "Pensilvania", RI: "Rhode Island", SC: "Carolina del Sur", SD: "Dakota del Sur", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "Virginia Occidental", WI: "Wisconsin", WY: "Wyoming" };
const CONDITIONS = { soltero: "estar soltero", maltrato_o_negligencia: "hechos de maltrato o negligencia", consentimiento_menor_18_o_mas: "consentimiento del joven si tiene 18 o más", bajo_custodia_estatal: "estar bajo custodia del estado", padre_ausente_o_abandono: "padre ausente o abandono", padre_fallecido: "padre fallecido", sin_orden_custodia_previa: "que no haya una orden de custodia anterior" };
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const short = (text, max) => { const clean = String(text ?? "").replace(/\s+/g, " ").trim(); return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "…" : clean; };
const countyName = label => String(label).replace(/\s+(County|Parish|Borough|Census Area|Municipality|city and borough|City and Borough)$/i, "").trim();
const official = domain => /(\.gov|\.us|\.mil)$/i.test(domain) || /(legislature|courts?|leg|senate|assembly|judiciary|statutes|capitol|law)\b/i.test(domain);

// Los nombres de los condados (por FIPS) salen de la corrida nacional, que los trae de todos los estados.
function v1(code) {
  const file = path.join(SRC, "salida", code, "paquete.json");
  return fs.existsSync(file) ? read(file) : null;
}

function fromV3(pkg, fips) {
  const ev = new Map(pkg.evidence.map(e => [e.key, e]));
  const sources = (keys, field) => { const seen = new Set(), out = [];
    for (const e of keys.map(k => ev.get(k)).filter(Boolean).sort((a, b) => (b.supports?.field === field) - (a.supports?.field === field))) { if (e.tier !== "A" || seen.has(e.url)) continue; seen.add(e.url); out.push({ u: e.url, q: short(e.quote, 260) }); if (out.length === 2) break; }
    return out; };
  const types = new Map(pkg.courtTypes.map(t => [t.key, t.officialName]));
  const routes = new Map();
  for (const r of pkg.routes) {
    const id = `${r.officialName}|${r.ageLimitExclusive}`; const at = routes.get(id);
    if (at) { const court = types.get(r.courtTypeKey); if (court && !at.courts.includes(court)) at.courts.push(court); at.ok = at.ok && r.status === "verificado"; continue; }
    routes.set(id, { name: short(r.officialName, 170), kind: r.category, courts: [types.get(r.courtTypeKey)].filter(Boolean), age: r.ageLimitExclusive, basis: r.ageBasis, statute: r.statute || null, venue: short(r.venueRule, 240) || null,
      conditions: r.conditions.map(c => c.code === "residencia_minima_meses" ? `residencia mínima de ${c.months} meses` : CONDITIONS[c.code] || c.code.replace(/_/g, " ")), who: (r.whoMayFile || []).slice(0, 4).map(w => short(w, 150)), ok: r.status === "verificado", src: sources(r.evidenceKeys, "ageLimitExclusive") });
  }
  const reqs = new Map();
  for (const q of pkg.filingRequirements) { const id = `${q.kind}|${q.text}`; const court = types.get(q.courtTypeKey);
    if (reqs.has(id)) { const at = reqs.get(id); if (court && !at.courts.includes(court)) at.courts.push(court); continue; }
    reqs.set(id, { kind: q.kind, text: short(q.text, 320), usd: q.amountUsd ?? null, courts: [court].filter(Boolean), ok: q.status === "verificado", src: sources(q.evidenceKeys).slice(0, 1).map(s => s.u) }); }
  const forms = pkg.forms.filter(f => f.officialUrl).map(f => ({ n: f.number || null, t: short(f.title, 120), u: f.officialUrl, use: f.purpose })).slice(0, 30);
  const courts = new Map(pkg.courts.map(c => [c.key, c])), houses = new Map();
  for (const h of pkg.courthouses) { if (!houses.has(h.courtKey)) houses.set(h.courtKey, []); houses.get(h.courtKey).push(h); }
  const counties = {};
  for (const a of pkg.assignments) { if (a.territory.kind !== "condado") continue; const name = fips.get(a.territory.code); const court = courts.get(a.courtKey); if (!name || !court) continue;
    const picked = (a.courthouseKeys.length ? pkg.courthouses.filter(h => a.courthouseKeys.includes(h.key)) : houses.get(a.courtKey) || [])[0];
    (counties[name] ||= []).push({ type: types.get(a.courtTypeKey) || null, court: court.canonicalName, ...(picked && (houses.get(a.courtKey) || []).length === 1 || a.courthouseKeys.length ? { at: short([picked?.name, picked?.street, picked?.cityStateZip].filter(Boolean).join(", "), 150) } : {}), ok: a.status === "verificado" }); }
  return { from: "v3", collected: pkg.generatedAt.slice(0, 10), majorityAge: pkg.framework.majorityAge ?? null, sijsStatute: pkg.framework.hasSijsStatute ?? null, routes: [...routes.values()], reqs: [...reqs.values()].slice(0, 60), forms, counties };
}

function fromV1(pkg) {
  const node = new Map(pkg.nodes.map(n => [n.id, n]));
  const sources = edge => { const seen = new Set(), out = [];
    for (const e of edge.evidence || []) { const s = node.get(e.source); if (!s?.url || seen.has(s.url) || !official(s.domain || "")) continue; seen.add(s.url); out.push({ u: s.url, q: short(e.quote, 260) }); if (out.length === 2) break; }
    return out; };
  const checked = edge => (edge.checks || []).includes("quote_verified") && (edge.checks || []).includes("official_domain");
  const filed = new Map(); for (const e of pkg.edges) if (e.rel === "route_filed_in") { if (!filed.has(e.from)) filed.set(e.from, []); filed.get(e.from).push(node.get(e.to)?.label); }
  const routes = pkg.edges.filter(e => e.rel === "allows_route" && e.confidence !== "low" && (e.evidence || []).length).map(e => ({ name: short(node.get(e.to)?.label, 170), kind: null, courts: (filed.get(e.to) || []).filter(Boolean), age: e.attrs?.ageLimitExclusive ?? null, basis: null, statute: null, venue: short(e.attrs?.venueRule, 240) || null, conditions: [], who: [], ok: checked(e), src: sources(e) })).filter(r => r.src.length);
  const counties = {};
  for (const e of pkg.edges) { if (e.rel !== "county_served_by" || e.confidence === "low" || !(e.evidence || []).length) continue; const county = node.get(e.from), court = node.get(e.to); if (!county || !court) continue;
    (counties[countyName(county.label)] ||= []).push({ type: null, court: court.label, ok: checked(e) }); }
  return { from: "v1", collected: pkg.generatedAt.slice(0, 10), majorityAge: null, sijsStatute: null, routes, reqs: [], forms: [], counties };
}

const states = {};
for (const code of Object.keys(NAMES)) {
  const old = v1(code); const fips = new Map((old?.nodes || []).filter(n => n.type === "county").map(n => [n.fips, countyName(n.label)]));
  const fresh = path.join(SRC, "salida-v3", code, "paquete.json");
  const data = fs.existsSync(fresh) ? fromV3(read(fresh), fips) : old ? fromV1(old) : null;
  if (!data) { console.log(code, "sin paquete"); continue; }
  // La corrida nacional conserva la corte de un condado cuando la fábrica nueva no la trae.
  if (data.from === "v3" && old) { const before = fromV1(old).counties; for (const [name, list] of Object.entries(before)) if (!data.counties[name]) data.counties[name] = list; }
  states[code] = { name: NAMES[code], ...data };
}
fs.writeFileSync(OUT, JSON.stringify({ builtOn: new Date().toISOString().slice(0, 10), states }));
const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`escrito ${path.relative(process.cwd(), OUT)} · ${kb} KB · ${Object.keys(states).length} estados`);
for (const [code, s] of Object.entries(states)) { const ages = [...new Set(s.routes.map(r => r.age))].sort(); console.log(code.padEnd(3), s.from, s.collected, "vías", String(s.routes.length).padStart(2), "edades", JSON.stringify(ages).padEnd(16), "condados", String(Object.keys(s.counties).length).padStart(3), "tasas/req", String(s.reqs.length).padStart(2), "form", String(s.forms.length).padStart(2), "verif.", s.routes.filter(r => r.ok).length); }
