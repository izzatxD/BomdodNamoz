// ============================================================
//  Bomdod namozi — asosiy mantiq (yadro)
//  Boshqa modullar: zikr.js, arabic.js, qazo.js — App orqali ulanadi
// ============================================================
window.App = (function () {
  const D = window.APP_DATA;
  const tg = window.Telegram && window.Telegram.WebApp;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const state = {
    gender: null, city: "Toshkent", geo: null, rakat: "sunnat", step: 0,
    suraKind: "suralar", tab: "home", arabicSize: 30,
  };
  const tabRenderers = {};          // modullar ro'yxatga oladi: App.onTab("zikr", fn)
  const titles = { home: "Bomdod namozi", namoz: "Qadam-baqadam", qazo: "Qazo namozlar", zikr: "Zikrlar", arab: "Arab tili", suralar: "Suralar va duolar", video: "Video darslar", reyting: "Reyting" };
  const navFor = { qazo: "namoz", video: "home" }; // pastki menyuda qaysi tugma yonadi

  function haptic(type) { try { tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(type || "light"); } catch (e) {} }
  function notify(type) { try { tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred(type || "success"); } catch (e) {} }
  function confirmDlg(msg, cb) {
    if (tg && tg.showConfirm) { try { return tg.showConfirm(msg, (ok) => ok && cb()); } catch (e) {} }
    if (window.confirm(msg)) cb();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  // ---------- mavzu (light/dark) ----------
  function applyTheme() {
    const scheme = (tg && tg.colorScheme) || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", scheme);
    if (tg) { try { tg.setHeaderColor(scheme === "dark" ? "#0E1512" : "#F2F5F3"); tg.setBackgroundColor(scheme === "dark" ? "#0E1512" : "#F2F5F3"); } catch (e) {} }
  }
  applyTheme();
  if (tg) {
    tg.ready(); tg.expand();
    tg.onEvent("themeChanged", applyTheme);
    tg.BackButton.onClick(() => {
      if ($("#screen-detail").classList.contains("active")) closeDetail();
      else if (state.tab !== "home") showTab("home");
    });
  }

  // ---------- boshlash ----------
  async function init() {
    await Store.load();
    state.gender = Store.get("gender", null);
    state.city = Store.get("city", "Toshkent");
    state.geo = Store.get("geo", null);          // { lng, lat, ts } — GPS orqali aniqlangan joy
    state.arabicSize = Number(Store.get("arabicSize", 30)) || 30;
    document.documentElement.style.setProperty("--arabic-size", state.arabicSize + "px");
    Icons.mount();

    // salomlashish
    const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
    $("#greet").textContent = user && user.first_name ? `Assalomu alaykum, ${user.first_name}` : "Assalomu alaykum";

    $$(".gender-card").forEach((b) => b.addEventListener("click", () => setGender(b.dataset.gender, true)));
    $("#btn-gender").addEventListener("click", () => { haptic(); setGender(state.gender === "erkak" ? "ayol" : "erkak", false); });
    $$(".nav").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
    $$("[data-go]").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.go)));
    $$("#rakat-seg .seg").forEach((b) => b.addEventListener("click", () => { state.rakat = b.dataset.rakat; state.step = 0; renderNamoz(); }));
    $$("#sura-seg .seg").forEach((b) => b.addEventListener("click", () => { state.suraKind = b.dataset.kind; renderSuraList(); }));
    $("#step-prev").addEventListener("click", () => { if (state.step > 0) { state.step--; haptic(); renderStep(); } });
    $("#step-next").addEventListener("click", () => { if (state.step < D.namoz.steps.length - 1) { state.step++; haptic(); renderStep(); } });
    $("#detail-back").addEventListener("click", closeDetail);
    $("#font-plus").addEventListener("click", () => setArabicSize(state.arabicSize + 3));
    $("#font-minus").addEventListener("click", () => setArabicSize(state.arabicSize - 3));

    const sel = $("#city-select");
    const gpsOpt = document.createElement("option"); gpsOpt.value = "gps"; gpsOpt.textContent = "📍 Joylashuvim (GPS)"; sel.appendChild(gpsOpt);
    D.cities.forEach((c) => { const o = document.createElement("option"); o.value = c.name; o.textContent = "📍 " + c.name; sel.appendChild(o); });
    if (state.city === "gps" && !state.geo) state.city = "Toshkent";
    sel.value = state.city; updateCityLabel();
    sel.addEventListener("change", () => {
      if (sel.value === "gps") { locateAndLoad(false); return; }
      state.city = sel.value; Store.set("city", state.city); updateCityLabel(); loadPrayerTimes();
    });
    $("#city-btn").addEventListener("click", () => { haptic(); try { sel.showPicker ? sel.showPicker() : sel.focus(); } catch (e) { sel.focus(); } });

    // Bulut sekin tarmoqda kech javob berishi mumkin. Kelganda holatni qayta o'qib,
    // ekranni yangilaymiz — foydalanuvchi ma'lumoti yo'qolgandek ko'rinib qolmasin.
    Store.onReady(() => {
      state.gender = Store.get("gender", state.gender);
      state.city = Store.get("city", state.city);
      state.geo = Store.get("geo", state.geo);
      if (!state.gender) return;
      if ($("#app").classList.contains("hidden")) enterApp();
      else { renderToday(); if (tabRenderers[state.tab]) tabRenderers[state.tab](); }
    });

    if (window.Api) Api.scheduleSync(600);
    if (state.city === "gps" && state.geo && Date.now() - state.geo.ts > 3600e3) locateAndLoad(true); // joyni jimgina yangilash
    if (state.gender) enterApp();
    // Bot xabaridagi tugma orqali to'g'ridan-to'g'ri bo'limga o'tish: ?tab=reyting (yoki startapp=reyting)
    const startTab = new URLSearchParams(location.search).get("tab") || (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || "";
    if (state.gender && titles[startTab]) showTab(startTab);
  }

  function setGender(g, enter) {
    state.gender = g; Store.set("gender", g);
    $("#btn-gender").textContent = g === "erkak" ? "👨 Erkak" : "🧕 Ayol";
    $("#topbar-sub").textContent = g === "erkak" ? "Erkaklar uchun ko'rsatma" : "Ayollar uchun ko'rsatma";
    if (enter) { haptic("medium"); enterApp(); }
    else { renderNamoz(); renderVideos(); }
  }

  function enterApp() {
    $("#screen-welcome").classList.remove("active");
    $("#app").classList.remove("hidden");
    setGender(state.gender, false);
    renderNamoz(); renderSuraList(); renderVideos(); loadPrayerTimes();
    showTab("home");
  }

  // ---------- tablar ----------
  function showTab(name) {
    state.tab = name;
    $$(".tab").forEach((s) => s.classList.toggle("active", s.id === "tab-" + name));
    const navName = navFor[name] || name;
    $$(".nav").forEach((b) => b.classList.toggle("active", b.dataset.tab === navName));
    $("#topbar-title").textContent = titles[name] || "Bomdod namozi";
    if (tabRenderers[name]) tabRenderers[name]();
    if (name === "home") renderToday();
    window.scrollTo(0, 0);
    if (tg) name === "home" ? tg.BackButton.hide() : tg.BackButton.show();
  }
  function onTab(name, fn) { tabRenderers[name] = fn; }

  // ---------- bugungi kartochka (bosh sahifa) ----------
  function renderToday() {
    const el = $("#today-card");
    if (!window.Zikr) { el.innerHTML = ""; return; }
    const s = Zikr.summary();
    if (!s.started) {
      el.innerHTML = `<span class="tile-icon t-green" style="margin:0">${Icons.get("sprout")}</span><div class="today-body"><div class="today-head"><b>Zikr odatini boshlang</b></div>
        <p class="small muted" style="margin:0 0 8px">30 kunlik dastur — har hafta yuk sekin oshadi.</p>
        <button class="btn primary" data-go="zikr" style="padding:9px 16px">Boshlash</button></div>`;
    } else {
      const done = s.tasks.filter((t) => t.done).length, pct = s.tasks.length ? done / s.tasks.length : 0;
      el.innerHTML = `${ring(pct, 64, `${done}/${s.tasks.length}`)}<div class="today-body">
        <div class="today-head"><b>${s.day}-kun <span class="muted">/ 30</span></b><span class="streak">${Icons.get("flame", 13)} ${s.streak}</span></div>
        <div class="today-tasks">${s.tasks.map((t) => `<span class="task ${t.done ? "done" : ""}">${t.done ? Icons.get("check", 15) : '<span style="width:15px;height:15px;border:1.5px solid var(--line);border-radius:5px;display:inline-block"></span>'} ${esc(t.label)}</span>`).join("")}</div></div>
        <button class="menu-arrow" data-go="zikr">${Icons.get("chevron")}</button>`;
    }
    $$("#today-card [data-go]").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.go)));
    if (window.Reyting) Reyting.renderHome();
  }

  // ---------- namoz vaqti ----------
  let countdownTimer = null;
  // Vaqtlar vaqt.js da hisoblanadi — O'zbekiston musulmonlari idorasi usuli, internet kerak emas.
  // Rasmiy usulda faqat UZUNLIK kerak: kenglik hamma hudud uchun 41.31°N. GPS — viloyat markazi o'rniga joyning o'z uzunligi.
  let lastTimes = null, lastDay = "";
  function currentLng() {
    if (state.city === "gps" && state.geo) return state.geo.lng;
    return (D.cities.find((c) => c.name === state.city) || D.cities[0]).lng;
  }
  function loadPrayerTimes() {
    const now = new Date(), t = Vaqt.times(now, currentLng()), h = Vaqt.hijri(now);
    lastTimes = t; lastDay = Store.today();
    $("#hero-date").textContent = gregorianDate() + (h ? ` · ${h.day} ${HIJRI[h.month - 1] || h.month} ${h.year}` : "");
    startCountdown();
  }
  const NAMES = { bomdod: "Bomdod", quyosh: "Quyosh", peshin: "Peshin", asr: "Asr", shom: "Shom", xufton: "Xufton" };
  function toMin(s) { const [a, b] = s.split(":").map(Number); return a * 60 + b; }

  // Kunning qaysi qismidamiz: hozir qaysi namoz vaqti va keyingisi nima.
  // Namoz oynalari: bomdod → quyosh | peshin → asr | asr → shom | shom → xufton | xufton → ertangi bomdod.
  // Quyosh chiqishidan peshingacha — namoz vaqti emas (faqat kutish).
  function prayerState(t, nowMin) {
    const m = {}; Object.keys(NAMES).forEach((k) => (m[k] = toMin(t[k])));
    if (nowMin < m.bomdod)  return { now: "xufton", next: "bomdod", at: m.bomdod, left: m.bomdod - nowMin };
    if (nowMin < m.quyosh)  return { now: "bomdod", next: "quyosh", at: m.quyosh, left: m.quyosh - nowMin };
    if (nowMin < m.peshin)  return { now: null,     next: "peshin", at: m.peshin, left: m.peshin - nowMin };
    if (nowMin < m.asr)     return { now: "peshin", next: "asr",    at: m.asr,    left: m.asr - nowMin };
    if (nowMin < m.shom)    return { now: "asr",    next: "shom",   at: m.shom,   left: m.shom - nowMin };
    if (nowMin < m.xufton)  return { now: "shom",   next: "xufton", at: m.xufton, left: m.xufton - nowMin };
    return { now: "xufton", next: "bomdod", at: m.bomdod, left: 24 * 60 - nowMin + m.bomdod, tomorrow: true };
  }

  const PRAYER_ICON = { bomdod: "dawn", quyosh: "sunrise", peshin: "sun", asr: "sun", shom: "sunset", xufton: "moon" };
  // Sanoq: 1 soatdan ko'p bo'lsa H:MM:SS, aks holda MM:SS
  function fmtClock(sec) {
    sec = Math.max(0, sec);
    const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    const p = (n) => String(n).padStart(2, "0");
    return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
  }

  // Hero: keyingi namozgacha jonli sanoq
  function renderHero(s, secLeft) {
    $("#next-label").textContent = s.now === "bomdod" ? "Quyosh chiqishigacha" : `${NAMES[s.next]}gacha`;
    $("#countdown").textContent = fmtClock(secLeft);
  }

  // Hero'dagi 6 ta vaqt; hozir davom etayotgan namoz vaqti ajratib ko'rsatiladi
  function renderAllTimes(t, s) {
    const el = $("#times-all"); if (!el || !t) return;
    el.innerHTML = Object.keys(NAMES).map((k) =>
      `<div class="${k === s.now ? "now" : ""}">
         <small>${NAMES[k]}</small>
         ${Icons.get(PRAYER_ICON[k], 16)}
         <b>${t[k]}</b>
       </div>`).join("");
  }

  // ---------- joylashuv (GPS) ----------
  // silent — ilova ochilganda jimgina yangilash: xato bo'lsa eski joy qoladi, ogohlantirish chiqmaydi
  function locateAndLoad(silent) {
    const sel = $("#city-select");
    const done = (lng, lat) => {
      state.geo = { lng: +Number(lng).toFixed(3), lat: +Number(lat).toFixed(3), ts: Date.now() }; Store.set("geo", state.geo);
      state.city = "gps"; Store.set("city", "gps"); sel.value = "gps";
      if (!silent) notify("success");
      updateCityLabel(); loadPrayerTimes();
    };
    const fail = (why) => {
      if (silent) return;
      if (state.city === "gps") { state.city = "Toshkent"; Store.set("city", state.city); }
      sel.value = state.city; updateCityLabel(); loadPrayerTimes();
      alertMsg(why || "Joylashuvni aniqlab bo'lmadi. Shaharni ro'yxatdan tanlang.");
    };
    const lm = tg && tg.LocationManager;
    if (lm && tg.isVersionAtLeast && tg.isVersionAtLeast("8.0")) {          // 1) Telegram (Bot API 8.0+)
      try {
        lm.init(() => {
          if (!lm.isLocationAvailable) return fail("Qurilmada joylashuv o'chirilgan.");
          lm.getLocation((loc) => {
            if (loc) return done(loc.longitude, loc.latitude);
            fail("Telegram'da joylashuvga ruxsat berilmagan. Sozlamalardan yoqing.");
            if (!silent) { try { lm.openSettings(); } catch (e) {} }
          });
        });
        return;
      } catch (e) {}
    }
    if (navigator.geolocation) {                                            // 2) Brauzer
      navigator.geolocation.getCurrentPosition(
        (p) => done(p.coords.longitude, p.coords.latitude), () => fail(),
        { timeout: 10000, maximumAge: 600000 });
      return;
    }
    fail("Bu qurilmada joylashuv mavjud emas.");
  }
  function updateCityLabel() {
    const btn = $("#city-btn"), name = $("#city-name");
    if (state.city === "gps" && state.geo) {
      const g = state.geo, d2 = (c) => (c.lat - g.lat) ** 2 + (c.lng - g.lng) ** 2;
      const near = D.cities.reduce((b, c) => (d2(c) < d2(b) ? c : b), D.cities[0]);
      name.textContent = `${near.name} · GPS`; btn.classList.add("gps");
    } else { name.textContent = state.city; btn.classList.remove("gps"); }
  }
  function alertMsg(text) { if (tg && tg.showAlert) { try { return tg.showAlert(text); } catch (e) {} } alert(text); }
  const MONTHS = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];
  const WEEKDAYS = ["Yakshanba","Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba"];
  const HIJRI = ["Muharram","Safar","Rabi'ul-avval","Rabi'ul-oxir","Jumadul-avval","Jumadul-oxir","Rajab","Sha'bon","Ramazon","Shavvol","Zulqa'da","Zulhijja"];
  function gregorianDate() { const d = new Date(); return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
  function startCountdown() {
    clearInterval(countdownTimer);
    const tick = () => {
      if (Store.today() !== lastDay) return loadPrayerTimes();   // yarim tun o'tdi — yangi kunning vaqtlari
      if (!lastTimes) return;
      const now = new Date();
      const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const s = prayerState(lastTimes, Math.floor(nowSec / 60));
      let left = s.at * 60 - nowSec;
      if (left < 0) left += 24 * 3600;                          // ertangi bomdod
      renderHero(s, left);
      renderAllTimes(lastTimes, s);
      const el = $("#hero-count-box") || $("#countdown").parentElement;
      el.classList.toggle("live", !!s.now);                     // namoz vaqti davom etyapti
      el.classList.toggle("soon", left <= 15 * 60);             // 15 daqiqadan kam qoldi
    };
    tick();
    countdownTimer = setInterval(tick, 1000);                   // sanoq soniyalab yuradi
  }
  // Ilova fonda turganda sanoqni to'xtatamiz — batareyani bekorga sarflamaslik uchun
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInterval(countdownTimer);
    else if (lastTimes) { if (Store.today() !== lastDay) loadPrayerTimes(); else startCountdown(); }
  });

  // ---------- qadam-baqadam ----------
  function renderNamoz() {
    $("#namoz-intro").innerHTML = `<p>${D.namoz.intro}</p>`;
    $$("#rakat-seg .seg").forEach((b) => b.classList.toggle("active", b.dataset.rakat === state.rakat));
    $("#niyat-text").textContent = state.rakat === "sunnat" ? D.namoz.sunnatNiyat : D.namoz.farzNiyat;
    $("#namoz-after").innerHTML = `<div class="card-label">Namozdan so'ng</div><p>${D.namoz.after}</p>`;
    renderStep();
  }
  function renderStep() {
    const steps = D.namoz.steps, i = state.step, s = steps[i], g = state.gender || "erkak", note = s[g];
    let html = `<div class="step fade">
      <div class="step-head"><div class="step-icon">${s.icon}</div><div><div class="step-num">${i + 1}-qadam</div><div class="step-title">${s.title}</div></div></div>
      <div class="step-text">${s.text}</div>
      ${note ? `<div class="step-gender"><b>${g === "erkak" ? "👨 Erkaklar uchun" : "🧕 Ayollar uchun"}</b>${note}</div>` : ""}`;
    if (s.zikr) { const z = D.zikrlar.find((x) => x.id === s.zikr); if (z) html += `<button class="step-link" data-open="zikr:${z.id}"><span>${Icons.get("beads", 18)} ${z.title}</span>${Icons.get("chevron", 18)}</button>`; }
    if (s.sura) { const su = D.suralar.find((x) => x.id === s.sura); if (su) html += `<button class="step-link" data-open="sura:${su.id}"><span>${Icons.get("book", 18)} ${su.title}</span>${Icons.get("chevron", 18)}</button>`; }
    html += `</div>`;
    $("#step-view").innerHTML = html;
    $$("#step-view [data-open]").forEach((b) => b.addEventListener("click", () => openDetail(b.dataset.open)));
    $("#step-counter").textContent = `${i + 1} / ${steps.length}`;
    $("#step-progress").style.width = ((i + 1) / steps.length * 100) + "%";
    $("#step-prev").disabled = i === 0; $("#step-next").disabled = i === steps.length - 1;
  }

  // ---------- suralar ----------
  function renderSuraList() {
    $$("#sura-seg .seg").forEach((b) => b.classList.toggle("active", b.dataset.kind === state.suraKind));
    const list = $("#sura-list"); list.innerHTML = "";
    if (state.suraKind === "suralar") D.suralar.forEach((s) => list.appendChild(listItem(`${s.number}`, s.title + (s.required ? ' <span class="badge">SHART</span>' : ""), `${s.ayahs} oyat${s.note ? " · " + s.note : ""}`, () => openDetail("sura:" + s.id))));
    else D.zikrlar.forEach((z) => list.appendChild(listItem("📿", z.title, z.when, () => openDetail("zikr:" + z.id))));
  }
  function listItem(num, title, sub, onClick) {
    const b = document.createElement("button");
    b.className = "list-item";
    b.innerHTML = `<div class="list-num">${num}</div><div class="list-body"><div class="list-title">${title}</div><div class="list-sub">${sub}</div></div>${Icons.get("chevron")}`;
    b.addEventListener("click", onClick);
    return b;
  }

  // ---------- batafsil (overlay) ----------
  function openDetail(key) {
    haptic();
    const [kind, id] = key.split(":");
    const obj = (kind === "sura" ? D.suralar : D.zikrlar).find((x) => x.id === id);
    if (!obj) return;
    const sub = kind === "sura" ? `${obj.number}-sura · ${obj.ayahs} oyat${obj.note ? " · " + obj.note : ""}` : `Qachon: ${obj.when}`;
    openDetailHtml(`
      <div class="detail-title fade">${obj.title}</div><div class="detail-sub">${sub}</div>
      <div class="arabic fade">${formatArabic(obj.arabic)}</div>
      <div class="block fade"><div class="card-label">O'qilishi</div><div class="latin">${obj.latin}</div></div>
      <div class="block fade"><div class="card-label">Ma'nosi</div><div class="meaning">${obj.meaning}</div></div>`);
  }
  function openDetailHtml(html) {
    $("#detail-body").innerHTML = html;
    $("#screen-detail").classList.add("active");
    $("#screen-detail").scrollTop = 0;
    if (tg) tg.BackButton.show();
  }
  function closeDetail() {
    $("#screen-detail").classList.remove("active");
    if (tg && state.tab === "home") tg.BackButton.hide();
    if (tabRenderers[state.tab]) tabRenderers[state.tab](); // holat yangilangan bo'lishi mumkin
  }
  function formatArabic(text) {
    const parts = text.split("۝").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 1) return parts[0];
    return parts.map((p, i) => `${p} <span class="ayah-mark">${toArabicDigits(i + 1)}</span>`).join(" ");
  }
  function toArabicDigits(n) { return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]); }
  function setArabicSize(px) {
    state.arabicSize = Math.max(20, Math.min(48, px));
    Store.set("arabicSize", state.arabicSize);
    document.documentElement.style.setProperty("--arabic-size", state.arabicSize + "px");
  }

  // ---------- video ----------
  // Video ro'yxati va admin paneli video.js modulida — bu yerda faqat qayta chizishga signal
  function renderVideos() { if (window.Video) Video.render(); }

  // Progress halqasi (SVG). pct: 0..1
  function ring(pct, size, label) {
    const r = (size - 8) / 2, c = 2 * Math.PI * r;
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}"/></svg><span class="ring-label" style="font-size:${size / 4.5}px">${label || ""}</span></div>`;
  }

  document.addEventListener("DOMContentLoaded", init);

  return { $, $$, state, haptic, notify, esc, confirm: confirmDlg, showTab, onTab, openDetail, openDetailHtml, closeDetail, formatArabic, listItem, renderToday, ring };
})();
