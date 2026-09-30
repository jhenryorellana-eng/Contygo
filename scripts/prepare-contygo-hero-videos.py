"""Import user clips without re-encoding; extract posters and review frames."""
import sys, pathlib, subprocess, shutil, json, re
root = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'output/media-tools'))
import imageio_ffmpeg
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
source = pathlib.Path('C:/Users/PepitoLee/Downloads/vvvv')
target = root / 'public/contygo/hero-video-v2'
review = root / 'output/contygo-hero-video-review'
target.mkdir(parents=True, exist_ok=True)
review.mkdir(parents=True, exist_ok=True)
manifest = []
for number, scene in enumerate(['01-elige', '02-contrato', '03-documentos'], 1):
    for fmt in ['mobile', 'desktop']:
        name = f'{number} mobile.mp4' if fmt == 'mobile' else f'{number} escritorio.mp4'
        src = source / name
        stem = f'{scene}-{fmt}'
        dest = target / f'{stem}.mp4'
        shutil.copy2(src, dest)
        # Supplied mobile clip 2 reveals the screen. Use the matching rear-view
        # desktop take, cropped to portrait, while preserving the supplied file.
        adapted = number == 2 and fmt == 'mobile'
        if adapted:
            shutil.copy2(src, target / f'{stem}-original.mp4')
            subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source / '2 escritorio.mp4'), '-map', '0:v:0', '-vf', 'crop=404:720:350:0,scale=720:1280', '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-an', '-movflags', '+faststart', str(dest)], check=True)
        probe = subprocess.run([ffmpeg, '-hide_banner', '-i', str(src)], capture_output=True, text=True).stderr
        (review / f'{stem}-metadata.txt').write_text(probe, encoding='utf8')
        duration = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', probe)
        seconds = int(duration[1])*3600 + int(duration[2])*60 + float(duration[3]) if duration else None
        subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-ss', '0.08', '-i', str(dest), '-frames:v', '1', '-q:v', '2', str(target / f'{stem}.jpg')], check=True)
        subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(dest), '-vf', 'fps=1,scale=320:-2,tile=3x2', '-frames:v', '1', str(review / f'{stem}.jpg')], check=True)
        manifest.append({'id':stem, 'source':str(source / '2 escritorio.mp4') if adapted else str(src), 'adaptation':'Portrait crop; supplied mobile original preserved' if adapted else None, 'video':str(dest.relative_to(root)), 'duration':seconds, 'bytes':dest.stat().st_size})
(target / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf8')
print(json.dumps(manifest, indent=2))

