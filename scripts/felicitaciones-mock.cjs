// Almacén de prueba para las felicitaciones (solo local): hace de Supabase para /califica, /admin y el muro de la
// landing, con lo justo: la tabla de reseñas, sus dos funciones de moderación y el cajón de fotos. Todo en memoria:
// al cerrarlo, se borra. No toca ninguna base real.
//   node scripts/felicitaciones-mock.cjs            (puerto 3998)
//   y la landing con SUPABASE_URL=http://<ip>:3998 SUPABASE_ANON_KEY=local SUPABASE_ADMIN_SECRET=local ADMIN_PASSWORD=<clave de prueba>
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const PORT = Number(process.env.PORT || 3998), SECRET = process.env.SUPABASE_ADMIN_SECRET || "local";
const rows = [], photos = new Map();
const read = req => new Promise(resolve => { const parts = []; req.on("data", part => parts.push(part)); req.on("end", () => resolve(Buffer.concat(parts))); });
const json = (res, status, data) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(data === undefined ? "" : JSON.stringify(data)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://local"), body = await read(req);
  if (req.method === "POST" && url.pathname === "/rest/v1/ulp_reviews") {
    const input = JSON.parse(body.toString() || "{}");
    if (input.image_path && !input.consent) return json(res, 400, { message: "image needs consent" });
    rows.unshift({ id: randomUUID(), status: "pending", created_at: new Date().toISOString(), kind: "review", place: null, image_path: null, consent: false, service_id: null, ...input });
    return json(res, 201);
  }
  if (req.method === "GET" && url.pathname === "/rest/v1/ulp_reviews") return json(res, 200, rows.filter(row => row.status === "approved").slice(0, Number(url.searchParams.get("limit") || 12)));
  if (req.method === "POST" && url.pathname.startsWith("/rest/v1/rpc/")) {
    const input = JSON.parse(body.toString() || "{}");
    if (input.p_secret !== SECRET) return json(res, 400, { message: "unauthorized" });
    if (url.pathname.endsWith("/ulp_admin_reviews_list")) return json(res, 200, rows.filter(row => input.p_status === "all" || row.status === input.p_status));
    if (url.pathname.endsWith("/ulp_admin_review_set_status")) { const row = rows.find(item => item.id === input.p_id); if (row) row.status = input.p_status; return json(res, row ? 200 : 404, row ? true : { message: "not found" }); }
    return json(res, 404, { message: "no such function (only reviews are simulated)" });
  }
  const upload = url.pathname.match(/^\/storage\/v1\/object\/felicitaciones\/([0-9a-f-]{36}\.jpg)$/);
  if (req.method === "POST" && upload) {
    if (req.headers["content-type"] !== "image/jpeg" || body.length > 1572864) return json(res, 400, { message: "not allowed" });
    photos.set(upload[1], body); return json(res, 200, { Key: `felicitaciones/${upload[1]}` });
  }
  const shown = url.pathname.match(/^\/storage\/v1\/object\/public\/felicitaciones\/([0-9a-f-]{36}\.jpg)$/);
  if (req.method === "GET" && shown && photos.has(shown[1])) { res.writeHead(200, { "Content-Type": "image/jpeg" }); return res.end(photos.get(shown[1])); }
  json(res, 404, { message: "not found" });
}).listen(PORT, "0.0.0.0", () => console.log(`Almacén de prueba de felicitaciones en http://0.0.0.0:${PORT}`));
