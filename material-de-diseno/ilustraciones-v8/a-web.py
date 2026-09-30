"""Convierte los originales V8 (PNG 1024 con alfa, material-de-diseno/ilustraciones-v8) en WebP para la web
(public/contygo/v8, 512 px, alfa conservada) y las fotos corregidas de los pasos (v7-fotos/*-v2.png) en WebP
de 1280 px (public/contygo/v7). Uso: python a-web.py  (desde cualquier carpeta)."""
import glob, os
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.abspath(os.path.join(here, "..", ".."))
out = os.path.join(root, "public", "contygo", "v8")
os.makedirs(out, exist_ok=True)
for src in sorted(glob.glob(os.path.join(here, "*.png"))):
    im = Image.open(src).convert("RGBA")
    if im.getchannel("A").getextrema()[0] != 0:
        print("SIN TRANSPARENCIA, revisar:", os.path.basename(src))
    web = im.resize((512, 512), Image.LANCZOS)
    dst = os.path.join(out, os.path.basename(src).replace(".png", ".webp"))
    web.save(dst, "WEBP", quality=88, method=6)
    print(f"{os.path.basename(dst):32} {os.path.getsize(dst) // 1024} KB")
for src in sorted(glob.glob(os.path.join(root, "material-de-diseno", "v7-fotos", "paso-0*-v2.png"))):
    im = Image.open(src).convert("RGB")
    web = im.resize((1280, round(1280 * im.height / im.width)), Image.LANCZOS)
    dst = os.path.join(root, "public", "contygo", "v7", os.path.basename(src).replace(".png", ".webp"))
    web.save(dst, "WEBP", quality=82, method=6)
    print(f"{os.path.basename(dst):32} {os.path.getsize(dst) // 1024} KB")
