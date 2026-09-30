# Testimonios / Fotos de clientes

Fotos reales que aparecen en la galería de prueba social (pantalla de
resultado cuando el cliente califica), junto al botón de WhatsApp.

## Fotos actuales

El componente `components/SocialProof.tsx` usa la lista `PHOTOS`. Hoy:

- `photo_2025-03-28_19-50-27.jpg`
- `photo_2025-04-19_22-57-16.jpg`
- `photo_2025-03-28_20-00-08.jpg`

## Cambiar fotos, cantidad o texto

Edita `components/SocialProof.tsx`:
- `PHOTOS` → rutas de las fotos (puedes poner 2, 3, 4…).
- `COUNT_LABEL` → el número (ej. "+500 familias").
- `SUBTITLE` → el texto de apoyo.

Recomendado: fotos horizontales o cuadradas; se recortan a cuadrado.
Si una foto falta, esa tarjeta no se muestra (no se ve roto).
