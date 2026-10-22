// Validación de destinos para que el Worker no sirva de proxy abierto.
// Función pura (sin red) para poder probarla con Node.

const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost", ".lan", ".home", ".corp", ".intranet", ".arpa"];

// Rechaza cualquier host que sea una IP escrita de cualquier forma (decimal, hex, octal, IPv6).
function looksLikeIp(host) {
  if (host.startsWith("[") || host.includes(":")) return true;          // IPv6
  if (/^[0-9.]+$/.test(host)) return true;                               // 127.0.0.1, 2130706433
  if (/^(0x[0-9a-f]+|[0-9]+)(\.(0x[0-9a-f]+|[0-9]+))*$/i.test(host)) return true; // 0x7f.1, 017.0.0.1
  return false;
}

/**
 * @param {string} raw URL candidata
 * @returns {{ok: true, url: URL} | {ok: false, reason: string}}
 */
export function validateTarget(raw) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return { ok: false, reason: "La dirección no es válida." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: "Solo se admiten direcciones http o https." };
  if (url.username || url.password) return { ok: false, reason: "La dirección no puede llevar usuario ni contraseña." };
  if (url.port && url.port !== "80" && url.port !== "443") return { ok: false, reason: "Solo se admiten los puertos 80 y 443." };
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || !host.includes(".")) return { ok: false, reason: "Escribe un dominio completo, por ejemplo www.ejemplo.com." };
  if (looksLikeIp(host)) return { ok: false, reason: "Escribe un nombre de dominio, no una dirección IP." };
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return { ok: false, reason: "Ese dominio no es público." };
  if (host.length > 253) return { ok: false, reason: "El dominio es demasiado largo." };
  url.hash = "";
  return { ok: true, url };
}
