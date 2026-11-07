// Self-hosted GitHub stats card (light + dark SVG). No dependencies; Node 18+.
// GH_TOKEN=<token> GH_USER=<login> node scripts/stats.mjs   ->  assets/stats-light.svg, assets/stats-dark.svg
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const USER = process.env.GH_USER || "MemeGamer";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error("set GH_TOKEN (or GITHUB_TOKEN)");

const query = `query($login: String!) {
  user(login: $login) {
    followers { totalCount }
    createdAt
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) {
      totalCount
      nodes { stargazerCount createdAt languages(first: 10, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } } }
    }
  }
}`;
const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "profile-stats" },
  body: JSON.stringify({ query, variables: { login: USER } }),
});
const body = await res.json();
if (!res.ok || body.errors) throw new Error(JSON.stringify(body.errors || body).slice(0, 400));
const u = body.data.user;
const repos = u.repositories.nodes;
const stars = repos.reduce((a, r) => a + r.stargazerCount, 0);
const y0 = new Date(u.createdAt).getUTCFullYear(), y1 = new Date().getUTCFullYear();
const years = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i);
const perYear = years.map((y) => repos.filter((r) => new Date(r.createdAt).getUTCFullYear() === y).length);
const age = y1 - y0;
const SKIP = new Set(["ShaderLab", "HLSL", "Makefile", "Batchfile", "Dockerfile"]);
const bytes = {}, ghColour = {};
const KOI = JSON.parse(readFileSync(resolve(ROOT, "scripts", "koi-palette.json"), "utf8"));
for (const r of repos) for (const e of r.languages.edges) if (!SKIP.has(e.node.name)) { bytes[e.node.name] = (bytes[e.node.name] || 0) + e.size; ghColour[e.node.name] = e.node.color; }
const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
const langs = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, b]) => [n, (b / total) * 100, KOI.languages[n] || ghColour[n] || "#8b949e"]);

const THEME = {
  light: { fg: "#1f2328", muted: "#59636e", line: "#d1d9e0", accent: "#c4511f" },
  dark: { fg: "#f0f6fc", muted: "#9198a1", line: "#3d444d", accent: "#f0883e" },
};
const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;
const W = 1200, H = 262;
const fmt = (n) => n.toLocaleString("en-US");
const today = new Date().toISOString().slice(0, 10);

function card(t) {
  const c = THEME[t];
  const o = [];
  // four numbers
  const nums = [[age, "years on GitHub"], [u.repositories.totalCount, "public repositories"], [stars, "stars"], [u.followers.totalCount, "followers"]];
  nums.forEach(([v, label], i) => {
    const x = 40 + (i % 2) * 190, y = 70 + Math.floor(i / 2) * 92;
    o.push(`<text x="${x}" y="${y}" font-size="46" font-weight="700" fill="${c.fg}" letter-spacing="-1">${fmt(v)}</text>`);
    o.push(`<text x="${x}" y="${y + 26}" font-size="17" fill="${c.muted}">${label}</text>`);
  });
  // new repositories per year, as one hairline (the accent), with year ticks on a baseline
  const gx = 440, gw = 360, gy = 40, gh = 150, max = Math.max(1, ...perYear);
  const pts = perYear.map((v, i) => [gx + (i / Math.max(1, perYear.length - 1)) * gw, gy + gh - (v / max) * (gh - 10)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  o.push(`<line x1="${gx}" y1="${gy + gh}" x2="${gx + gw}" y2="${gy + gh}" stroke="${c.line}"/>`);
  pts.forEach(([x], i) => {
    o.push(`<line x1="${x.toFixed(1)}" y1="${gy + gh}" x2="${x.toFixed(1)}" y2="${gy + gh + 5}" stroke="${c.line}"/>`);
    if (i % 2 === 0 || i === pts.length - 1) o.push(`<text x="${x.toFixed(1)}" y="${gy + gh + 22}" font-size="14" fill="${c.muted}" text-anchor="middle">${years[i]}</text>`);
  });
  o.push(`<path d="${d}" fill="none" stroke="${c.accent}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`);
  pts.forEach(([x, y], i) => { if (perYear[i]) o.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="${c.accent}"/>`); });
  o.push(`<text x="${gx}" y="${gy - 14}" font-size="16" fill="${c.muted}">new public repositories per year</text>`);
  // languages: name + share, a single thin rule split by share (no filled track)
  const lx = 850, lw = 310;
  let cx = lx;
  langs.forEach(([, p, col]) => {
    const w = Math.max(3, (p / 100) * lw - 3);
    o.push(`<line x1="${cx.toFixed(1)}" y1="44" x2="${(cx + w).toFixed(1)}" y2="44" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`);
    cx += w + 4;
  });
  langs.forEach(([n, p, col], i) => {
    const y = 82 + i * 28;
    o.push(`<rect x="${lx}" y="${y - 13}" width="14" height="14" rx="3" fill="${col}"/>`);
    o.push(`<text x="${lx + 22}" y="${y}" font-size="18" fill="${c.fg}">${n}</text>`);
    if (i < 3) o.push(`<text x="${lx + 140}" y="${y}" font-size="14" fill="${c.muted}">koi ${KOI.roles[i]}</text>`);
    o.push(`<text x="${lx + lw}" y="${y}" font-size="18" fill="${c.muted}" text-anchor="end">${p.toFixed(1)}%</text>`);
  });
  o.push(`<text x="${lx}" y="${gy + gh + 26}" font-size="15" fill="${c.muted}">koi colour per language, updated ${today}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub stats for ${USER}">
<title>GitHub stats for ${USER}</title>
<g font-family="${FONT}">${o.join("\n")}</g>
</svg>`;
}

for (const t of ["light", "dark"]) writeFileSync(resolve(ROOT, "assets", `stats-${t}.svg`), card(t));
console.log(`stats: ${age} years, per-year ${perYear.join("/")}, ${u.repositories.totalCount} repos, ${stars} stars, langs ${langs.map((l) => l[0]).join(",")}`);
