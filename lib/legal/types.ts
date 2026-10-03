/* Páginas legales como DATOS versionados (SEC-04). El texto vive aquí, no en el JSX de la página:
   así la huella de tests/contygo-api.test.cjs lo cubre y tocarlo obliga a subir CONTRACT_TERMS.version.
   Marcas dentro del texto: **negrita**, `código` y [etiqueta](enlace). Nada de HTML. */
export type LegalBlock =
  | { h: string }
  | { p: string }
  | { box: string }
  | { ul: string[] };

export type LegalDoc = {
  /** <title> y descripción del buscador. */
  metaTitle: string;
  description: string;
  canonical: string;
  title: string;
  intro: string;
  /** «Última actualización» tal como se muestra. */
  updated: string;
  blocks: LegalBlock[];
};
