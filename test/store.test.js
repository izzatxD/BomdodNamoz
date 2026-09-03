// ============================================================
//  store.js sinovi — foydalanuvchi ma'lumoti yo'qolmasligini tekshiradi
//
//  Telegram CloudStorage bitta kalitga 4096 belgi beradi. "days" (45 kunlik
//  tarix) undan oshadi, shuning uchun store.js uni bo'laklarga bo'lib saqlaydi.
//  Bu sinov bo'linish, qayta birlashish va eski buzuq ma'lumotdan tiklanishni
//  tekshiradi — chunki bu yerdagi xato foydalanuvchining streak, Nur va
//  nishonlarini yo'qotadi.
//
//  Ishga tushirish:  node test/store.test.js
// ============================================================
const path = require("path");
const STORE = path.join(__dirname, "..", "webapp", "store.js");

// CloudStorage'ni taqlid qiladi — 4096 dan uzun qiymatni KESADI (haqiqiy xatti-harakat)
function makeEnv(opts) {
  const cloudData = {};
  const store = {};
  let truncations = 0;
  // "ok" — normal, "err" — xato qaytaradi, "hang" — umuman javob bermaydi (sekin tarmoq)
  let mode = (opts && opts.mode) || "ok";
  global.window = {
    Telegram: {
      WebApp: {
        initDataUnsafe: { user: { id: 1 } },
        CloudStorage: {
          setItem(k, v, cb) {
            if (typeof v !== "string" || v.length > 4096) { truncations++; v = String(v).slice(0, 4096); }
            cloudData[k] = v; cb && cb(null, true);
          },
          removeItem(k, cb) { delete cloudData[k]; cb && cb(null, true); },
          getKeys(cb) {
            if (mode === "hang") return;
            if (mode === "err") return cb("network");
            cb(null, Object.keys(cloudData));
          },
          getItems(keys, cb) {
            if (mode === "hang") return;
            if (mode === "err") return cb("network");
            const o = {}; keys.forEach((k) => (o[k] = cloudData[k])); cb(null, o);
          },
        },
      },
    },
  };
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
  };
  delete require.cache[require.resolve(STORE)];
  require(STORE);
  return {
    Store: window.Store, cloudData, store,
    truncations: () => truncations,
    setMode: (m) => { mode = m; },
  };
}

// store.js ning qayta urinish oralig'i 3 soniya — sinovda uni qisqartiramiz
const realTimeout = global.setTimeout;
function fastTimers(on) {
  global.setTimeout = on ? ((fn, ms) => realTimeout(fn, Math.min(ms || 0, 3))) : realTimeout;
}
const sleep = (ms) => new Promise((r) => realTimeout(r, ms));

function bigDays(n) {
  const d = {}, base = new Date(2026, 6, 20);
  for (let i = 0; i < n; i++) {
    const dt = new Date(base); dt.setDate(base.getDate() + i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    d[key] = { t: 14, n: 15, s: { subhanalloh: 100, alhamdulillah: 33, allohuakbar: 34, istighfar: 100, salavot: 100 }, ok: true, q: 5, a: 1 };
  }
  return d;
}
const QAZO = {
  left: { bomdod: 1250, peshin: 1250, asr: 1250, shom: 1250, xufton: 1250, vitr: 1250 },
  total: { bomdod: 1825, peshin: 1825, asr: 1825, shom: 1825, xufton: 1825, vitr: 1825 },
  plan: 5,
};

let failed = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "  ok   " : "  XATO ") + name + (extra ? " — " + extra : ""));
  if (!cond) failed++;
};

(async () => {
  console.log("1) Katta ma'lumot bo'laklarga bo'lib saqlanadi");
  const A = makeEnv();
  await A.Store.load();            // himoya: load() dan oldin bulutga yozilmaydi
  const days = bigDays(45);
  A.Store.set("days", days);
  A.Store.set("qazo", QAZO);
  A.Store.set("nur", { total: 184320, upto: "2026-09-02" });
  A.Store.set("city", "Toshkent");
  ok("days bo'laklandi", !!A.cloudData["days__0"], JSON.stringify(days).length + " bayt");
  ok("bulutda hech narsa kesilmadi", A.truncations() === 0);

  console.log("\n2) Yangi qurilmada to'liq tiklanadi");
  const B = makeEnv();
  Object.assign(B.cloudData, A.cloudData);
  await B.Store.load();
  const q = B.Store.get("qazo", { left: {}, total: {} });
  ok("days to'liq", JSON.stringify(B.Store.get("days", {})) === JSON.stringify(days));
  ok("qazo hisobi butun", q.left.bomdod === 1250 && q.total.vitr === 1825);
  ok("jami Nur butun", B.Store.get("nur", {}).total === 184320);
  ok("oddiy satr butun", B.Store.get("city", "") === "Toshkent");

  console.log("\n3) Ma'lumot kichrayganda eski bo'laklar tozalanadi");
  B.Store.set("days", bigDays(3));
  ok("ortiqcha bo'lak qolmadi", Object.keys(B.cloudData).filter((k) => /^days__/.test(k)).length === 0);
  const C = makeEnv(); Object.assign(C.cloudData, B.cloudData); await C.Store.load();
  ok("kichraygan qiymat to'g'ri o'qildi", Object.keys(C.Store.get("days", {})).length === 3);

  console.log("\n4) Eski versiyadan qolgan kesilgan ma'lumot ilovani buzmaydi");
  const D = makeEnv();
  D.cloudData["days"] = JSON.stringify(bigDays(45)).slice(0, 4096);
  await D.Store.load();
  const d4 = D.Store.get("days", {});
  ok("buzuq JSON xom satr bo'lib qaytmaydi", typeof d4 === "object" && !Array.isArray(d4));
  D.Store.set("days", bigDays(45));
  const E = makeEnv(); Object.assign(E.cloudData, D.cloudData); await E.Store.load();
  ok("keyingi saqlashda o'zi tuzaladi", Object.keys(E.Store.get("days", {})).length === 45);

  console.log("\n5) Bulutdagi bo'lak yo'qolsa, telefondagi nusxa saqlanadi");
  const F = makeEnv();
  F.Store.set("days", days);
  delete F.cloudData["days__1"];
  const G = makeEnv();
  Object.assign(G.cloudData, F.cloudData);
  G.store["bomdod_days"] = JSON.stringify(days);
  await G.Store.load();
  ok("to'liq nusxa saqlanib qoldi", Object.keys(G.Store.get("days", {})).length === 45);

  // ---- Eng xavfli holat ----
  // Sekin tarmoqda ilova ochildi, bulut javob bermadi. Agar ilova bu paytda
  // "foydalanuvchi yangi" deb o'ylab yoza boshlasa — bulutdagi qazo va Nur
  // tarixi butunlay o'chadi. Ayni shu yo'l berkitilganini tekshiramiz.
  fastTimers(true);

  console.log("\n6) Bulut javob bermasa — bulutdagi ma'lumot o'chirilmaydi");
  const H = makeEnv({ mode: "hang" });
  Object.assign(H.cloudData, A.cloudData);        // bulutda 45 kunlik tarix va qazo bor
  const snapshot = JSON.stringify(H.cloudData);
  await H.Store.load();                            // javob kelmaydi
  ok("bulut o'qilmagani bilinadi", H.Store.synced === false);
  H.Store.set("gender", "erkak");                  // foydalanuvchi qaytadan kiritdi
  H.Store.set("days", bigDays(1));                 // va bitta zikr qildi
  H.Store.set("qazo", { left: {}, total: {}, plan: 5 });
  ok("bulutdagi nusxa tegilmadi", JSON.stringify(H.cloudData) === snapshot);
  ok("telefonda ishlayveradi", H.Store.get("gender", null) === "erkak");

  console.log("\n7) Aloqa tiklanganda tarix qaytadi");
  H.setMode("ok");
  await sleep(60);                                 // fon urinishi ishga tushadi
  ok("bulut o'qildi", H.Store.synced === true);
  ok("qazo hisobi qaytdi", H.Store.get("qazo", {}).left.bomdod === 1250);
  ok("45 kunlik tarix qaytdi", Object.keys(H.Store.get("days", {})).length === 45);
  ok("jami Nur qaytdi", H.Store.get("nur", {}).total === 184320);

  console.log("\n8) Telefonda ma'lumot bo'lsa — seansdagi o'zgarish ustun turadi");
  const I = makeEnv({ mode: "err" });
  Object.assign(I.cloudData, A.cloudData);
  I.store["bomdod_city"] = "Toshkent";                   // telefonda avval ham bor edi (satr xom saqlanadi)
  await I.Store.load();
  I.Store.set("city", "Farg'ona");                       // foydalanuvchi o'zgartirdi
  I.setMode("ok");
  await sleep(60);
  ok("yangi tanlov saqlandi", I.Store.get("city", "") === "Farg'ona");
  ok("bulutga ham yozildi", I.cloudData["city"] === "Farg'ona");
  ok("tegilmagan tarix bulutdan olindi", Object.keys(I.Store.get("days", {})).length === 45);

  console.log("\n9) Bulut haqiqatan bo'sh bo'lsa — yozishga ruxsat beriladi");
  const J = makeEnv();                                   // bo'sh bulut, xato yo'q
  await J.Store.load();
  ok("darhol tayyor", J.Store.synced === true);
  J.Store.set("gender", "ayol");
  ok("yangi foydalanuvchi yoza oladi", J.cloudData["gender"] === "ayol");

  console.log("\n10) Kun tarixi cheksiz o'smaydi");
  // days{} har kuni ~140 bayt o'sadi. Cheklanmasa ~15 oydan keyin bulutning
  // 64 KB chegarasidan oshadi va cloudSet JIMGINA yozmay qo'yadi — qurilma
  // almashtirilganda hammasi yo'qoladi. Ikkala yozuvchi ham 45 kun bilan
  // cheklashi shart: zikr.js (zikr qilganda) va nur.js (qazo/dars belgilanganda).
  const src = require("fs").readFileSync(path.join(__dirname, "..", "webapp", "nur.js"), "utf8");
  const zsrc = require("fs").readFileSync(path.join(__dirname, "..", "webapp", "zikr.js"), "utf8");
  ok("nur.js cheklaydi", /while \(keys\.length > 45\)/.test(src));
  ok("zikr.js cheklaydi", /while \(keys\.length > 45\)/.test(zsrc));
  ok("nur.js to'g'ridan-to'g'ri yozmaydi", (src.match(/Store\.set\("days"/g) || []).length === 1);
  ok("zikr.js to'g'ridan-to'g'ri yozmaydi", (zsrc.match(/Store\.set\("days"/g) || []).length === 1);

  // 45 kunlik eng og'ir holat bulutga to'liq sig'ishi kerak (16 bo'lak = 64 KB)
  const K = makeEnv();
  await K.Store.load();
  K.Store.set("days", bigDays(45));
  const parts = Object.keys(K.cloudData).filter((k) => /^days__/.test(k)).length;
  ok("bulutga to'liq sig'di", parts > 0 && parts <= 16, parts + " bo'lak");

  fastTimers(false);
  console.log(failed ? `\n${failed} ta sinov muvaffaqiyatsiz` : "\nHamma sinov o'tdi");
  process.exit(failed ? 1 : 0);
})();
