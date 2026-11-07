"""Prepare the koi sprites (run locally once, whenever the art changes; needs Pillow, numpy, opencv).

assets/src/koi-sheet-raw.png  (generated: 4 swim + 4 eat frames, top-down, facing right, on magenta)
  -> assets/koi-sprites.png   (8 frames in one row, transparent, snapped to the pond's pixel grid,
                               every frame aligned on the head tip so the fish never jitters)
"""
import cv2
import numpy as np
from PIL import Image

SRC, OUT = "assets/src/koi-sheet-raw.png", "assets/koi-sprites.png"
COLS, ROWS = 4, 2
ADULT_LEN = 46            # length of the straight swim frame, in pond pixels
CELL_W, CELL_H = 60, 32   # output cell, in pond pixels
HEAD_X = CELL_W - 6       # where every frame's head tip lands (room for bubbles in front)

img = np.array(Image.open(SRC).convert("RGB")).astype(np.int16)
H, W = img.shape[:2]
# chroma key: anything close to magenta is background
mag = np.abs(img - np.array([255, 0, 255])).sum(axis=2) < 150
alpha = (~mag).astype(np.uint8)

cw, ch = W // COLS, H // ROWS
cells = []
for r in range(ROWS):
    for c in range(COLS):
        a = alpha[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]
        rgb = img[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]
        n, lab, stats, _ = cv2.connectedComponentsWithStats(a, connectivity=8)
        big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))       # the fish (bubbles are separate, small)
        x, y, w, h = stats[big, :4]
        head = x + w                                                  # head tip = right edge of the fish
        mid = y + h / 2
        cells.append((rgb, a, head, mid, w))

# scale from the straight swim frame (frame 2)
scale = ADULT_LEN / cells[1][4]
out = Image.new("RGBA", (CELL_W * COLS * ROWS, CELL_H), (0, 0, 0, 0))
for i, (rgb, a, head, mid, w) in enumerate(cells):
    rgba = np.dstack([rgb.clip(0, 255).astype(np.uint8), a * 255])
    # premultiply-free box downscale: average colour over opaque pixels only
    im = Image.fromarray(rgba, "RGBA")
    sw, sh = round(im.width * scale), round(im.height * scale)
    small_rgb = Image.fromarray((rgb.clip(0, 255) * a[..., None]).astype(np.uint8)).resize((sw, sh), Image.BOX)
    small_a = Image.fromarray(a * 255).resize((sw, sh), Image.BOX)
    A = np.array(small_a).astype(np.float32)
    C = np.array(small_rgb).astype(np.float32) / np.maximum(A[..., None] / 255, 1e-3)
    keep = A >= 110
    frame = np.dstack([C.clip(0, 255).astype(np.uint8), (keep * 255).astype(np.uint8)])
    fr = Image.fromarray(frame, "RGBA")
    ox = HEAD_X - round(head * scale)
    oy = round(CELL_H / 2 - mid * scale)
    cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    cell.alpha_composite(fr, (ox, oy)) if ox >= 0 and oy >= 0 else cell.paste(fr, (ox, oy), fr)
    out.alpha_composite(cell, (i * CELL_W, 0))

# a small shared palette keeps it pixel-art clean (alpha stays binary)
a = out.getchannel("A")
q = out.convert("RGB").quantize(colors=20, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGB")
q.putalpha(a)
q.save(OUT)
print(f"{OUT}: {COLS * ROWS} frames of {CELL_W}x{CELL_H}, scale {scale:.3f}")
