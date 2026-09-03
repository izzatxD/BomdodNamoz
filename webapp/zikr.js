// ============================================================
//  ZIKR moduli — tongi/tungi zikrlar (hisoblagich bilan), tasbih, 30 kunlik odat
// ============================================================
window.Zikr = (function () {
  const Z = window.ZIKR_DATA, D = window.APP_DATA;
  const { $, $$, haptic, notify, esc, openDetailHtml, closeDetail } = App;
  let kind = "odat";

  // ---------- saqlash ----------
  // days: { "2026-09-02": { t: 5, n: 3, s: {subhanalloh: 33}, ok: true } }  (ixcham, 45 kun)
  // today: { d: "2026-09-02", tong: ["t_kursi"...], tun: [...] }            (bugungi batafsil)
  function days() { return Store.get("days", {}); }
  function saveDays(d) {
    const keys = Object.keys(d).sort();
    while (keys.length > 45) delete d[keys.shift()];
    Store.set("days", d);
  }
  function todayRec() {
    const t = Store.get("today", null), td = Store.today();
    if (!t || t.d !== td) return { d: td, tong: [], tun: [] };
    return t;
  }
  function saveToday(t) { Store.set("today", t); syncDay(); }
  function habit() { return Store.get("habit", null); }

  function fullZikr(z) { return z.sameAs ? Object.assign({}, Z.tong.find((x) => x.id === z.sameAs), z) : z; }

  // ---------- dastur holati ----------
  function programInfo() {
    const h = habit();
    if (!h) return { started: false };
    const start = new Date(h.start + "T00:00:00"), now = new Date(Store.today() + "T00:00:00");
    const day = Math.floor((now - start) / 86400000) + 1;
    const week = Z.habit.weeks[Math.min(3, Math.max(0, Math.ceil(day / 7) - 1))];
    return { started: true, day, week, beyond: day > 30 };
  }
  function tasksFor(week, rec, dayRec) {
    return week.tasks.map((t) => {
      let done = false, progress = "";
      if (t.type === "tong" || t.type === "tun") {
        const need = t.ids.length ? t.ids : Z[t.type].map((z) => z.id);
        const have = (rec && rec[t.type]) || [];
        const n = need.filter((id) => have.includes(id)).length;
        done = n >= need.length; progress = `${n}/${need.length}`;
      } else if (t.type === "tasbih") {
        const s = (dayRec && dayRec.s) || {};
        const n = t.ids.filter((id) => (s[id] || 0) >= (Z.tasbih.find((x) => x.id === id) || {}).target).length;
        done = n >= t.ids.length; progress = `${n}/${t.ids.length}`;
      }
      return { type: t.type, label: t.label, done, progress };
    });
  }
  function syncDay() {
    const d = days(), td = Store.today(), rec = todayRec();
    const cur = d[td] || { s: {} };
    cur.t = rec.tong.length; cur.n = rec.tun.length;
    const p = programInfo();
    cur.ok = p.started ? tasksFor(p.week, rec, cur).every((t) => t.done) : false;
    d[td] = cur; saveDays(d);
  }
  function streak() {
    const d = days(); let n = 0; const cur = new Date();
    if (!(d[Store.dateKey(cur)] || {}).ok) cur.setDate(cur.getDate() - 1); // bugun hali tugamagan bo'lsa kechadan sanaymiz
    while ((d[Store.dateKey(cur)] || {}).ok) { n++; cur.setDate(cur.getDate() - 1); }
    return n;
  }
  function summary() {
    const p = programInfo();
    if (!p.started) return { started: false };
    return { started: true, day: Math.min(p.day, 30), streak: streak(), tasks: tasksFor(p.week, todayRec(), days()[Store.today()]) };
  }

  // ---------- render ----------
  function render() {
    $$("#zikr-seg .seg").forEach((b) => b.classList.toggle("active", b.dataset.kind === kind));
    const body = $("#zikr-body");
    if (kind === "odat") body.innerHTML = renderOdat();
    else if (kind === "tasbih") body.innerHTML = renderTasbih();
    else body.innerHTML = renderList(kind);
    bind(body);
  }

  function renderOdat() {
    const p = programInfo();
    if (!p.started) {
      return `<div class="card hero-card"><span class="tile-icon t-green" style="margin:0 auto 8px">${Icons.get("sprout")}</span><h3>30 kunlik zikr odati</h3><p class="small">${Z.habit.intro}</p>
        <button class="btn primary wide" data-act="start">Bugundan boshlash</button></div>
        ${Z.habit.weeks.map((w) => `<div class="card week-card"><div class="card-label">${w.week}-hafta</div><b>${w.title}</b><p class="small muted">${w.desc}</p>
          <div class="chips">${w.tasks.map((t) => `<span class="chip-sm">${t.label}</span>`).join("")}</div></div>`).join("")}`;
    }
    const tasks = tasksFor(p.week, todayRec(), days()[Store.today()]);
    const doneN = tasks.filter((t) => t.done).length;
    const d = days(), start = new Date(habit().start + "T00:00:00");
    let grid = "";
    for (let i = 0; i < 30; i++) {
      const dt = new Date(start); dt.setDate(start.getDate() + i);
      const k = Store.dateKey(dt), rec = d[k];
      const cls = k === Store.today() ? "cur" : rec && rec.ok ? "ok" : rec && (rec.t || rec.n) ? "part" : dt > new Date() ? "future" : "miss";
      grid += `<span class="dot ${cls}" title="${k}">${i + 1}</span>`;
    }
    return `
      <div class="card hero-card odat-head">
        <div><div class="card-label">${p.beyond ? "Doimiy rejim" : p.week.week + "-hafta · " + p.week.title}</div><h3>${Math.min(p.day, 30)}-kun <span class="muted">/ 30</span></h3></div>
        <div class="streak-big">${Icons.get("flame", 26)}<b>${streak()}</b><small>kun ketma-ket</small></div>
      </div>
      <div class="card"><div class="card-label">Bugungi vazifalar · ${doneN}/${tasks.length}</div>
        <div class="progress"><div class="progress-bar" style="width:${tasks.length ? doneN / tasks.length * 100 : 0}%"></div></div>
        ${tasks.map((t) => `<button class="task-row ${t.done ? "done" : ""}" data-goto="${t.type}"><span class="task-check">${t.done ? Icons.get("check", 16) : ""}</span><span class="task-label">${esc(t.label)}</span><span class="muted small">${t.progress}</span>${Icons.get("chevron", 18)}</button>`).join("")}
        ${doneN === tasks.length ? `<p class="small ok-text">🎉 Bugungi vazifalar bajarildi! Ertaga davom eting.</p>` : ""}
      </div>
      <div class="card"><div class="card-label">30 kunlik yo'l</div><div class="dots">${grid}</div>
        <div class="legend"><span><i class="dot ok"></i>bajarildi</span><span><i class="dot part"></i>qisman</span><span><i class="dot miss"></i>o'tkazildi</span></div></div>
      <div class="card"><div class="card-label">Maslahatlar</div>${Z.habit.tips.map((t) => `<p class="small">• ${t}</p>`).join("")}</div>
      <button class="btn ghost wide danger" data-act="restart">Dasturni qayta boshlash</button>`;
  }

  function renderList(k) {
    const rec = todayRec(), list = Z[k], done = rec[k] || [];
    const p = programInfo();
    const need = p.started ? (p.week.tasks.find((t) => t.type === k) || { ids: [] }).ids : [];
    const title = k === "tong" ? "Tongi zikrlar" : "Tungi zikrlar";
    const when = k === "tong" ? "Bomdoddan keyin — quyosh chiqquncha" : "Asrdan keyin — xuftongacha";
    return `<div class="card hero-card"><h3>${title}</h3><p class="small muted" style="margin-top:0">${when}</p>
        <div class="progress"><div class="progress-bar" style="width:${done.length / list.length * 100}%"></div></div>
        <p class="small">${done.length}/${list.length} bajarildi ${need.length && !need.every((id) => done.includes(id)) ? `· <b>bugungi vazifa: ${need.length} ta</b>` : ""}</p>
        ${done.length ? `<button class="btn ghost small-btn" data-act="reset-${k}">Bugungini tozalash</button>` : ""}</div>
      <div class="list">${list.map((z, i) => {
        const f = fullZikr(z), isDone = done.includes(z.id), req = need.includes(z.id) || (p.started && !need.length);
        return `<button class="list-item ${isDone ? "done" : ""}" data-zikr="${k}:${i}">
          <div class="list-num">${isDone ? Icons.get("check", 18) : req ? Icons.get("star", 16) : i + 1}</div>
          <div class="list-body"><div class="list-title">${esc(f.title)}</div><div class="list-sub">${z.count} marta${f.fazilat ? " · " + esc(f.fazilat) : ""}</div></div>
          ${Icons.get("chevron")}</button>`; }).join("")}</div>`;
  }

  // ---------- zikr hisoblagichi (overlay) ----------
  function openZikr(k, i) {
    const list = Z[k], z = list[i], f = fullZikr(z);
    let count = 0;
    const done = () => todayRec()[k].includes(z.id);
    const html = () => `
      <div class="detail-title fade">${esc(f.title)}</div>
      <div class="detail-sub">${k === "tong" ? "Tong" : "Tun"} zikri · ${i + 1}/${list.length} · ${z.count} marta</div>
      ${f.arabic ? `<div class="arabic fade">${App.formatArabic(f.arabic)}</div>` : ""}
      <div class="block"><div class="card-label">O'qilishi</div><div class="latin">${esc(f.latin || "")}</div></div>
      <div class="block"><div class="card-label">Ma'nosi</div><div class="meaning">${esc(f.meaning || "")}</div></div>
      ${f.link ? `<div class="chips">${f.link.map((id) => { const s = D.suralar.find((x) => x.id === id); return s ? `<button class="chip-sm" data-sura="${id}">📖 ${s.title}</button>` : ""; }).join("")}</div>` : ""}
      ${f.fazilat ? `<div class="block fazilat"><div class="card-label">Fazilati</div><div class="small">${esc(f.fazilat)}</div></div>` : ""}
      <div class="counter-wrap">
        ${counterHtml("zc", done() ? "✓" : count, z.count, done() ? 1 : 0, done())}
        <p class="small muted" style="margin-top:10px">${done() ? "Bugun bajarildi" : "Har o'qiganda bosing"}</p>
      </div>
      <div class="step-nav">
        <button class="btn ghost" id="zc-prev" ${i === 0 ? "disabled" : ""}>‹ Oldingi</button>
        <button class="btn primary" id="zc-next">${i < list.length - 1 ? "Keyingi ›" : "Tugatish"}</button>
      </div>`;
    openDetailHtml(html());
    const bindAll = () => {
      $("#zc-btn").addEventListener("click", () => {
        if (done()) return;
        count++; haptic();
        $("#zc-num").textContent = count; setRing("zc", count / z.count);
        if (count >= z.count) markDone(k, z.id);
      });
      $("#zc-prev").addEventListener("click", () => openZikr(k, i - 1));
      $("#zc-next").addEventListener("click", () => i < list.length - 1 ? openZikr(k, i + 1) : closeDetail());
      $$("#detail-body [data-sura]").forEach((b) => b.addEventListener("click", () => App.openDetail("sura:" + b.dataset.sura)));
    };
    bindAll();
    function markDone(k, id) {
      const rec = todayRec(); if (!rec[k].includes(id)) rec[k].push(id); saveToday(rec);
      notify("success");
      $("#zc-btn").classList.add("done"); $("#zc-num").textContent = "✓"; setRing("zc", 1);
      if (i < list.length - 1) setTimeout(() => openZikr(k, i + 1), 700);
      else setTimeout(() => { closeDetail(); }, 700);
    }
  }

  // ---------- halqali hisoblagich ----------
  const RING = { zc: 170, tb: 220 };
  function counterHtml(id, num, target, pct, done, big) {
    const size = big ? RING.tb : RING.zc, r = size / 2 - 5, c = 2 * Math.PI * r;
    return `<button class="counter ${big ? "big" : ""} ${done ? "done" : ""}" id="${id}-btn">
      <svg viewBox="0 0 ${size} ${size}"><circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="fg" id="${id}-ring" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}"/></svg>
      <span class="counter-inner"><span class="counter-num" id="${id}-num">${num}</span><span class="counter-target">/ ${target}</span></span></button>`;
  }
  function setRing(id, pct) {
    const el = $("#" + id + "-ring"); if (!el) return;
    const c = Number(el.getAttribute("stroke-dasharray")); el.setAttribute("stroke-dashoffset", c * (1 - Math.min(1, pct)));
    const btn = $("#" + id + "-btn"); btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  }

  // ---------- tasbih ----------
  let tasbihId = Z.tasbih[0].id, tasbihCount = 0;
  function renderTasbih() {
    const z = Z.tasbih.find((x) => x.id === tasbihId), rec = days()[Store.today()] || { s: {} }, s = rec.s || {};
    return `<div class="chips scroll">${Z.tasbih.map((t) => `<button class="chip-sm ${t.id === tasbihId ? "on" : ""}" data-tasbih="${t.id}">${esc(t.title)}${(s[t.id] || 0) >= t.target ? " ✓" : ""}</button>`).join("")}</div>
      <div class="card tasbih-card">
        <div class="arabic center">${z.arabic}</div>
        <div class="muted small">${esc(z.meaning)}</div>
        ${counterHtml("tb", tasbihCount, z.target, tasbihCount / z.target, false, true)}
        <div class="row-center">
          <button class="btn ghost" id="tb-reset">Tozalash</button>
          <span class="muted small">Bugun jami: <b id="tb-today">${s[z.id] || 0}</b></span>
        </div>
      </div>
      <div class="card"><div class="card-label">Bugungi natijalar</div><div id="tb-results">${tasbihResults(s)}</div></div>`;
  }
  function tasbihResults(s) {
    return Z.tasbih.map((t) => `<div class="row-between small"><span>${esc(t.title)}</span><b class="${(s[t.id] || 0) >= t.target ? "ok-text" : ""}">${s[t.id] || 0} / ${t.target}</b></div>`).join("");
  }
  function tasbihTap() {
    const z = Z.tasbih.find((x) => x.id === tasbihId);
    tasbihCount++; haptic(tasbihCount % 33 === 0 ? "heavy" : "light");
    const d = days(), td = Store.today(); d[td] = d[td] || { s: {} }; d[td].s = d[td].s || {};
    d[td].s[z.id] = (d[td].s[z.id] || 0) + 1; saveDays(d); syncDay();
    $("#tb-num").textContent = tasbihCount; $("#tb-today").textContent = d[td].s[z.id]; setRing("tb", tasbihCount / z.target);
    $("#tb-results").innerHTML = tasbihResults(d[td].s);
    if (tasbihCount === z.target) { notify("success"); $("#tb-btn").classList.add("done"); setTimeout(render, 600); }
  }

  // ---------- hodisalar ----------
  function bind(body) {
    body.querySelectorAll("[data-zikr]").forEach((b) => b.addEventListener("click", () => { const [k, i] = b.dataset.zikr.split(":"); openZikr(k, Number(i)); }));
    body.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => { kind = b.dataset.goto; render(); }));
    body.querySelectorAll("[data-tasbih]").forEach((b) => b.addEventListener("click", () => { tasbihId = b.dataset.tasbih; tasbihCount = 0; render(); }));
    body.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "start") { Store.set("habit", { start: Store.today() }); notify("success"); syncDay(); render(); }
      if (a === "restart") App.confirm("Dasturni 1-kundan qayta boshlaysizmi?", () => { Store.set("habit", { start: Store.today() }); syncDay(); render(); });
      if (a === "reset-tong" || a === "reset-tun") { const r = todayRec(); r[a.slice(6)] = []; saveToday(r); render(); }
    }));
    const tb = body.querySelector("#tb-btn"); if (tb) tb.addEventListener("click", tasbihTap);
    const tr = body.querySelector("#tb-reset"); if (tr) tr.addEventListener("click", () => { tasbihCount = 0; render(); });
  }

  $$("#zikr-seg .seg").forEach((b) => b.addEventListener("click", () => { kind = b.dataset.kind; render(); }));
  App.onTab("zikr", render);
  return { summary, render };
})();
