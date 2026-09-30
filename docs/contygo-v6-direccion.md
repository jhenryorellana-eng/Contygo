# ContyGo · Landing integrada V6

Implementada el 22 de septiembre de 2026 en `/contygo-app/v5`, mediante `components/contygo/v6`. El componente V5 anterior queda conservado. La propuesta inicial se documenta debajo; las decisiones finales están en este apartado.

## Implementación final

- Hero: «Tu historia sigue. El siguiente paso, ContyGo.» Escultura editorial de papel con documentos, un camino verde y el símbolo original. Dos imágenes específicas, fondo blanco y marino. No usa la antigua foto como referencia.
- Destacados: Visa Juvenil, Apelación y Reforzamiento de Asilo. Catálogo filtrable debajo; recorrido explicado en cuatro pasos; pantalla real de la plataforma; certificado original; preguntas y cierre.
- Colores exactos del branding. Fondo claro blanco puro; preferencia persistida en `contygo-appearance`. El contenedor incluye el diálogo para que sus colores acompañen la elección.
- Se reutiliza `ServiceCinemaDialog`: preguntas, voz, secuencia, gating y animaciones conservados. Sólo cambia el color dentro del flujo; la transición al segundo vídeo lee `--cg-stage`.
- Overrides claros identificados con `CONTYGO LIGHT APPEARANCE`, generados por `scripts/contygo-light-theme.cjs`. Estilos nuevos acotados para no cambiar tamaños del flujo.
- Imágenes generadas directamente con la herramienta integrada. Originales y prompts en `output/contygo-v6`; WebP en `public/contygo/v6`. Cinco archivos suman aproximadamente 500 KiB. Hero prioritario; creativos de servicios diferidos y con transparencia para ambos temas.
- Creativos finales: arcos que protegen una casa; escalera con hoja ascendente; carpeta con hojas y separadores. Las pruebas `service-N.png` sin `-final` no se usan.
- Referencias observadas: [papel escultórico](https://www.pinterest.com/pin/59320920088566802/), [bodegón editorial](https://www.pinterest.com/pin/2392606049409709/), [geometría editorial](https://www.pinterest.com/pin/946178202987671204/). Se eligieron materialidad y capas de las dos primeras. [Wise](https://wise.com/community/us/brand-new-look) aportó principios de jerarquía y espacio, sin copiar identidad.
- Los tres vídeos introductorios se conservan; el segundo vídeo sigue siendo provisional. El selector recolorea la interfaz, no los píxeles incrustados en los MP4. No se publica la página.

Comprobaciones: TypeScript sin errores; 37 pruebas existentes de flujo, preguntas y voz aprobadas. Revisión visual a 430 px y escritorio a 1280/1440 px: ambos heroes, imágenes, catálogo, entrada al vídeo, subtítulos y superficie del chat. Filtro Empresa, apertura/cierre de certificado y FAQ comprobados. Revisión independiente estática detectó selectores de pseudo-elementos incorrectos en el adaptador; corregidos. No se ha repetido una auditoría completa de voces o elegibilidad, cuyo funcionamiento no se modificó.

## Propuesta inicial conservada como contexto

### Corrección posterior · 22 septiembre

El usuario exige parejas de imágenes con igual posición, encuadre y escala: sólo cambia la apariencia de color. Las nuevas variantes se editan desde la base clara, no se recrean como escenas independientes. Quiere animarlas personalmente con la opción **Bucle** de Grok; la investigación y los prompts provisionales están en `output/contygo-v6/grok-motion-prompts.md`. No generar vídeos ni operar Grok.

Propuesta aún no implementada: hero en bucle y una sola transición corta guiada por scroll hacia los destacados; CTA siempre accesible y continuidad directa con el servicio del anuncio. El recorrido interior se mantiene. El aumento de conversión es una hipótesis que requiere medir llegada al contrato y firma, no una consecuencia garantizada de más animación.

## Diagnóstico observado

- El hero actual depende de una fotografía ilustrativa; la app real aparece mucho después. En móvil la imagen y la ilustración de categoría alargan el camino hasta elegir un servicio.
- La base crema y los verdes secundarios de V5 no coinciden con la dirección blanca/marina solicitada ni con la experiencia inmersiva interior.
- La explicación pública tiene tres pasos, omite la conversación y sus botones abren Visa Juvenil aunque el visitante esté viendo otro servicio.
- El registro original está disponible, pero su presencia llega tarde para generar confianza desde el inicio.
- Se mantienen textos de exploración V5. La cifra de clientes requiere respaldo antes de trasladarla al diseño final.

## Idea: el siguiente paso se ve

La portada debe demostrar el acompañamiento y la plataforma. Una composición de la UI real conecta visualmente servicio, conversación, documentos y seguimiento. Cada movimiento ayuda a comprender un paso. El visitante controla cuándo entra en el recorrido con audio.

Hero propuesto:

**Tu trámite, más claro. Tu siguiente paso, ContyGo.**

“Entiende tu proceso, conoce nuestro acompañamiento y organiza tu preparación desde una sola plataforma.”

CTA principal: **Encontrar mi servicio**. Acceso secundario discreto al registro y al equipo. Una demostración breve sin audio de la UI real; sin reproducir tres vídeos simultáneos ni inventar funcionalidades.

## Orden de la página

1. Hero con demostración y señal de confianza verificable.
2. Servicios destacados: Visa Juvenil, Apelación y Reforzamiento de Asilo. Después, catálogo completo compacto por categorías.
3. Recorrido real: entiende el proceso → conversa con el agente → conoce la propuesta → revisa tu contrato. Para evaluación, adaptar el último paso a su alcance real. El nombre se solicita durante la conversación; ninguna respuesta negativa bloquea el acceso a la propuesta.
4. Plataforma real y equipo: mostrar qué recibe el cliente y cómo avanza después de contratar. Certificado original ampliable, titular y alcance del registro correctamente identificados.
5. Preguntas esenciales y un cierre que regresa a elegir servicio, sin duplicar la celebración personalizada del modal.

## Dos temas, una identidad

La guía visual original indica marino #061B3D, verde #25D366, verde profundo #087F46 y blanco frío #F6F8F7. Por petición del usuario la base clara será **#FFFFFF**; reservar el blanco frío para superficies secundarias.

- Claro: blanco puro, tipografía marina, verde profundo para texto sobre blanco; verde vivo para acciones con texto marino.
- Oscuro: marino de marca, texto blanco y los mismos acentos verdes. No sustituir por negro o púrpura.
- El selector controla landing, reproductor, subtítulos, agente, selectores, transiciones y cierre. Recordar preferencia y evitar destellos de otro tema al cargar.
- Usar variables semánticas compartidas. El diálogo está fuera del contenedor de V5: debe recibir el tema o quedar bajo el mismo proveedor; no basta cambiar el fondo de la página.
- El cristal adapta contraste, transparencia y reflejos a cada tema. El líquido permanece localizado y acompaña la voz; no invade el texto ni reduce su legibilidad.

## Continuidad de vídeo y movimiento

- Dirección vigente de los creativos de portada y servicios: storyboard de cuatro estados, pieza compacta → apertura física → acción de organización documental digital → cierre en su misma forma. Diez segundos por clip. Se recupera el mecanismo de `output/imagegen/contygo-comunidad-popup-v1/B03_storyboard.png` y su prompt original: la transformación debe mostrar el proceso, no limitarse a mover la cámara ni a ondulaciones mínimas. El usuario autorizó rediseñar hero y tres servicios bajo esta dirección. Entrega actual en `output/contygo-v6/storyboards-digitales/`, temas claro y oscuro.
- Las láminas son Referencia de estados, no imágenes para poner como ancla de Bucle. No asumir que la cuenta permite combinar roles. Los prompts cubren diez segundos y el retorno al estado inicial; la continuidad real sigue pendiente de los vídeos del usuario.
- Para entradas a Grok, entregar imágenes con fondo opaco incorporado: blanco #FFFFFF o marino #061B3D, suelo continuo sin horizonte y sombra de contacto. Los recortes PNG transparentes hicieron que Grok utilizara negro. Conservar los originales; el paquete corregido se prepara como `output/contygo-v6/CONTYGO-PARA-GROK-CON-FONDO`. Comprobar los fondos y la unión real del clip; un prompt no garantiza coincidencia exacta de color o movimiento.

- Cada servicio se expande desde su selección hacia el vídeo. Móvil: 16:9 completo, sin recortar a vertical; aprovechar el espacio inferior para subtítulos y el superior/inferior para luz de marca.
- Conservar la secuencia aprobada: vídeo 1 → marca → chat → celebración/nombre → vídeo 2 → cierre personalizado → acceso al contrato o evaluación.
- Los vídeos MP4 actuales tienen colores incrustados. Cambiar el tema de la web no recolorea esos píxeles. Preparar futuras aperturas/finales en versiones clara y oscura con idéntica duración y edición, o piezas de marca animadas en la web sobre el fondo del tema. No aplicar filtros de inversión a personas, logo o documentos.
- Si se permite cambiar el tema durante reproducción, mantener el tiempo y el estado de reproducción al sustituir una variante. Priorizar continuidad del audio.
- El hero y las transiciones pueden ser expresivos; mantener lectura y controles tranquilos. Alternativa de movimiento reducido y carga de vídeos bajo demanda.

## Entrega y comprobación

Construir la nueva composición dentro de la landing integrada, conservando V5 como respaldo. Revisar pronto hero + destacados + entrada al vídeo en móvil y escritorio; extender después el sistema aprobado a todo el recorrido.

Antes de llamarla final: verificar temas completos, teclado, tamaños móviles, reproducción y subtítulos, preguntas por servicio, nombre/voz, transiciones y enlace final correcto. Retirar etiquetas de prototipo en la entrega pública. Los tres vídeos introductorios existen; el segundo vídeo sigue siendo una demostración provisional y los demás servicios requieren sus piezas finales.
