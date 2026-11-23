#!/bin/bash
# The five clay scenes of «tu contrato en cinco pasos»: one Codex job each, in parallel. usage: lanzar.sh <take> [names…]
S="$(cd "$(dirname "$0")" && pwd)"; TAKE="${1:-a}"; shift; NAMES=("$@"); [ ${#NAMES[@]} -eq 0 ] && NAMES=(tocas respondes llena confirmas firmas)
COMUN='Crea una ilustración NUEVA en el mismo estilo exacto que estilo-1.png y estilo-2.png: un render 3D de plastilina mate (clay), formas redondeadas y gruesas, luz suave de estudio, sombras suaves, sin texturas realistas. Misma paleta y solo esa: beige arcilla para las personas y las bases, azul rey (#2460d6), verde vivo (#25d366) y verde oscuro, y blanco. El protagonista es el mismo muñeco de plastilina beige sin cara de las referencias (cabeza redonda lisa, cuerpo sencillo).
La escena se apoya en una base redonda de plastilina beige, como en las referencias, y por la base cruza de izquierda a derecha un camino de cinta verde brillante (verde #25d366), que entra por el borde izquierdo y sale por el borde derecho de la base.
Fondo TRANSPARENTE (PNG con canal alfa), sin suelo ni pared, sin texto, sin letras, sin números escritos y sin logotipos. Composición centrada, con aire alrededor, formato cuadrado.'
escena() { case "$1" in
  tocas) echo 'Escena: el muñeco, de pie y contento, toca con un dedo un teléfono celular GIGANTE de plastilina azul, tan alto como él, apoyado de pie sobre la base. En la pantalla del teléfono hay un gran botón redondo verde que se hunde bajo su dedo y del que salen dos o tres destellos pequeños. El camino de cinta verde nace al pie del teléfono.';;
  respondes) echo 'Escena: el muñeco, de pie, con una mano levantada como quien responde. Sobre él flotan dos globos de diálogo grandes de plastilina: uno azul con un signo de interrogación en relieve y otro verde con una marca de verificación (check) blanca en relieve. A su lado, dos botones gruesos de plastilina, uno verde y uno blanco, como los de elegir sí o no.';;
  llena) echo 'Escena: una hoja de contrato GRANDE de plastilina blanca sobre un atril o tablilla azul, con renglones en relieve; tres de los renglones ya tienen delante un círculo verde con check. Un lápiz grueso de plastilina azul y verde escribe solo sobre la hoja, inclinado, sin que nadie lo sostenga. El muñeco lo mira relajado, con los brazos cruzados o las manos en la cintura.';;
  confirmas) echo 'Escena: un sobre de carta GRANDE de plastilina blanca y azul, abierto, del que asoma una tarjeta con seis puntos redondos gruesos en fila (como un código oculto). Junto al sobre, un candado de plastilina abierto con un check verde. El muñeco sostiene un teléfono celular azul en una mano y con la otra señala la tarjeta.';;
  firmas) echo 'Escena: el muñeco firma con una pluma gruesa azul una hoja de contrato grande de plastilina blanca apoyada en una mesa baja; en la hoja se ve un garabato de firma en relieve azul y, en una esquina, un GRAN sello redondo verde con un check blanco en relieve, recién estampado. Alrededor caen unos pocos confetis de plastilina azules y verdes. El camino de cinta verde termina en una pequeña bandera verde.';;
esac; }
for name in "${NAMES[@]}"; do dir="$S/$name-$TAKE"; mkdir -p "$dir"; cp "$S/estilo-1.png" "$S/estilo-2.png" "$dir/"; rm -f "$dir/escena.png"
  codex exec --skip-git-repo-check --ephemeral -s workspace-write -m gpt-6.1-sol -c model_reasoning_effort=medium -C "$dir" -o "$dir/respuesta.txt" "$COMUN
$(escena "$name")
Guarda el resultado en este directorio como escena.png (PNG cuadrado con fondo transparente)." < /dev/null > "$dir/codex.log" 2>&1 &
done
wait
for name in "${NAMES[@]}"; do dir="$S/$name-$TAKE"; [ -f "$dir/escena.png" ] && echo "ok   $name-$TAKE" || echo "FALTA $name-$TAKE: $(tail -c 300 "$dir/codex.log" | tr '\n' ' ')"; done
