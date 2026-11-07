/**
 * Rack: six game cartridges standing in a slotted dock, one per part of a
 * developer's stack. The cartridge under the pointer lifts straight up out of
 * its slot and stands upright; the ones behind tip back and the ones in front
 * tip forward, staggered outwards from it on the 700ms lift curve. Each one's
 * place is punched as a dot code along its top edge, and its area goes to the
 * read-out. At rest the row fans from a deep lean at the back to a slight one
 * at the front, with the first cartridge's code lit. The slider is the stagger.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, proj, rad, ringAt, rrect, run, seg,
  tdone, tset, tval, tween, disposer, mk, place, pointer, reflect, register,
} = HL;

const N = 6, W = 58, H = 66, G = 16, TK = 2.2;
const AREAS = ["xr", "3d", "vision", "web", "cloud", "iot"];
const BACK = -22, FWD = 16, LIFT = 20;
const REST = (i) => -15 + i * 2.2;                       // the fan: deep lean at the back, slight at the front
const X0 = -6, X1 = W + 6, Y0 = -10, Y1 = (N - 1) * G + 10, WH = 16, WR = 5, WT = 2.6;

const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** The dock, which never moves: `far` is painted before the cartridges, `near` after them. */
function dock(P, front, outer, inner) {
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil"],
    [poly(ringAt(P, inner, WH)), "nf"],
    [open(ringAt(P, run(inner, (q) => !front(q)), 3)), "nf lo"],
  ];
  // the slot rails across the floor, one between each pair of cartridges
  for (let i = 1; i < N; i++) far.push([seg(P(X0 + WT + 1, i * G - G / 2, 3), P(X1 - WT - 1, i * G - G / 2, 3)), "nf lo"]);
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  const onFront = (ring) => ring.map((q) => P(q.u, Y1, q.v));
  const hx = (X0 + X1) / 2;
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
    [open(oT), "nf lo"],
    [open(iF), "nf"],
    [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
    // an eject button set into the front face
    [poly(onFront(rrect(hx - 9, 5, hx + 9, 11, 2.6, 5))), "nf"],
    [poly(onFront(rrect(hx - 7.4, 6.4, hx + 7.4, 9.6, 1.4, 5))), "nf lo"],
  ];
  return { far, near };
}

/** A cartridge's outline in its own plane: a chamfered top corner and a contact edge at the foot. */
const SHAPE = fillet(
  [[0, 0], [W, 0], [W, H - 12], [W - 12, H], [0, H]],
  [1, 1, 2.4, 2.4, 3.2],
);

/** Cartridge i leaning th degrees (negative leans back) and lifted by `lift`. */
function pose(P, i, th, lift) {
  const yb = i * G, s = Math.sin(rad(th)), c = Math.cos(rad(th));
  const w = (u, v) => P(u, yb + v * s, v * c + lift);
  const wb = (u, v) => P(u, yb + v * s - TK * c, v * c + TK * s + lift);
  const dots = [];
  for (let k = 0; k < N; k++) dots.push(w(7 + k * 4.2, H - 5));
  const label = poly(rrect(7, 9, W - 7, H - 22, 2.2, 4).map((q) => w(q.u, q.v)));
  return {
    back: poly(SHAPE.map((p) => wb(p[0], p[1]))),
    face: poly(SHAPE.map((p) => w(p[0], p[1]))),
    label,
    rules: [18, 24, 30].map((v) => seg(w(13, v), w(W - 13 - (v === 30 ? 14 : 0), v))).join(""),
    grip: [W - 24, W - 20, W - 16].map((u) => seg(w(u, H - 15), w(u, H - 19))).join(""),
    dots,
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.72);
  fit(C, [[X0, Y0, 0], [X1, Y1, -8], [X1, Y0, 0], [X0, Y1, 0], [X0, Y0, H + LIFT], [X1, Y1, H + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);
  const paths = dock(P, front, outer, inner);

  const g = mk("g", {}, svg);
  reflect(svg, g, P, front, outer, 0, 12);
  for (const [d, cls] of paths.far) mk("path", { d, class: cls }, g);

  const carts = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, g);
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp);
    const label = mk("path", { class: "nf lo" }, grp), rules = mk("path", { class: "nf lo" }, grp), grip = mk("path", { class: "nf" }, grp);
    const dots = [];
    for (let k = 0; k < N; k++) dots.push(mk("circle", { r: 1.05, class: "dot " + (k === i ? "m" : "off") }, grp));
    carts.push({ back, face, label, rules, grip, dots, a: tween(REST(i)), z: tween(0) });
  }
  for (const [d, cls] of paths.near) mk("path", { d, class: cls }, g);

  // hit bands along the RESTING top edges: they never move, and nothing draws them
  const top = (i) => P(W / 2, i * G + H * Math.sin(rad(REST(i))), H * Math.cos(rad(REST(i))));
  const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];
  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (d[0] * qy - d[1] * qx) / det;
    if (Math.abs(r) > HALF || s < -0.5 || s > N + 0.5) return -1;
    return clamp(Math.round(s), 0, N - 1);
  }

  function draw(i, th, lift) {
    const cd = carts[i], q = pose(P, i, th, lift);
    cd.back.setAttribute("d", q.back);
    cd.face.setAttribute("d", q.face);
    cd.label.setAttribute("d", q.label);
    cd.rules.setAttribute("d", q.rules);
    cd.grip.setAttribute("d", q.grip);
    cd.dots.forEach((el, k) => place(el, q.dots[k]));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    carts.forEach((cd, i) => { draw(i, tval(cd.a, now), tval(cd.z, now)); if (!tdone(cd.a, now) || !tdone(cd.z, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  // at rest the first cartridge's code is lit: where the eye starts
  carts[0].dots[0].classList.replace("m", "dot");
  let act = -1;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    carts.forEach((cd, i) => {
      const delay = Math.abs(i - from) * stag;
      const th = a < 0 ? REST(i) : i < a ? BACK : i > a ? FWD : 0;
      tset(cd.a, th, now, delay); tset(cd.z, a === i ? LIFT : 0, now, delay);
      cd.face.classList.toggle("hi", i === a);
      cd.grip.classList.toggle("hi", i === a);
      cd.dots[i].setAttribute("class", "dot " + (i === a || (a < 0 && i === 0) ? "" : "m"));
    });
    read.textContent = a < 0 ? "rest" : AREAS[a];
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "rack",
  means: "Six cartridges in a dock, one per part of the stack: the one under the pointer lifts out, its neighbours tip away in turn.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[150, 150], [205, 140], [265, 150], null],
  mount,
});
