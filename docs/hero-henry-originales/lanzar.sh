#!/bin/bash
# The six frames of the hero with Henry: one Codex job each, in parallel. usage: lanzar.sh <take> [names…]
S="$(cd "$(dirname "$0")" && pwd)"; TAKE="${1:-a}"; shift; NAMES=("$@"); [ ${#NAMES[@]} -eq 0 ] && NAMES=(claro-lee claro-mira claro-muestra oscuro-lee oscuro-mira oscuro-muestra)
COMUN='Edita la foto referencia.png: sustituye a la mujer por el hombre de las fotos henry-1.jpg, henry-2.jpg y henry-3.jpg (las tres son de la misma persona, Henry). Tiene que reconocerse que es él: su rostro, su edad, sus lentes de montura oscura, su pelo corto entrecano peinado hacia atrás y su complexión. Es una fotografía realista de estudio, no una ilustración.
Conserva EXACTAMENTE de referencia.png: el encuadre cuadrado y el tamaño y lugar de la figura; el fondo y su luz; y la cinta verde de satén, en su mismo sitio, con su misma forma, sus mismas vueltas y su mismo brillo, saliendo por el borde inferior en el mismo punto (no la muevas, no la simplifiques y no la tapes más de lo que ya está tapada).
Vestuario de Henry, idéntico en toda la serie: blazer verde bosque oscuro (color #0b5a36) de corte moderno, sobre camisa blanca de cuello abierto, sin corbata; un reloj discreto en la muñeca izquierda. Nada más: sin pañuelo, sin insignias.
Sin texto, sin logotipos y sin marcas de agua en la imagen.'
pose() { case "$1" in
  lee) echo 'Pose, la misma que la mujer de referencia.png: de pie, de medio cuerpo, sostiene el teléfono con las dos manos a la altura del pecho y lo mira, con la cabeza algo inclinada y una sonrisa tranquila. La cinta verde nace del teléfono, como en la referencia.';;
  mira) echo 'Pose, la misma que la mujer de referencia.png: es el instante siguiente; levanta la mirada del teléfono hacia la cámara, sonriendo, con el teléfono todavía en las manos a la altura del pecho, empezando a girarlo.';;
  muestra) echo 'Pose, la misma que la mujer de referencia.png: mira a la cámara sonriendo y le muestra el teléfono con el brazo extendido hacia delante, la pantalla de frente a la cámara, vertical, en el mismo lugar y del mismo tamaño que en la referencia. La pantalla del teléfono debe ser un rectángulo completamente liso y uniforme de color azul #2460d6: sin reflejos, sin brillos, sin iconos y sin texto, con sus cuatro esquinas visibles; los dedos sujetan el teléfono por el borde y no tapan la pantalla.';;
esac; }
for name in "${NAMES[@]}"; do tema="${name%%-*}"; pose="${name##*-}"; dir="$S/$name-$TAKE"; mkdir -p "$dir"; [ -f "$dir/referencia.png" ] || cp "$S/$name-a/"{referencia.png,henry-1.jpg,henry-2.jpg,henry-3.jpg} "$dir/"
  rm -f "$dir/cuadro.png"
  fondo=$([ "$tema" = "oscuro" ] && echo 'El fondo es azul marino muy oscuro (como en la referencia), con la luz de contorno azulada sobre los hombros y el pelo.' || echo 'El fondo es blanco liso, como en la referencia.')
  codex exec --skip-git-repo-check --ephemeral -s workspace-write -m gpt-6.1-sol -c model_reasoning_effort=medium -C "$dir" -o "$dir/respuesta.txt" "$COMUN
$fondo
$(pose "$pose")
Guarda el resultado en este directorio como cuadro.png, cuadrado." < /dev/null > "$dir/codex.log" 2>&1 &
done
wait
for name in "${NAMES[@]}"; do dir="$S/$name-$TAKE"; [ -f "$dir/cuadro.png" ] && echo "ok   $name-$TAKE" || echo "FALTA $name-$TAKE: $(tail -c 300 "$dir/codex.log" | tr '\n' ' ')"; done
