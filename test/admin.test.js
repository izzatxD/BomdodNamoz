// ============================================================
//  admin.js sinovi — admin paneldagi raqamlar eskirib qolmasligini tekshiradi
//
//  Telegram Mini App yopilganda uni O'CHIRMAYDI: WebView xotirada qoladi va
//  keyin ochilganda sahifa qayta yuklanmaydi. Shu sababli bir marta olingan
//  statistika kunlab turib qolishi mumkin edi — botga yangi odamlar qo'shilsa
//  ham kartochkada eski "N foydalanuvchi" ko'rinardi.
//
//  Bu sinov shuni tekshiradi:
//    • ko'rinishga qaytganda raqamlar serverdan qayta so'raladi
//    • lekin har chizilganda emas — qisqa vaqt ichida takror so'rov ketmaydi
//    • tarmoq uzilsa eski raqamlar saqlanadi, sahifa bo'shab qolmaydi
//
//  Ishga tushirish:  node test/admin.test.js
// ============================================================
const path = require("path");
const ADMIN = path.join(__dirname, "..", "webapp", "admin.js");

let failed = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "  ok   " : "  XATO ") + name + (extra ? " — " + extra : ""));
  if (!cond) failed++;
};
const tick = () => new Promise((r) => setImmediate(r));

// Statistika javobi — faqat sinovga kerakli maydonlar
function stats(users, extra) {
  return Object.assign({
    ok: true, users, new_today: 0, new_week: 0, dau: 0, wau: 0, loyal: 0,
    nur_today: 0, nur_week: 0, teams: 0, team_members: 0, friend_pairs: 0,
    videos: 0, files: 0, db_kb: 0, blocked: 0, reminders: 0, last_backup: 0,
    persistent: true, since: 0, now: 0, series: [], levels: [], last_broadcast: null,
  }, extra || {});
}

function makeEnv() {
  const el = () => ({
    innerHTML: "", onclick: null,
    classList: { add() {}, remove() {}, toggle() {} },
    querySelectorAll: () => [],
  });
  const nodes = { "#admin-body": el(), "#admin-card": el() };
  const hooks = {};                       // onTab / onSync / visibilitychange qayta chaqiruvlari
  let calls = 0, reply = stats(77), now = 1_000_000;

  global.Date.now = () => now;
  global.document = {
    hidden: false,
    addEventListener: (name, fn) => { hooks[name] = fn; },
  };
  global.App = {
    $: (sel) => nodes[sel] || null,
    haptic() {}, notify() {}, esc: (s) => String(s),
    showTab() {}, state: { tab: "home" },
    onTab: (name, fn) => { hooks["tab:" + name] = fn; },
  };
  global.Api = {
    enabled: true,
    meta: { isAdmin: true },
    onSync: (fn) => { hooks.sync = fn; },
    adminStats: () => { calls++; return Promise.resolve(reply); },
  };
  global.Icons = { get: () => "" };
  global.Nur = { LEVELS: [] };
  // Brauzerda `window.Nur` va `Nur` bir narsa — node'da bo'lmagani uchun ikkalasi ham beriladi
  global.window = { Admin: null, Nur: global.Nur, App: global.App, Api: global.Api, Icons: global.Icons };

  delete require.cache[require.resolve(ADMIN)];
  require(ADMIN);
  return {
    Admin: global.window.Admin, nodes, hooks,
    calls: () => calls,
    setReply: (r) => { reply = r; },
    advance: (ms) => { now += ms; },
  };
}

(async () => {
  console.log("\n1) Birinchi ochilishda raqamlar serverdan olinadi");
  const E = makeEnv();
  E.hooks["tab:admin"]();                              // admin bo'limi ochildi
  await tick(); await tick();
  ok("serverga bir marta murojaat qilindi", E.calls() === 1, "calls=" + E.calls());
  ok("sahifada foydalanuvchilar soni bor", E.nodes["#admin-body"].innerHTML.includes(">77<"));
  ok("bosh sahifadagi kartochkada ham", E.nodes["#admin-card"].innerHTML.includes("77 foydalanuvchi"));

  console.log("\n2) Qayta chizish serverni bekorga bezovta qilmaydi");
  E.Admin.render(); E.Admin.renderHome(); E.hooks["tab:admin"]();
  await tick(); await tick();
  ok("qisqa vaqt ichida takror so'rov yo'q", E.calls() === 1, "calls=" + E.calls());

  console.log("\n3) Botga 3 kishi qo'shildi — ilova ko'rinishga qaytganda raqam yangilanadi");
  E.setReply(stats(80, { new_today: 3 }));             // serverda endi 80 ta
  E.advance(60_000);                                   // ilova bir muddat fonda turdi
  E.hooks.visibilitychange();                          // Telegram uni qaytadan ko'rsatdi
  await tick(); await tick();
  ok("server qaytadan so'raldi", E.calls() === 2, "calls=" + E.calls());
  ok("kartochkada yangi son", E.nodes["#admin-card"].innerHTML.includes("80 foydalanuvchi"),
    E.nodes["#admin-card"].innerHTML.includes("77 foydalanuvchi") ? "eski 77 turib qoldi" : "");
  E.Admin.render();
  ok("sahifada ham yangi son", E.nodes["#admin-body"].innerHTML.includes(">80<"));

  console.log("\n4) Sinxronlashda ham yangilanadi");
  E.setReply(stats(81));
  E.advance(60_000);
  E.hooks.sync();
  await tick(); await tick();
  ok("kartochkada 81", E.nodes["#admin-card"].innerHTML.includes("81 foydalanuvchi"));

  console.log("\n5) Tarmoq uzilsa oxirgi raqamlar saqlanadi");
  E.setReply(null);                                    // Api.call() xatoda null qaytaradi
  E.advance(60_000);
  E.hooks["tab:admin"]();
  await tick(); await tick();
  const body = E.nodes["#admin-body"].innerHTML;
  ok("sahifa bo'shab qolmadi", body.includes(">81<"));
  ok("yangilanmagani aytiladi", body.includes("yangilash o'tmadi"));
  ok("kartochkada ham raqam qoldi", E.nodes["#admin-card"].innerHTML.includes("81 foydalanuvchi"));

  console.log("\n6) Tarmoq qaytgach o'zi tiklanadi");
  E.setReply(stats(84));
  E.advance(60_000);
  E.hooks["tab:admin"]();
  await tick(); await tick();
  ok("sahifada 84", E.nodes["#admin-body"].innerHTML.includes(">84<"));
  ok("xato yozuvi yo'qoldi", !E.nodes["#admin-body"].innerHTML.includes("yangilash o'tmadi"));

  console.log(failed ? `\n${failed} ta sinov muvaffaqiyatsiz` : "\nHamma sinov o'tdi");
  process.exit(failed ? 1 : 0);
})();
