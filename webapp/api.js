// ============================================================
//  API — reyting serveri bilan aloqa (bot/api.py). Server ulanmagan bo'lsa ilova serversiz ishlaydi.
//  Serverga faqat: ism, anonim belgisi, daraja va oxirgi 7 kunning KATEGORIYA bo'yicha Nur'i yuboriladi.
//  Zikr, tasbih, qazo va dars tafsilotlari hech qachon yuborilmaydi.
//  Manzil: data.js → apiUrl. Har so'rovda Telegram initData (X-Init-Data) yuboriladi — server HMAC bilan tekshiradi.
// ============================================================
window.Api = (function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  const base = String(window.APP_DATA.apiUrl || "").replace(/\/+$/, "");
  const initData = (tg && tg.initData) || "";
  const enabled = !!base && !!initData;
  const SYNC_KEYS = ["days", "today", "qazo", "arab", "profile", "habit"]; // shu kalitlar o'zgarsa — sinxronlash
  const listeners = [];
  let timer = null, lastError = null, meta = null, inflight = null;

  async function call(path, body) {
    if (!enabled) return null;
    try {
      const r = await fetch(base + path, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", "X-Init-Data": initData },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) { lastError = r.status; return null; }
      lastError = null;
      return await r.json();
    } catch (e) { lastError = "network"; return null; }
  }

  function payload() {
    const p = Store.get("profile", {});
    return { name: p.name || "", anon: !!p.anon, total: Nur.total(), level: Nur.level().index, days: Nur.lastDays(7) };
  }
  function sync() {
    if (!enabled) return Promise.resolve(null);
    if (inflight) return inflight;
    inflight = call("/api/sync", payload()).then((r) => {
      inflight = null;
      if (r && r.ok) { meta = r; listeners.forEach((f) => { try { f(r); } catch (e) {} }); }
      return r;
    });
    return inflight;
  }
  function scheduleSync(ms) { if (!enabled) return; clearTimeout(timer); timer = setTimeout(sync, ms == null ? 2500 : ms); }
  function board(scope, team) {
    return call("/api/board?scope=" + encodeURIComponent(scope) + (team ? "&team=" + encodeURIComponent(team) : ""));
  }
  function onSync(fn) { listeners.push(fn); }

  // ---------- video katalogi ----------
  function content() { return call("/api/content"); }
  // Admin amallari. Server ADMIN_IDS bo'yicha ruxsatni qayta tekshiradi — bu yerdagi chaqiruv kifoya emas.
  function saveVideo(v) { return call("/api/admin/video", v); }
  function deleteVideo(id) { return call("/api/admin/video/delete", { id }); }
  function moveVideo(id, dir) { return call("/api/admin/video/move", { id, dir }); }
  function deleteFile(id) { return call("/api/admin/file/delete", { id }); }
  function lookup(url) { return call("/api/admin/lookup", { url }); }
  function adminStats() { return call("/api/admin/stats"); }   // faqat adminlar; faqat yig'indilar

  Store.onChange((key) => { if (SYNC_KEYS.includes(key)) scheduleSync(); });

  return {
    enabled, sync, scheduleSync, board, onSync,
    content, saveVideo, deleteVideo, moveVideo, deleteFile, lookup, adminStats,
    get meta() { return meta; }, get error() { return lastError; },
  };
})();
