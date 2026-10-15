import * as PIXI from "pixi.js";
import { REELS, ROWS } from "../game/symbols";
import { tr, money } from "../game/i18n";
import type { Book, BookEvent } from "../game/rgs";
import { url } from "./assets";
import { board, sprites, badges, spots, mark, mult, cell, pos, fxLayer, symLayer, drawSpot, placeSprite, makeSymbol, makeEyes, resetCells, Sym } from "./scene";
import { tween, wait, easeIn, PAUSE, reduceMotion, getSpeed } from "./anim";

const $ = (id: string) => document.getElementById(id)!;
const banner = $("banner"), winEl = $("winval"), fsbar = $("fsbar");

export const round = {bet: 1_000_000};
let inFS = false;
const setWin = (hundredths: number) => { winEl.textContent = money(Math.round(round.bet * hundredths / 100)); };

async function showBanner(html: string, ms: number, kind: "fs" | "big" | "max") {
  const bg = url(`ui/banner_${kind}`);
  banner.style.backgroundImage = bg ? `url("${bg}")` : ""; banner.classList.toggle("has-bg", !!bg);
  banner.innerHTML = html; banner.classList.add("on"); await wait(ms); banner.classList.remove("on"); await wait(200);
}

/* ---------------- маскоти ---------------- */
const LINES: Record<string, [string, string]> = {
  idle: ["k", "Mate, I reckon they're all asleep."], small: ["d", "That'll do for bait."], stir: ["k", "Somethin's stirrin' down there, Daz."],
  near: ["k", "Nah. Nah nah nah. Robbed."], fs: ["d", "Grab the big net, Kev!"], chomp: ["k", "IT'S REAL. I TOLD YA IT'S REAL!"],
  big: ["d", "We're eatin' good tonight."], huge: ["d", "...Did that thing just wink at us?"],
};
const HYPE = new Set(["fs", "chomp", "big", "huge", "stir"]);
let bubbleTimer: ReturnType<typeof setTimeout>;
export function face(who: string, hyped: boolean) {
  const name = `characters/${who === "d" ? "yeti" : "kev"}`;
  ($(who === "d" ? "img-d" : "img-k") as HTMLImageElement).src = (hyped && url(name + "_hyped")) || url(name) || "";
}
export function say(key: string) {
  const [who, text] = LINES[key], el = $(who === "d" ? "bubble-d" : "bubble-k");
  document.querySelectorAll(".bubble").forEach(b => b.classList.remove("on"));
  face("d", false); face("k", false);
  if (HYPE.has(key)) { face("d", true); face("k", true); }
  el.textContent = text; el.classList.add("on"); clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { el.classList.remove("on"); face("d", false); face("k", false); }, 2600);
}

/* ---------------- обробники подій книги ---------------- */
async function dropBoard(newBoard: string[][]) {
  for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) board[r][c] = newBoard[r][c];
  const jobs: Promise<void>[] = [];
  for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) {
    const s = placeSprite(r, c), y = s.y; s.y = y - cell * ROWS - cell;
    jobs.push(wait(r * 45).then(() => tween(s, {y}, 260 + c * 25, easeIn)));
  }
  await Promise.all(jobs);
}

const H: Record<string, (e: BookEvent) => Promise<void>> = {
  async reveal(e) { await dropBoard(e.board); await wait(PAUSE.afterReveal); },
  async refill(e) { await dropBoard(e.board); },
  async burleySeed(e) { for (const [r, c] of e.cells) { mark[r][c] = true; const s = drawSpot(r, c)!; s.scale.set(.2); tween(s, {scale: 1}, 220); } await wait(260); },
  async clusterWin(e) {
    const all: Promise<void>[] = [];
    for (const cl of e.clusters) for (const [r, c] of cl.cells) { const s = sprites[r][c]!; all.push(tween(s, {scale: 1.18}, 140).then(() => tween(s, {scale: 1}, 140))); }
    await Promise.all(all);
    for (const cl of e.clusters) {
      const cx = cl.cells.reduce((a: number, [r]: number[]) => a + r, 0) / cl.cells.length, cy = cl.cells.reduce((a: number, [, c]: number[]) => a + c, 0) / cl.cells.length;
      const p = pos(cx, cy);
      const label = money(Math.round(round.bet * cl.win / 100)) + (cl.mult > 1 ? "  ×" + cl.mult : "");
      const t = new PIXI.Text(label, {fontFamily: "Permanent Marker", fontSize: Math.max(16, cell * .3), fill: 0xf7b538, stroke: 0x17120d, strokeThickness: 5});
      t.anchor.set(.5); t.position.set(p.x, p.y); fxLayer.addChild(t);
      tween(t, {y: p.y - cell * .6, alpha: 0}, 1100).then(() => t.destroy());
    }
    const fades: Promise<void>[] = [];
    for (const cl of e.clusters) for (const [r, c] of cl.cells) fades.push(tween(sprites[r][c]!, {alpha: 0, scale: .4}, 220));
    await Promise.all(fades);
  },
  async cellUpgrade(e) {
    for (const [r, c, m, x] of e.cells) { const had = mult[r][c]; mark[r][c] = !!m; mult[r][c] = x; const s = drawSpot(r, c); if (s && x !== had) { s.scale.set(.5); tween(s, {scale: 1}, 200); } if (x >= 8) say("stir"); }
    await wait(180);
  },
  async tumble(e) {
    const removed = new Set(e.removed.map(([r, c]: number[]) => r + "," + c));
    const jobs: Promise<void>[] = [];
    for (let r = 0; r < REELS; r++) {
      const keep: Sym[] = [];
      for (let c = 0; c < ROWS; c++) { if (removed.has(r + "," + c)) sprites[r][c]!.destroy({children: true}); else keep.push(sprites[r][c]!); }
      const add: string[] = e.newSymbols[r];
      const newCodes = add.concat(keep.map(s => s.code));
      const newSprites: Sym[] = [];
      add.forEach((code, i) => { board[r][i] = code; const s = makeSymbol(code), p = pos(r, i); s.position.set(p.x, p.y - (add.length + 1) * cell); symLayer.addChild(s); newSprites.push(s); });
      keep.forEach(s => newSprites.push(s));
      newSprites.forEach((s, c) => { board[r][c] = newCodes[c]; sprites[r][c] = s; const p = pos(r, c); if (s.y !== p.y) jobs.push(tween(s, {y: p.y}, 280, easeIn)); });
    }
    await Promise.all(jobs); await wait(PAUSE.afterCascade);
  },
  async chomp(e) {
    say("chomp");
    const [cx, cy] = e.center, p = pos(cx, cy);
    const eyes = makeEyes();
    eyes.position.set(p.x, p.y + cell * .4); eyes.alpha = 0; fxLayer.addChild(eyes);
    await tween(eyes, {y: p.y, alpha: 1}, 300);
    const flies: Promise<void>[] = [];
    for (const [r, c] of e.absorbed) { const s = badges[r][c] || spots[r][c]; if (!s) continue; flies.push(tween(s, {x: p.x, y: p.y, scale: .3, alpha: .2}, 380)); }
    await Promise.all(flies);
    for (const [r, c] of e.absorbed) { mult[r][c] = 0; drawSpot(r, c); }
    mult[cx][cy] = e.newMultiplier; const s = drawSpot(cx, cy)!; s.scale.set(1.6); await tween(s, {scale: 1}, 260);
    await tween(eyes, {y: p.y + cell * .4, alpha: 0}, 260); eyes.destroy();
  },
  async freeSpinTrigger(e) {
    say("fs"); inFS = true;
    resetCells(!!e.startMarks || e.startMultiplier > 0, e.startMultiplier || 0);
    await showBanner(`${e.spins} ${tr("freeSpins")}<small>${e.scatters} × ${tr("cooler")}</small>`, 1500, "fs");
  },
  async freeSpinStart(e) {
    if (e.spin > 1) await wait(PAUSE.betweenFS);
    fsbar.style.display = "block"; fsbar.textContent = tr("freeSpin", {a: e.spin, b: e.of});
    if (fsbar.animate && !reduceMotion) fsbar.animate([{transform: "translateX(-50%) scale(1.2)"}, {transform: "translateX(-50%) scale(1)"}], {duration: 300 / getSpeed()});
    await wait(PAUSE.beforeSpin);
  },
  async retrigger(e) { fsbar.textContent = tr("freeSpin", {a: "…", b: e.of}); await showBanner(tr("moreSpins", {n: e.added}), 900, "fs"); },
  async setTotalWin(e) { setWin(e.amount); if (inFS) await wait(PAUSE.afterSpin); },
  async maxWin(e) { setWin(e.amount); say("huge"); await showBanner(`${tr("maxWin")}<small>5,000×</small>`, 2200, "max"); },
  async finalWin(e) {
    setWin(e.amount);
    const x = e.amount / 100; // у ставках
    if (x >= 1000) { say("huge"); await showBanner(`${tr("bigWin")}<small>${money(Math.round(round.bet * e.amount / 100))}</small>`, 2200, "big"); }
    else if (x >= 100) { say("big"); await showBanner(`${tr("bigWin")}<small>${money(Math.round(round.bet * e.amount / 100))}</small>`, 1600, "big"); }
    else if (x > 0) say("small");
  },
};

export async function playBook(book: Book) {
  inFS = false; fsbar.style.display = "none"; resetCells(); setWin(0);
  for (const e of book.events) { const h = H[e.type]; if (h) await h(e); }
  inFS = false; fsbar.style.display = "none";
}
