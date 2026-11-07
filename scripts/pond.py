"""Put the git-koi fish in a pond.

python scripts/pond.py [koi/koi.gif] [assets/pond.png] [koi/pond.gif]

Crops every frame of git-koi's transparent koi.gif to the fish, scales it up with
nearest-neighbour (pixel art stays crisp), and composites each frame onto the centre
of the pond background, keeping the original frame timings. Needs Pillow.
"""
import sys
from PIL import Image, ImageSequence

src = sys.argv[1] if len(sys.argv) > 1 else "koi/koi.gif"
bg_path = sys.argv[2] if len(sys.argv) > 2 else "assets/pond.png"
out = sys.argv[3] if len(sys.argv) > 3 else "koi/pond.gif"

OUT_W = 960            # final strip width; height follows the pond's aspect
FISH_FRAC = 0.30       # the fish's length as a share of the strip width

koi = Image.open(src)
frames, durations = [], []
for f in ImageSequence.Iterator(koi):
    frames.append(f.convert("RGBA"))
    durations.append(f.info.get("duration", koi.info.get("duration", 80)))

# union bounding box of the fish over all frames, with a little margin for the tail
box = None
for f in frames:
    b = f.getchannel("A").getbbox()
    if b:
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
if box is None:
    raise SystemExit("koi.gif has no visible pixels")
m = 6
box = (max(0, box[0] - m), max(0, box[1] - m), min(frames[0].width, box[2] + m), min(frames[0].height, box[3] + m))
fw, fh = box[2] - box[0], box[3] - box[1]

bg = Image.open(bg_path).convert("RGBA")
bg = bg.resize((OUT_W, round(bg.height * OUT_W / bg.width)), Image.LANCZOS)
scale = max(1, round(OUT_W * FISH_FRAC / fw))       # integer scale keeps the pixels square
sw, sh = fw * scale, fh * scale
ox, oy = (bg.width - sw) // 2, (bg.height - sh) // 2

composited = []
for f in frames:
    fish = f.crop(box).resize((sw, sh), Image.NEAREST)
    # a soft shadow under the fish, offset down-right, so it sits in the water
    shadow = Image.new("RGBA", fish.size, (0, 0, 0, 0))
    shadow.putalpha(fish.getchannel("A").point(lambda a: 70 if a > 0 else 0))
    frame = bg.copy()
    frame.alpha_composite(shadow, (ox + scale * 3, oy + scale * 4))
    frame.alpha_composite(fish, (ox, oy))
    composited.append(frame.convert("RGB"))

# one shared palette (from the first frame) keeps the GIF small and stops the water flickering
pal = composited[0].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
gif = [c.quantize(palette=pal, dither=Image.Dither.NONE) for c in composited]
gif[0].save(out, save_all=True, append_images=gif[1:], duration=durations, loop=0, optimize=True, disposal=1)
print(f"{out}: {len(gif)} frames, {bg.width}x{bg.height}, fish x{scale}")
