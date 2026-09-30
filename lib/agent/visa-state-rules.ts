/**
 * Conservative SIJ orientation, researched 2026-09-17. This is not a complete
 * jurisdiction survey: an unlisted state always needs an individual review.
 * Age at state proceedings and age at federal filing are different questions.
 */
export interface IntakeSource { title: string; url: string }

export interface VisaStateRule {
  adultPathwayReviewed: boolean;
  detail: string;
  sources: IntakeSource[];
}

export const FEDERAL_SIJ_SOURCE: IntakeSource = {
  title: "Regla federal SIJ — 8 CFR 204.11",
  url: "https://www.govinfo.gov/content/pkg/CFR-2025-title8-vol1/pdf/CFR-2025-title8-vol1-sec204-11.pdf",
};

const STATE_RULES: Readonly<Record<string, VisaStateRule>> = {
  CA: {
    adultPathwayReviewed: true,
    detail: "California contempla una vía de tutela para ciertos jóvenes de 18 a 20 años con su consentimiento y una solicitud de hallazgos SIJ. La corte debe revisar los requisitos del caso.",
    sources: [{ title: "California Courts — tutela de jóvenes de 18 a 20 años", url: "https://courts.ca.gov/cms/rules/index/seven/rule7_1002_5" }],
  },
  NY: {
    adultPathwayReviewed: true,
    detail: "Nueva York contempla ciertas tutelas antes de los 21 años; después de los 18 se requiere el consentimiento del joven. La vía judicial y los demás requisitos necesitan revisión.",
    sources: [{ title: "Nueva York — Family Court Act 661", url: "https://www.nysenate.gov/legislation/laws/FCT/661" }],
  },
  MD: {
    adultPathwayReviewed: true,
    detail: "Maryland contempla ciertos procesos para jóvenes solteros menores de 21 años, con hechos de abuso, abandono o negligencia ocurridos antes de los 18. Debe revisarse la vía judicial concreta.",
    sources: [{ title: "Maryland — Family Law 1-201", url: "https://www.mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gfl&enactments=false&section=1-201" }],
  },
  MA: {
    adultPathwayReviewed: true,
    detail: "Massachusetts contempla ciertos procesos de dependencia para jóvenes solteros menores de 21 años. La corte debe revisar los hechos y los requisitos de la solicitud.",
    sources: [{ title: "Massachusetts — protocolo de dependencia 39M", url: "https://www.mass.gov/info-details/protocol-for-complaints-and-judgments-for-dependency-pursuant-to-g-l-c-119-ss-39m-special-immigrant-juvenile-findings" }],
  },
  CO: {
    adultPathwayReviewed: true,
    detail: "Colorado contempla ciertas vías antes de los 21 años para jóvenes solteros que residen con un cuidador y dependen de él. Existen otros requisitos judiciales que deben revisarse.",
    sources: [{ title: "Colorado — HB19-1042", url: "https://leg.colorado.gov/bills/hb19-1042" }],
  },
  WA: {
    adultPathwayReviewed: true,
    detail: "Washington contempla una tutela especial para ciertos jóvenes de 18 a 20 años, con consentimiento del joven y del tutor y otras condiciones. No es una regla general de elegibilidad.",
    sources: [{ title: "Washington — RCW 13.90", url: "https://app.leg.wa.gov/RCW/default.aspx?cite=13.90&full=true" }],
  },
  NJ: {
    adultPathwayReviewed: true,
    detail: "Nueva Jersey contempla solicitudes de ciertos jóvenes solteros menores de 21 años al presentar la demanda estatal. La corte debe tener jurisdicción sobre su cuidado o custodia.",
    sources: [{ title: "Nueva Jersey — Directiva 04-25", url: "https://www.njcourts.gov/notices/directive-04-25-family-special-immigrant-juvenile-status-sijs-filing-requirements" }],
  },
  NC: {
    adultPathwayReviewed: false,
    detail: "En Carolina del Norte, la jurisdicción ordinaria de ciertos procesos de abuso, negligencia y dependencia termina a los 18 años. Esto exige revisar el proceso y las órdenes previas; no decide por sí solo el resultado migratorio.",
    sources: [{ title: "Carolina del Norte — G.S. 7B-201", url: "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_7B/GS_7B-201.html" }],
  },
};

const UNREVIEWED_STATE: VisaStateRule = {
  adultPathwayReviewed: false,
  detail: "La edad y la vía judicial disponibles en este estado requieren una revisión individual. El límite federal de 21 años no garantiza que una corte estatal pueda emitir una nueva orden.",
  sources: [],
};

export function getVisaStateRule(state: string | undefined): VisaStateRule {
  return state && Object.prototype.hasOwnProperty.call(STATE_RULES, state) ? STATE_RULES[state] : UNREVIEWED_STATE;
}
