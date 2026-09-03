// ============================================================
//  STORE — ma'lumotlarni saqlash
//  Telegram CloudStorage (foydalanuvchining barcha qurilmalarida sinxron)
//  + localStorage (zaxira / brauzerda test uchun)
// ============================================================
window.Store = (function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  const cloud = tg && tg.CloudStorage && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.CloudStorage : null;
  const PREFIX = "bomdod_";
  const cache = {};
  const subs = []; // set() dan keyin chaqiriladi — api.js sinxronlash uchun

  function lsGet(k) { try { return localStorage.getItem(PREFIX + k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(PREFIX + k, v); } catch (e) {} }

  // Ilova boshlanishida bir marta chaqiriladi — barcha kalitlarni yuklaydi
  function load() {
    return new Promise((resolve) => {
      if (!cloud) return resolve();
      const timer = setTimeout(resolve, 2500); // Cloud javob bermasa — kutmaymiz
      try {
        cloud.getKeys((err, keys) => {
          if (err || !keys || !keys.length) { clearTimeout(timer); return resolve(); }
          cloud.getItems(keys, (err2, items) => {
            clearTimeout(timer);
            if (!err2 && items) Object.keys(items).forEach((k) => { cache[k] = items[k]; lsSet(k, items[k]); });
            resolve();
          });
        });
      } catch (e) { clearTimeout(timer); resolve(); }
    });
  }

  function get(key, def) {
    let raw = key in cache ? cache[key] : lsGet(key);
    if (raw === null || raw === undefined || raw === "") return def;
    try { return JSON.parse(raw); } catch (e) { return raw; }
  }

  function set(key, value) {
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    cache[key] = raw; lsSet(key, raw);
    subs.forEach((f) => { try { f(key, value); } catch (e) {} });
    if (cloud) { try { cloud.setItem(key, raw.slice(0, 4096), () => {}); } catch (e) {} }
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function onChange(fn) { subs.push(fn); }

  return { load, get, set, onChange, today, dateKey, hasCloud: !!cloud };
})();
