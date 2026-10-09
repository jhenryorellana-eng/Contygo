/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A production preview can build beside the running dev server (NEXT_DIST_DIR=.next-movil).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Live API uses Node's WebSocket implementation and optional native modules.
  // Keep the SDK out of Next 14's server bundle (bufferUtil.mask otherwise fails).
  experimental: { serverComponentsExternalPackages: ["@google/genai"] },

  // Cabeceras de seguridad para todas las rutas. La CSP lleva SOLO frame-ancestors: un script-src
  // rompería los scripts en línea de Next, Turnstile, GSAP, el Pixel de Meta y Gemini Live.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        ],
      },
    ];
  },

  // Variantes de URL → slug canónico (para que ningún anuncio caiga en 404). Cada servicio del catálogo
  // también responde a su slug de contygo.app (p. ej. visa-juvenil-basico, apelacion, taxes).
  async redirects() {
    const map = {
      "visa-juvenil": ["visajuvenil", "sijs", "visa-juvenil-basico"],
      "reapertura-in-absentia": ["reapertura"],
      "llc-florida": ["llc"],
      "peticion-i-360": ["i-360", "i360", "peticioni360"],
      "ajuste-de-estatus": ["i-485", "i485", "ajustedeestatus", "ajuste-estatus"],
      "asilo-politico": ["asilo", "asilopolitico"],
      "reforzar-asilo": [
        "reforzarasilo",
        "reforzamiento-de-asilo",
        "reforzamientodeasilo",
      ],
      "apelacion-bia": ["apelacion", "apelacionbia"],
      "cambio-de-corte": ["cambio-corte", "cambiodecorte"],
      itin: ["itin-number", "itinnumber"],
      "declaracion-de-impuestos": [
        "impuestos",
        "taxes",
        "declaraciondeimpuestos",
      ],
      terminos: ["terminos-y-condiciones", "terminos-condiciones"],
      privacidad: ["politica-de-privacidad", "privacidad-politica"],
    };
    return Object.entries(map).flatMap(([canonical, aliases]) =>
      aliases.map((alias) => ({
        source: `/${alias}`,
        destination: `/${canonical}`,
        permanent: true,
      })),
    );
  },
};

export default nextConfig;
