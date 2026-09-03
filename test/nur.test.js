// ============================================================
//  nur.js sinovi — ball tizimining to'g'riligi va balansi
//
//  Nur foydalanuvchining harakati va reytingdagi o'rnini belgilaydi, shuning
//  uchun bu yerdagi xato bevosita odamlarga tegadi. Sinov ikki narsani ushlaydi:
//    1) mexanika — chegaralar, takroriy qo'shish, streak, daraja chegaralari
//    2) balans — biror kategoriya haddan tashqari ustun bo'lib ketmasligi
//       (tamoyil: davomiylik > hajm — eng katta ulush kunlik vazifalarda)
//
//  Ishga tushirish:  node test/nur.test.js
// ============================================================
const OrigDate = Date;
const path = require("path");
const W = path.join(__dirname, "..", "webapp");
const FIXED = new OrigDate(2026, 8, 3); // sinov uchun qat'iy "bugun"

const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function env(store = {}) {
  const s = JSON.parse(JSON.stringify(store));
  global.window = {};
  global.Store = {
    get: (k, def) => (k in s ? JSON.parse(JSON.stringify(s[k])) : def),
    set: (k, v) => { s[k] = JSON.parse(JSON.stringify(v)); },
    today: () => key(FIXED),
    dateKey: key,
  };
  global.Date = function (...a) { return a.length ? new OrigDate(...a) : new OrigDate(FIXED.getTime()); };
  global.Date.prototype = OrigDate.prototype;
  global.Date.now = () => FIXED.getTime();
  for (const f of ["data_zikr.js", "data_arabic.js", "nur.js"]) {
    delete require.cache[require.resolve(path.join(W, f))];
    require(path.join(W, f));
  }
  return { Nur: window.Nur, Z: window.ZIKR_DATA, raw: s };
}

const day = (o) => Object.assign({ t: 0, n: 0, s: {}, ok: false, q: 0, a: 0 }, o);
function daysBack(n, o) {
  const d = {};
  for (let i = 0; i < n; i++) { const x = new OrigDate(FIXED); x.setDate(FIXED.getDate() - i); d[key(x)] = day(o); }
  return d;
}

let failed = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "  ok   " : "  XATO ") + name + (extra ? " — " + extra : ""));
  if (!cond) failed++;
};

console.log("1) Kunlik chegaralar");
{
  const { Nur } = env();
  const s = Nur.dayScore(day({ t: 99, n: 99, s: { x: 99999 }, ok: true, q: 999, a: 99 }), 999);
  Object.keys(Nur.CAP).forEach((k) => ok(k + " chegarasi", s[k] <= Nur.CAP[k], `${s[k]}/${Nur.CAP[k]}`));
  const neg = Nur.dayScore(day({ t: -5, n: -5, s: { x: -100 }, q: -10, a: -3 }), -5);
  ok("manfiy kirish 0 beradi", Object.values(neg).every((v) => v >= 0));
}

console.log("\n2) Chegaralar real qiymatlarga mos");
{
  const { Nur, Z } = env();
  const full = Nur.dayScore(day({ t: Z.tong.length, n: Z.tun.length }), 0);
  ok("barcha zikr aynan chegaraga teng", full.zikr === Nur.CAP.zikr, `${full.zikr} = ${Nur.CAP.zikr}`);
  ok("qazo chegarasi 10 namoz", Nur.CAP.qazo === 10 * Nur.W.qazo, `${Nur.CAP.qazo} = 10 × ${Nur.W.qazo}`);
  ok("ilm chegarasi 3 dars", Nur.CAP.ilm === 3 * Nur.W.dars, `${Nur.CAP.ilm} = 3 × ${Nur.W.dars}`);
  ok("odat chegarasi baza + streak", Nur.CAP.odat === Nur.W.odat + Nur.W.streakMax, `${Nur.W.odat} + ${Nur.W.streakMax}`);
}

console.log("\n3) Balans — davomiylik hajmdan ustun");
{
  const { Nur } = env();
  const C = Nur.CAP, jami = Object.values(C).reduce((a, b) => a + b, 0);
  Object.entries(C).forEach(([k, v]) => console.log(`     ${k.padEnd(7)} ${String(v).padStart(4)}  ${(v / jami * 100).toFixed(0)}%`));
  ok("odat eng katta ulush", C.odat === Math.max(...Object.values(C)), `odat ${C.odat}`);
  ok("hech bir kategoriya 30% dan oshmaydi", Object.values(C).every((v) => v / jami <= 0.3));
  ok("odat > qazo", C.odat > C.qazo, `${C.odat} > ${C.qazo}`);
  console.log("     kunlik maksimal:", jami, "Nur");
}

console.log("\n4) Jami hisob — takroriy qo'shish yo'q");
{
  const e = env({ days: daysBack(5, { t: 14, n: 15, ok: true, q: 2 }) });
  const a = e.Nur.total(), b = e.Nur.total(), c = e.Nur.total();
  ok("total() barqaror", a === b && b === c, `${a}, ${b}, ${c}`);
  const e2 = env({ days: e.raw.days, nur: e.raw.nur });
  ok("keshdan qayta yuklanganda bir xil", e2.Nur.total() === a, `${e2.Nur.total()} vs ${a}`);
}

console.log("\n5) Eski kunlar o'chirilsa jami saqlanadi");
{
  const e = env({ days: daysBack(45, { t: 14, n: 15, ok: true }) });
  const before = e.Nur.total();
  const keys = Object.keys(e.raw.days).sort();
  const trimmed = {}; keys.slice(10).forEach((k) => (trimmed[k] = e.raw.days[k]));
  const e2 = env({ days: trimmed, nur: e.raw.nur });
  ok("jami kamaymaydi", e2.Nur.total() >= before, `${e2.Nur.total()} vs ${before}`);
}

console.log("\n6) Streak");
{
  const e = env({ days: daysBack(40, { ok: true }) });
  const s0 = e.Nur.dayScore(day({ ok: true }), 0);
  const sMax = e.Nur.dayScore(day({ ok: true }), 999);
  ok("bonus o'sadi", sMax.odat > s0.odat, `${s0.odat} → ${sMax.odat}`);
  ok("bonus chegarada to'xtaydi", sMax.odat === e.Nur.CAP.odat, String(sMax.odat));
  ok("streak 40 kun", e.Nur.streak() === 40, String(e.Nur.streak()));
  const gap = env({ days: Object.fromEntries(Object.entries(daysBack(10, { ok: true })).filter((_, i) => i !== 3)) });
  ok("uzilish streakni to'xtatadi", gap.Nur.streak() === 3, String(gap.Nur.streak()));
}

console.log("\n7) Serverga yuboriladigan ma'lumot");
{
  const e = env({ days: daysBack(3, { t: 14, n: 15, ok: true, q: 2, a: 1 }) });
  const ld = e.Nur.lastDays(7), cats = Object.keys(e.Nur.CAP);
  ok("kategoriyalar to'liq", ld.length > 0 && cats.every((c) => c in ld[0]));
  ok("total yuborilmaydi (server o'zi qo'shadi)", !("total" in ld[0]));
  ok("qiymatlar chegaradan past", ld.every((d) => cats.every((c) => d[c] <= e.Nur.CAP[c])));
  ok("tafsilot yuborilmaydi", ld.every((d) => !("s" in d) && !("t" in d) && !("n" in d)));
}

console.log("\n8) Darajalar");
{
  const { Nur } = env();
  Nur.LEVELS.forEach((l, i) => {
    if (i === 0) return;
    const at = Nur.level(l.min), below = Nur.level(l.min - 1);
    ok(`${l.name} chegarasi`, at.cur.id === l.id && below.cur.id !== l.id);
  });
  const top = Nur.level(9e9);
  ok("eng yuqorida next yo'q", top.next === null && top.pct === 1);
}

console.log(failed ? `\n${failed} ta sinov muvaffaqiyatsiz` : "\nHamma sinov o'tdi");
process.exit(failed ? 1 : 0);
