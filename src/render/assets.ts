import * as PIXI from "pixi.js";
import { SYMBOLS } from "../game/symbols";

/*
  ЄДИНЕ МІСЦЕ, ДЕ ЖИВУТЬ КАРТИНКИ ГРИ.
  Кожен рядок = файл public/assets/<шлях>.png. Поклав PNG з таким ім'ям — гра його підхопила.
  Нема файлу — малюється як у прототипі (кодом / CSS). Розміри й призначення — README.md.
*/
export const ASSETS = [
  "bg/background", "bg/background_portrait",
  ...SYMBOLS.map(c => `symbols/${c}`),
  "characters/yeti", "characters/yeti_hyped", "characters/kev", "characters/kev_hyped",
  "characters/yeti_chomp", "characters/kev_fishing",  // йєті на «укусі» буньїпа; Kev, поки ввімкнена прикормка
  // поле (Pixi)
  "ui/frame", "ui/burley_spot", "ui/mult_badge", "ui/bunyip_eyes",
  // бейдж множника за рівнями: 1 = ×2–3, 2 = ×4–7, 3 = ×8–15, 4 = ×16–32; нема файлу рівня → ui/mult_badge
  "ui/mult_badge_1", "ui/mult_badge_2", "ui/mult_badge_3", "ui/mult_badge_4",
  // підкладка банера: fs = фриспіни, big = великий виграш, max = максимальний
  "ui/banner_fs", "ui/banner_big", "ui/banner_max",
  // кнопки-картинки: ui/btn_<назва>_<стан>.png
  ...["spin", "minus", "plus", "turbo", "burley", "rules"].flatMap(n => ["normal", "pressed", "disabled"].map(s => `ui/btn_${n}_${s}`)),
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
  // фон через CSS-змінні: у портретній орієнтації styles.css бере вертикальний, якщо він є
  const bg = url("bg/background"), bgP = url("bg/background_portrait"), root = document.documentElement.style;
  if (bg) root.setProperty("--bg-land", `url("${bg}")`);
  if (bgP) root.setProperty("--bg-port", `url("${bgP}")`);
  const logo = url("ui/logo"), h1 = document.querySelector("h1")!;
  if (logo) { h1.innerHTML = `<img src="${logo}" alt="Bunyip Bait">`; h1.classList.add("logo"); }
  skin("footer", "ui/hud_bar");
  skin("#spin", "ui/btn_spin");
  skin("button:not(#spin):not(.buy)", "ui/btn");
  skin("button.buy", "ui/btn_buy");
  skin(".bubble", "ui/bubble");
  skin("#fsbar", "ui/fs_bar");
  skin("dialog", "ui/dialog");
  // кнопка → картинка зі станами; нема normal-файлу → лишається текстова кнопка
  const ICON_BTNS: Record<string, string> = {spin: "spin", betdown: "minus", betup: "plus", turbo: "turbo", burley: "burley", info: "rules"};
  for (const [id, n] of Object.entries(ICON_BTNS)) {
    const u = url(`ui/btn_${n}_normal`), el = document.getElementById(id);
    if (!u || !el) continue;
    el.setAttribute("aria-label", el.getAttribute("aria-label") || el.textContent!.trim());
    el.style.setProperty("--img", `url("${u}")`);
    el.style.setProperty("--img-pressed", `url("${url(`ui/btn_${n}_pressed`) ?? u}")`);
    el.style.setProperty("--img-disabled", `url("${url(`ui/btn_${n}_disabled`) ?? u}")`);
    el.classList.add("iconbtn");
  }
}
