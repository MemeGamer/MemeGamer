// Tech-stack panel: grouped chips with Simple Icons (CC0) marks, light + dark. node stack.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GROUPS = [
  ["XR & 3D", [["unity", "Unity"], ["meta", "Meta Quest"], [null, "WebXR"], ["blender", "Blender"]]],
  ["Languages", [[null, "C#"], ["cplusplus", "C++"], ["c", "C"], ["python", "Python"], ["javascript", "JavaScript"]]],
  ["AI & vision", [["mediapipe", "MediaPipe"], ["opencv", "OpenCV"], ["tensorflow", "TensorFlow"]]],
  ["Web & cloud", [["html5", "HTML"], ["css", "CSS"], ["dotnet", ".NET"], ["firebase", "Firebase"], ["googlecloud", "Google Cloud"], [null, "AWS"], ["netlify", "Netlify"], ["mysql", "MySQL"]]],
  ["Design", [["figma", "Figma"], [null, "Photoshop"], [null, "Illustrator"], [null, "After Effects"], [null, "Premiere Pro"]]],
  ["Hardware", [["arduino", "Arduino"], ["espressif", "Espressif"]]],
];
const THEME = {
  light: { fg: "#1f2328", muted: "#59636e", line: "#d1d9e0", chip: "#ffffff", icon: "#3d444d" },
  dark: { fg: "#f0f6fc", muted: "#9198a1", line: "#3d444d", chip: "#0d1117", icon: "#c9d1d9" },
};
const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;
const W = 860, LABEL = 150, PAD = 20, GAP = 10, CH = 36, ROWGAP = 14;
const textW = (s) => [...s].reduce((a, ch) => a + (/[A-Z#+&]/.test(ch) ? 9.2 : ch === " " ? 4.2 : /[il.]/.test(ch) ? 4 : 7.6), 0);
const pathOf = (slug) => {
  const f = join(HERE, "icons", `${slug}.svg`);
  if (!slug || !existsSync(f)) return null;
  return /<path d="([^"]+)"/.exec(readFileSync(f, "utf8"))[1];
};
const esc = (s) => s.replace(/&/g, "&amp;");

for (const theme of ["light", "dark"]) {
  const c = THEME[theme];
  const out = [];
  let y = 24;
  for (const [label, items] of GROUPS) {
    let x = PAD + LABEL, rowY = y;
    out.push(`<text x="${PAD}" y="${rowY + CH / 2 + 5}" font-size="15" font-weight="600" fill="${c.fg}">${esc(label)}</text>`);
    for (const [slug, name] of items) {
      const d = pathOf(slug);
      const w = Math.round((d ? 40 : 18) + textW(name) + 16);
      if (x + w > W - PAD) { x = PAD + LABEL; rowY += CH + GAP; }
      out.push(`<g transform="translate(${x} ${rowY})"><rect width="${w}" height="${CH}" rx="8" fill="${c.chip}" stroke="${c.line}"/>` +
        (d ? `<svg x="12" y="9" width="18" height="18" viewBox="0 0 24 24"><path d="${d}" fill="${c.icon}"/></svg>` : "") +
        `<text x="${d ? 38 : 16}" y="${CH / 2 + 5}" font-size="14" fill="${c.fg}">${esc(name)}</text></g>`);
      x += w + GAP;
    }
    y = rowY + CH + ROWGAP;
    out.push(`<line x1="${PAD}" y1="${y - ROWGAP / 2}" x2="${W - PAD}" y2="${y - ROWGAP / 2}" stroke="${c.line}" stroke-width="1" opacity="${label === "Hardware" ? 0 : 0.6}"/>`);
  }
  const H = y + 6;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tech stack">
<title>Tech stack</title>
<g font-family="${FONT}">${out.join("\n")}</g>
</svg>`;
  writeFileSync(resolve(HERE, "..", "assets", `stack-${theme}.svg`), svg);
  console.log(theme, H, (svg.length / 1024).toFixed(1) + " KB");
}
