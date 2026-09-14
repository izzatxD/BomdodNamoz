// ============================================================
//  qibla.js sinovi — burchak va kompas o'qishi to'g'riligini tekshiradi
//
//  Qibla burchagi xato bo'lsa hech narsa "buzilmaydi": ilova ishlayveradi,
//  strelka ham chiroyli aylanadi — faqat noto'g'ri tomonni ko'rsatadi.
//  Shuning uchun hisob mashhur shaharlarning e'lon qilingan qiymatlari bilan
//  solishtiriladi, kompas o'qishi esa iOS va Android formatlarida tekshiriladi.
//
//  Ishga tushirish:  node test/qibla.test.js
// ============================================================
const path = require("path");
const QIBLA = path.join(__dirname, "..", "webapp", "qibla.js");
const DATA = path.join(__dirname, "..", "webapp", "data.js");

let failed = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "  ok   " : "  XATO ") + name + (extra ? " — " + extra : ""));
  if (!cond) failed++;
};

// qibla.js brauzer moduli: App, Icons va DOM kerak. Bu yerda eng sodda soxta DOM —
// render() ishlab, chiqargan HTML ini o'qib ko'rish uchun shuncha kifoya.
const nodes = {};
function fakeEl() {
  return {
    innerHTML: "", textContent: "", className: "", dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    querySelectorAll: () => [], setAttribute() {}, getAttribute: () => null, addEventListener() {},
  };
}
const $ = (sel) => (nodes[sel] || (nodes[sel] = fakeEl()));
global.App = { $, haptic() {}, notify() {}, esc: (s) => String(s), onTab() {}, onLeaveTab() {}, state: {}, coords: () => ({ lat: 41.2995, lng: 69.24, gps: false, name: "Toshkent" }) };
global.Icons = { get: () => "", mount() {} };
const listeners = new Set();       // datchikka nechta quloq osilgan — chiqishda 0 bo'lishi shart
const hooks = {};                  // App.onTab / App.onLeaveTab qayta chaqiruvlari
global.App.onTab = (n, fn) => { hooks["kir:" + n] = fn; };
global.App.onLeaveTab = (n, fn) => { hooks["chiq:" + n] = fn; };
global.document = { addEventListener() {}, querySelector: () => null };
global.window = {
  App: global.App, Icons: global.Icons,
  addEventListener: (n) => { if (n.indexOf("deviceorientation") === 0) listeners.add(n); },
  removeEventListener: (n) => { listeners.delete(n); },
};
// Android uslubidagi qurilma: absolute hodisa bor, requestPermission (iOS) yo'q
global.window.DeviceOrientationEvent = function DeviceOrientationEvent() {};
global.window.ondeviceorientationabsolute = null;
global.screen = {};
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};
require(QIBLA);
const Q = global.window.Qibla;
require(DATA);
const D = global.window.APP_DATA;

console.log("\n1) Qibla burchagi — e'lon qilingan qiymatlar bilan bir xilmi");
// Manba: islamicfinder / qiblafinder kabi ma'lumotnomalarda keltirilgan qiymatlar.
// 0.3 daraja farqga ruxsat: ular ham shahar markazini biroz boshqacha oladi.
[
  ["Istanbul", 41.0082, 28.9784, 151.6],
  ["London", 51.5074, -0.1278, 119.0],
  ["Nyu-York", 40.7128, -74.0060, 58.5],
  ["Jakarta", -6.2088, 106.8456, 295.2],
  ["Toshkent", 41.2995, 69.24, 240.3],
].forEach(([name, lat, lng, want]) => {
  const got = Q.bearing(lat, lng);
  ok(`${name}: ${got.toFixed(1)}°`, Math.abs(got - want) < 0.3, `kutilgan ${want}°`);
});

console.log("\n2) Chegaraviy holatlar");
ok("Makkaning o'zida burchak 0", Math.abs(Q.bearing(21.4225, 39.8262)) < 0.001);
// Ka'badan ANIQ shimolda turgan odam janubga — 180° ga qarashi kerak
ok("Ka'badan shimolda — 180°", Math.abs(Q.bearing(31.4225, 39.8262) - 180) < 0.001,
  Q.bearing(31.4225, 39.8262).toFixed(3));
// Ka'badan aniq janubda — 0° (shimolga)
ok("Ka'badan janubda — 0°", Math.abs(Q.bearing(11.4225, 39.8262)) < 0.001);
ok("hamma burchak 0..360 oralig'ida", [[-89, -179], [89, 179], [0, 0], [-45, 120]]
  .every(([la, ln]) => { const b = Q.bearing(la, ln); return b >= 0 && b < 360; }));

console.log("\n3) Masofa");
const dTosh = Q.distance(41.2995, 69.24);
ok(`Toshkent → Makka ${Math.round(dTosh)} km`, Math.abs(dTosh - 3531) < 15);
ok("Makkada masofa 0", Q.distance(21.4225, 39.8262) < 0.01);
ok("London → Makka ~4800 km", Math.abs(Q.distance(51.5074, -0.1278) - 4794) < 20);

console.log("\n4) «Qaysi tomonga burilish kerak» — 0/360 chegarasida ham to'g'ri");
ok("350° dan 10° ga — 20° o'ngga", Q.delta(350, 10) === 20);
ok("10° dan 350° ga — 20° chapga", Q.delta(10, 350) === -20);
ok("0 dan 180 ga — 180", Math.abs(Q.delta(0, 180)) === 180);
ok("bir xil burchakda 0", Q.delta(240, 240) === 0);
ok("natija hamisha -180..180", [[0, 359], [359, 0], [90, 271], [180, 0]]
  .every(([a, b]) => { const d = Q.delta(a, b); return d > -181 && d <= 180; }));

console.log("\n5) Kompas o'qishi — iOS va Android bir xil natija berishi kerak");
// iOS tayyor qiymat beradi: shimoldan soat yo'nalishi bo'yicha
ok("iOS: webkitCompassHeading o'zgarishsiz olinadi", Q.headingOf({ webkitCompassHeading: 240.3 }) === 240.3);
// Android alpha TESKARI yo'nalishda: shimolga qaraganda 0, o'ngga burilganda kamayadi
ok("Android: alpha=119.7 → 240.3°", Math.abs(Q.headingOf({ absolute: true, alpha: 360 - 240.3 }) - 240.3) < 0.001);
ok("Android: alpha=0 → shimol (0°)", Q.headingOf({ absolute: true, alpha: 0 }) === 0);
ok("Android: alpha=90 → g'arb (270°)", Q.headingOf({ absolute: true, alpha: 90 }) === 270);
// absolute bo'lmagan o'qish magnit shimolga bog'lanmagan — ishlatilmaydi
ok("absolute emas — rad etiladi", Q.headingOf({ absolute: false, alpha: 90 }) === null);
ok("bo'sh hodisa — rad etiladi", Q.headingOf({}) === null);
ok("NaN — rad etiladi", Q.headingOf({ absolute: true, alpha: NaN }) === null);

console.log("\n6) Ilovadagi barcha shaharlar uchun hisob ishlaydimi");
const bad = D.cities.filter((c) => {
  const b = Q.bearing(c.lat, c.lng), km = Q.distance(c.lat, c.lng);
  return !(b > 200 && b < 260) || !(km > 2500 && km < 4200);   // O'zbekiston: janubi-g'arb, 2.5–4.2 ming km
});
ok(`${D.cities.length} ta shaharning hammasi janubi-g'arbni ko'rsatadi`, bad.length === 0,
  bad.map((c) => c.name).join(", "));
// Nukus eng shimoli-g'arbda, Termiz eng janubi-sharqda — burchaklari sezilarli farq qilishi kerak
const nukus = Q.bearing(42.4531, 60.24), termiz = Q.bearing(37.2242, 67.24);
ok("Nukus va Termiz burchagi bir xil emas", Math.abs(nukus - termiz) > 10,
  `Nukus ${nukus.toFixed(1)}°, Termiz ${termiz.toFixed(1)}°`);

console.log("\n7) Bo'limdan chiqilganda datchik o'chadimi (batareya)");
// Magnit datchik fonda ishlab tursa batareyani yeydi — kirganda ulanib, chiqqanda uzilishi shart
ok("App bo'limga kirish ilgagini oldi", typeof hooks["kir:qibla"] === "function");
ok("App bo'limdan chiqish ilgagini oldi", typeof hooks["chiq:qibla"] === "function");
Q.start();
ok("kirganda datchikka ulanadi", listeners.size > 0, "ulangan: " + listeners.size);
hooks["chiq:qibla"]();                      // bo'limdan chiqildi
ok("chiqqanda hamma ulanish uziladi", listeners.size === 0, "qolgan: " + [...listeners].join(", "));
Q.start(); Q.stop();
ok("qayta kirib-chiqqanda ham quyruq qolmaydi", listeners.size === 0);

console.log("\n8) Kompas datchigi umuman yo'q qurilma (eski WebView, Telegram Desktop)");
// Bunda hodisa ham kelmaydi, kutish taymeri ham qo'yilmaydi — ekran «sozlanmoqda» da
// qotib qolmasligi, darhol qo'l rejimiga o'tishi kerak.
delete global.window.DeviceOrientationEvent;
delete global.window.ondeviceorientationabsolute;
$("#q-msg").innerHTML = "ESKI";               // shu kirishda qayta yozilishi kerak
hooks["kir:qibla"]();                         // bo'limga kirildi: render + start
const msg = nodes["#q-msg"].innerHTML;
ok("xabar shu kirishda yangilanadi", msg !== "ESKI", "o'zgarmadi");
ok("«sozlanmoqda» da qotib qolmaydi", !/sozlanmoqda/.test(msg), msg.slice(0, 60));
ok("qo'l rejimi xabari chiqadi", /kompas datchigi yo'q/i.test(msg));
ok("burchak raqam bilan aytiladi", /240/.test(msg), msg.replace(/<[^>]+>/g, " ").trim().slice(0, 80));
ok("sahifada hisob ham bor", /3 531|3531/.test(nodes["#qibla-body"].innerHTML.replace(/ /g, " ")));

console.log(failed ? `\n${failed} ta sinov muvaffaqiyatsiz` : "\nHamma sinov o'tdi");
process.exit(failed ? 1 : 0);
