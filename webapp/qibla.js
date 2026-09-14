// ============================================================
//  QIBLA — kompas. Joylashuvdan Ka'ba tomonini topadi.
//
//  Burchak katta doira (great-circle) formulasi bilan hisoblanadi — xaritadagi
//  to'g'ri chiziq emas, yer sharidagi eng qisqa yo'nalish. Shuning uchun
//  Toshkentdan qibla 240° (janubi-g'arb), garchi Makka xaritada deyarli
//  to'g'ri g'arbda ko'rinsa ham.
//
//  Kompas o'qishi qurilmadan keladi:
//    iOS      — webkitCompassHeading (tayyor: shimoldan soat yo'nalishi bo'yicha)
//    Android  — deviceorientationabsolute.alpha (teskari yo'nalishda — 360 dan ayiriladi)
//  Datchik bo'lmasa ilova qo'l rejimiga o'tadi: burchak raqam bilan ko'rsatiladi.
// ============================================================
window.Qibla = (function () {
  const { $, haptic, notify } = App;
  const RAD = Math.PI / 180;
  const KAABA = { lat: 21.4225, lng: 39.8262 };   // Masjidul Harom, Makka
  const R_EARTH = 6371;                            // km — o'rtacha radius

  const ALIGN_IN = 5;      // shuncha darajadan yaqin bo'lsa — «qibla topildi»
  const ALIGN_OUT = 9;     // chiqish chegarasi kattaroq: raqam chegarada tebranib turmasin
  const SENSOR_WAIT = 2500; // datchikdan shuncha vaqt xabar kelmasa — qo'l rejimi

  // ---------- hisob (sof funksiyalar — sinovdan o'tadi) ----------
  //  Boshlang'ich azimut: shu nuqtadan Ka'baga qarab yo'lga chiqsangiz,
  //  shimoldan soat yo'nalishi bo'yicha necha daraja buriladi.
  function bearing(lat, lng) {
    const f1 = lat * RAD, f2 = KAABA.lat * RAD, dl = (KAABA.lng - lng) * RAD;
    const y = Math.sin(dl) * Math.cos(f2);
    const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return (Math.atan2(y, x) / RAD + 360) % 360;
  }

  //  Ka'bagacha masofa (km) — haversine
  function distance(lat, lng) {
    const f1 = lat * RAD, f2 = KAABA.lat * RAD;
    const df = (KAABA.lat - lat) * RAD, dl = (KAABA.lng - lng) * RAD;
    const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
    return R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  //  Ikki burchak orasidagi eng qisqa farq: -180..180 (musbat — o'ngga burish kerak)
  function delta(from, to) { return ((to - from + 540) % 360) - 180; }

  // ---------- holat ----------
  let heading = null;        // datchikdan kelgan oxirgi o'qish (daraja) yoki null
  let shown = 0;             // ekranda ko'rsatilayotgan burchak — silliqlangan, o'ralmagan
  let qibla = 0, km = 0, place = "";
  let sensor = "kutilmoqda";  // kutilmoqda | ishlayapti | yoq | ruxsat
  let aligned = false, raf = 0, waitTimer = 0, lastStatus = "", lastRot = "";
  let el = {};            // to'liq ekran
  let hero = {};          // bosh sahifadagi kichik kompas

  // ---------- datchik ----------
  function screenAngle() {
    const o = window.screen && window.screen.orientation;
    return (o && typeof o.angle === "number") ? o.angle : (window.orientation || 0);
  }
  function headingOf(e) {
    // iOS o'zi shimoldan hisoblab beradi — ekran burilishini ham o'zi hisobga oladi
    if (typeof e.webkitCompassHeading === "number" && !isNaN(e.webkitCompassHeading)) return e.webkitCompassHeading;
    // Android: alpha teskari yo'nalishda o'lchanadi; ekran yon burilgan bo'lsa qo'shib to'g'rilanadi
    if (e.absolute && typeof e.alpha === "number" && !isNaN(e.alpha)) return (360 - e.alpha + screenAngle() + 360) % 360;
    return null;
  }
  function onOrient(e) {
    const h = headingOf(e);
    if (h === null) return;
    if (sensor !== "ishlayapti") { sensor = "ishlayapti"; shown = h; renderInfo(); }
    heading = h;
  }
  function attach() {
    // Qurilmada DeviceOrientationEvent umuman bo'lmasligi mumkin (eski Android WebView,
    // Telegram Desktop). Kutish taymeri ham qo'yilmaydi — shuning uchun xabarni DARHOL
    // yangilaymiz, aks holda ekran «Kompas sozlanmoqda…» da qotib qoladi.
    if (typeof window.DeviceOrientationEvent === "undefined") { sensor = "yoq"; renderInfo(); return; }
    if ("ondeviceorientationabsolute" in window) window.addEventListener("deviceorientationabsolute", onOrient, true);
    window.addEventListener("deviceorientation", onOrient, true);
    // Kompas yo'q qurilmalarda hodisa umuman kelmaydi yoki absolute bo'lmaydi — kutib ko'ramiz
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => { if (sensor === "kutilmoqda") { sensor = "yoq"; renderInfo(); } }, SENSOR_WAIT);
  }
  function detach() {
    window.removeEventListener("deviceorientationabsolute", onOrient, true);
    window.removeEventListener("deviceorientation", onOrient, true);
    clearTimeout(waitTimer);
  }
  //  iOS 13+ da kompas faqat foydalanuvchi tugma bosgandan keyin ochiladi
  function needsPermission() {
    return typeof window.DeviceOrientationEvent !== "undefined"
      && typeof window.DeviceOrientationEvent.requestPermission === "function";
  }
  function askPermission() {
    haptic();
    window.DeviceOrientationEvent.requestPermission().then((r) => {
      if (r === "granted") { sensor = "kutilmoqda"; attach(); }
      else sensor = "yoq";
      renderInfo();
    }).catch(() => { sensor = "yoq"; renderInfo(); });
  }

  // ---------- chizma ----------
  //  Burchak yuqoridan (shimoldan) soat yo'nalishi bo'yicha o'lchanadi
  const P = (a, r) => [150 + r * Math.sin(a * RAD), 150 - r * Math.cos(a * RAD)];

  function dialSvg() {
    let ticks = "";
    for (let a = 0; a < 360; a += 5) {
      const major = a % 45 === 0;
      const [x1, y1] = P(a, major ? 116 : 124), [x2, y2] = P(a, 133);
      ticks += `<line class="q-tick${major ? " maj" : ""}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }
    // To'rt tomon o'z nomi bilan — «Sh» ikki ma'noli bo'lib qolmasin (Shimol/Sharq)
    const dirs = [[0, "Shimol"], [90, "Sharq"], [180, "Janub"], [270, "G'arb"]];
    // Doira aylanganda yozuv teskari o'girilib qolmasin: har biri o'z nuqtasi atrofida
    // doiraga QARAMA-QARSHI buriladi (paint()), shuning uchun alohida <g> ichida turadi.
    const labels = dirs.map(([a, name]) => {
      const [x, y] = P(a, 98);
      return `<g class="q-up" data-px="${x.toFixed(1)}" data-py="${y.toFixed(1)}">` +
        `<text class="q-dir${a === 0 ? " n" : ""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${name}</text></g>`;
    }).join("");
    // Qibla yo'nalishi: yumshoq konus (xatolik doirasi) + nur + Ka'ba belgisi
    const [cx1, cy1] = P(qibla - ALIGN_IN, 120), [cx2, cy2] = P(qibla + ALIGN_IN, 120);
    const cone = `<path class="q-cone" d="M150 150 L${cx1.toFixed(1)} ${cy1.toFixed(1)} A120 120 0 0 1 ${cx2.toFixed(1)} ${cy2.toFixed(1)} Z"/>`;
    const [kx, ky] = P(qibla, 104);
    const ray = `<line class="q-ray" x1="150" y1="150" x2="${kx.toFixed(1)}" y2="${ky.toFixed(1)}"/>`;
    const kaaba = `<g class="q-up q-kaaba" data-px="${kx.toFixed(1)}" data-py="${ky.toFixed(1)}">` +
      `<g transform="translate(${kx.toFixed(1)} ${ky.toFixed(1)})"><circle class="q-kaaba-bg" r="17"/>` +
      `<g transform="translate(-10 -10) scale(.83)">${Icons.get("kaaba", 24)}</g></g></g>`;
    return `<g class="q-dial" id="q-dial">${ticks}${labels}${cone}${ray}${kaaba}</g>`;
  }

  function compassSvg() {
    return `<svg class="q-svg" viewBox="0 0 300 300" role="img" aria-label="Qibla kompasi">
      <circle class="q-face" cx="150" cy="150" r="141"/>
      <circle class="q-rim" cx="150" cy="150" r="141"/>
      ${dialSvg()}
      <circle class="q-hub" cx="150" cy="150" r="34"/>
      <text class="q-head" id="q-head" x="150" y="147">—</text>
      <text class="q-head-lbl" x="150" y="164">qarayapsiz</text>
      <path class="q-you" d="M150 6 l9 15 h-18 z"/>
      <line class="q-axis" x1="150" y1="26" x2="150" y2="116"/>
    </svg>`;
  }

  // ---------- bosh sahifadagi kichik kompas ----------
  //  Hero ichida, sanoq yonida turadi — namozdan oldin kerak bo'ladigan yagona narsa.
  //  Xuddi shu datchik, xuddi shu aylanish; faqat ixcham va bitta o'q bilan.
  //  Tepadagi belgi rejimni aytib turadi: uchburchak — «siz qarab turgan tomon»,
  //  «Sh» — datchik yo'q, doira qimirlamaydi va o'q shimoldan hisoblanadi.
  function heroSvg() {
    const top = sensor === "ishlayapti"
      ? `<path class="hq-you" d="M50 1 l5 8 h-10 z"/>`
      : `<text class="hq-n" x="50" y="10">Sh</text>`;
    return `<svg class="hq-svg" viewBox="0 0 100 100" aria-hidden="true">
      <circle class="hq-face" cx="50" cy="50" r="38"/>
      <circle class="hq-rim" cx="50" cy="50" r="38"/>
      <g id="hq-dial"><g transform="rotate(${qibla.toFixed(1)} 50 50)">
        <line class="hq-stem" x1="50" y1="50" x2="50" y2="31"/>
        <path class="hq-head" d="M50 13 l7.5 14 h-15 z"/>
      </g></g>${top}
    </svg>`;
  }

  function renderHero() {
    const btn = $("#hero-qibla");
    if (!btn) return;
    const c = App.coords();
    qibla = bearing(c.lat, c.lng);
    btn.classList.remove("hidden");
    btn.innerHTML = heroSvg() + `<span class="hq-label" id="hq-label">Qibla</span>`;
    btn.onclick = () => { haptic(); App.showTab("qibla"); };
    hero = { btn, dial: $("#hq-dial"), label: $("#hq-label") };
    start();
    paint(true);
  }

  // ---------- ko'rinish ----------
  function statusCard() {
    if (sensor === "ruxsat") {
      return `<button class="btn primary wide" data-q="ruxsat">${Icons.get("compass", 18)} Kompasni yoqish</button>
        <p class="small muted center" style="margin:8px 0 0">iPhone kompasga ruxsat so'raydi — bir marta.</p>`;
    }
    if (sensor === "yoq") {
      return `<div class="q-manual">${Icons.get("info", 18)}
        <p class="small">Bu qurilmada kompas datchigi yo'q. Shimolni aniqlang va undan
        <b>${Math.round(qibla)}°</b> soat yo'nalishi bo'yicha buriling — doiradagi Ka'ba belgisi shu yerni ko'rsatib turibdi.</p></div>`;
    }
    if (sensor === "kutilmoqda") return `<p class="q-status small muted center">Kompas sozlanmoqda…</p>`;
    return `<p class="q-status" id="q-status"></p>`;
  }

  function render() {
    const body = $("#qibla-body");
    if (!body) return;
    const c = App.coords();
    qibla = bearing(c.lat, c.lng);
    km = distance(c.lat, c.lng);
    place = c.gps ? "Aniqlangan joylashuv" : c.name;
    if (sensor !== "ishlayapti" && needsPermission()) sensor = "ruxsat";

    body.innerHTML = `
      <div class="card q-card">
        <div class="q-wrap" id="q-wrap">${compassSvg()}</div>
        <div id="q-msg">${statusCard()}</div>
      </div>

      <div class="card">
        <div class="card-label">Hisob</div>
        <div class="kv"><span>Qibla burchagi</span><b>${Math.round(qibla)}° <small class="muted">shimoldan</small></b></div>
        <div class="kv"><span>Makkagacha</span><b>${fmtKm(km)} km</b></div>
        <div class="kv"><span>Joylashuv</span><b>${App.esc(place)}</b></div>
        <button class="btn ghost wide" data-q="joy" style="margin-top:10px">${Icons.get("pin", 16)} Joylashuvni aniqlash</button>
        <p class="small muted" style="margin:8px 0 0">GPS bilan burchak aniqroq bo'ladi — shahar markazi o'rniga o'zingiz turgan joy olinadi.</p>
      </div>

      <div class="card">
        <div class="card-label">Qanday to'g'ri o'lchanadi</div>
        <ul class="q-tips">
          <li>Telefonni kaftda <b>yerga parallel</b>, tekis ushlang.</li>
          <li>Temir eshik, radiator, kompyuter va karnaydan <b>bir qadam uzoqroq</b> turing — magnit kompasni adashtiradi.</li>
          <li>Ko'rsatkich sakrab tursa, telefonni havoda <b>8 raqami</b> shaklida bir necha marta aylantiring.</li>
          <li>Magnit kompasda 1–2 daraja farq bo'lishi tabiiy. Namoz uchun qiblaga <b>taxminan</b> yuzlanish ham kifoya qiladi.</li>
        </ul>
      </div>`;
    Icons.mount(body);
    el = {
      wrap: $("#q-wrap"), dial: $("#q-dial"), head: $("#q-head"),
      status: $("#q-status"), msg: $("#q-msg"),
      up: Array.from(body.querySelectorAll(".q-up")),   // tik turishi kerak bo'lganlar
    };
    lastStatus = ""; lastRot = "";
    body.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.q === "ruxsat") askPermission();
      else { haptic(); App.locate(); }
    }));
    paint(true);
  }

  //  Faqat xabar qismini qayta chizadi — kompas aylanib turganda butun sahifa yangilanmasin
  function renderInfo() {
    if (hero.btn) renderHero();   // tepadagi belgi «Sh» ↔ uchburchak almashadi
    if (!el.msg) return;
    el.msg.innerHTML = statusCard();
    Icons.mount(el.msg);
    el.status = $("#q-status");
    lastStatus = ""; lastRot = "";
    el.msg.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.q === "ruxsat") askPermission();
    }));
  }

  function fmtKm(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

  // ---------- animatsiya ----------
  function paint(force) {
    if (!el.dial && !hero.dial) return;
    // Datchik yo'q bo'lsa doira aylanmaydi: shimol tepada turadi, Ka'ba belgisi burchakni ko'rsatadi
    const target = (sensor === "ishlayapti" && heading !== null) ? heading : 0;
    if (force) shown = target;
    else shown += delta(shown, target) * 0.18;   // silliqlash — magnit o'qish biroz titraydi
    // Burchak amalda o'zgarmagan bo'lsa (kompas yo'q yoki telefon qimirlamayapti) —
    // DOM ni har kadrda bekorga qo'zg'atmaymiz
    const rot = (-shown).toFixed(2);
    if (rot !== lastRot) {
      lastRot = rot;
      if (el.dial) {
        el.dial.setAttribute("transform", `rotate(${rot} 150 150)`);
        const back = shown.toFixed(2);
        el.up.forEach((g) => g.setAttribute("transform", `rotate(${back} ${g.dataset.px} ${g.dataset.py})`));
        el.head.textContent = sensor === "ishlayapti" ? Math.round((shown % 360 + 360) % 360) + "°" : "—";
      }
      if (hero.dial) hero.dial.setAttribute("transform", `rotate(${rot} 50 50)`);
    }
    if (sensor !== "ishlayapti") { if (hero.btn) hero.btn.classList.remove("on"); return; }

    const d = delta(shown, qibla);
    const abs = Math.abs(d);
    const now = aligned ? abs <= ALIGN_OUT : abs <= ALIGN_IN;
    if (now !== aligned) {
      aligned = now;
      if (el.wrap) el.wrap.classList.toggle("on", aligned);
      if (hero.btn) hero.btn.classList.toggle("on", aligned);
      if (hero.label) hero.label.textContent = aligned ? "Qibla ✓" : "Qibla";
      // Tebranish faqat Qibla ekranida — bosh sahifada telefon qimirlaganda
      // kutilmaganda titrab qolmasin
      if (aligned && App.state.tab === "qibla") notify("success");
    }
    const text = aligned
      ? "Qibla aynan shu tomonda"
      : `${Math.round(abs)}° ${d > 0 ? "o'ngga" : "chapga"} buriling`;
    if (el.status && text !== lastStatus) {
      lastStatus = text;
      el.status.textContent = text;
      el.status.className = "q-status" + (aligned ? " on" : "");
    }
  }

  function loop() { paint(false); raf = requestAnimationFrame(loop); }
  function start() {
    if (raf) return;
    if (sensor !== "ruxsat") attach();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    cancelAnimationFrame(raf); raf = 0;
    detach();
    aligned = false;
    if (hero.btn) hero.btn.classList.remove("on");
    if (hero.label) hero.label.textContent = "Qibla";
  }

  //  Kompas ikki joyda ko'rinadi: bosh sahifadagi hero va Qibla ekrani.
  //  Datchik faqat shu ikkalasi ochiq turganda ishlaydi.
  const USES_COMPASS = ["qibla", "home"];
  App.onTab("qibla", () => { render(); start(); });
  App.onLeaveTab("qibla", stop);
  App.onLeaveTab("home", stop);
  // Ilova fonga o'tganda magnit datchik bekorga ishlab turmasin — batareya uchun
  document.addEventListener("visibilitychange", () => {
    if (USES_COMPASS.indexOf(App.state.tab) < 0) return;
    if (document.hidden) stop(); else start();
  });

  //  headingOf — sinovda ham tekshiriladi: iOS/Android farqi shu yerda, eng oson adashadigan joy
  return { bearing, distance, delta, headingOf, render, renderHero, start, stop };
})();
