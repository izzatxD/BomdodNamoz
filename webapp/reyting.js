// ============================================================
//  REYTING moduli — Nur natijalari, nishonlar, jamoa / liga / do'stlar reytingi
//  Tamoyillar: (1) reytingga faqat haftalik UMUMIY Nur chiqadi — qazo va tafsilotlar telefonda qoladi
//              (2) anonim ko'rinish mumkin   (3) dushanba kuni reyting nolga tushadi
// ============================================================
window.Reyting = (function () {
  const { $, haptic, notify, esc } = App;
  const tg = window.Telegram && window.Telegram.WebApp;
  const DAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
  const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  const CATS = [
    { id: "zikr",   label: "Tong va tun zikrlari", icon: "sunrise",  hint: "har zikr 2 · to'liq to'plam +30" },
    { id: "tasbih", label: "Tasbih",               icon: "beads",    hint: "har 33 marta — 5" },
    { id: "qazo",   label: "Qazo namozlar",        icon: "calendar", hint: "har namoz 15 · faqat sizga ko'rinadi", private: true },
    { id: "ilm",    label: "Arab tili darslari",   icon: "letters",  hint: "har dars 40 (test 80%+)" },
    { id: "odat",   label: "Kunlik vazifalar",     icon: "sprout",   hint: "to'liq bajarilsa 50 + streak bonusi" },
  ];
  let view = "men", scope = "liga", teamId = null, selDay = null;

  // ---------- yordamchilar ----------
  function fmt(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function dateLabel(k) { const d = new Date(k + "T00:00:00"); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; }
  function period(a, b) {
    const da = new Date(a + "T00:00:00"), db = new Date(b + "T00:00:00");
    return da.getMonth() === db.getMonth() ? `${da.getDate()}–${db.getDate()} ${MONTHS[da.getMonth()]}` : `${dateLabel(a)} – ${dateLabel(b)}`;
  }
  function daysLeft(to) { return Math.max(0, Math.round((new Date(to + "T00:00:00") - new Date(Store.today() + "T00:00:00")) / 86400000)) + 1; }
  function profile() { return Store.get("profile", {}); }
  function saveProfile(p) { Store.set("profile", p); }
  function tgName() { const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user; return (u && u.first_name) || ""; }
  function initials(name) { return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?"; }
  function levelOf(i) { return Nur.LEVELS[Math.max(0, Math.min(Nur.LEVELS.length - 1, Number(i) || 0))]; }
  function isTelegram() { return !!(tg && tg.initData); }

  // ---------- render ----------
  function render() {
    const body = $("#reyting-body");
    if (!Store.get("nurAck", null)) { body.innerHTML = renderPledge(); bind(body); return; }
    body.innerHTML = renderHero() + `
      <div class="segmented">
        <button class="seg ${view === "men" ? "active" : ""}" data-view="men">${Icons.get("chart", 16)}Natijalarim</button>
        <button class="seg ${view === "reyting" ? "active" : ""}" data-view="reyting">${Icons.get("trophy", 16)}Reyting</button>
      </div>
      ${view === "men" ? renderMen() : renderBoardShell()}`;
    bind(body);
    if (view === "reyting" && Api.enabled) loadBoard();
  }

  // Birinchi ochilganda — niyat va qoidalar
  function renderPledge() {
    const p = profile();
    return `<div class="card pledge fade">
      <div class="pledge-verse"><div class="arabic center pledge-ar">فَاسْتَبِقُوا الْخَيْرَاتِ</div>
        <p><b>«Yaxshiliklarda musobaqalashinglar»</b></p><span class="quote-src">Baqara surasi, 148-oyat</span></div>
      <h3>Niyat</h3>
      <p class="small">Nur — savob emas. U faqat harakat va davomiylikni o'lchaydi. Savobni Alloh hisoblaydi, ilova esa — odatingizni.</p>
      <div class="pledge-rules">
        <div class="pledge-rule">${Icons.get("shield", 20)}<div><b>Qazo — sir</b><small>Qazo namozlar soni hech kimga ko'rinmaydi. Reytingga faqat haftalik umumiy Nur chiqadi.</small></div></div>
        <div class="pledge-rule">${Icons.get("eyeoff", 20)}<div><b>Anonim bo'lish mumkin</b><small>Ismingiz o'rniga «Anonim» ko'rinadi, o'rningizni esa o'zingiz ko'rasiz.</small></div></div>
        <div class="pledge-rule">${Icons.get("refresh", 20)}<div><b>Har hafta yangidan</b><small>Dushanba kuni reyting nolga tushadi — muhimi bugungi harakat, o'tgan yutuqlar emas.</small></div></div>
        <div class="pledge-rule">${Icons.get("hands", 20)}<div><b>Halollik</b><small>O'zimni aldasam — faqat o'zimga zarar. Qilganimni belgilayman, qilmaganimni emas.</small></div></div>
      </div>
      <div class="switch-row" data-switch="anon"><span>${Icons.get("eyeoff", 18)} Anonim ko'rinish</span><span class="switch ${p.anon ? "on" : ""}"><i></i></span></div>
      <button class="btn primary wide" data-act="ack">Niyat qildim — boshlayman</button></div>`;
  }

  function renderHero() {
    const lv = Nur.level(), t = Nur.today(), st = Nur.streak(), w = Nur.week();
    return `<div class="nur-hero"><div class="hero-pattern"></div>
      <div class="nur-hero-top">
        <div class="nur-level">${App.ring(lv.pct, 76, "")}<span class="nur-level-ic">${Icons.get(lv.cur.icon, 30)}</span></div>
        <div class="nur-hero-body">
          <div class="nur-hero-label">${esc(lv.cur.name)} darajasi</div>
          <div class="nur-hero-total">${fmt(lv.total)} <small>Nur</small></div>
          <div class="nur-hero-next">${lv.next ? `${esc(lv.next.name)}gacha ${fmt(lv.toNext)} Nur` : "Eng yuqori daraja — barakalla!"}</div>
        </div>
      </div>
      <div class="nur-hero-stats">
        <div><b>+${t.total}</b><small>bugun</small></div>
        <div><b>${fmt(w.total)}</b><small>bu hafta</small></div>
        <div><b>${Icons.get("flame", 15)}${st}</b><small>kun ketma-ket</small></div>
      </div></div>`;
  }

  // ---------- Natijalarim ----------
  function renderMen() {
    const w = Nur.week(), p = profile(), lv = Nur.level();
    const max = Math.max(60, ...w.days.map((d) => (d.score ? d.score.total : 0)));
    const sel = w.days.some((d) => d.date === selDay && !d.future) ? selDay : Store.today();
    const s = (w.days.find((d) => d.date === sel) || {}).score || Nur.dayScore(null, 0);
    const badges = Nur.badges(), earned = badges.filter((b) => b.earned).length;
    return `
      <div class="card">
        <div class="row-between bare"><span class="card-label" style="margin:0">Bu hafta · ${period(w.from, w.to)}</span><b>${fmt(w.total)} Nur</b></div>
        <div class="bars">${w.days.map((d) => {
          const v = d.score ? d.score.total : 0, wd = DAYS[(new Date(d.date + "T00:00:00").getDay() + 6) % 7];
          return `<button class="bar-col ${d.today ? "today" : ""} ${d.future ? "future" : ""} ${d.date === sel ? "sel" : ""}" data-day="${d.date}" ${d.future ? "disabled" : ""}>
            <span class="bar-val">${v || ""}</span><span class="bar"><i style="height:${d.future ? 3 : Math.max(4, v / max * 100)}%"></i></span><span class="bar-lbl">${wd}</span></button>`; }).join("")}</div>
      </div>
      <div class="card"><div class="card-label">${sel === Store.today() ? "Bugun" : dateLabel(sel)} · ${s.total} Nur</div>
        ${CATS.map((c) => `<div class="cat-row"><span class="cat-ic">${Icons.get(c.icon, 18)}</span><div class="cat-body">
          <div class="row-between bare"><b>${c.label}${c.private ? ` <span class="lock-tag">${Icons.get("lock", 11)} sir</span>` : ""}</b><span><b>${s[c.id]}</b><span class="muted small"> / ${Nur.CAP[c.id]}</span></span></div>
          <div class="progress thin"><div class="progress-bar" style="width:${s[c.id] / Nur.CAP[c.id] * 100}%"></div></div><small class="muted">${c.hint}</small></div></div>`).join("")}
      </div>
      <div class="card"><div class="card-label">Nishonlar · ${earned}/${badges.length}</div>
        <div class="badge-grid">${badges.map((b) => `<button class="badge-cell ${b.earned ? "" : "locked"}" data-badge="${b.id}">${b.isNew ? '<span class="badge-new">yangi</span>' : ""}<span class="badge-ic">${Icons.get(b.icon, 20)}</span><small>${esc(b.name)}</small></button>`).join("")}</div>
      </div>
      <div class="card"><div class="card-label">Darajalar</div>
        ${Nur.LEVELS.map((l, i) => `<div class="lvl-row ${i === lv.index ? "cur" : i < lv.index ? "done" : ""}"><span class="lvl-ic">${Icons.get(l.icon, 18)}</span><b>${esc(l.name)}</b><span class="small muted">${i < lv.index ? Icons.get("check", 16) : fmt(l.min) + " Nur"}</span></div>`).join("")}
      </div>
      <div class="card"><div class="card-label">Reytingda ko'rinish</div>
        <label class="field"><span class="small muted">Ism (reytingda shu ko'rinadi)</span><input id="rey-name" maxlength="24" placeholder="${esc(tgName() || "Ismingiz")}" value="${esc(p.name || "")}"></label>
        <div class="switch-row" data-switch="anon"><span>${Icons.get("eyeoff", 18)} Anonim ko'rinish</span><span class="switch ${p.anon ? "on" : ""}"><i></i></span></div>
        <p class="small muted">Serverga faqat kunlik umumiy Nur, ism va daraja yuboriladi. Zikr, tasbih, qazo va dars tafsilotlari telefoningizda qoladi.</p>
      </div>
      <p class="small muted center" style="margin:4px 0 0">Nur savobni emas, harakatni o'lchaydi. Savobni Alloh hisoblaydi.</p>`;
  }

  function openBadge(b) {
    App.openDetailHtml(`<div class="quiz-result fade"><span class="badge-ic big ${b.earned ? "" : "locked"}">${Icons.get(b.icon, 40)}</span>
      <h3 style="font-size:26px">${esc(b.name)}</h3><p>${esc(b.desc)}</p>
      <p class="small muted">${b.earned ? "Olingan: " + dateLabel(b.earned) : "Hali olinmagan"}${b.private ? " · faqat sizga ko'rinadi" : ""}</p></div>`);
  }

  // ---------- Reyting (server) ----------
  function renderBoardShell() {
    if (!Api.enabled) {
      return `<div class="card hero-card"><span class="tile-icon t-gold" style="margin:0 auto 8px">${Icons.get("users")}</span><h3>Musobaqa hali yoqilmagan</h3>
        <p class="small muted">${isTelegram() ? "Reyting serveri ulanmagan. Natijalaringiz saqlanib boradi — server ulanganda reytingga qo'shiladi." : "Reyting faqat Telegram ichida ishlaydi — ilovani bot orqali oching."}</p></div>
        ${renderHowTo()}`;
    }
    const teams = (Api.meta && Api.meta.teams) || [];
    if (scope === "team" && teams.length && !teams.some((t) => t.id === teamId)) teamId = teams[0].id;
    return `<div class="chips scroll">
        <button class="chip-sm ${scope === "liga" ? "on" : ""}" data-scope="liga">${Icons.get("medal", 14)} Liga</button>
        ${teams.length
          ? teams.map((t) => `<button class="chip-sm ${scope === "team" && teamId === t.id ? "on" : ""}" data-scope="team" data-team="${t.id}">${Icons.get("users", 14)} ${esc(t.title)}</button>`).join("")
          : `<button class="chip-sm ${scope === "team" ? "on" : ""}" data-scope="team">${Icons.get("users", 14)} Jamoa</button>`}
        <button class="chip-sm ${scope === "friends" ? "on" : ""}" data-scope="friends">${Icons.get("user", 14)} Do'stlar</button>
      </div>
      <div id="rey-board"><div class="card center" style="padding:28px"><span class="spinner"></span></div></div>`;
  }
  function renderHowTo() {
    return `<div class="card"><div class="card-label">Qanday ishlaydi</div>
      <div class="pledge-rules">
        <div class="pledge-rule">${Icons.get("medal", 20)}<div><b>Liga</b><small>Haftalik musobaqa. Odam ko'paygach daraja bo'yicha bo'linadi — shunda o'zingizga tenglar bilan yarashasiz.</small></div></div>
        <div class="pledge-rule">${Icons.get("users", 20)}<div><b>Jamoa</b><small>Oila yoki do'stlar guruhiga botni qo'shing va <b>/jamoa</b> yozing — guruh jamoaga aylanadi.</small></div></div>
        <div class="pledge-rule">${Icons.get("user", 20)}<div><b>Do'stlar</b><small>Taklif havolasini yuboring — qabul qilgan do'stingiz bilan bir-biringizni ko'rasiz.</small></div></div>
      </div></div>`;
  }
  async function loadBoard() {
    if (!$("#rey-board")) return;
    const want = scope + ":" + teamId;
    const data = await Api.board(scope, scope === "team" ? teamId : null);
    const el = $("#rey-board");
    if (!el || scope + ":" + teamId !== want) return; // foydalanuvchi boshqa joyga o'tib ketdi
    el.innerHTML = data ? renderBoard(data) : `<div class="card center"><p class="small muted">Serverga ulanib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.</p><button class="btn ghost small-btn" data-act="reload">Qayta urinish</button></div>`;
    bind(el);
  }
  function renderBoard(b) {
    const title = scope === "liga" ? "Liga" : scope === "team" ? "Jamoa" : "Do'stlar";
    const rows = b.rows || [], lvl = levelOf(b.level);
    let html = `<div class="card board-head"><div><div class="card-label">${title}</div><h3>${esc(b.title || title)}</h3>
        <p class="small muted">${period(b.from, b.to)} · ${daysLeft(b.to)} kun qoldi${b.size ? " · " + b.size + " kishi" : ""}</p></div>
      ${scope === "liga" ? `<div class="board-lvl">${Icons.get(lvl.icon, 26)}</div>` : ""}</div>`;
    const empty = !rows.length || (scope === "friends" && !b.size);
    if (empty) html += emptyState();
    else {
      const meIn = rows.some((r) => r.me);
      html += `<div class="card board">${rows.map(rowHtml).join("")}${!meIn && b.me ? `<div class="board-gap">···</div>${rowHtml(Object.assign({ me: true }, b.me))}` : ""}</div>`;
      if (scope === "friends") html += `<button class="btn primary wide" data-act="invite">${Icons.get("share", 18)} Do'st taklif qilish</button>`;
      if (scope === "team") html += `<p class="small muted center">Guruhdagi boshqalar ham qo'shilishi uchun guruhda <b>/jamoa</b> yozing.</p>`;
    }
    if (b.community) html += `<div class="card community">${Icons.get("users", 26)}<span>Bu hafta jamiyat birgalikda <b>${fmt(b.community)} Nur</b> to'pladi</span></div>`;
    return html;
  }
  function rowHtml(r) {
    const rank = r.rank || 0, top = rank && rank <= 3 ? `top${rank}` : "";
    return `<div class="board-row ${r.me ? "me" : ""}">
      <span class="rank ${top}">${rank === 1 ? Icons.get("crown", 20) : rank && rank <= 3 ? Icons.get("medal", 20) : rank || "–"}</span>
      <span class="avatar">${esc(initials(r.name))}</span>
      <div class="board-body"><b>${esc(r.name)}${r.me ? '<span class="me-tag">siz</span>' : ""}</b><small class="muted">${esc(levelOf(r.level).name)}</small></div>
      <b class="board-nur">${fmt(r.nur)}</b></div>`;
  }
  function emptyState() {
    if (scope === "team") return `<div class="card hero-card"><span class="tile-icon t-green" style="margin:0 auto 8px">${Icons.get("users")}</span><h3>Jamoa yo'q</h3>
      <p class="small muted">Oila yoki do'stlar guruhiga botni qo'shing va guruhda <b>/jamoa</b> yozing — guruh jamoaga aylanadi, a'zolar bir tugma bilan qo'shiladi.</p>
      <button class="btn primary wide" data-act="addgroup">${Icons.get("users", 18)} Botni guruhga qo'shish</button></div>`;
    if (scope === "friends") return `<div class="card hero-card"><span class="tile-icon t-gold" style="margin:0 auto 8px">${Icons.get("user")}</span><h3>Do'stlaringiz hali yo'q</h3>
      <p class="small muted">Taklif havolasini yuboring. Do'stingiz botni ochib qabul qilsa — reytingda bir-biringizni ko'rasiz.</p>
      <button class="btn primary wide" data-act="invite">${Icons.get("share", 18)} Do'st taklif qilish</button></div>`;
    return `<div class="card hero-card"><h3>Bu hafta ligada hali hech kim yo'q</h3><p class="small muted">Birinchi bo'ling — bugungi zikr yoki dars sizni ro'yxatga qo'shadi.</p></div>`;
  }

  function invite() {
    const url = Api.meta && Api.meta.invite;
    if (!url) { notify("error"); return; }
    const text = "Bomdod ilovasida birga zikr qilamiz — yaxshiliklarda musobaqalashaylik!";
    if (tg && tg.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    else if (navigator.share) navigator.share({ text: text + " " + url }).catch(() => {});
    else window.prompt("Havolani nusxalang:", url);
  }
  function addGroup() {
    const bot = Api.meta && Api.meta.bot;
    if (bot && tg && tg.openTelegramLink) tg.openTelegramLink(`https://t.me/${bot}?startgroup=jamoa`);
  }

  // ---------- hodisalar ----------
  function bind(root) {
    root.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { view = b.dataset.view; haptic(); render(); }));
    root.querySelectorAll("[data-scope]").forEach((b) => b.addEventListener("click", () => { scope = b.dataset.scope; teamId = b.dataset.team ? Number(b.dataset.team) : null; haptic(); render(); }));
    root.querySelectorAll("[data-day]").forEach((b) => b.addEventListener("click", () => { selDay = b.dataset.day; haptic(); render(); }));
    root.querySelectorAll("[data-badge]").forEach((b) => b.addEventListener("click", () => { const x = Nur.badges().find((y) => y.id === b.dataset.badge); if (x) { haptic(); openBadge(x); } }));
    root.querySelectorAll("[data-switch]").forEach((b) => b.addEventListener("click", () => {
      const p = profile(); p.anon = !p.anon; saveProfile(p); haptic("medium");
      b.querySelector(".switch").classList.toggle("on", !!p.anon);
    }));
    const nameEl = root.querySelector("#rey-name");
    if (nameEl) nameEl.addEventListener("change", () => { const p = profile(); p.name = nameEl.value.trim().slice(0, 24); saveProfile(p); });
    root.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "ack") { Store.set("nurAck", Store.today()); notify("success"); render(); Api.scheduleSync(300); }
      if (a === "reload") loadBoard();
      if (a === "invite") invite();
      if (a === "addgroup") addGroup();
    }));
  }

  // ---------- bosh sahifadagi kartochka ----------
  function renderHome() {
    const el = $("#nur-card"); if (!el) return;
    const lv = Nur.level(), t = Nur.today(), ack = Store.get("nurAck", null);
    const sub = !ack ? "Harakatingizni o'lchang — reytingga qo'shiling"
      : lv.next ? `${esc(lv.cur.name)} · ${esc(lv.next.name)}gacha ${fmt(lv.toNext)} Nur`
      : `${esc(lv.cur.name)} — eng yuqori daraja, barakalla!`;
    el.innerHTML = `<span class="tile-icon t-gold" style="margin:0">${Icons.get(lv.cur.icon)}</span><div class="today-body">
      <div class="today-head"><b>${fmt(lv.total)} Nur</b>${t.total ? `<span class="nur-chip">+${t.total} bugun</span>` : ""}</div>
      <div class="progress thin" style="margin:2px 0 5px"><div class="progress-bar gold" style="width:${lv.pct * 100}%"></div></div>
      <p class="small muted" style="margin:0">${sub}</p></div>
      <span class="menu-arrow">${Icons.get("chevron")}</span>`;
    el.onclick = () => { haptic(); App.showTab("reyting"); };
  }

  App.onTab("reyting", render);
  Api.onSync(() => { if (App.state.tab === "reyting" && view === "reyting") render(); }); // jamoalar ro'yxati kelganda yangilash
  return { render, renderHome, fmt };
})();
