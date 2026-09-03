// ============================================================
//  ADMIN moduli — faqat adminlarga ko'rinadi (server ADMIN_IDS bo'yicha tekshiradi)
//  Ko'rsatadi: foydalanuvchilar, faollik, 30 kunlik grafik, Nur, darajalar, server holati.
//  MAXFIYLIK: faqat yig'indilar — bitta foydalanuvchining ma'lumoti hech qachon chiqmaydi.
//  E'lon yuborish botda bo'ladi (/xabar) — u yerda ko'rinish, segment va tasdiq bor.
// ============================================================
window.Admin = (function () {
  const { $, haptic, notify, esc } = App;
  const tg = window.Telegram && window.Telegram.WebApp;
  const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  const METRICS = { dau: "Faol", new: "Yangi", nur: "Nur" };
  const METRIC_TITLE = { dau: "kunlik faol foydalanuvchilar", new: "yangi qo'shilganlar", nur: "jamiyat Nur'i" };
  let data = null, loading = false, metric = "dau";

  function isAdmin() { return !!(Api.meta && Api.meta.isAdmin); }
  function fmt(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function now() { return (data && data.now) || Math.floor(Date.now() / 1000); }
  function dlabel(k) { if (!k) return ""; const d = new Date(k + "T00:00:00"); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; }
  function ago(ts) {
    const m = Math.max(0, Math.floor((now() - ts) / 60));
    if (m < 60) return `${m} daqiqa oldin`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} soat oldin`;
    const d = Math.floor(h / 24); return d === 1 ? "kecha" : `${d} kun oldin`;
  }
  function openBot(param) {
    const b = (data && data.bot) || (Api.meta && Api.meta.bot);
    if (!b) { notify("error"); return; }
    const url = `https://t.me/${b}?start=${param}`;
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, "_blank");
  }

  async function load() {
    if (!Api.enabled || loading) return;
    loading = true;
    const r = await Api.adminStats();
    loading = false;
    data = r && r.ok ? r : { error: (r && r.error) || "network" };
    render();
    renderHome();
  }

  // ---------- ko'rinish ----------
  function render() {
    const body = $("#admin-body");
    if (!body) return;
    if (!isAdmin()) { body.innerHTML = guard(); return; }
    if (!data) { body.innerHTML = `<div class="card center" style="padding:28px"><span class="spinner"></span></div>`; load(); return; }
    if (data.error) { body.innerHTML = errorCard(); bind(body); return; }
    body.innerHTML = hero() + chart() + nurCard() + levels() + server() + actions();
    bind(body);
  }

  function guard() {
    return `<div class="card hero-card"><span class="tile-icon t-blue" style="margin:0 auto 8px">${Icons.get("shield")}</span>
      <h3>Faqat adminlar uchun</h3><p class="small muted">Bu bo'lim ADMIN_IDS ro'yxatidagi foydalanuvchilarga ochiq.</p></div>`;
  }
  function errorCard() {
    return `<div class="card center"><p class="small muted">${data.error === "forbidden" ? "Ruxsat yo'q." : "Serverga ulanib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring."}</p>
      <button class="btn ghost small-btn" data-act="reload">Qayta urinish</button></div>`;
  }

  function hero() {
    const d = data;
    return `<div class="nur-hero admin-hero fade"><div class="hero-pattern"></div>
      <div class="nur-hero-top"><span class="admin-ic">${Icons.get("users", 30)}</span>
        <div class="nur-hero-body"><div class="nur-hero-label">Foydalanuvchilar</div>
          <div class="nur-hero-total">${fmt(d.users)}</div>
          <div class="nur-hero-next">+${d.new_today} bugun · +${d.new_week} bu hafta</div></div></div>
      <div class="nur-hero-stats">
        <div><b>${fmt(d.dau)}</b><small>bugun faol</small></div>
        <div><b>${fmt(d.wau)}</b><small>haftada faol</small></div>
        <div><b>${fmt(d.loyal)}</b><small>har kuni 7/7</small></div></div></div>`;
  }

  function chart() {
    const s = data.series || [], k = metric;
    const max = Math.max(1, ...s.map((x) => x[k] || 0));
    const total = s.reduce((a, x) => a + (x[k] || 0), 0);
    return `<div class="card">
      <div class="row-between bare"><span class="card-label" style="margin:0">Oxirgi 30 kun</span><b>${fmt(total)}${k === "nur" ? " Nur" : ""}</b></div>
      <div class="segmented" style="margin:10px 0 2px">${Object.keys(METRICS).map((m) =>
        `<button class="seg ${m === k ? "active" : ""}" data-metric="${m}">${METRICS[m]}</button>`).join("")}</div>
      <div class="bars dense">${s.map((x, i) =>
        `<div class="bar-col ${i === s.length - 1 ? "today" : ""}" title="${dlabel(x.d)}: ${x[k] || 0}"><span class="bar"><i style="height:${Math.max(3, (x[k] || 0) / max * 100)}%"></i></span></div>`).join("")}</div>
      <div class="bars-axis"><span>${dlabel(s.length ? s[0].d : "")}</span><span>${METRIC_TITLE[k]}</span><span>bugun</span></div></div>`;
  }

  function nurCard() {
    const d = data, avg = d.dau ? Math.round(d.nur_today / d.dau) : 0;
    return `<div class="card"><div class="card-label">Nur va jamoa</div>
      <div class="kv"><span>Bugun</span><b>${fmt(d.nur_today)} Nur</b></div>
      <div class="kv"><span>Bu hafta</span><b>${fmt(d.nur_week)} Nur</b></div>
      <div class="kv"><span>O'rtacha, faol kishi boshiga</span><b>${avg}</b></div>
      <div class="kv"><span>Jamoalar</span><b>${d.teams} <small class="muted">· ${d.team_members} a'zo</small></b></div>
      <div class="kv"><span>Do'stlik juftlari</span><b>${d.friend_pairs}</b></div></div>`;
  }

  function levels() {
    const ls = data.levels || [], max = Math.max(1, ...ls.map((l) => l.n));
    const icons = ((window.Nur && Nur.LEVELS) || []).map((l) => l.icon);
    return `<div class="card"><div class="card-label">Darajalar</div>
      ${ls.map((l, i) => `<div class="cat-row"><span class="cat-ic">${Icons.get(icons[i] || "star", 18)}</span><div class="cat-body">
        <div class="row-between bare"><b>${esc(l.name)}</b><b>${fmt(l.n)}</b></div>
        <div class="progress thin"><div class="progress-bar" style="width:${l.n / max * 100}%"></div></div></div></div>`).join("")}</div>`;
  }

  function server() {
    const d = data, ok = !!d.persistent, lb = d.last_broadcast;
    const sinceDays = d.since ? Math.floor((now() - d.since) / 86400) : 0;
    return `<div class="card"><div class="card-label">Server</div>
      <div class="kv"><span>Disk</span><b class="${ok ? "ok-text" : "danger"}">${ok ? "doimiy" : "VAQTINCHALIK"}${ok && d.since ? ` <small class="muted">· ${sinceDays} kun</small>` : ""}</b></div>
      ${ok ? "" : `<p class="small danger" style="margin:0 0 8px">Baza har deploy'da o'chadi — Railway'da Volume (/data) ulang.</p>`}
      <div class="kv"><span>Baza hajmi</span><b>${d.db_kb} KB</b></div>
      <div class="kv"><span>Oxirgi zaxira</span><b>${d.last_backup ? ago(d.last_backup) : "hali yo'q"}</b></div>
      <div class="kv"><span>Eslatma yoqqanlar</span><b>${fmt(d.reminders)}</b></div>
      <div class="kv"><span>Botni bloklaganlar</span><b>${fmt(d.blocked)}</b></div>
      <div class="kv"><span>Kontent</span><b>${d.videos} video · ${d.files} fayl</b></div>
      <div class="kv"><span>Oxirgi e'lon</span><b>${lb ? `${fmt(lb.sent)}/${fmt(lb.total)} <small class="muted">· ${ago(lb.created)}</small>` : "hali yo'q"}</b></div></div>`;
  }

  function actions() {
    return `<div class="grid2 admin-actions">
      <button class="tile" data-act="xabar"><span class="tile-icon t-gold">${Icons.get("bell")}</span><b>E'lon yuborish</b><small>Botda, tasdiq bilan</small></button>
      <button class="tile" data-act="video"><span class="tile-icon t-purple">${Icons.get("video")}</span><b>Video qo'shish</b><small>Video bo'limida</small></button>
      <button class="tile" data-act="pdf"><span class="tile-icon t-blue">${Icons.get("file")}</span><b>PDF qo'shish</b><small>Botga fayl yuboring</small></button>
      <button class="tile" data-act="backup"><span class="tile-icon t-green">${Icons.get("shield")}</span><b>Zaxira olish</b><small>Botda /backup</small></button>
    </div>
    <button class="btn ghost wide" data-act="reload" style="margin-top:10px">${Icons.get("refresh", 16)} Yangilash</button>
    <p class="small muted center" style="margin-top:12px">Bu sahifada faqat yig'indilar ko'rinadi — hech kimning shaxsiy natijasi emas.</p>`;
  }

  // ---------- bosh sahifadagi kartochka ----------
  function renderHome() {
    const el = $("#admin-card");
    if (!el) return;
    if (!isAdmin()) { el.classList.add("hidden"); return; }
    el.classList.remove("hidden");
    const sub = data && !data.error ? `${fmt(data.users)} foydalanuvchi · ${fmt(data.dau)} bugun faol` : "Statistika, server holati, e'lon";
    el.innerHTML = `<span class="tile-icon t-blue" style="margin:0">${Icons.get("shield")}</span><div class="today-body">
      <div class="today-head"><b>Admin panel</b></div><p class="small muted" style="margin:0">${sub}</p></div>
      <span class="menu-arrow">${Icons.get("chevron")}</span>`;
    el.onclick = () => { haptic(); App.showTab("admin"); };
    if (!data && !loading) load();   // kartochkada raqam ko'rinsin
  }

  // ---------- hodisalar ----------
  function bind(body) {
    body.querySelectorAll("[data-metric]").forEach((b) => b.addEventListener("click", () => { metric = b.dataset.metric; haptic(); render(); }));
    body.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.act; haptic();
      if (a === "reload") { data = null; render(); }
      else if (a === "video") App.showTab("video");
      else if (a === "xabar") openBot("xabar");
      else openBot("admin");   // pdf, backup — bot ko'rsatma beradi
    }));
  }

  App.onTab("admin", () => { render(); if (data && !data.error) load(); });   // ochilganda fonda yangilanadi
  Api.onSync(() => { renderHome(); if (App.state.tab === "admin") render(); });
  return { render, renderHome, load };
})();
