// Worker del Comprobador PHP2Shell: pide las cabeceras de una web pública y las devuelve.
// Nunca devuelve el contenido de la página, no guarda nada y no registra las URLs.
import { validateTarget } from "./validate.js";

const ALLOWED_ORIGINS = ["https://robertocifre.github.io"];
const USER_AGENT = "php2shell-check/1.0 (+https://robertocifre.github.io/php2shell-check/)";
const MAX_HOPS = 5;
const TIMEOUT_MS = 8000;
// Cabeceras útiles para el análisis; el resto no se devuelve.
const KEEP = new Set(["server", "x-powered-by", "set-cookie", "x-pingback", "link", "x-generator", "x-drupal-cache",
  "via", "location", "content-type", "cf-mitigated", "x-cache"]);

function cors(origin) {
  const h = { "Vary": "Origin", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (ALLOWED_ORIGINS.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origin) } });

function pickHeaders(headers) {
  const out = [];
  for (const [name, value] of headers) {
    const n = name.toLowerCase();
    if (!KEEP.has(n)) continue;
    // De las cookies solo interesa el nombre (p. ej. PHPSESSID); el valor nunca sale del Worker.
    out.push([n, n === "set-cookie" ? value.split(";")[0].split("=")[0] + "=…" : value.slice(0, 300)]);
  }
  // Workers une varias Set-Cookie; getSetCookie() da cada una por separado cuando está disponible.
  if (typeof headers.getSetCookie === "function") {
    const cookies = headers.getSetCookie();
    if (cookies.length > 1) {
      const rest = out.filter(([n]) => n !== "set-cookie");
      return rest.concat(cookies.map((c) => ["set-cookie", c.split(";")[0].split("=")[0] + "=…"]));
    }
  }
  return out;
}

async function fetchHop(url, method) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url.toString(), { method, redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": USER_AGENT, "Accept": "*/*" } });
    if (resp.body) await resp.body.cancel(); // nunca se lee el contenido
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

async function inspect(start) {
  const hops = [];
  let current = start;
  for (let i = 0; i <= MAX_HOPS; i++) {
    let resp = await fetchHop(current, "HEAD");
    if (resp.status === 405 || resp.status === 501) resp = await fetchHop(current, "GET");
    hops.push({ url: current.toString(), status: resp.status, headers: pickHeaders(resp.headers) });
    const loc = resp.headers.get("location");
    if (resp.status < 300 || resp.status >= 400 || !loc) return { hops };
    if (i === MAX_HOPS) return { hops, error: "Demasiadas redirecciones." };
    const next = validateTarget(new URL(loc, current).toString());
    if (!next.ok) return { hops, error: "La web redirige a un destino no permitido: " + next.reason };
    current = next.url;
  }
  return { hops };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== "GET") return json({ error: "Método no permitido." }, 405, origin);

    // Sin límite de consultas configurado, el Worker no atiende: así nunca queda como proxy abierto.
    if (!env.PER_IP || !env.GLOBAL) return json({ error: "Servicio no configurado." }, 503, origin);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const [perIp, global] = await Promise.all([env.PER_IP.limit({ key: ip }), env.GLOBAL.limit({ key: "all" })]);
    if (!perIp.success || !global.success) return json({ error: "Demasiadas consultas. Espera un minuto y vuelve a probar." }, 429, origin);

    const target = validateTarget(new URL(request.url).searchParams.get("url") || "");
    if (!target.ok) return json({ error: target.reason }, 400, origin);

    try {
      return json(await inspect(target.url), 200, origin);
    } catch (e) {
      const reason = e && e.name === "AbortError" ? "La web no respondió en 8 segundos." : "No se pudo conectar con la web.";
      return json({ error: reason }, 502, origin);
    }
  },
};
