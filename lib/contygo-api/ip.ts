/* ============================================================
   ContyGo · IP del cliente para los límites propios (lógica pura)
   IPv6: un cliente suele tener un /64 entero, así que sus límites se
   cuentan por /64 (si no, cada dirección del bloque sería una «IP» nueva).
   ============================================================ */

/** Los 8 grupos de una IPv6 (acepta «::» y un IPv4 al final), o null si no lo es. */
function ipv6Groups(address: string): number[] | null {
  let text = address;
  const tail = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (tail) {
    const octets = tail.slice(1).map(Number);
    if (octets.some(octet => octet > 255)) return null;
    text = text.slice(0, tail.index) + ((octets[0] << 8) | octets[1]).toString(16) + ":" + ((octets[2] << 8) | octets[3]).toString(16);
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string) => part === "" ? [] : part.split(":");
  const head = parse(halves[0]!), rest = halves.length === 2 ? parse(halves[1]!) : [];
  const fill = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : fill < 1) return null;
  const all = [...head, ...Array<string>(halves.length === 2 ? fill : 0).fill("0"), ...rest];
  if (all.length !== 8 || all.some(group => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
  return all.map(group => parseInt(group, 16));
}

/** La clave de límite de una IP: IPv4 tal cual, IPv6 por /64, IPv4 «mapeada» como IPv4. */
export function limitKeyForIp(raw: string): string {
  const text = raw.trim().replace(/^\[|\]$/g, "").split("%")[0]!.slice(0, 64);
  if (!text.includes(":")) return text;
  const groups = ipv6Groups(text);
  if (!groups) return text;
  if (groups.slice(0, 5).every(group => group === 0) && groups[5] === 0xffff) {
    return `${groups[6]! >> 8}.${groups[6]! & 255}.${groups[7]! >> 8}.${groups[7]! & 255}`;
  }
  return `${groups.slice(0, 4).map(group => group.toString(16)).join(":")}::/64`;
}
