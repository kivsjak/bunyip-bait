import "./styles.css";
import { applyI18n, tr, money, setCurrency } from "./game/i18n";
import { makeRGS, bookOf, type Mode } from "./game/rgs";
import { REELS, ROWS, SYM, PAYS, PAY_HEADS, PAYING } from "./game/symbols";
import { loadAssets, skinDom, url } from "./render/assets";
import { app, board, layout } from "./render/scene";
import { setTurbo, wait, PAUSE } from "./render/anim";
import { playBook, say, face, round, rest } from "./render/events";

const $ = (id: string) => document.getElementById(id) as HTMLElement;
applyI18n();
const rgs = makeRGS();

function buildPaytable() {
  $("paytable").innerHTML = "<tr><th></th>" + PAY_HEADS.map(h => `<th>${h}</th>`).join("") + "</tr>" +
    Object.entries(PAYS).map(([k, v]) => `<tr><td><img src="${url(`symbols/${k}`) ?? ""}" width="40" height="40" alt="${SYM[k].name}"></td>${v.map(x => `<td>${x}×</td>`).join("")}</tr>`).join("");
}

/* ---------------- раунд ---------------- */
let betLevels: number[] = [], betIdx = 0, busy = false, burleyOn = false, idleSpins = 0;
function setBusy(b: boolean) { busy = b; ["spin", "betup", "betdown", "burley", "buy-bonus", "buy-super"].forEach(id => ($(id) as HTMLButtonElement).disabled = b); }
function showErr(code: string) {
  const msg = code === "ERR_IPB" ? tr("insufficient") : (code === "ERR_IS" || code === "ERR_ATE") ? tr("sessionErr") : code === "ERR_GLE" ? tr("limitErr") : tr("genericErr", {c: code});
  const el = $("err"); el.textContent = msg; el.style.display = "block"; setTimeout(() => el.style.display = "none", 3500);
}
async function play(mode: Mode) {
  if (busy) return; setBusy(true);
  try {
    const res = await rgs.play(round.bet, mode);
    $("balance").textContent = money(res.balance.amount);
    const book = bookOf(res.round);
    await playBook(book);
    if (book.payoutMultiplier > 0) await wait(PAUSE.afterWin);
    if (book.payoutMultiplier > 0) { const end = await rgs.endRound(); $("balance").textContent = money(end.balance.amount); idleSpins = 0; }
    else if (++idleSpins % 6 === 0) say("idle");
  } catch (err: any) { showErr(err?.code || "ERR_GEN"); }
  setBusy(false);
}
function updateBet() {
  round.bet = betLevels[betIdx]; $("betval").textContent = money(round.bet);
  $("buy-bonus").textContent = tr("buyBonus") + " " + money(round.bet * 100);
  $("buy-super").textContent = tr("buySuper") + " " + money(round.bet * 200);
}

/* ---------------- кнопки ---------------- */
$("betup").onclick = () => { betIdx = Math.min(betLevels.length - 1, betIdx + 1); updateBet(); };
$("betdown").onclick = () => { betIdx = Math.max(0, betIdx - 1); updateBet(); };
$("spin").onclick = () => play(burleyOn ? "burley" : "base");
$("burley").onclick = e => {
  burleyOn = !burleyOn; (e.currentTarget as HTMLElement).setAttribute("aria-pressed", String(burleyOn));
  rest.k = burleyOn ? "fishing" : ""; face("k", rest.k);
};
$("turbo").onclick = e => { const b = e.currentTarget as HTMLElement, on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on)); setTurbo(on); };
const confirmDlg = $("confirm") as HTMLDialogElement, rulesDlg = $("rules") as HTMLDialogElement;
function askBuy(price: number, mode: Mode) {
  $("confirm-text").textContent = tr("confirmBuy", {p: money(price)});
  $("confirm-yes").onclick = () => { confirmDlg.close(); play(mode); };
  $("confirm-no").onclick = () => confirmDlg.close();
  confirmDlg.showModal();
}
$("buy-bonus").onclick = () => askBuy(round.bet * 100, "bonus");
$("buy-super").onclick = () => askBuy(round.bet * 200, "superbonus");
$("info").onclick = () => rulesDlg.showModal();
$("close").onclick = () => rulesDlg.close();
addEventListener("keydown", e => { if (e.code === "Space" && !e.repeat && document.activeElement?.tagName !== "BUTTON" && !rulesDlg.open && !confirmDlg.open) { e.preventDefault(); $("spin").click(); } });

(async function init() {
  try { await document.fonts.load("20px 'Permanent Marker'"); await document.fonts.load("20px 'Patrick Hand'"); } catch {}
  for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) board[r][c] = PAYING[Math.floor(Math.random() * PAYING.length)];
  await loadAssets(); skinDom(); face("d"); face("k"); buildPaytable();
  layout(); app.renderer.on("resize", layout);
  try {
    const a = await rgs.authenticate();
    setCurrency(a.balance.currency || "USD");
    betLevels = a.config.betLevels; betIdx = Math.max(0, betLevels.indexOf(a.config.defaultBetLevel));
    updateBet(); $("balance").textContent = money(a.balance.amount);
    // незавершений раунд: дограємо
    if (a.round?.active) { setBusy(true); await playBook(bookOf(a.round)); const end = await rgs.endRound(); $("balance").textContent = money(end.balance.amount); setBusy(false); }
  } catch (err: any) { showErr(err?.code || "ERR_GEN"); setBusy(true); }
})();
