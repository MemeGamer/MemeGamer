// Profile hero: name on the left, an isometric "spatial computing bench" on the right (anatomy kit).
// node hero.mjs  ->  ../assets/hero-light.svg, ../assets/hero-dark.svg
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = process.env.ANATOMY_KIT || join(homedir(), ".claude", "skills", "anatomy");
const k = await import(pathToFileURL(join(KIT, "kit", "iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(KIT, "kit", "lathe.mjs")).href);
const T = await import(pathToFileURL(join(KIT, "kit", "tube.mjs")).href);

const FW = 700, FH = 440;                          // figure viewport
const PLATE = { x: -170, y: -95, w: 340, d: 190, r: 10 };
const PH = 9, FOOT = 5;
const TT = [70, -10];                               // turntable centre
const TT_R = 46, TT_TOP = 10;
const P = k.fitProjection([...k.boxCorners(PLATE, -PH - FOOT, 0), [TT[0], TT[1], 150], [-120, -96, 76], [TT[0] - 46, TT[1] + 46, 150], [TT[0] + 46, TT[1] - 46, 150]], FW, FH, { pad: 18, azimuth: 38 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const seg = (a, b) => k.segment(a, b, P);
const depth = (p) => k.depthOf(p, P);
const byDepth = (pts) => [...pts].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));

function bench() {
  const o = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PH - FOOT, PH, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    o.push(S(k.cylinder(x, y, 8, -PH - FOOT, 1.6, P, 24), { tone: "lo" }));
    o.push(S(k.cylinder(x, y, 6.2, -PH - FOOT + 1.6, FOOT - 1.6, P, 24), { tone: "mid" }));
  }
  o.push(S(k.slabOf(PLATE, -PH, PH, P, 8, 1.4), { tone: "mid", inner: L(k.sideSeam(PLATE, -PH / 2, P, 8), { tone: "faint" }) }));
  o.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" }));
  const sc = k.corners(PLATE, 11);
  o.push(L(sc.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 14)).join(""), { tone: "lo" }), D(sc.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: PLATE.x + 16, y: PLATE.y + PLATE.d - 15, w: 300, d: 7, r: 1 };
  o.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 5, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return o.join("");
}

// ---- headset on a display stand (back-left)
function headset() {
  const o = [];
  const base = { x: -150, y: -78, w: 56, d: 44, r: 6 };
  o.push(S(k.slabOf(base, 0, 4, P, 6, 0.6), { tone: "mid" }));
  o.push(S(k.cylinder(-122, -56, 3, 4, 26, P, 16), { tone: "mid", crease: "none" }));
  o.push(L(k.sideArc(-122, -56, 3, 24, P, 10), { tone: "faint" }));
  o.push(S(k.slabOf({ x: -134, y: -64, w: 24, d: 16, r: 4 }, 30, 3, P, 4, 0.5), { tone: "mid" })); // saddle
  // visor body (front faces +y), strap, lenses on the inner (−y) side are hidden; front shows a sensor band
  const body = { x: -150, y: -70, w: 56, d: 26, r: 9 };
  o.push(S(k.slabOf(body, 33, 24, P, 8, 1), { tone: "hi", crease: "lo", inner: L(k.sideSeam(body, 60, P, 8), { tone: "faint" }) }));
  const band = { x: -146, y: -45.6, w: 48, d: 1.2, r: 0.6 };
  o.push(S(k.slabOf(band, 44, 7, P, 2), { tone: "lo", crease: "none" }));
  for (const x of [-140, -104]) o.push(S(G.disc(0, 1.2, 2.2, G.frameAlong([x, -44.4, 47.5], [0, 1, 0]), P), { tone: "mid" })); // tracking cameras
  // head strap arcing back over the top
  const strap = [[-150, -58, 50], [-156, -70, 64], [-122, -96, 72], [-88, -70, 64], [-94, -58, 50]];
  o.push(T.tubePieces(G.fillet(strap, 10, 8), 2.4, P, { maxLength: 400 }).map((pc) => T.tubeSvg(pc, { tone: "mid" })).join(""));
  return o.join("");
}

// ---- dev board with a sensor (front-left)
function board() {
  const o = [];
  const pcb = { x: -150, y: 20, w: 70, d: 46, r: 2 };
  for (const [x, y] of [[pcb.x + 5, pcb.y + 5], [pcb.x + pcb.w - 5, pcb.y + 5], [pcb.x + 5, pcb.y + pcb.d - 5], [pcb.x + pcb.w - 5, pcb.y + pcb.d - 5]]) o.push(S(k.cylinder(x, y, 2.2, 0, 4, P, 12), { tone: "mid" }));
  o.push(S(k.slabOf(pcb, 4, 1.6, P, 3, 0.4), { tone: "mid" }));
  o.push(S(k.slabOf({ x: -128, y: 34, w: 16, d: 16, r: 1 }, 5.6, 2, P, 2, 0.3), { tone: "lo" })); // chip
  const pins = [];
  for (let i = 0; i < 12; i++) pins.push(at([pcb.x + 8 + i * 4.8, pcb.y + 3.5, 5.6]), at([pcb.x + 8 + i * 4.8, pcb.y + pcb.d - 3.5, 5.6]));
  o.push(S(k.slabOf({ x: pcb.x + 5, y: pcb.y + 1.5, w: 60, d: 4, r: 0.6 }, 5.6, 2.4, P, 2), { tone: "lo", crease: "none" }));
  o.push(D(pins.slice(1).filter((_, i) => i % 2 === 0), { size: 0.45 }));
  o.push(S(k.cylinder(-96, 44, 6, 5.6, 7, P, 22, 0.4), { tone: "mid" })); // sensor can
  o.push(L(k.ring(-96, 44, 3.4, 12.6, P, 18), { tone: "lo" }));
  o.push(S(k.slabOf({ x: pcb.x + pcb.w - 2, y: 36, w: 8, d: 12, r: 1 }, 5.6, 4, P, 2), { tone: "mid" })); // usb port
  return o.join("");
}

// ---- tripod camera aimed at the turntable
const CAM = [-20, 50, 64];
function camera() {
  const o = [];
  for (const a of [0, 2.1, 4.2]) {
    const foot = [CAM[0] + Math.cos(a) * 26, CAM[1] + Math.sin(a) * 26, 0];
    const d = G.sub3(foot, [CAM[0], CAM[1], CAM[2] - 8]);
    o.push(S(G.disc(0, G.len3(d), 1.4, G.frameAlong([CAM[0], CAM[1], CAM[2] - 8], G.unit3(d)), P), { tone: "mid" }));
  }
  o.push(S(k.cylinder(CAM[0], CAM[1], 4, CAM[2] - 10, 4, P, 16), { tone: "mid" }));
  const body = { x: CAM[0] - 12, y: CAM[1] - 9, w: 24, d: 18, r: 3 };
  o.push(S(k.slabOf(body, CAM[2] - 6, 14, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(body, CAM[2] + 3, P, 4), { tone: "faint" }) }));
  const aim = G.unit3(G.sub3([TT[0], TT[1], 60], CAM));
  const F = G.frameAlong([CAM[0] + aim[0] * 10, CAM[1] + aim[1] * 10, CAM[2] + 1], aim);
  o.push(S(G.disc(0, 6, 6.5, F, P), { tone: "mid" }));
  o.push(L(G.ribsOf(F, 0, 6, 6.5, 22, P, { seams: true }), { tone: "lo" }));
  o.push(S(G.disc(6, 8, 5, F, P), { tone: "hi" }));
  return o.join("");
}

// ---- turntable with a mannequin, its pose skeleton lit
function turntable() {
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: TT[0] - TT_R, y: TT[1] - TT_R, w: TT_R * 2, d: TT_R * 2, r: TT_R }, 0, 0.1, P)}"/>`];
  o.push(S(k.cylinder(TT[0], TT[1], TT_R, 0, 5, P, 72, 0.6), { tone: "mid" }));
  o.push(S(k.cylinder(TT[0], TT[1], TT_R - 3, 5, TT_TOP - 5, P, 72, 0.8), { tone: "mid" }));
  const ticks = k.radialTicks(TT[0], TT[1], TT_R - 5, 48, 6, TT_TOP, [1.6, 3.2], P);
  o.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // mannequin, T-pose, facing +y (toward the camera side of the bench)
  const z0 = TT_TOP, AZ = 38 * Math.PI / 180;
  const A = [-Math.sin(AZ), Math.cos(AZ)], V = [Math.cos(AZ), Math.sin(AZ)];
  const pt = (side, h) => [TT[0] + A[0] * side, TT[1] + A[1] * side, z0 + h];
  const J = {
    pelvis: pt(0, 62), chest: pt(0, 92), neck: pt(0, 104), head: pt(0, 118),
    lsh: pt(16, 100), rsh: pt(-16, 100), lel: pt(38, 100), rel: pt(-38, 100), lwr: pt(58, 100), rwr: pt(-58, 100),
    lhip: pt(9, 60), rhip: pt(-9, 60), lkn: pt(11, 32), rkn: pt(-11, 32), lan: pt(12, 5), ran: pt(-12, 5),
  };
  const rod = (a, b, r) => S(G.disc(0, G.len3(G.sub3(b, a)), r, G.frameAlong(a, G.unit3(G.sub3(b, a))), P), { tone: "hi", crease: "none" });
  // far limbs first, then torso, then near limbs (which side is nearer is decided by depth)
  const nearL = depth(J.lwr) > depth(J.rwr);
  const [fh, fa, nh, na] = nearL ? [[J.rhip, J.ran], [J.rsh, J.rwr], [J.lhip, J.lan], [J.lsh, J.lwr]] : [[J.lhip, J.lan], [J.lsh, J.lwr], [J.rhip, J.ran], [J.rsh, J.rwr]];
  const ball = (p, r) => S(G.sphereOf(p, r, P), { tone: "hi" });
  const farSide = nearL ? "r" : "l", nearSide = nearL ? "l" : "r";
  const balls = (sd) => [ball(J[sd + "kn"], 5.8), ball(J[sd + "el"], 4.8), ball(J[sd + "wr"], 5.6), ball(J[sd + "sh"], 6.2)];
  o.push(rod(fh[0], fh[1], 5.2), rod(fa[0], fa[1], 4.2), ...balls(farSide));
  o.push(S(G.solidOf([[0, 9], [10, 12, 1], [30, 15, 1], [42, 11]], G.frameAlong(J.pelvis, [0, 0, 1]), P), { tone: "hi" }));
  o.push(S(G.disc(0, 6, 4, G.frameAlong(pt(0, 102), [0, 0, 1]), P), { tone: "hi" }));
  o.push(S(G.sphereOf(J.head, 9.5, P), { tone: "hi" }));
  o.push(rod(nh[0], nh[1], 5.2), rod(na[0], na[1], 4.2), ...balls(nearSide));
  for (const f of [J.lan, J.ran]) o.push(S(k.slabOf({ x: f[0] - 4, y: f[1] - 3, w: 8, d: 13, r: 2 }, z0, 3.5, P, 3), { tone: "hi" }));
  // the lit pose skeleton, drawn over the body (what the camera reads)
  const bones = [["head", "neck"], ["neck", "chest"], ["chest", "pelvis"], ["lsh", "rsh"], ["lsh", "lel"], ["lel", "lwr"], ["rsh", "rel"], ["rel", "rwr"],
    ["lhip", "rhip"], ["lhip", "lkn"], ["lkn", "lan"], ["rhip", "rkn"], ["rkn", "ran"]];
  const front = (p) => [p[0] + V[0] * 9, p[1] + V[1] * 9, p[2]];
  o.push(L(bones.map(([a, b]) => seg(front(J[a]), front(J[b]))).join(""), { tone: "lit" }));
  o.push(D(Object.values(J).map((p) => at(front(p))), { size: 1.1, tone: "hi" }));
  return o.join("");
}

function cable() {
  const route = G.fillet([[-80, 42, 7.6], [-60, 42, 4], [-40, 48, 4], [CAM[0] - 6, CAM[1] - 2, 4], [CAM[0] - 6, CAM[1] - 2, CAM[2] - 10]], 6, 8, { P, tube: 1.6 });
  return T.tubePieces(route, 1.6, P, { maxLength: 400, caps: [true, false] }).map((pc) => T.tubeSvg(pc, { tone: "mid" })).join("");
}

function figure(theme) {
  return k.figureSvg({
    width: FW, height: FH, standalone: theme,
    label: "A spatial computing bench: an XR headset on a display stand, a dev board with a sensor wired to a tripod camera, and a mannequin on a turntable whose pose skeleton the camera reads.",
    body: [bench(), headset(), board(), cable(), camera(), turntable()],
  });
}

const TEXT = {
  light: { fg: "#1f2328", muted: "#59636e", accent: "#c4511f" },
  dark: { fg: "#f0f6fc", muted: "#9198a1", accent: "#f0883e" },
};
const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;
for (const theme of ["light", "dark"]) {
  const c = TEXT[theme];
  const fig = figure(theme).replace("<svg", `<svg x="500" y="0" width="${FW}" height="${FH}"`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="440" viewBox="0 0 1200 440" role="img" aria-label="Varun VP, spatial computing and XR developer">
<title>Varun VP: spatial computing and XR developer</title>
<g font-family="${FONT}">
  <text x="40" y="168" font-size="64" font-weight="700" fill="${c.fg}" letter-spacing="-1.5">Varun VP</text>
  <rect x="42" y="196" width="44" height="3" rx="1.5" fill="${c.accent}"/>
  <text x="40" y="244" font-size="26" font-weight="600" fill="${c.fg}">Spatial computing &amp; XR developer</text>
  <text x="40" y="284" font-size="19" fill="${c.muted}">Unity, WebXR, computer vision and 3D tools.</text>
  <text x="40" y="312" font-size="19" fill="${c.muted}">I build immersive apps and the AI tooling behind them.</text>
</g>
${fig}
</svg>`;
  const out = resolve(HERE, "..", "assets", `hero-${theme}.svg`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svg);
  console.log("wrote", out, (svg.length / 1024).toFixed(0) + " KB");
}
