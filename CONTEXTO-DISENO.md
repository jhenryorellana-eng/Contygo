# Contexto para probar otros diseños de ContyGo

> **27 sep 2026 · Propuesta V8 «Lo que nos hace únicos»** en `/contygo-app/v8` (`components/contygo/v8/`): landing centrada en lo verificable y recorrido calmado con control, precio y contrato visibles. Ver `docs/contygo-v8-propuesta.md`.
>
> **27 sep 2026 · Propuesta V7 «El hilo verde»** en `/contygo-app/v7` (`components/contygo/v7/`). Extiende la dirección de papel con un sistema de color con significado, un hilo que recorre la página y termina en el símbolo, y un suelo tipográfico legible. Decisiones, fuentes y pendientes: `docs/contygo-v7-direccion-arte.md`. La V6 sigue siendo la raíz `/`.

## Estado que reproduce esta carpeta

La landing actual está en `/` y también en `/contygo-app/v5`. Su entrada es `components/contygo/v6/ContygoLanding.tsx`. La versión clara abre con fondo blanco; el selector permite pasar al marino oscuro y guarda la elección en `contygo-appearance` dentro de este origen local.

La secuencia visible de la página es: hero → tres servicios destacados → catálogo completo → explicación del recorrido → vista de la plataforma real → registro original del consultor → preguntas frecuentes → cierre. Los destacados son Visa Juvenil, Apelación y Reforzamiento de Asilo.

## Recorrido al elegir un servicio

La página abre `components/contygo/rebuild/ServiceCinemaDialog.tsx`. El recorrido que ya existe es: vídeo introductorio → transición de marca → conversación con el agente y preguntas del servicio → nombre y acceso al segundo vídeo → segundo vídeo de propuesta → cierre personalizado → acceso a la revisión del contrato o a las condiciones de evaluación. El nombre se pide después del primer vídeo. Las respuestas se usan para orientar la conversación; una respuesta negativa no debe cerrar el acceso al segundo vídeo.

El reproductor conserva el formato 16:9 en móvil. La interfaz de conversación, las transiciones y el cierre forman parte de una sola experiencia. Si pruebas otro hero, otras tarjetas o nuevos movimientos de la landing, comprueba que el servicio elegido sigue llegando a su propio recorrido. Los tres vídeos introductorios están en `public/contygo/films/`. Las piezas del segundo vídeo siguen siendo provisionales donde así lo indica `docs/contygo-v6-direccion.md`.

## Identidad y recursos

Paleta de marca: marino `#061B3D`, verde `#25D366`, verde profundo `#087F46`, blanco `#FFFFFF` y blanco frío secundario `#F6F8F7`. El modo oscuro usa el marino de marca, no negro. El modo claro usa blanco puro. Los logos y el símbolo están en `public/contygo/brand/`; el registro original y su PDF están en `public/contygo/registro/`. La vista de la plataforma que aparece en la página está en `public/contygo-ae-v5/servicio-original.png`.

Las imágenes que actualmente muestra la landing están en `public/contygo/v6/`. Los storyboards más recientes se copiaron a `material-de-diseno/storyboards-digitales/`. **Son material para experimentar y aún no reemplazan las imágenes estáticas de la landing.** Cada pieza propone un clip de 10 segundos: objeto compacto → apertura física → organización documental en una pantalla → cierre en la misma forma. Hay versión clara y oscura con fondos opacos y prompts separados. El usuario genera personalmente los clips en Grok; después pueden integrarse y comprobarse como bucles reales.

## Archivos para retomar el trabajo

- `docs/contygo-v6-direccion.md`: decisiones visuales, recorrido y límites de la versión actual.
- `components/contygo/v6/ContygoLanding.tsx` y `ContygoLanding.module.css`: estructura y estilo de la landing.
- `components/contygo/rebuild/ServiceCinemaDialog.tsx`: entrada al recorrido de cada servicio.
- `lib/contygo-catalog.ts` y `lib/contygo-presentation.ts`: catálogo y vídeos introductorios.
- `material-de-diseno/storyboards-digitales/`: láminas claras/oscuras y prompts de animación.

Este documento describe el punto de partida de la copia. No atribuyas a la página animaciones de Grok que todavía no se han integrado ni trates los vídeos provisionales como piezas finales.
