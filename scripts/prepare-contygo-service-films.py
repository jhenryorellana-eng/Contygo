"""Prepare the approved AE service films for on-demand landing playback."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import re
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = ROOT / 'output/media-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
DEST = ROOT / 'public/contygo/films'
LOG = ROOT / 'output/service-films-web'
FILMS = [
    ('apelacion', 'contygo-apelacion-video1/entrega-ae/ContyGo-Apelacion-Completo.mp4', 2636),
    ('reforzamiento-asilo', 'contygo-reforzamiento-asilo-video1/entrega-ae/ContyGo-Reforzamiento-Asilo-Completo.mp4', 2880),
]

def run(args, log):
    result = subprocess.run([str(FFMPEG), '-hide_banner', '-y', *map(str, args)], capture_output=True, text=True, encoding='utf-8', errors='replace')
    (LOG / log).write_text(result.stderr, encoding='utf-8')
    if result.returncode:
        raise RuntimeError(result.stderr[-2500:])
    return result.stderr

def atoms(path):
    result = []
    with path.open('rb') as f:
        while header := f.read(8):
            size, kind = struct.unpack('>I4s', header)
            header_size = 8
            if size == 1:
                size = struct.unpack('>Q', f.read(8))[0]
                header_size = 16
            result.append(kind.decode('ascii'))
            if not size:
                break
            f.seek(size - header_size, 1)
    return result

def prepare(film):
    name, relative, frames = film
    source = ROOT / 'output' / relative
    target = DEST / f'{name}-v1-720p.mp4'
    poster = DEST / f'{name}-v1-poster.webp'
    run(['-i', source, '-map', '0:v:0', '-map', '0:a:0', '-vf', 'scale=1280:720', '-c:v', 'libx264', '-threads', '4', '-preset', 'medium', '-crf', '24', '-maxrate', '1800k', '-bufsize', '3600k', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '96k', '-ar', '48000', '-movflags', '+faststart', target], f'{name}-encode.log')
    run(['-ss', '7', '-i', source, '-frames:v', '1', '-vf', 'scale=960:540', '-c:v', 'libwebp', '-quality', '82', poster], f'{name}-poster.log')
    verification = run(['-i', target, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], f'{name}-decode.log')
    assert re.search(r'frame=\s*' + str(frames) + r'\b', verification), 'Unexpected frame count'
    ordering = atoms(target)
    assert ordering.index('moov') < ordering.index('mdat'), 'MP4 is not faststart'
    report = {'service': name, 'source': str(source), 'web': str(target), 'source_bytes': source.stat().st_size, 'web_bytes': target.stat().st_size, 'poster_bytes': poster.stat().st_size, 'duration_seconds': frames / 24, 'frames': frames, 'resolution': '1280x720', 'faststart': True, 'full_decode': 'passed'}
    print(json.dumps(report, ensure_ascii=False), flush=True)
    return report

if __name__ == '__main__':
    DEST.mkdir(parents=True, exist_ok=True)
    LOG.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        reports = list(pool.map(prepare, FILMS))
    (LOG / 'manifest.json').write_text(json.dumps(reports, indent=2, ensure_ascii=False), encoding='utf-8')
