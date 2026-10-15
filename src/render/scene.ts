import * as PIXI from "pixi.js";
import { REELS, ROWS, SYM } from "../game/symbols";
import { tex } from "./assets";

const stageEl = document.getElementById("stage")!;
export const app = new PIXI.Application({resizeTo: stageEl, backgroundAlpha: 0, antialias: false, resolution: Math.min(devicePixelRatio, 2), autoDensity: true});
stageEl.prepend(app.view as HTMLCanvasElement);

const root = new PIXI.Container(); app.stage.addChild(root);
const panel = new PIXI.Graphics(); root.addChild(panel);
const spotLayer = new PIXI.Container(); root.addChild(spotLayer);
export const symLayer = new PIXI.Container(); root.addChild(symLayer);
const badgeLayer = new PIXI.Container(); root.addChild(badgeLayer);
export const fxLayer = new PIXI.Container(); root.addChild(fxLayer);
const mask = new PIXI.Graphics(); root.addChild(mask); symLayer.mask = mask;
let frameSprite: PIXI.Sprite | null = null;
// ui/frame.png: яку частку картинки з кожного боку займають дошки (виміряно по прозорій дірці PNG)
const FRAME_HOLE = {l: .12, t: .16, r: .12, b: .158};

export type Sym = PIXI.Container & {code: string};
export let cell = 80, ox = 0, oy = 0;

/* ---------------- стан поля ---------------- */
const grid = <T>(v: T): T[][] => Array.from({length: REELS}, () => Array<T>(ROWS).fill(v));
export const board = grid("L4");
export const sprites = grid<Sym | null>(null);
export const mark = grid(false);
export const mult = grid(0);
export const spots = grid<PIXI.Container | null>(null);
export const badges = grid<PIXI.Container | null>(null);

/* ---------------- «кривий» контур: запасний малюнок, поки нема PNG ---------------- */
function rand(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function roughRect(g: PIXI.Graphics, x: number, y: number, w: number, h: number, j: number, seed: number) {
  const r = rand(seed), pts: number[] = [], step = Math.max(24, w / 18);
  const jit = () => (r() - .5) * 2 * j;
  for (let px = x; px < x + w; px += step) pts.push(px + jit() * .3, y + jit());
  for (let py = y; py < y + h; py += step) pts.push(x + w + jit(), py + jit() * .3);
  for (let px = x + w; px > x; px -= step) pts.push(px + jit() * .3, y + h + jit());
  for (let py = y + h; py > y; py -= step) pts.push(x + jit(), py + jit() * .3);
  g.drawPolygon(pts);
}
function wobble(g: PIXI.Graphics, cx: number, cy: number, rx: number, ry: number, seed: number, n = 14, amp = .09) {
  const r = rand(seed), pts: number[] = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + (r() - .5) * 2 * amp; pts.push(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k); }
  g.drawPolygon(pts);
}
// PNG-слот, якщо файл є: спрайт по центру, вписаний у w×h
function slot(key: string, w: number, h: number) {
  const t = tex(key);
  if (!t) return null;
  const s = new PIXI.Sprite(t); s.anchor.set(.5); s.width = w; s.height = h; return s;
}

function drawSymbolFallback(code: string): Sym {
  const d = SYM[code], c = new PIXI.Container() as Sym, g = new PIXI.Graphics(), s = cell * .42;
  const seed = code.charCodeAt(0) * 31 + (code.charCodeAt(1) || 0);
  g.lineStyle(Math.max(2, cell * .04), 0x17120d, 1);
  g.beginFill(d.color);
  if (d.shape === "fish") { wobble(g, -s * .12, 0, s * .78, s * .48, seed); g.endFill(); g.beginFill(d.color); g.drawPolygon([s * .55, 0, s * .95, -s * .42, s * .92, s * .4]); }
  else if (d.shape === "eel") { wobble(g, 0, 0, s * .95, s * .3, seed, 18, .14); }
  else if (d.shape === "claw") { wobble(g, 0, s * .1, s * .55, s * .6, seed); g.endFill(); g.beginFill(d.color); wobble(g, -s * .45, -s * .55, s * .28, s * .22, seed + 3); wobble(g, s * .45, -s * .55, s * .28, s * .22, seed + 5); }
  else if (d.shape === "can") { g.drawRoundedRect(-s * .45, -s * .75, s * .9, s * 1.5, s * .18); }
  else if (d.shape === "esky") { g.drawRoundedRect(-s * .9, -s * .55, s * 1.8, s * 1.2, s * .12); g.endFill(); g.beginFill(0xf1e7cb); g.drawRoundedRect(-s * .95, -s * .8, s * 1.9, s * .36, s * .1); }
  else { wobble(g, 0, 0, s * .75, s * .62, seed, 12, .16); }
  g.endFill();
  if (d.shape === "fish") { g.beginFill(0x17120d); g.drawCircle(-s * .55, -s * .1, Math.max(2, s * .08)); g.endFill(); }
  c.addChild(g);
  const t = new PIXI.Text(d.name, {fontFamily: "Patrick Hand", fontSize: Math.max(11, cell * .19), fill: 0xf1e7cb, stroke: 0x17120d, strokeThickness: Math.max(2, cell * .05)});
  t.anchor.set(.5); t.y = s * .88; c.addChild(t);
  c.code = code; return c;
}
export function makeSymbol(code: string): Sym {
  const s = slot(`symbols/${code}`, cell * .94, cell * .94);
  if (!s) return drawSymbolFallback(code);
  const c = new PIXI.Container() as Sym; c.addChild(s); c.code = code; return c;
}
// очі буньїпа для «укусу»
export function makeEyes() {
  const s = slot("ui/bunyip_eyes", cell * .7, cell * .35);
  if (s) return s;
  const eyes = new PIXI.Graphics(); eyes.lineStyle(3, 0x17120d);
  for (const dx of [-1, 1]) { eyes.beginFill(0xf1e7cb); wobble(eyes, dx * cell * .2, 0, cell * .15, cell * .11, dx + 9, 10, .12); eyes.endFill(); eyes.beginFill(0x17120d); eyes.drawCircle(dx * cell * .2 + cell * .03, cell * .02, cell * .05); eyes.endFill(); }
  return eyes;
}

export const pos = (r: number, c: number) => ({x: ox + r * cell + cell / 2, y: oy + c * cell + cell / 2});

/* ---------------- розкладка ---------------- */
function placeMascots(narrow: boolean, side: number, band: number, H: number) {
  const d = document.getElementById("dazza")!, k = document.getElementById("kev")!;
  let w: number, top: string, bottom: string, edge: number;
  if (!narrow) { w = Math.round(Math.min(side - cell * .12 - 30, H * .62, 320)); edge = 12; top = "auto"; bottom = "0px"; }
  else { w = Math.round(band / 1.3); edge = 8; top = "0px"; bottom = "auto"; }
  for (const el of [d, k]) {
    el.classList.toggle("top", narrow);
    el.style.width = w + "px"; el.style.top = top; el.style.bottom = bottom;
  }
  d.style.left = edge + "px"; d.style.right = "auto";
  k.style.right = edge + "px"; k.style.left = "auto";
}
export function layout() {
  const W = app.screen.width, H = app.screen.height;
  const wide = W / H > 1.25;
  let band = 0;
  // з PNG-рамкою поле менше: запас під товщину дошок, у клітинках (поле + 0.24 клітинки — це дірка рамки)
  const hasFrame = !!tex("ui/frame");
  const exW = hasFrame ? (REELS + .24) * (FRAME_HOLE.l + FRAME_HOLE.r) / (1 - FRAME_HOLE.l - FRAME_HOLE.r) : 0;
  const exH = hasFrame ? (ROWS + .24) * (FRAME_HOLE.t + FRAME_HOLE.b) / (1 - FRAME_HOLE.t - FRAME_HOLE.b) : 0;
  if (wide) cell = Math.floor(Math.min(W * .62 / REELS, (H - 20) / (ROWS + exH)));
  else { band = Math.min(170, Math.round(H * .26)); cell = Math.floor(Math.min((W - 20) / (REELS + exW), (H - 20 - band) / (ROWS + exH))); }
  const side = (W - cell * REELS) / 2;
  ox = Math.round((W - cell * REELS) / 2); oy = band + Math.round((H - band - cell * ROWS) / 2);
  placeMascots(!wide, side, band, H);
  // поле + 12% клітинки з кожного боку: тут темна підкладка, а дірка PNG-рамки лягає рівно на цей прямокутник
  const fx = ox - cell * .12, fy = oy - cell * .12, fw = cell * REELS + cell * .24, fh = cell * ROWS + cell * .24;
  panel.clear();
  const ft = tex("ui/frame");
  if (ft) {
    panel.beginFill(0x2b5148, 1); panel.drawRect(fx, fy, fw, fh); panel.endFill();
    const fW = fw / (1 - FRAME_HOLE.l - FRAME_HOLE.r), fH = fh / (1 - FRAME_HOLE.t - FRAME_HOLE.b);
    frameSprite ??= root.addChildAt(new PIXI.Sprite(ft), 1);
    frameSprite.position.set(fx - fW * FRAME_HOLE.l, fy - fH * FRAME_HOLE.t); frameSprite.width = fW; frameSprite.height = fH;
  }
  else { panel.lineStyle(3, 0x17120d); panel.beginFill(0x2b5148, 1); roughRect(panel, fx, fy, fw, fh, cell * .05, 77); panel.endFill(); }
  mask.clear(); mask.beginFill(0xffffff); mask.drawRect(ox - 4, oy - 4, cell * REELS + 8, cell * ROWS + 8); mask.endFill();
  redrawAll();
}

/* ---------------- клітинки ---------------- */
export function resetCells(m = false, x = 0) { for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) { mark[r][c] = m; mult[r][c] = x; drawSpot(r, c); } }
export function drawSpot(r: number, c: number): PIXI.Container | undefined {
  spots[r][c]?.destroy({children: true});
  badges[r][c]?.destroy({children: true});
  spots[r][c] = null; badges[r][c] = null;
  if (!mark[r][c]) return;
  const p = pos(r, c), cont = new PIXI.Container();
  const spot = slot("ui/burley_spot", cell * .84, cell * .76);
  if (spot) cont.addChild(spot);
  else { const g = new PIXI.Graphics(); g.beginFill(0x6b4e2e, .85); wobble(g, 0, 0, cell * .42, cell * .38, r * 7 + c * 13 + 5, 12, .18); g.endFill(); cont.addChild(g); }
  cont.position.set(p.x, p.y); spotLayer.addChild(cont); spots[r][c] = cont;
  if (mult[r][c] > 0) {
    const bc = new PIXI.Container();
    const x = mult[r][c], tier = x >= 16 ? 4 : x >= 8 ? 3 : x >= 4 ? 2 : 1;
    const badge = slot(`ui/mult_badge_${tier}`, cell * .44, cell * .44) ?? slot("ui/mult_badge", cell * .42, cell * .34);
    if (badge) bc.addChild(badge);
    else { const b = new PIXI.Graphics(); b.lineStyle(3, 0x17120d); b.beginFill(0xf7b538); wobble(b, 0, 0, cell * .21, cell * .17, r + c * 9, 10, .1); b.endFill(); bc.addChild(b); }
    const tx = new PIXI.Text("×" + mult[r][c], {fontFamily: "Permanent Marker", fontSize: Math.max(12, cell * .2), fill: 0x17120d});
    tx.anchor.set(.5); tx.y = -cell * .01;
    bc.addChild(tx); bc.position.set(p.x + cell * .28, p.y - cell * .3); badgeLayer.addChild(bc); badges[r][c] = bc; return bc;
  }
  return cont;
}
export function placeSprite(r: number, c: number) {
  sprites[r][c]?.destroy({children: true});
  const s = makeSymbol(board[r][c]), p = pos(r, c);
  s.position.set(p.x, p.y); symLayer.addChild(s); sprites[r][c] = s; return s;
}
function redrawAll() { for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) { placeSprite(r, c); drawSpot(r, c); } }
