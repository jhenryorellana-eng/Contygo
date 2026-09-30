/** Hero: cinco capítulos de seis segundos que cubren los nueve servicios. */
export type HeroScene = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  services: { name: string; href: string }[];
  video?: { desktop: string; mobile: string };
};

export const HERO_SCENE_DURATION = 6000;
export const HERO_SCENES: HeroScene[] = [
  {
    id: "juvenil", label: "Visa Juvenil", eyebrow: "PROTECCIÓN PARA JÓVENES",
    title: "Un camino para tu futuro.",
    video: { desktop: "/hero-services/juvenil-desktop.mp4", mobile: "/hero-services/juvenil-mobile.mp4" },
    services: [
      { name: "Visa Juvenil · SIJS", href: "/visa-juvenil" },
      { name: "Petición I-360", href: "/peticion-i-360" },
    ],
  },
  {
    id: "residencia", label: "Residencia", eyebrow: "AJUSTE DE ESTATUS",
    title: "El siguiente paso de tu caso.",
    video: { desktop: "/hero-services/residencia-desktop.mp4", mobile: "/hero-services/residencia-mobile.mp4" },
    services: [{ name: "I-485 · Ajuste de Estatus", href: "/ajuste-de-estatus" }],
  },
  {
    id: "asilo", label: "Asilo", eyebrow: "PREPARACIÓN Y ACOMPAÑAMIENTO",
    title: "Tu historia merece atención.",
    video: { desktop: "/hero-services/asilo-desktop.mp4", mobile: "/hero-services/asilo-mobile.mp4" },
    services: [
      { name: "Asilo Político", href: "/asilo-politico" },
      { name: "Reforzar Asilo", href: "/reforzar-asilo" },
    ],
  },
  {
    id: "corte", label: "Procesos en corte", eyebrow: "CONTINUIDAD DE TU PROCESO",
    title: "Cada paso cuenta.",
    video: { desktop: "/hero-services/corte-desktop.mp4", mobile: "/hero-services/corte-mobile.mp4" },
    services: [
      { name: "Apelación · BIA", href: "/apelacion-bia" },
      { name: "Cambio de Corte", href: "/cambio-de-corte" },
    ],
  },
  {
    id: "impuestos", label: "ITIN e impuestos", eyebrow: "SERVICIOS FISCALES",
    title: "Tus documentos, en orden.",
    video: { desktop: "/hero-services/impuestos-desktop.mp4", mobile: "/hero-services/impuestos-mobile.mp4" },
    services: [
      { name: "ITIN Number", href: "/itin" },
      { name: "Declaración de Impuestos", href: "/declaracion-de-impuestos" },
    ],
  },
];

export function heroPoster(id: string, mobile = false) {
  return `/hero-services/${id}-${mobile ? "mobile" : "desktop"}-poster.webp`;
}
