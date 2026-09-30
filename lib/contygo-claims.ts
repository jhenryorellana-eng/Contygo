/**
 * Public claims of the landings (V7, V8). A claim renders only when `verified` records who confirmed it
 * and when. Superlatives and numbers stay off the page until they have evidence behind them.
 * See docs/contygo-v8-propuesta.md and docs/contygo-v7-direccion-arte.md.
 */
export type Claim = { text: string; verified: null | { by: string; on: string; evidence: string } };

export const CONTYGO_CLAIMS = {
  /** Owner's positioning (27 Sep 2026). A "first" superlative needs documented proof and legal review
   * before it can be advertised; until then the page leads with what anyone can verify. */
  pioneer: {
    text: "La primera plataforma que automatiza la preparación de trámites migratorios en Estados Unidos.",
    verified: null,
  } as Claim,
  /** Confirmed by the owner on 14 Sep 2026 (docs/contygo-base-comercial.md): clients served across
   * services, mostly Visa Juvenil. It is not a count of approved cases and must never read as one. */
  clientsServed: {
    text: "+500 clientes atendidos",
    verified: { by: "Propietario de ContyGo", on: "2026-09-14", evidence: "docs/contygo-base-comercial.md" },
  } as Claim,
};

export const isPublic = (claim: Claim) => claim.verified !== null;

/** Utah Code Title 13, Chapter 49; administered by the Division of Consumer Protection. */
export const UTAH_REGISTRY = {
  publicRegister: "https://services.commerce.utah.gov/dcp-registrations/",
  statute: "https://le.utah.gov/xcode/Title13/Chapter49/C13-49_1800010118000101.xml",
  certificate: "/contygo/registro/certificado-utah.png",
  certificatePdf: "/contygo/registro/registro-utah-original.pdf",
  holder: "Jimy Henry Orellana",
  notice: "El consultor no es abogado y no presta servicios legales. El registro no constituye un aval del Estado de Utah ni autorización para ejercer como abogado.",
};
