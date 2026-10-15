import * as PIXI from "pixi.js";
import { SYMBOLS } from "../game/symbols";

/*
  ЄДИНЕ МІСЦЕ, ДЕ ЖИВУТЬ КАРТИНКИ ГРИ.
  Кожен рядок = файл public/assets/<шлях>.png. Поклав PNG з таким ім'ям — гра його підхопила.
  Нема файлу — малюється як у прототипі (кодом / CSS). Розміри й призначення — README.md.
*/
export const ASSETS = [
  "bg/background",
  ...SYMBOLS.map(c => `symbols/${c}`),
  "characters/yeti", "characters/yeti_hyped", "characters/kev", "characters/kev_hyped",
  // поле (Pixi)
  "ui/frame", "ui/burley_spot", "ui/mult_badge", "ui/bunyip_eyes",
  // HUD (DOM)
  "ui/logo", "ui/hud_bar", "ui/btn_spin", "ui/btn", "ui/btn_buy", "ui/bubble", "ui/fs_bar", "ui/dialog",
];

const BASE = `${import.meta.env.BASE_URL}assets/`;
const IMG: Record<string, HTMLImageElement> = {};
const TEX: Record<string, PIXI.Texture> = {};

// ponytail: 404 у консолі на кожен ще не намальований слот — так і задумано, слот просто порожній
export const loadAssets = () => Promise.all(ASSETS.map(k => new Promise<void>(res => {
  const img = new Image();
  img.onload = () => { IMG[k] = img; res(); };
  img.onerror = () => res();
  img.src = `${BASE}${k}.png`;
})));

export const url = (k: string) => IMG[k]?.src ?? null;
export const tex = (k: string) => IMG[k] ? (TEX[k] ??= PIXI.Texture.from(IMG[k])) : null;

function skin(sel: string, k: string) {
  const u = url(k);
  if (u) document.querySelectorAll<HTMLElement>(sel).forEach(el => { el.style.backgroundImage = `url("${u}")`; el.classList.add("skinned"); });
}

// DOM-слоти: фон, лого, HUD, кнопки, бульбашки, діалоги
export function skinDom() {
  const bg = url("bg/background");
  if (bg) document.body.style.backgroundImage = `url("${bg}")`;
  const logo = url("ui/logo"), h1 = document.querySelector("h1")!;
  if (logo) { h1.innerHTML = `<img src="${logo}" alt="Bunyip Bait">`; h1.classList.add("logo"); }
  skin("footer", "ui/hud_bar");
  skin("#spin", "ui/btn_spin");
  skin("button:not(#spin):not(.buy)", "ui/btn");
  skin("button.buy", "ui/btn_buy");
  skin(".bubble", "ui/bubble");
  skin("#fsbar", "ui/fs_bar");
  skin("dialog", "ui/dialog");
}
