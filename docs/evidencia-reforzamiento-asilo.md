# Evidencia · Evaluación de Reforzamiento de Asilo (plazo para presentar pruebas)

10 de octubre de 2026.
- Código: `lib/agent/asylum-intake.ts` y `app/api/agent/service-intake/route.ts`. El cierre está en `components/contygo/juvenil/closingSpeech.ts`, y la ficha en `components/contygo/contract/ContractCheckout.tsx`.
- Pruebas: `tests/reforzar-asilo.test.cjs`.

## Lo que pidió el dueño (conversación de WhatsApp del 10-10-2026)

- **Regla del socio:** la evaluación pregunta la fecha de la audiencia y su tipo (preliminar 1, preliminar 2 o mérito final). Las pruebas se pueden presentar hasta 30 días antes de la audiencia final.
- **Orden de las preguntas:**
  1. ¿Defensivo (ante un juez de inmigración) o afirmativo (ante USCIS)?
  2. ¿Personal o familiar?
  3. ¿Cuándo es tu próxima audiencia?
  4. ¿Qué tipo de audiencia es? Con las 3 opciones.
- **Mensaje si hay tiempo:** «Felicitaciones, todavía tienes tiempo de presentar tu reforzamiento de asilo».
- **Decisiones del dueño, del mismo día (respuestas en la sesión):**
  - Afirmativo: se pregunta la fecha de la entrevista y se aplica la regla de USCIS.
  - Mérito final a 30 días o menos: un asesor por WhatsApp, y se presenta la Apelación.
  - Personal o familiar: solo se guarda; el precio no cambia.

## Fuentes

| # | Nivel | Fuente | Qué dice (comprobado literal el 10-10-2026) |
|---|---|---|---|
| 1 | A | EOIR, [Policy Manual, parte II, 2.1 · Delivery and Receipt](https://www.justice.gov/eoir/policy-manual-eoir/part-II/icpm/chapter-2-1) | Ver el detalle debajo de la tabla. |
| 2 | A | USCIS, [Asylum](https://www.uscis.gov/humanitarian/refugees-and-asylum/asylum) (revisada el 26-08-2026) | «Starting Aug. 21, 2026, you must submit all evidence in support of your asylum application to the asylum office 14 calendar days before the date of your scheduled interview.» «Evidence submitted less than 14 calendar days from your scheduled interview may not be included», y USCIS puede reprogramar la entrevista. |
| 3 | A (copia en LII) | [8 CFR 1003.38(b)](https://www.ecfr.gov/current/title-8/chapter-V/subchapter-A/part-1003/subpart-C/section-1003.38), leído en [Cornell LII](https://www.law.cornell.edu/cfr/text/8/1003.38) | Ver el detalle debajo de la tabla. |
| 4 | Prueba propia | contygo, `GET /catalog` y `POST /eligibility/evaluate` (no crea nada), 10-10-2026 | Reforzar Asilo tiene una sola pregunta: «¿Cuál es la fecha de su próxima audiencia en corte?» (`date`, `future_event`, `minNotice` de 5 días hábiles). Con hoy sábado 10-10:<br>• una fecha pasada da `answer`;<br>• del 10-10 al 13-10 da `event_too_close`;<br>• del 16-10 en adelante, `eligible:true`. |

**Fuente 1, EOIR (manual de las cortes de inmigración)**
- **(b)(2) Audiencia individual, persona no detenida:** las pruebas «must be submitted at least thirty (30) days in advance of the individual calendar hearing». Vale con o sin abogado.
- **(b)(2)(C) Persona detenida:** «filing deadlines are as specified by the Immigration Judge».
- **(b) Cualquier caso:** «the Immigration Judge retains the authority to modify filing deadlines».
- **(b)(1) Audiencia de calendario maestro (preliminar):** 15 días, solo «if requesting a ruling at or prior to the hearing».
- **(c)(B) Cómo se cuentan los días:**
  - El día de la audiencia es el «day 0».
  - Se cuentan días naturales.
  - Si el plazo cae en sábado, domingo o feriado, pasa «to the next business day».

**Fuente 3, 8 CFR 1003.38(b)**
- **Regla general:** la apelación ante la BIA se presenta «within 10 calendar days» de la decisión del juez.
- **Asilo:** el plazo es «within 30 calendar days» cuando el juez decidió una solicitud de asilo y no la negó por la sección 208(a)(2)(A), (B) o (C) de la ley. La (B) es el plazo de un año.
- **Fin de semana:** si el último día cae en sábado, domingo o feriado, pasa al siguiente día hábil.

## Decisiones

1. **Las preguntas, en el orden del dueño.** Las tres de opciones son botones, pero también se pueden escribir o decir.
   - Lo claro se entiende sin Gemini: «defensivo», «ante el juez», «familiar, con mis hijos», «la de mérito final».
   - Si una respuesta nombra dos opciones a la vez, o solo dice «preliminar», se vuelve a preguntar. Nunca se adivina.
   - Gemini recibe las opciones y solo puede devolver una de ellas.
2. **«Afirmativo ante abogados de USCIS» se dice «ante un oficial de asilo de USCIS».** Quien entrevista en USCIS es un oficial de asilo, no un abogado (fuentes 1 y 2).
3. **La fecha es la pregunta de contygo.**
   - Su respuesta va a contygo tal cual. Las respuestas «asilo.» no salen de la landing.
   - El agente redacta la pregunta según la vía: «próxima audiencia en la corte» o «entrevista de asilo en USCIS».
   - Si un catálogo no trae esa pregunta, la fecha se guarda en `asilo.fecha` y la regla es la misma.
   - **«Aún no tengo fecha»:** a contygo no va ninguna fecha, nunca una inventada. Como contygo exige la fecha, el contrato lo prepara un asesor.
4. **Cuándo «todavía hay tiempo»:**
   - **Preliminar 1 o 2:** siempre. La final aún no llega y la regla de los 30 días es para la final (fuente 1).
   - **Mérito final:** hay tiempo hasta el día del plazo, incluido. El plazo es la fecha de la audiencia menos 30 días; si cae en fin de semana, pasa al lunes (fuente 1, (c)(B)).
     - Los feriados no se cuentan. Así, el día que se dice es igual o anterior al oficial, nunca posterior.
   - **Afirmativo:** hay tiempo hasta la fecha de la entrevista menos 14 días (fuente 2). USCIS no habla de fines de semana.
   - **En la orientación, siempre:** «Si estás detenido o el juez fijó otro plazo, vale el que indique el juez» (fuente 1).
5. **contygo no conoce el tipo de audiencia.** Aceptaría un mérito final que es en 20 días (fuente 4). Por eso el plazo de 30 días lo aplica la landing.
   - Con el plazo vencido, la ficha manda a WhatsApp aunque contygo diga `eligible:true`.
   - Al revés, puede haber tiempo para la final pero la próxima audiencia ser en menos de 5 días hábiles. Ahí contygo no deja contratar: es el caso «soon», y lo atiende un asesor.
6. **La Apelación, sin prometer el plazo.**
   - Solo se presenta con mérito final vencido y en la vía defensiva. En USCIS no hay un juez que niegue el caso.
   - El agente dice «el plazo para apelar es corto». No dice «30 días», porque en algunas negativas son 10 (fuente 3).
   - La orientación da la regla completa con su fuente.
   - La ficha añade el enlace «Conocer la Apelación».
7. **Personal o familiar:** solo se guarda (`asilo.alcance`). contygo tiene un solo paquete, «Sin abogado», de $600, sin cargo por persona adicional.
8. **El cierre del segundo vídeo sigue lo que dijo el agente:**

   | Caso | Cierre | Botón |
   |---|---|---|
   | Hay tiempo | «Todavía tienes tiempo» | Revisar mi contrato |
   | Sin fecha | Un asesor prepara tu contrato | Revisar mi contrato |
   | Próxima audiencia en pocos días | Un asesor prepara tu contrato para empezar cuanto antes | Revisar mi contrato |
   | Plazo vencido en USCIS | Un asesor revisa tu caso | Hablar con un asesor |
   | Mérito final vencido | Te acompañamos en la apelación | Hablar con un asesor |

   - El vídeo 2 termina con «Toca "Revisar mi contrato"». Por eso, cuando sí se va a contratar, el botón dice eso mismo.
   - Con el plazo vencido no hay contrato de reforzamiento que revisar, así que el botón sigue siendo «Hablar con un asesor».

## APUESTAS (ninguna fuente lo dice)

- **Que una audiencia preliminar siempre deje tiempo.** Un juez puede fijar en esa audiencia un plazo propio para las pruebas. Por eso la orientación lo advierte.
- **Que «hoy» sea el día UTC del servidor**, como en el resto de la contratación (`lib/contygo-api/checkout.ts`).

## Pendiente del dueño

- **La pregunta de contygo dice «audiencia en corte».** En la vía afirmativa le llega la fecha de la entrevista. Conviene pedir a contygo que la pregunta diga «audiencia o entrevista».
- **El segundo vídeo de Reforzamiento de Asilo ya está conectado** (6:14; guion `Video-2-Reforzamiento-de-Asilo/guion-cartesia-v2-breve.txt`).
  - Su precio coincide con contygo: $600 en total. contygo lo cobra en dos pagos de $300; el vídeo no habla de cuotas.
  - El vídeo habla solo de la vía de corte: Notice to Appear, «lo que ya tiene el juez», envío a la corte y al fiscal. Falta decidir qué entrega este servicio a quien tiene asilo afirmativo ante USCIS.
- **Revisar con el abogado** los textos de la orientación, que no es asesoría legal.
