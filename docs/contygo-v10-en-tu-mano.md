# ContyGo · V10 «En tu mano»

Propuesta del 27 de septiembre de 2026, en **`/contygo-app/v10`** (`components/contygo/v10/`). No cambia la V6, la V7, la V8, la V9 ni el recorrido del servicio.

## Encargo

El propietario rechazó la V9 por genérica: reutilizaba imágenes y vídeos existentes y el concepto no funcionaba. Para la V10 pidió:

- la **información de la V7**, presentada con un diseño nuevo y más creativo;
- un **celular en 3D** con más detalle y **más imágenes**, todas de creación propia (las anteriores sólo sirven de inspiración);
- objetos que **floten** sobre la página: vídeo o render con el color exacto del fondo, hecho en After Effects o Blender;
- que los vídeos de Grok y AE los produzca él por su cuenta: aquí se piden con especificación y luego se integran;
- una intro de carga de hasta 2 segundos.

Como referencia de pantallas, usar la app real: <https://contygo.app/welcome>.

## Concepto

**Un solo objeto cuenta la historia: el celular de ContyGo.** La persona llega con su trámite en papel: una carpeta, un formulario y una lista. Al desplazarse, el celular gira desde la funda con el símbolo hasta mostrar la app real, y los papeles se abren a su alrededor. Después, la pantalla de ese mismo celular acompaña los cuatro pasos del recorrido.

La audacia se gasta sólo ahí. Lo demás es orden: la información de la V7 en el mismo orden (servicios, recorrido, plataforma, respaldo, «Claro desde el principio», preguntas y cierre), con el celular y los objetos 3D como imágenes de cada sección.

## Plan de diseño (frontend-design)

- **Color:** blanco `#FFFFFF` en claro y noche `#061B3D` en oscuro, los dos exactos porque son el fondo de los renders y vídeos. Verde `#25D366` sólo en el check y la acción principal; verde firma `#087F46` para enlaces sobre blanco.
- **Tipografía:** Cabinet Grotesk 700/800 para titulares y Nunito Sans, la de la marca, para el texto.
- **Movimiento:** un único momento guiado por el desplazamiento, el giro del celular en el hero (secuencia de 60 fotogramas en un `<canvas>`). Al terminar, el celular sigue flotando en bucle. El recorrido cambia de pantalla por paso. Nada de aparecer-al-desplazar en cada bloque.
- **Evitado a propósito:** antetítulos en mayúsculas, palabras sueltas en color, números decorativos sin secuencia y kits de tarjetas iguales.
- **Móvil primero:** en el hero, el objeto va arriba (máx. 52 % de la altura) y el texto debajo. Las listas se desplazan en horizontal y hay una barra fija con la acción principal.

## Recursos 3D (Blender 5.2, Cycles, fondo transparente)

Todos se renderizan con fondo transparente y una sombra real, recogida con un *shadow catcher*, para que floten sobre claro y oscuro. Scripts en `material-de-diseno/v10/blender/`:

| Script | Qué modela | Salidas |
|---|---|---|
| `phone.py` | Celular con funda azul marino `#061634` y relieve sutil, símbolo ContyGo grabado, módulo de cámaras, botones, puerto, Dynamic Island y pantalla con capturas reales de la app | `seq/` (giro de 60 fotogramas), `front-*` (8 pantallas), `pose-*` (5 poses), `idle/` (bucle de 96 fotogramas) |
| `objects.py` | Símbolo «y» en tubos 3D (curva marino en claro, marfil en oscuro) y documentos de papel: formulario, lista con checks y carpeta con pestaña verde | `simbolo-*`, `doc-formulario`, `doc-lista`, `carpeta` |

Uso: `blender -b --factory-startup -P phone.py -- <modo> <salida>`. Los modos son `test`, `back`, `seq`, `stills`, `poses` e `idle`.

- **Pantallas:** capturas de la app real en `contygo.app` a 1179×2556, con la barra de estado de iOS dibujada. Guardadas en `material-de-diseno/v10/pantallas/`. El chat se capturó en local, en oscuro.
- **Texturas de papel:** `material-de-diseno/v10/texturas/`, generadas con PIL. Sólo llevan barras, casillas y checks: ni texto legible ni sellos.
- **Exportación web:** WebP a 720 px de ancho, recortado con la misma caja en la secuencia y en las pantallas frontales, y borde alfa difuminado (64 px) para que ninguna sombra termine en un corte recto. En total, unos 2,9 MB en `public/contygo/v10/`.

### El bucle final del hero

Tras el giro, el celular «respira»: ±3° de giro, ±1,2° de inclinación y 5 mm de flotación, en 4 s. Es un vídeo H.264 compuesto sobre el color exacto de cada tema (`idle-claro.mp4`, `idle-oscuro.mp4`, unos 210 KB cada uno).

- El vídeo es opaco, así que va **debajo** de todos los documentos y sólo ocupa el lugar del celular. Aparece bajo el lienzo; cuando ya reproduce fotogramas, el lienzo se aparta.
- Al volver a subir, el lienzo reaparece al instante y el vídeo se pausa.
- Los documentos se desplazan en porcentajes de su propio tamaño (`doc(x, y, r, k)`), así la carpeta deja libre el celular en cualquier ancho. Además, la carpeta se aleja: encoge un 14 % mientras el celular viene al frente, y así tampoco toca el titular. Queda a unos 18 px del celular en escritorio (medido sobre el último fotograma).
- H.264 desplaza el azul noche unos pocos niveles (medido: 4, 25, 59 frente a 6, 27, 61). Unas máscaras de degradado en los bordes del vídeo lo disimulan.
- Con «reducir movimiento», no hay giro ni bucle: se muestra directamente el celular de frente.

**APUESTA:** WebM con alfa evitaría el fondo opaco, pero Safari en iOS no lo reproduce y HEVC con alfa no se puede codificar desde Windows. Por eso el vídeo usa un color exacto y no alfa.

## Encargos de vídeo (los produce el propietario)

En `material-de-diseno/v10/encargos/`:

- `ENCARGOS.md` con las reglas: color exacto en todo el encuadre, sin viñeta ni suelo, bucle perfecto, MP4 H.264 o secuencia PNG con alfa, y nombres `v10-<n>-<tema>-<formato>.mp4`.
- Láminas de primer fotograma en claro y oscuro, 16:9 y 9:16.

| N.º | Momento | Estado |
|---|---|---|
| 01 | Celular flotando (hero) | Hecho en Blender e integrado |
| 02 | Los documentos se ordenan («Claro desde el principio») | Pendiente del propietario |
| 03 | El símbolo se arma (cierre) | Pendiente; escena lista en `objects.py` |
| 04 | Del celular al expediente (paso 4 del recorrido) | Pendiente del propietario |

La página funciona sin ellos, con los renders fijos.

## Verificación (27-09-2026)

- Escritorio 1440×900 en claro y oscuro, y celular 390×664, con Edge sin interfaz (CDP):
  - el giro va de la funda a la app;
  - el bucle se reproduce y se detiene al volver;
  - la carpeta ya no se solapa con el celular;
  - el recorrido cambia de pantalla;
  - el diálogo del servicio se abre con el tema correcto;
  - no hay desbordamiento horizontal.
- `npm test`: 64/64. `next lint` sobre V10: sin avisos. `tsc --noEmit`: sin errores.

## Pendientes y dudas abiertas

1. **El catálogo local no coincide con la app real.** Revisado en `contygo.app` el 27-09-2026:
   - la app tiene 13 servicios y el local, 12;
   - «Apelación (Re-apertura)» cuesta desde **$550** en la app y **$250** en `lib/contygo-catalog.ts`;
   - la app incluye «Permiso de Trabajo (I-765)» a $100.

   La pantalla del celular del hero es una captura real y muestra $550, así que la misma página enseña dos precios. **No se ha cambiado nada sin confirmación.**
2. La captura del chat se tomó con un mensaje a medio escribir. Se puede repetir.
3. La afirmación «La primera plataforma…» sigue sin verificar y oculta (`CONTYGO_CLAIMS.pioneer`).
4. Vídeos 02–04 por integrar cuando lleguen.
