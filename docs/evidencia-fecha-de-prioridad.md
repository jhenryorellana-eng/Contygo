# Evidencia · Fecha de prioridad en la evaluación de Ajuste de estatus (I-485 SIJ)

10 de octubre de 2026. Código: `lib/agent/visa-bulletin.ts`, `lib/agent/adjustment-intake.ts`,
`app/api/agent/service-intake/route.ts`. Pruebas: `tests/fecha-de-prioridad.test.cjs`.

## Lo que pidió el dueño

- La IA pregunta la fecha de prioridad y explica qué es: la que el gobierno asigna para saber cuándo
  se puede iniciar la residencia. Por eso importa el boletín de visas.
- Si la fecha está vigente, el agente invita a contratar; el segundo vídeo lo detalla.
- Si aún no lo está, recomienda el contrato previo, por sus garantías y la oferta del segundo vídeo.
- El agente debe estar siempre actualizado.

## Fuentes (todas de nivel A, leídas el 10-10-2026)

| # | Fuente | Qué dice y para qué sirve |
|---|---|---|
| 1 | USCIS, [Visa Availability and Priority Dates](https://www.uscis.gov/green-card/green-card-processes-and-procedures/visa-availability-priority-dates) | La fecha de prioridad está en el **Form I-797, Notice of Action**. En la cuarta preferencia (special immigrant) es el día en que USCIS acepta el **I-360**. La visa está disponible si la fecha de prioridad es **anterior** («earlier than») a la fecha de corte de la tabla aplicable. «C» = al día; «U» = sin visas. |
| 2 | USCIS, [Adjustment of Status Filing Charts from the Visa Bulletin](https://www.uscis.gov/green-card/green-card-processes-and-procedures/visa-availability-priority-dates/adjustment-of-status-filing-charts-from-the-visa-bulletin) | Cada mes USCIS designa qué tabla del boletín vale para presentar el I-485: «Final Action Dates» o «Dates for Filing». En octubre de 2026, para empleo, «Dates for Filing». |
| 3 | USCIS, [When to File… October 2026](https://www.uscis.gov/green-card/green-card-processes-and-procedures/visa-availability-priority-dates/when-to-file-your-adjustment-of-status-application-for-family-sponsored-or-employment-based-129) | La tabla designada, en HTML. EB-4 («4th»): **01JAN25** en todas las columnas. Se busca la fila de la categoría y la columna del país de nacimiento. |
| 4 | Departamento de Estado, [Visa Bulletin for October 2026](https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/2027/visa-bulletin-for-october-2026.html) | Comprobación cruzada, leída en el navegador. EB-4: Final Action **15DEC22**; Dates for Filing **01JAN25**. Las columnas son All Chargeability, China, India, México y Filipinas. |
| 5 | USCIS, [Policy Manual, vol. 7, parte F, cap. 7](https://www.uscis.gov/policy-manual/volume-7-part-f-chapter-7) | El ajuste SIJ exige una visa disponible al presentar el I-485 y también en la decisión final. |

## Decisiones

1. **La fuente automática es USCIS, no el Departamento de Estado.**
   - travel.state.gov está detrás de Cloudflare y rechaza las peticiones de servidor: probado el
     10-10-2026, devuelve 403 a curl, a Node y a un lector web. Solo responde a un navegador real.
   - uscis.gov sí responde (200) y además resuelve qué tabla manda ese mes (fuente 2), algo que el
     boletín solo no dice.
2. **Vigente quiere decir «puede presentar el I-485»,** según la tabla que USCIS designa.
   - La comparación es estricta: la fecha de prioridad debe ser *anterior* a la de corte (fuente 1).
   - La aprobación final depende además de «Final Action Dates» (fuente 5). En octubre de 2026 esa
     fecha va en 15DEC22. El agente dice «ya puede presentar», nunca «se aprueba ya».
3. **La pregunta de contygo «¿está vigente en el Visa Bulletin?» no se le hace a la persona.**
   - La responde la comparación anterior: vigente → sí; aún no → no.
   - Sin la fecha a mano, o sin un boletín confiable, no se responde: nunca se adivina.
   - Lo que mande el navegador para esa pregunta se ignora: se recalcula en el servidor.
3 bis. **Tres formas de abordar al cliente**, pedidas por el dueño el 10-10-2026: «si su fecha está
   próxima o aún en un futuro».

   | Situación | Antes del vídeo 2 | Después del vídeo 2 |
   |---|---|---|
   | Vigente | «Te invito a hacer tu contrato con nosotros» | «Revisar mi contrato» |
   | Próxima | «Está muy cerca: adelántate con el contrato previo y llega listo» | «Revisar mi contrato» |
   | Aún en el futuro | «No esperes con las manos vacías: asegura hoy tu lugar» | «Revisar mi contrato» |

   - El botón es «Revisar mi contrato» en los tres casos, porque el vídeo 2 termina diciendo «Toca "Revisar mi contrato"». Hasta el 10-10-2026, el botón de los casos de espera decía «Asegurar mi lugar».

   - **Próxima** = hasta `NEAR_MONTHS` (6) meses después de la fecha del boletín. El agente dice la
     distancia entre las dos fechas («a solo 5 meses de esa fecha»), nunca un plazo de espera.
   - **APUESTA:** el umbral de 6 meses no sale de ninguna fuente. Se apoya en cómo se movió EB-4
     en la tabla que USCIS designó cada mes, leída de sus páginas mensuales el 10-10-2026:

     | Mes | Tabla | EB-4 |
     |---|---|---|
     | 01-2025 | Filing | 01FEB21 |
     | 03-2025 | Final | 01AUG19 (retrocede) |
     | 04 a 09-2025 | Final | «U» (sin visas) |
     | 10-2025 | Filing | 15FEB21 |
     | 03-2026 | Filing | 01JAN23 |
     | 05-2026 | Final | 15JUL22 |
     | 09-2026 | Final | 15DEC22 |
     | 10-2026 | Filing | 01JAN25 |

     El boletín avanza, se detiene y retrocede. Por eso la orientación lo dice así y nadie promete
     fechas.
3 ter. **La fecha no es de sí o no** (el dueño, 10-10-2026: «se debe escribir o hablar»).
   - La pregunta lo dice: «Escríbela, dímela o elígela en el calendario».
   - Bajo el calendario de toda pregunta de fecha aparece «También puedes escribirla o decírmela».
   - Se entiende sin Gemini «15 de marzo de 2024», «March 15, 2024» (como la imprime el I-797) y
     «15/03/2024».
   - Si una fecha numérica tiene día y mes intercambiables (03/04/2024), no se adivina: se pide con
     el mes en palabras.
   - Hay un botón «No la tengo a mano».
4. **El país de nacimiento solo se pregunta si cambia el resultado** (fuente 3).
   - Hoy EB-4 tiene la misma fecha en todas las columnas, así que no se pregunta.
   - Si un mes México u otra columna tiene una fecha distinta, aparece «¿El menor nació en…?».
5. **Siempre actualizado:**
   - El servidor lee USCIS y guarda el dato 6 h en memoria. Si falla, reintenta a los 10 minutos.
   - Si USCIS no responde o cambia su HTML, usa la copia verificada (`EB4_SNAPSHOT`, octubre de
     2026) y siempre dice el mes del dato.
   - Se acepta el boletín del mes en curso o del anterior, para los primeros días de cada mes. Uno más
     viejo no da veredicto: «un asesor revisará tu fecha».
   - **APUESTA:** 6 h, 10 min y el mes de gracia son decisiones de ingeniería, no salen de una fuente.
     USCIS actualizó su página el 01-10-2026.
6. **Contrato previo:** contygo no deja contratar en línea si la fecha no está vigente.
   - Probado el 10-10-2026 con `POST /eligibility/evaluate`, que no crea nada: «no» a la pregunta del
     boletín da `eligible:false`. `POST /contracts` respondería `422 NOT_ELIGIBLE`.
   - Por eso, con la fecha aún sin llegar o sin la fecha a mano:
     - el agente recomienda el contrato previo;
     - el cierre del segundo vídeo lo dice con su tono, y el botón es «Revisar mi contrato»;
     - la ficha lo deriva a WhatsApp con un mensaje propio.
   - Si contygo acepta ese caso en línea, la ficha pasa sola al contrato en línea (`eligible:true`).

## Pendiente del dueño

- Pedir a contygo que acepte el contrato previo en línea, ya sea quitando la descalificación de la
  pregunta del boletín o con un plan propio. Hasta entonces va por WhatsApp.
- **El segundo vídeo de Ajuste de estatus ya está conectado** (6:33; guion `Video-2-Ajuste-de-Estatus/guion-cartesia-v2-breve.txt`).
  - Cubre los dos casos que anuncia el agente: presentar ya, y la «contratación anticipada» para quien espera su fecha, con su garantía de 15 días y la oferta del mes.
  - El agente la llama «contrato previo», el término del dueño.
- **Los precios del vídeo no coinciden con contygo** (`GET /catalog`, 10-10-2026):
  - El vídeo dice $500 de inicio y 5 cuotas de $200.
  - contygo cobra $1,500 con $500 de inicio y 3 cuotas de $333.33 / $333.34. Es lo que verá la ficha del contrato.
  - La contratación anticipada ($200 de inicio y 13 cuotas de $100) no existe en contygo.
  - Hay que pedir a contygo que configure las dos formas de pago.
- Revisar con el abogado los textos de la orientación, que no es asesoría legal.
