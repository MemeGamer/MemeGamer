"""Our koi pond: a pixel-art koi that swims, feeds and grows with public GitHub activity.

GH_TOKEN=... GH_USER=MemeGamer python scripts/koi.py   ->  koi/pond.gif   (needs Pillow only)

  size     lifetime public contributions grow the koi: fry, juvenile, young, adult
  food     two daily pellets plus one per public contribution in the last 7 days (max 8); the koi eats each
  water    ripple lines sway and twinkle; pellets land with a splash ring; eating sends out bubbles
  colour   the koi is recoloured from its languages: top language = patches, 2nd = fins, 3rd = body sheen

Everything is drawn on the pond's 240x80 pixel grid and scaled 4x with nearest-neighbour, and every
motion is periodic over the loop, so the GIF repeats without a jump. Idea after git-koi (MIT).
"""
import colorsys
import datetime as dt
import json
import math
import os
import random
import urllib.request
from PIL import Image

GRID_W, GRID_H, SCALE = 240, 80, 4
T = 120                    # frames per loop
FRAME_MS = 80
CELL_W, CELL_H, HEAD_X = 60, 32, 54      # sprite cell layout (see scripts/sprites.py)
WATER = (28, 112, 128)     # ripple colour
FOAM = (196, 236, 236)     # splash rings, bubbles, sparkles
PELLET = (201, 138, 58)
PELLET_DARK = (124, 76, 30)
SHADOW = (6, 38, 46, 120)


# ------------------------------------------------------------------ colour
# One koi-friendly base colour per language (tuned to read on the teal pond). Anything not listed
# falls back to GitHub's own language colour.
LANG_PALETTE = {
    "C#": "#2fa043", "Python": "#3b7bd4", "JavaScript": "#f2c12e", "TypeScript": "#3178c6",
    "CSS": "#7a4fd1", "SCSS": "#d4559a", "HTML": "#e8562a", "C": "#6b7a8f", "C++": "#e24b7d",
    "ShaderLab": "#2ab0a8", "HLSL": "#2ab0a8", "Java": "#d08a2c", "Kotlin": "#a97bff", "Swift": "#f05138",
    "Go": "#29beb0", "Rust": "#dea584", "Shell": "#7bd043", "Jupyter Notebook": "#f37726", "Dart": "#00b4ab",
}
KOHAKU = ["#f63406", "#d3b3ed", "#eedaf5"]      # the sprite's own colours, used when there are no languages


def _hsv(hex_colour):
    h = hex_colour.lstrip("#")
    return colorsys.rgb_to_hsv(*(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)))


def _rgb(h, s, v):
    return tuple(round(c * 255) for c in colorsys.hsv_to_rgb(h % 1, max(0, min(1, s)), max(0, min(1, v))))


def recolour(img, patch, fin, sheen):
    """Swap the koi's colour classes for language colours, keeping each pixel's own light and shade."""
    ph, ps, pv = _hsv(patch)
    fh, fs, _ = _hsv(fin)
    bh, bs, _ = _hsv(sheen)
    lut = {}
    out = img.copy()
    data = list(out.get_flattened_data() if hasattr(out, "get_flattened_data") else out.getdata())
    for i, (r, g, b, a) in enumerate(data):
        if not a:
            continue
        key = (r, g, b)
        if key not in lut:
            h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            warm = h < 0.08 or h > 0.92
            if v < 0.12:                                   # eyes
                new = key
            elif warm and s_ >= 0.45:                      # patches (incl. their dark outline)
                new = _rgb(ph, ps * min(1, s_ / 0.9), min(1, max(pv, 0.55) * v / 0.96))
            elif warm:                                     # soft patch edges blending into the body
                new = _rgb(ph, ps * s_, v)
            elif s_ >= 0.17:                               # fins and tail
                new = _rgb(fh, (0.2 + 0.45 * (s_ - 0.17)) * min(1, fs / 0.5), v)   # soft, even pastel
            else:                                          # the pale body, with a faint sheen
                new = _rgb(fh if s_ > 0.09 else bh, 0.1 if s_ > 0.09 else min(0.09, bs * 0.12 + 0.02), v)
            lut[key] = new
        data[i] = lut[key] + (a,)
    out.putdata(data)
    return out


def koi_colours(langs):
    """Top three languages -> (patch, fin, sheen) colours; fewer languages reuse the top ones."""
    if not langs:
        return KOHAKU
    cols = [LANG_PALETTE.get(name, colour or "#f63406") for name, colour in langs[:3]]
    while len(cols) < 3:
        cols.append(cols[-1])
    return cols


# ------------------------------------------------------------------ data
def activity(user, token):
    def gql(q):
        req = urllib.request.Request("https://api.github.com/graphql", data=json.dumps({"query": q}).encode(),
                                     headers={"Authorization": f"bearer {token}", "User-Agent": "koi-pond"})
        body = json.loads(urllib.request.urlopen(req, timeout=60).read())
        if body.get("errors"):
            raise SystemExit(body["errors"])
        return body["data"]["user"]
    first = gql(f'{{ user(login: "{user}") {{ contributionsCollection {{ contributionYears }} '
                f'repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) {{ nodes {{ '
                f'languages(first: 10, orderBy: {{field: SIZE, direction: DESC}}) {{ edges {{ size node {{ name color }} }} }} }} }} }} }}')
    years = first["contributionsCollection"]["contributionYears"]
    size, colour = {}, {}
    for repo in first["repositories"]["nodes"]:
        for e in repo["languages"]["edges"]:
            n = e["node"]["name"]
            size[n] = size.get(n, 0) + e["size"]
            colour[n] = e["node"]["color"]
    langs = [(n, colour[n]) for n in sorted(size, key=size.get, reverse=True)]
    parts = " ".join(f'y{y}: contributionsCollection(from: "{y}-01-01T00:00:00Z", to: "{y}-12-31T23:59:59Z") '
                     f'{{ contributionCalendar {{ totalContributions }} }}' for y in years)
    per = gql(f'{{ user(login: "{user}") {{ {parts} recent: contributionsCollection {{ contributionCalendar '
              f'{{ weeks {{ contributionDays {{ date contributionCount }} }} }} }} }} }}')
    lifetime = sum(per[f"y{y}"]["contributionCalendar"]["totalContributions"] for y in years)
    days = [d for w in per["recent"]["contributionCalendar"]["weeks"] for d in w["contributionDays"]]
    today = dt.date.today()
    week = sum(d["contributionCount"] for d in days if 0 < (today - dt.date.fromisoformat(d["date"])).days <= 7)
    return lifetime, week, langs


def stage_of(lifetime):
    for limit, s, name in ((50, 0.6, "fry"), (250, 0.75, "juvenile"), (1000, 0.9, "young")):
        if lifetime < limit:
            return s, name
    return 1.0, "adult"


# ------------------------------------------------------------------ sprites
def load_frames(path, s, colours):
    sheet = recolour(Image.open(path).convert("RGBA"), *colours)
    frames = []
    for i in range(sheet.width // CELL_W):
        cell = sheet.crop((i * CELL_W, 0, (i + 1) * CELL_W, CELL_H))
        if s != 1.0:
            cell = cell.resize((max(2, round(CELL_W * s)), max(2, round(CELL_H * s))), Image.NEAREST)
        frames.append(cell)
    return frames[:4], frames[4:8]


def shadow_of(sprite):
    sh = Image.new("RGBA", sprite.size, SHADOW)
    sh.putalpha(sprite.getchannel("A").point(lambda a: SHADOW[3] if a else 0))
    return sh


def ring(img, cx, cy, r, colour):
    """A 1px pixel-art circle outline."""
    px = img.load()
    for k in range(max(8, int(2 * math.pi * r * 1.5))):
        a = 2 * math.pi * k / max(8, int(2 * math.pi * r * 1.5))
        x, y = round(cx + r * math.cos(a)), round(cy + r * math.sin(a) * 0.8)
        if 0 <= x < GRID_W and 0 <= y < GRID_H:
            px[x, y] = colour + (255,)


# ------------------------------------------------------------------ motion
X0, X1 = 74, 166            # body centre at the two ends of each pass
LOW, HIGH, R = 47, 33, 7    # swim right in the lower lane, left in the upper lane; turn radius
TURN = 0.09                 # share of the loop spent in each U-turn


def path(t):
    """(x, y, face, turn_frame): body centre, facing +1/-1 on a pass, or the U-turn frame 0..7 (None on a pass)."""
    u = (t % T) / T
    ease = lambda f: 0.75 * f + 0.25 * (0.5 - 0.5 * math.cos(math.pi * f))
    half = 0.5 - TURN
    if u < half:                                   # swim right, lower lane
        f = u / half
        return X0 + (X1 - X0) * ease(f), LOW + 2.5 * math.sin(2 * math.pi * f), 1, None
    if u < 0.5:                                    # U-turn at the right end: up and round to the upper lane
        f = (u - half) / TURN
        a = -math.pi / 2 + math.pi * f             # from below the centre, round the right side, to above it
        return X1 + R * math.cos(a), (LOW + HIGH) / 2 - R * math.sin(a) * ((LOW - HIGH) / (2 * R)), 0, min(7, int(f * 8))
    if u < 0.5 + half:                             # swim left, upper lane
        f = (u - 0.5) / half
        return X1 - (X1 - X0) * ease(f), HIGH - 2.5 * math.sin(2 * math.pi * f), -1, None
    f = (u - 0.5 - half) / TURN                    # U-turn at the left end: down and round to the lower lane
    a = math.pi / 2 + math.pi * f
    return X0 + R * math.cos(a), (LOW + HIGH) / 2 - R * math.sin(a) * ((LOW - HIGH) / (2 * R)), 0, min(7, int(f * 8)) + 8


def head_at(t, half_len):
    x, y, face, _ = path(t)
    return x + face * half_len, y


def main():
    user = os.environ.get("GH_USER", "MemeGamer")
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if os.environ.get("KOI_LIFETIME"):            # offline preview: KOI_LIFETIME=600 KOI_WEEK=5
        lifetime, week = int(os.environ["KOI_LIFETIME"]), int(os.environ.get("KOI_WEEK", "0"))
        langs = [(n.strip(), None) for n in os.environ.get("KOI_LANGS", "").split(",") if n.strip()]
    else:
        lifetime, week, langs = activity(user, token)
    patch, fin, sheen = koi_colours(langs)
    s, stage = stage_of(lifetime)
    swim, eat = load_frames("assets/koi-sprites.png", s, (patch, fin, sheen))
    tsheet = recolour(Image.open("assets/koi-turn.png").convert("RGBA"), patch, fin, sheen)
    tc = tsheet.height
    turns = [tsheet.crop((i * tc, 0, (i + 1) * tc, tc)) for i in range(tsheet.width // tc)]
    if s != 1.0:
        turns = [f.resize((max(2, round(tc * s)), max(2, round(tc * s))), Image.NEAREST) for f in turns]
    turns = turns + [f.transpose(Image.ROTATE_180) for f in turns]
    head_dx = round(HEAD_X * s)                   # head tip, measured from the cell's left edge
    cell_w, cell_h = swim[0].size
    half_len = round(23 * s)
    bg = Image.open("assets/pond.png").convert("RGBA")
    assert bg.size == (GRID_W, GRID_H), "pond.png must be the 240x80 grid"

    # food: pellets on the koi's path, half on each pass, each dropped ~2.3 s before the koi reaches it
    n = min(8, 2 + week)                          # two daily pellets, plus one per contribution this week
    hits = []
    half = 0.5 - TURN
    right = [int(T * half * (0.15 + 0.7 * (i + 1) / ((n + 1) // 2 + 1))) for i in range((n + 1) // 2)]
    left = [int(T * (0.5 + half * (0.15 + 0.7 * (i + 1) / (n // 2 + 1)))) for i in range(n // 2)]
    for th in right + left:
        hx, hy = head_at(th, half_len)
        hits.append((th, round(hx), round(hy)))
    drop = 28

    rnd = random.Random(7)
    ripples = [(rnd.randint(52, 188), rnd.randint(16, 64), rnd.randint(3, 5), rnd.random(), rnd.choice([1, 2])) for _ in range(16)]

    frames = []
    for t in range(T):
        u = t / T
        img = bg.copy()
        px = img.load()
        # water: ripple dashes sway and twinkle (integer multiples of the loop, so they repeat cleanly)
        for (x, y, ln, ph, m) in ripples:
            if math.sin(2 * math.pi * (u * m + ph)) > -0.35:
                ox = round(2 * math.sin(2 * math.pi * (u + ph)))
                for i in range(ln):
                    if 0 <= x + ox + i < GRID_W:
                        px[x + ox + i, y] = WATER + (255,)
        # food: falling splash ring, then the pellet waiting on the water
        for (th, hx, hy) in hits:
            age = (t - (th - drop)) % T
            if age < drop:
                if age < 12 and (age < 6 or age % 2 == 0):
                    ring(img, hx, hy, 1 + age * 0.55, FOAM)
                if age >= 2:
                    for dx, dy, c in ((0, 0, PELLET), (1, 0, PELLET), (0, 1, PELLET_DARK), (1, 1, PELLET_DARK)):
                        px[hx + dx, hy + dy] = c + (255,)
        # the koi
        x, y, face, turn = path(t)
        if turn is not None:                                            # a real U-turn sprite, centred on the body
            sprite = turns[turn]
            sw, sh = sprite.size
            ox, oy = round(x) - sw // 2, round(y) - sh // 2
        else:
            near = [((t - th) % T) for (th, _, _) in hits]
            eating = [d for d in near if d < 8 or d > T - 7]
            if eating:
                d = eating[0] if eating[0] < 8 else eating[0] - T      # -6 .. 7 around the bite
                sprite = eat[0 if d < -3 else 1 if d < 0 else 2 if d < 4 else 3]
            else:
                sprite = swim[(t // 3) % 4]
            if face < 0:
                sprite = sprite.transpose(Image.FLIP_LEFT_RIGHT)
            sw, sh = sprite.size
            hx_in = head_dx if face > 0 else sw - head_dx
            ox, oy = round(x + face * half_len) - hx_in, round(y) - sh // 2
        img.alpha_composite(shadow_of(sprite), dest=(max(0, ox + 2), max(0, oy + 3)), source=(max(0, -(ox + 2)), max(0, -(oy + 3))))
        img.alpha_composite(sprite, dest=(max(0, ox), max(0, oy)), source=(max(0, -ox), max(0, -oy)))
        # bubbles after each bite
        for (th, hx, hy) in hits:
            a = (t - th) % T
            if 1 <= a <= 9:
                for j, (bx, by) in enumerate(((2, -2), (4, 1), (1, 3))):
                    if a >= j * 2 and (a - j * 2) < 6:
                        rr = 1 + (a - j * 2) // 3
                        qx, qy = hx + face * (bx + a // 2), hy + by - (a // 3)
                        if 0 <= qx < GRID_W and 0 <= qy < GRID_H:
                            px[qx, qy] = FOAM + (255,)
                            if rr > 1 and 0 <= qx + 1 < GRID_W:
                                px[qx + 1, qy] = FOAM + (255,)
        frames.append(img.convert("RGB"))

    big = [f.resize((GRID_W * SCALE, GRID_H * SCALE), Image.NEAREST) for f in frames]
    # one palette for the whole loop, taken from a mosaic of frames, so nothing flickers
    mosaic = Image.new("RGB", (GRID_W, GRID_H * 4))
    for i, f in enumerate(frames[:: T // 4]):
        mosaic.paste(f, (0, GRID_H * i))
    pal = mosaic.quantize(colors=96, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    gif = [b.quantize(palette=pal, dither=Image.Dither.NONE) for b in big]
    os.makedirs("koi", exist_ok=True)
    gif[0].save("koi/pond.gif", save_all=True, append_images=gif[1:], duration=FRAME_MS, loop=0, optimize=True, disposal=1)
    print(f"koi: {stage}, colours {[n for n, _ in langs[:3]] or 'kohaku'} -> {patch} {fin} {sheen}, (lifetime {lifetime} contributions), {n} pellets from {week} contributions in the last 7 days, "
          f"{len(gif)} frames -> koi/pond.gif ({os.path.getsize('koi/pond.gif') // 1024} KB)")


if __name__ == "__main__":
    main()
