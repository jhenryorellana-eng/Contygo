/** Publish commercial claims only after their conditions match the contract. */
export type ContygoCommercialOffer = {
  guarantee: null | { title: string; description: string; conditions: string[]; serviceIds: string[] };
  promotion: null | { title: string; description: string; endsAt: string; serviceIds: string[] };
};

// Owner's new refund policy (2026-09-11). The contract template must be aligned
// before public release; the time limit and amount still need formal terms.
// No permanent "7 days left" claim: a price promotion needs a genuine end date.
export const CONTYGO_COMMERCIAL_OFFER: ContygoCommercialOffer = {
  guarantee: {
    title: "Tu tiempo importa. Nuestro compromiso también.",
    description: "Si nuestro proceso no cubre tu caso a tiempo, puedes solicitar el reembolso desde Soporte en ContyGo.",
    conditions: [
      "Respaldo ante retrasos atribuibles a nuestro proceso.",
      "Solicita la revisión desde Soporte, dentro de tu cuenta.",
      "Los tiempos y decisiones de las autoridades no dependen de ContyGo.",
    ],
    serviceIds: ["visa-juvenil", "i-360", "i-485", "asilo", "reforzar-asilo", "evaluacion-asilo", "apelacion", "cambio-corte", "reapertura", "itin", "impuestos", "llc"],
  },
  promotion: null,
};
