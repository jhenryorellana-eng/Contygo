# Ilustraciones V8 · 28 sep 2026

Sistema de ilustraciones de ContyGo: una escultura de papel por categoría y una por servicio, cada una con su porqué. Se dibujan una sola vez para los dos tonos (claro y oscuro).

- Originales: PNG 1024 px con transparencia, en esta carpeta.
- Versiones web: `python a-web.py` genera WebP de 512 px en `public/contygo/v8/`.
- Encargos a Codex (`codex-image`): en `prompts/`.
  - La dirección de arte común está en `prompts/comun.txt`.
  - El piloto (`piloto.txt`) sirvió de referencia de estilo para los lotes A, B y C.

**Por qué una sola imagen para los dos tonos.** Hacer dos versiones duplica el trabajo, y el generador nunca devuelve dos veces lo mismo, así que habrían salido distintas (el mismo problema que con los vídeos). Por eso la paleta está pensada para leerse sobre blanco y sobre marino:

- **Colores:** masas en marfil (#F4EEE3) y cobalto (#3470D6 / #1F4FA3), acentos en verde (#25D366 / #0B8F4D).
- **Nada de marino oscuro en superficies grandes:** era lo que desaparecía en modo oscuro.
- **Luz de contorno cálida**, para que la silueta se separe del fondo.
- **En modo oscuro, la página añade una luz suave detrás** de cada ilustración (CSS, sin tocar la imagen).

| Archivo | Porqué |
|---|---|
| categoria-todos | Una plaza con los cinco caminos en miniatura |
| categoria-familia | Hogar compartido: dos casas bajo un mismo techo |
| categoria-asilo | Protección y un nuevo comienzo: paraguas sobre un brote. La primera versión, un fajo de papeles atado, parecía dinero y se descartó |
| categoria-corte | La corte y sus escalones |
| categoria-impuestos | Calculadora y recibos |
| categoria-empresa | Tu propio negocio: una tienda |
| servicio-visa-juvenil | Mochila del menor protegida por un arco, sobre su expediente: custodia e I-360 en un mismo proceso |
| servicio-i-360 | Un papalote (la juventud) que despega atado al sobre de la petición |
| servicio-i-485 | La llave de la casa: la residencia |
| servicio-asilo | Tu historia: un diario con pluma y evidencias sujetas |
| servicio-reforzar-asilo | El expediente que ya existe, reforzado con una correa y ordenado con pestañas |
| servicio-evaluacion-asilo | Un informe con indicador y un destello: la evaluación con IA |
| servicio-apelacion | Subir a la instancia superior (BIA) |
| servicio-cambio-corte | El expediente viaja de una corte a otra |
| servicio-reapertura | Una puerta que se vuelve a abrir |
| servicio-itin | Tu tarjeta de identificación fiscal |
| servicio-impuestos | La declaración enviada, con su visto bueno |
| servicio-llc | El certificado de constitución y tus tarjetas: empresa e identidad |

Fotos del recorrido corregidas: `v7-fotos/paso-01-entiende-v2.png` y `paso-03-avanza-v2.png`. En las originales, el teléfono mostraba la pantalla por la cara de las cámaras; ahora son tomas por encima del hombro, físicamente correctas.
