# ContyGo V10 · Encargos de vídeo (Grok, After Effects o Blender)

La V10 funciona sin estos vídeos: ya usa los renders 3D hechos en Blender. Cada encargo añade vida a un momento concreto. Cuando me pases los archivos, los integro.

## La regla que hace que el objeto «flote»

El vídeo debe tener **exactamente** el color de fondo de la página, en todo el encuadre y en cada fotograma:

- **Claro:** `#FFFFFF` (RGB 255, 255, 255).
- **Oscuro:** `#061B3D` (RGB 6, 27, 61).

Si el fondo coincide, el borde del vídeo desaparece y el objeto parece flotar sobre la página. Sin viñetas, degradados, suelo visible, horizonte, grano ni partículas. La sombra de contacto sí se puede mantener.

Las láminas de esta carpeta ya tienen el color exacto y sirven como **primer fotograma o referencia**, en 16:9 y 9:16, claro y oscuro.

**Grok suele desplazar el color del fondo.** Si pasa, corrígelo en After Effects antes de entregarlo: capa sólida del color exacto debajo, clave de luminancia o de color sobre el fondo y un ligero *feather*. O entrégame el vídeo con canal alfa (ProRes 4444 o secuencia PNG) y yo lo compongo.

## Entrega

- **Formato:** MP4 H.264, 24 o 30 fps. Si hay canal alfa, secuencia PNG.
- **Duración:** la indicada en cada encargo, en **bucle perfecto** (el último fotograma encaja con el primero).
- **Versiones:** la que mejor funcione en celular es la 9:16. Idealmente entrégame también la 16:9.
- **Nombre:** `v10-<número>-<tema>-<formato>.mp4`, por ejemplo `v10-02-claro-9x16.mp4`.

---

## 01 · El celular flotando (ya resuelto en Blender)

Ya lo renderizo yo en Blender: 4 s en bucle, sobre claro y oscuro. Está integrado en el hero, al final del giro. **No hace falta producirlo.** Sólo si quieres una versión más rica en AE, por ejemplo con reflejos que recorran el cristal.

**Láminas:** `01-celular-flotando-*`

---

## 02 · Los documentos se ordenan (sección «Claro desde el principio»)

**Láminas:** `02-documentos-se-ordenan-*`. **Duración:** 8 s en bucle.

**Prompt (Grok, con la lámina como primer fotograma y como final):**

> Escena de estudio minimalista. El fondo es un color sólido y uniforme exactamente igual al de la imagen de referencia, en todo el encuadre y durante todo el vídeo, sin degradados, viñeta, suelo, horizonte ni partículas. Tres objetos de papel mate flotan en el aire con sombras suaves: una carpeta azul marino con una pestaña verde, una hoja color crema con un formulario de líneas grises y una hoja crema con tres casillas verdes marcadas. Durante los primeros 3 segundos, las dos hojas giran lentamente y se deslizan con peso físico hasta entrar ordenadas en la carpeta. La carpeta se endereza con un leve rebote. Mantén ese estado un segundo. Después las hojas vuelven a salir y regresan exactamente a su posición y ángulo iniciales, para un bucle perfecto. Cámara fija. Movimiento suave, elegante, sin cortes. Sin texto legible, sellos, logotipos nuevos ni personas.

---

## 03 · El símbolo se arma (cierre de la página)

**Láminas:** `03-simbolo-se-arma-*`. **Duración:** 6 s en bucle.

**Mejor en After Effects o Blender** (en Blender tengo la escena lista en `material-de-diseno/v10/blender/objects.py`):

- 0–1,2 s: la curva (marino en claro, marfil en oscuro) se dibuja desde su extremo inferior hasta el vértice.
- 1,2–2,2 s: el check verde crece desde el vértice hacia su punta larga, con un rebote corto.
- 2,2–5 s: el símbolo completo flota y gira ±8°, con reflejos suaves que recorren el verde.
- 5–6 s: vuelve a la pose inicial.

**Prompt (Grok, con la lámina como primer fotograma):**

> El mismo símbolo 3D de la imagen, hecho de tubos brillantes (un check verde y una curva), flota sobre un fondo sólido uniforme exactamente igual al de la referencia, en todo el encuadre y durante todo el vídeo, sin viñeta, degradado ni suelo. Gira lentamente ±8 grados sobre su eje vertical mientras un reflejo de luz recorre el tubo verde. Al final vuelve exactamente a la pose inicial para un bucle perfecto. Cámara fija, movimiento lento y elegante. Sin texto ni partículas.

---

## 04 · Del celular a tu expediente (paso «Da tu siguiente paso»)

**Láminas:** `04-del-celular-al-expediente-*`. **Duración:** 8 s en bucle.

**Prompt (Grok):**

> Un celular con funda azul marino flota de frente, ligeramente inclinado, sobre un fondo sólido uniforme exactamente igual al de la referencia, en todo el encuadre y durante todo el vídeo, sin viñeta, degradado ni suelo. En su pantalla se ve una app de trámites. Dos hojas de papel crema flotan a los lados. Las hojas se acercan en arco, se encogen y entran suavemente en la pantalla del celular, como si se guardaran dentro de la app; al entrar, la pantalla destella muy suavemente en verde. El celular hace un leve asentimiento. Después las hojas vuelven a salir y regresan a su posición inicial para un bucle perfecto. Cámara fija. La pantalla conserva el contenido de la referencia: no inventes textos, botones ni aprobaciones. Sin logotipos nuevos ni personas.

---

## Dónde se integran

| Encargo | Sección | Cómo se integra |
|---|---|---|
| 01 | Hero | Aparece al terminar el giro, sin corte visible (fundido de 0,4 s y bordes difuminados). |
| 02 | Claro desde el principio | Sustituye a los tres documentos fijos; se reproduce sólo en pantalla. |
| 03 | Cierre | Sustituye al símbolo fijo. |
| 04 | Paso 4 del recorrido | Sustituye a la pantalla fija del paso 4 mientras ese paso está activo. |

Si alguno no queda bien, la página sigue funcionando con los renders fijos.
