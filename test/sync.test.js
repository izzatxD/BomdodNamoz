// ============================================================
//  sync.test.js — Mini App va bot bir xil gapiryaptimi?
//
//  Loyihada ataylab takrorlangan bir nechta ro'yxat bor: ilova serversiz ham
//  ishlashi kerak, shuning uchun ball chegaralari, darajalar, bo'limlar,
//  shaharlar va namoz formulasi IKKI tomonda ham yozilgan.
//  Bir tomonini o'zgartirib ikkinchisini unutish — bu loyihadagi eng oson xato:
//  hech narsa buzilmaydi, shunchaki server boshqacha hisoblay boshlaydi.
//
//  Bu sinov ikkalasini o'qib solishtiradi. JS tomoni haqiqatan yuklanadi,
//  Python tomoni matndan o'qiladi (Python o'rnatilgan bo'lishi shart emas).
//
//  Ishga tushirish:  node test/sync.test.js
// ============================================================
const fs = require("fs");
const path = require("path");

const WEB = path.join(__dirname, "..", "webapp");
const BOT = path.join(__dirname, "..", "bot");

const py = (name) => fs.readFileSync(path.join(BOT, name), "utf8");

// ---------- JS tomonini yuklash ----------
function loadWeb() {
  global.window = {};
  for (const f of ["data.js", "data_zikr.js", "data_arabic.js", "nur.js", "vaqt.js"]) {
    delete require.cache[require.resolve(path.join(WEB, f))];
    require(path.join(WEB, f));
  }
  return { Nur: window.Nur, D: window.APP_DATA, Vaqt: window.Vaqt };
}

// ---------- Python tomonini matndan o'qish ----------
// To'liq parser emas — shu fayllardagi aniq yozuv shakllariga mo'ljallangan.
function pyBlock(src, name, open, close) {
  const i = src.indexOf(name);
  if (i < 0) return null;
  const from = src.indexOf(open, i);
  if (from < 0) return null;
  let depth = 0;
  for (let k = from; k < src.length; k++) {
    if (src[k] === open) depth++;
    else if (src[k] === close && --depth === 0) return src.slice(from + 1, k);
  }
  return null;
}

/** CAPS = {"zikr": 118, ...} → { zikr: 118, ... } */
function pyNumMap(src, name) {
  const body = pyBlock(src, name, "{", "}");
  if (body === null) return null;
  const out = {};
  for (const m of body.matchAll(/["'](\w+)["']\s*:\s*(-?[\d.]+)/g)) out[m[1]] = Number(m[2]);
  return out;
}

/** SECTIONS = {"tahorat": "Tahorat...", ...} → ["tahorat", ...] (tartibi bilan) */
function pyStrMapKeys(src, name) {
  const body = pyBlock(src, name, "{", "}");
  if (body === null) return null;
  return [...body.matchAll(/["'](\w+)["']\s*:\s*["']/g)].map((m) => m[1]);
}

/** VIDEO_SECTIONS = {"tahorat", "bomdod", ...} → to'plam (tartibsiz) */
function pyStrSet(src, name) {
  const body = pyBlock(src, name, "{", "}");
  if (body === null) return null;
  return [...body.matchAll(/["']([\w]+)["']/g)].map((m) => m[1]);
}

/** LEVELS = [("Sham", 0), ("Chiroq", 500), ...] → [{name, min}, ...] */
function pyPairs(src, name) {
  const body = pyBlock(src, name, "[", "]");
  if (body === null) return null;
  return [...body.matchAll(/\(\s*["'](.+?)["']\s*,\s*(-?[\d.]+)\s*\)/g)]
    .map((m) => ({ name: m[1], min: Number(m[2]) }));
}

/** CITIES = {"toshkent": ("Toshkent", 69.24), ...} → { Toshkent: 69.24, ... } */
function pyCities(src) {
  const body = pyBlock(src, "CITIES", "{", "}");
  if (body === null) return null;
  const out = {};
  for (const m of body.matchAll(/["'](.+?)["']\s*:\s*\(\s*["'](.+?)["']\s*,\s*(-?[\d.]+)\s*\)/g)) {
    // bir shaharning bir nechta yozilishi bo'lishi mumkin (farg'ona / fargona) — nomi bo'yicha yig'amiz
    out[m[2]] = Number(m[3]);
  }
  return out;
}

/** LAT = 41.31 ko'rinishidagi modul konstantasi */
function pyConst(src, name) {
  const m = src.match(new RegExp(`^${name}\\s*=\\s*(-?[\\d.]+)`, "m"));
  return m ? Number(m[1]) : null;
}

// ---------- sinov yordamchilari ----------
let failed = 0;
function ok(label, cond, detail) {
  if (cond) {
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  XATO ${label}${detail ? "\n       " + detail : ""}`);
  }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const show = (v) => JSON.stringify(v);

const { Nur, D, Vaqt } = loadWeb();
const API = py("api.py");
const DB = py("db.py");
const BOTPY = py("bot.py");
const VAQTPY = py("vaqt.py");

console.log("1) Kunlik ball chegaralari — nur.js CAP  ↔  api.py CAPS");
{
  const caps = pyNumMap(API, "CAPS");
  ok("api.py dagi CAPS topildi", caps !== null);
  if (caps) {
    ok("kategoriyalar bir xil", same(Object.keys(Nur.CAP).sort(), Object.keys(caps).sort()),
      `JS: ${show(Object.keys(Nur.CAP).sort())}\n       PY: ${show(Object.keys(caps).sort())}`);
    for (const k of Object.keys(Nur.CAP)) {
      ok(`${k} = ${Nur.CAP[k]}`, Nur.CAP[k] === caps[k], `JS: ${Nur.CAP[k]}  PY: ${caps[k]}`);
    }
  }
}

console.log("\n2) Darajalar — nur.js LEVELS  ↔  db.py LEVELS");
{
  const levels = pyPairs(DB, "LEVELS");
  ok("db.py dagi LEVELS topildi", levels !== null);
  if (levels) {
    const js = Nur.LEVELS.map((l) => ({ name: l.name, min: l.min }));
    ok("soni bir xil", js.length === levels.length, `JS: ${js.length}  PY: ${levels.length}`);
    ok("nomlari va chegaralari bir xil", same(js, levels), `JS: ${show(js)}\n       PY: ${show(levels)}`);
  }
}

console.log("\n3) Bo'limlar — data.js videoSections  ↔  bot.py SECTIONS  ↔  api.py VIDEO_SECTIONS");
{
  const jsIds = (D.videoSections || []).map((s) => s.id);
  const botIds = pyStrMapKeys(BOTPY, "SECTIONS");
  const apiIds = pyStrSet(API, "VIDEO_SECTIONS");
  ok("bot.py dagi SECTIONS topildi", botIds !== null);
  ok("api.py dagi VIDEO_SECTIONS topildi", apiIds !== null);
  if (botIds) {
    // bot.py dagi tartib ilovadagi bilan bir xil bo'lsa, admin botda tanlagan
    // bo'limlar ro'yxati ilovadagidek chiqadi — shuning uchun tartib ham tekshiriladi
    ok("bot.py bilan tartibigacha bir xil", same(jsIds, botIds), `JS:  ${show(jsIds)}\n       PY:  ${show(botIds)}`);
  }
  if (apiIds) {
    ok("api.py bilan to'plam sifatida bir xil", same([...jsIds].sort(), [...apiIds].sort()),
      `JS:  ${show([...jsIds].sort())}\n       PY:  ${show([...apiIds].sort())}`);
  }
  ok("«boshqa» bo'limi bor (noma'lum bo'limlar shunga tushadi)", jsIds.includes("boshqa"));
}

console.log("\n4) Shaharlar — data.js cities  ↔  bot.py CITIES");
{
  const bot = pyCities(BOTPY);
  ok("bot.py dagi CITIES topildi", bot !== null);
  if (bot) {
    const js = {};
    (D.cities || []).forEach((c) => { js[c.name] = c.lng; });
    ok("shaharlar ro'yxati bir xil", same(Object.keys(js).sort(), Object.keys(bot).sort()),
      `JS: ${show(Object.keys(js).sort())}\n       PY: ${show(Object.keys(bot).sort())}`);
    for (const name of Object.keys(js)) {
      // uzunlik rasmiy jadvaldan olingan — farq qilsa /vaqt va ilova boshqa vaqt ko'rsatadi
      ok(`${name} uzunligi ${js[name]}`, js[name] === bot[name], `JS: ${js[name]}  PY: ${bot[name]}`);
    }
  }
}

console.log("\n5) Namoz formulasi — vaqt.js  ↔  vaqt.py");
{
  for (const name of ["LAT", "ANGLE", "SHOM_PLUS", "ASR_SHADOW", "TZ"]) {
    const p = pyConst(VAQTPY, name);
    ok(`${name} = ${Vaqt[name]}`, Vaqt[name] === p, `JS: ${Vaqt[name]}  PY: ${p}`);
  }
}

console.log("\n6) Reyting izohlari Nur.W dan olinadimi (raqam qo'lda yozilmaganmi)");
{
  const src = fs.readFileSync(path.join(WEB, "reyting.js"), "utf8");
  const cats = src.slice(src.indexOf("const CATS"), src.indexOf("];", src.indexOf("const CATS")));
  // hint ichida qo'lda yozilgan ball raqami bo'lmasligi kerak — ${W.x} shaklida bo'lsin
  const hardcoded = [...cats.matchAll(/hint:\s*[`"'](.*?)[`"']/g)]
    .map((m) => m[1])
    .filter((h) => /(^|[^{])\b\d+\b/.test(h.replace(/\$\{[^}]*\}/g, "").replace(/33 marta|80%/g, "")));
  ok("hint matnlarida qo'lda yozilgan ball yo'q", hardcoded.length === 0, hardcoded.join("\n       "));
}

console.log(failed ? `\n${failed} ta sinov muvaffaqiyatsiz` : "\nHamma sinov o'tdi");
process.exit(failed ? 1 : 0);
