#!/bin/bash
# The five clay scenes, second round: the person, their assistant beside them, and a giant phone whose screen is a
# flat magenta marker (the real screens of the assistant are laid over it by code). usage: lanzar2.sh <take> [names…]
S="$(cd "$(dirname "$0")" && pwd)"; TAKE="${1:-b}"; shift; NAMES=("$@"); [ ${#NAMES[@]} -eq 0 ] && NAMES=(tocas respondes llena confirmas firmas)
COMUN='Crea una ilustración NUEVA en el mismo estilo exacto que estilo-3.png y estilo-4.png: render 3D de plastilina mate (clay), formas redondeadas y gruesas, luz suave de estudio, sombras suaves. Misma paleta y solo esa: beige arcilla, azul rey (#2460d6), verde vivo (#25d366), verde oscuro y blanco.
En la escena hay SIEMPRE estos tres elementos, sobre una base redonda de plastilina beige por la que cruza, de izquierda a derecha, un camino de cinta verde brillante:
1) LA PERSONA: el mismo muñeco de plastilina beige sin cara de las referencias, con zapatos azules.
2) SU ASISTENTE: un segundo muñeco de plastilina, del mismo tamaño y forma, pero todo de color VERDE vivo (#25d366), sin cara, que lleva unos auriculares de diadema azules con micrófono (como un agente de atención). Está al lado de la persona, acompañándola, con un gesto amable.
3) UN TELÉFONO CELULAR GIGANTE de plastilina azul, de pie sobre la base, más alto que los muñecos, visto de frente o casi de frente. Su pantalla es un rectángulo vertical grande (proporción aproximada 9:16) completamente LISO y uniforme de color magenta puro #ff00ff: es un marcador que después se sustituye, así que no dibujes nada dentro, ni reflejos, ni brillos, ni sombras encima. Las cuatro esquinas de la pantalla deben verse enteras: NADIE la toca y NADA la tapa, ni siquiera un poco (los muñecos y los objetos quedan a los lados, sin solaparse con la pantalla).
Fondo TRANSPARENTE (PNG con canal alfa), sin suelo ni pared. Sin texto, sin letras, sin números y sin logotipos. Formato cuadrado, composición centrada con aire alrededor.'
escena() { case "$1" in
  tocas) echo 'Escena «empezar»: el teléfono a la derecha. La persona, a la izquierda, lo señala con el brazo extendido (sin llegar a tocar la pantalla), con ganas de empezar. El asistente verde, junto a ella, la recibe con una mano levantada saludando. Del teléfono salen dos o tres destellos verdes pequeños por un lado.';;
  respondes) echo 'Escena «preguntas»: el teléfono en el centro. A la izquierda, la persona con una mano levantada, respondiendo. A la derecha, el asistente verde con una tablilla de notas azul en la mano. Sobre ellos flotan dos globos de diálogo de plastilina: uno azul con un signo de interrogación en relieve (sobre el asistente) y uno verde con un check blanco (sobre la persona).';;
  llena) echo 'Escena «el contrato se llena»: el teléfono a la izquierda. A la derecha, una hoja de contrato grande de plastilina blanca en una tablilla azul, con renglones y tres checks verdes; el asistente verde sostiene un lápiz grueso y va llenando la hoja. La persona, en medio, mira tranquila con las manos en la cintura.';;
  confirmas) echo 'Escena «el código»: el teléfono a la derecha. A la izquierda, la persona sostiene un sobre de carta grande, blanco y azul, abierto, del que asoma una tarjeta con seis puntos redondos en fila. El asistente verde, a su lado, levanta el pulgar. En el suelo, delante, un candado de plastilina abierto con un check verde.';;
  firmas) echo 'Escena «la firma»: el teléfono a la izquierda. A la derecha, una mesa baja con una hoja de contrato blanca que tiene un garabato de firma azul y un gran sello redondo verde con check blanco; la persona, sentada o inclinada, firma con una pluma azul. El asistente verde, de pie a su lado, aplaude o levanta los brazos celebrando. Caen unos pocos confetis azules y verdes, y el camino verde termina en una banderita verde.';;
esac; }
for name in "${NAMES[@]}"; do dir="$S/$name-$TAKE"; mkdir -p "$dir"; cp "$S/estilo-3.png" "$S/estilo-4.png" "$dir/"; rm -f "$dir/escena.png"
  codex exec --skip-git-repo-check --ephemeral -s workspace-write -m gpt-6.1-sol -c model_reasoning_effort=medium -C "$dir" -o "$dir/respuesta.txt" "$COMUN
$(escena "$name")
Guarda el resultado en este directorio como escena.png (PNG cuadrado con fondo transparente)." < /dev/null > "$dir/codex.log" 2>&1 &
done
wait
for name in "${NAMES[@]}"; do dir="$S/$name-$TAKE"; [ -f "$dir/escena.png" ] && echo "ok   $name-$TAKE" || echo "FALTA $name-$TAKE: $(tail -c 300 "$dir/codex.log" | tr '\n' ' ')"; done
