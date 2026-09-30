from pathlib import Path
import json
import zipfile
from PIL import Image

public = Path('public')
root = public / 'contygo-produccion/visa-secuencia-venta'
data = json.loads((root / 'data.json').read_text(encoding='utf-8'))
assets = set()
for style in data['styles']:
    for board in style['boards']:
        png = root / 'boards' / (board['id'] + '.png')
        with Image.open(png) as image:
            image.verify()
        for frame in board['frames']:
            for field in ('asset', 'screen'):
                if frame.get(field):
                    assets.add(public / frame[field].lstrip('/'))
for ref in data['references']:
    assets.add(public / ref['image'].lstrip('/'))
assets.update([
    public / 'fonts/nunito-latin-variable.woff2',
    public / 'fonts/nunito-sans-latin-variable.woff2',
    public / 'contygo/registro/registro-utah-original.pdf',
])
files = set(f for f in root.rglob('*') if f.is_file() and f.suffix != '.zip') | assets
missing = [str(f) for f in files if not f.exists()]
if missing:
    raise FileNotFoundError('\n'.join(missing))
archive = root / 'contygo-secuencia-venta.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
    for file in sorted(files):
        output.write(file, str(file.relative_to(public)))
    output.writestr('LEEME.txt', '''CONTYGO · SECUENCIA DE VENTA

Las 19 imágenes están en contygo-produccion/visa-secuencia-venta/boards/.
Dos guiones de voz y prompts completos en la misma carpeta.
El PDF original está en contygo/registro/.

PNG y TXT se pueden abrir directamente. La galería index.html necesita
servirse por HTTP desde esta carpeta raíz; usa los mismos enlaces que
la vista local del proyecto. No contiene vídeos ni voces generadas.
Los storyboards usan imágenes humanas ya dirigidas y capturas reales.
El usuario opera Grok. Las pantallas y el certificado permanecen como
capas originales en el montaje. Consulta guion-y-direccion.md y montaje.md.
''')
with zipfile.ZipFile(archive) as output:
    assert output.testzip() is None
print(json.dumps({'archive': str(archive), 'bytes': archive.stat().st_size, 'files': len(files) + 1}))
