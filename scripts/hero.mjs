// Profile hero: name and role on the left, the bench illustration (assets/src/hero-<theme>.jpg) on the right.
// node scripts/hero.mjs  ->  assets/hero-light.svg, assets/hero-dark.svg (images embedded, so GitHub can show them)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEXT = {
  light: { fg: "#1f2328", muted: "#59636e", accent: "#c4511f" },
  dark: { fg: "#f0f6fc", muted: "#9198a1", accent: "#f0883e" },
};
const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;
const W = 1200, H = 450, IW = 680, IH = Math.round(IW / 1.6);
for (const theme of ["light", "dark"]) {
  const c = TEXT[theme];
  const b64 = readFileSync(resolve(ROOT, "assets", "src", `hero-${theme}.jpg`)).toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Varun VP, spatial computing and XR developer">
<title>Varun VP: spatial computing and XR developer</title>
<image x="${W - IW}" y="${(H - IH) / 2}" width="${IW}" height="${IH}" href="data:image/jpeg;base64,${b64}" xlink:href="data:image/jpeg;base64,${b64}"/>
<g font-family="${FONT}">
  <text x="40" y="178" font-size="64" font-weight="700" fill="${c.fg}" letter-spacing="-1.5">Varun VP</text>
  <rect x="42" y="206" width="44" height="3" rx="1.5" fill="${c.accent}"/>
  <text x="40" y="254" font-size="26" font-weight="600" fill="${c.fg}">Spatial computing &amp; XR developer</text>
  <text x="40" y="294" font-size="19" fill="${c.muted}">Unity, WebXR, computer vision and 3D tools.</text>
  <text x="40" y="322" font-size="19" fill="${c.muted}">I build immersive apps and the AI tooling behind them.</text>
</g>
</svg>`;
  writeFileSync(resolve(ROOT, "assets", `hero-${theme}.svg`), svg);
  console.log(theme, (svg.length / 1024).toFixed(0) + " KB");
}
