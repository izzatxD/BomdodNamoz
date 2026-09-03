// ============================================================
//  VIDEO moduli — bo'limlar, video/playlist ro'yxati, pleyer, materiallar va ADMIN paneli
//
//  Kontent uch manbadan keladi:
//    • data.js dagi `videos` — kodda yozilgan (server kerak emas)
//    • serverdan videolar (bot/api.py) — admin panel orqali qo'shilgan, id raqami bor
//    • serverdan materiallar (PDF va h.k.) — botga yuklangan, bot orqali yetkaziladi
//  Server ulanmagan bo'lsa oxirgi yuklangan ro'yxat keshdan ko'rsatiladi (internetsiz ham ochiladi).
//
//  ADMIN: bot .env dagi ADMIN_IDS ro'yxatidagilar qo'shimcha tugmalarni ko'radi.
//  Ruxsatni server tekshiradi — bu yerdagi bayroq faqat interfeys uchun.
// ============================================================
window.Video = (function () {
  const D = window.APP_DATA;
  const { $, haptic, notify, esc } = App;
  const tg = window.Telegram && window.Telegram.WebApp;
  const SECTIONS = D.videoSections || [];
  const GENDERS = [
    { id: "hamma", label: "Hammaga" },
    { id: "erkak", label: "Erkaklar" },
    { id: "ayol", label: "Ayollar" },
  ];
  let section = null;   // null — bo'limlar ro'yxati; aks holda bo'lim id si
  let loading = false;
  const DONE_AT = 0.9;  // videoning shuncha qismi ko'rilsa — dars tugagan hisoblanadi

  // ---------- ko'rilgan darslar ----------
  // watched: { "<youtubeId>": foiz(0..1) }. 0.9 dan oshsa dars tugagan.
  function watched() { return Store.get("watched", {}); }
  function progressOf(yt) { return Number(watched()[yt] || 0); }
  function isDone(v) { const yt = parseYouTube(v.youtubeId); return !!yt && progressOf(yt) >= DONE_AT; }
  function saveProgress(yt, pct) {
    if (!yt) return false;
    const w = watched(), was = Number(w[yt] || 0);
    // CloudStorage kaliti 4KB bilan chegaralangan — foizni ikki xonagacha yaxlitlaymiz
    const next = Math.min(1, Math.round(pct * 100) / 100);
    if (next <= was) return false;
    w[yt] = next; Store.set("watched", w);
    return was < DONE_AT && next >= DONE_AT;   // endigina tugadimi?
  }
  // Ketma-ket bo'limda qulflanganmi? Kurs (playlist) yozuvlari zanjirga kirmaydi.
  function lockedAt(list, i) {
    const s = SECTIONS.find((x) => x.id === section);
    if (!s || !s.sequential || isAdmin()) return false;
    for (let k = 0; k < i; k++) {
      const v = list[k];
      if (v.playlistId && !parseYouTube(v.youtubeId)) continue;
      if (!isDone(v)) return true;
    }
    return false;
  }
  function alertMsg(text) {
    if (tg && tg.showAlert) { try { return tg.showAlert(text); } catch (e) {} }
    alert(text);
  }

  // ---------- YouTube havolasi ----------
  // Video: watch?v=, youtu.be/, shorts/, embed/, live/ yoki toza ID
  function parseYouTube(input) {
    const s = String(input || "").trim();
    if (!s) return "";
    if (/^[\w-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : "";
  }
  // Playlist: havoladagi list= parametri yoki toza PL... ID
  function parsePlaylist(input) {
    const s = String(input || "").trim();
    if (!s) return "";
    if (/^(?:PL|UU|OL|LL|FL|RD)[\w-]{10,}$/.test(s)) return s;
    const m = s.match(/[?&]list=([\w-]{12,})/);
    return m ? m[1] : "";
  }
  function thumb(id) { return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }
  function embedUrl(v) {
    const yt = parseYouTube(v.youtubeId), pl = v.playlistId || "";
    const base = "https://www.youtube-nocookie.com/embed/";
    const q = "?rel=0&modestbranding=1&playsinline=1" + (pl ? "&list=" + encodeURIComponent(pl) : "");
    return base + (yt ? encodeURIComponent(yt) : "videoseries") + q;
  }

  // ---------- ma'lumot ----------
  function all() {
    const local = (D.videos || []).filter((v) => parseYouTube(v.youtubeId) || v.playlistId);
    return local.concat(Store.get("videos", []));
  }
  // Materiallar: data.js dagilar (ilova bilan birga keladi) + admin botga yuklaganlari
  function files() { return (D.materials || []).concat(Store.get("files", [])); }
  function isAdmin() { return !!(Api.meta && Api.meta.isAdmin); }
  // Joriy foydalanuvchiga ko'rinadigan videolar (admin hammasini ko'radi)
  function visible(list) {
    if (isAdmin()) return list;
    const g = App.state.gender || "erkak";
    return list.filter((v) => !v.gender || v.gender === "hamma" || v.gender === g);
  }
  function inSection(id) { return visible(all()).filter((v) => (v.section || "boshqa") === id); }
  function filesIn(id) { return files().filter((f) => (f.section || "boshqa") === id); }

  async function load() {
    if (!Api.enabled || loading) return;
    loading = true;
    const r = await Api.content();
    loading = false;
    if (!r) return;
    if (Array.isArray(r.videos)) Store.set("videos", r.videos);
    if (Array.isArray(r.files)) Store.set("files", r.files);
    render();
  }

  // ---------- ko'rinish ----------
  function render() {
    const body = $("#video-body");
    if (!body) return;
    updateCount();
    body.innerHTML = section ? renderSection() : renderSections();
    bind(body);
  }
  function updateCount() {
    const el = $("#video-count");
    if (el) { const n = visible(all()).length; el.textContent = n ? `${n} ta dars` : "Tez orada"; }
  }

  function renderSections() {
    const list = visible(all()), fs = files();
    const used = SECTIONS.map((s) => ({
      s, n: list.filter((v) => (v.section || "boshqa") === s.id).length,
      f: fs.filter((x) => (x.section || "boshqa") === s.id).length,
    }));
    const total = list.length;
    return `
      <div class="card hero-card"><span class="tile-icon t-purple" style="margin:0 auto 8px">${Icons.get("video")}</span>
        <h3>Video darslar</h3>
        <p class="small muted">${total ? `${total} ta dars · ${used.filter((x) => x.n).length} ta bo'lim` : "Hozircha video qo'shilmagan."}</p>
        ${isAdmin() ? `<button class="btn primary wide" data-act="add">${Icons.get("plus", 18)} Video qo'shish</button>` : ""}</div>
      <div class="grid2">${used.map(({ s, n, f }) => `
        <button class="tile ${n || f ? "" : "tile-empty"}" data-sec="${s.id}">
          <span class="tile-icon t-purple">${Icons.get(s.icon || "video")}</span>
          <b>${esc(s.title)}</b><small>${n ? n + " ta dars" : f ? "" : "bo'sh"}${f ? (n ? " · " : "") + f + " ta kitob" : ""}</small></button>`).join("")}</div>
      ${!total && !isAdmin() ? `<p class="small muted center" style="margin-top:14px">Darslar tayyorlanmoqda, in shaa Alloh.</p>` : ""}`;
  }

  function renderSection() {
    const s = SECTIONS.find((x) => x.id === section) || { id: section, title: "Darslar" };
    const list = inSection(section), fs = filesIn(section);
    const done = list.filter(isDone).length;
    const seq = s.sequential && !isAdmin();
    return `
      <button class="btn ghost small-btn" data-act="back" style="margin:0 0 12px">${Icons.get("back", 16)} Bo'limlar</button>
      <div class="card"><div class="card-label">${list.length} ta dars${done ? ` · ${done} tasi ko'rildi` : ""}${fs.length ? ` · ${fs.length} ta material` : ""}</div>
        <h3 style="font-size:20px">${esc(s.title)}</h3>
        ${s.desc ? `<p class="small muted" style="margin:4px 0 0">${esc(s.desc)}</p>` : ""}
        ${seq && list.length ? `<div class="progress" style="margin:12px 0 6px"><div class="progress-bar" style="width:${done / list.length * 100}%"></div></div>
          <p class="small muted" style="margin:0">${Icons.get("lock", 13)} Darslar ketma-ket ochiladi — har birini oxirigacha ko'ring.</p>` : ""}
        ${isAdmin() ? `<button class="btn primary wide" data-act="add">${Icons.get("plus", 18)} Shu bo'limga video qo'shish</button>` : ""}</div>
      ${fs.length ? `<div class="section-head"><h2 class="section-title">Materiallar</h2></div>
        <div class="list">${fs.map(fileCard).join("")}</div>` : ""}
      ${list.length ? `${fs.length ? `<div class="section-head"><h2 class="section-title">Video darslar</h2></div>` : ""}
        <div class="list">${list.map((v, i) => card(v, i, list.length)).join("")}</div>`
        : `<div class="card center"><p class="small muted">Bu bo'limda hali video yo'q.</p></div>`}
      ${isAdmin() && SECTIONS.find((x) => x.id === section && x.sequential) ? `<p class="small muted center" style="margin-top:14px">${Icons.get("lock", 13)} Bu bo'lim ketma-ket. Admin uchun qulf ishlamaydi.</p>` : ""}
      ${isAdmin() ? `<p class="small muted center" style="margin-top:8px">PDF yoki kitob qo'shish: botga faylni yuboring — qaysi bo'limga qo'shishni so'raydi.</p>` : ""}`;
  }

  function card(v, i, n) {
    const yt = parseYouTube(v.youtubeId), pl = v.playlistId || "";
    const g = GENDERS.find((x) => x.id === (v.gender || "hamma"));
    const locked = lockedAt(inSection(section), i);
    const done = isDone(v), pct = yt ? progressOf(yt) : 0;
    const sub = locked ? "Oldingi darsni oxirigacha ko'ring"
      : [done ? "Ko'rildi" : pct > 0.02 ? `Ko'rilgan: ${Math.round(pct * 100)}%` : null,
         pl ? "Kurs — bir nechta dars" : null,
         v.gender && v.gender !== "hamma" ? (g ? g.label : v.gender) : null, v.note || null]
        .filter(Boolean).join(" · ") || "Hammaga";
    return `<div class="vid ${locked ? "vid-locked" : ""} ${done ? "vid-done" : ""}">
      <button class="vid-main" ${locked ? `data-locked="1"` : `data-play="${i}"`}>
        <span class="vid-thumb">${yt ? `<img src="${thumb(yt)}" alt="" loading="lazy">` : `<span class="vid-noimg">${Icons.get("list", 22)}</span>`}
          <span class="vid-play">${Icons.get(locked ? "lock" : done ? "check" : "play", 20)}</span>
          ${pl ? `<span class="vid-badge">${Icons.get("list", 11)} KURS</span>` : ""}
          ${v.duration ? `<span class="vid-dur">${esc(v.duration)}</span>` : ""}
          ${!locked && pct > 0.02 && !done ? `<span class="vid-bar"><i style="width:${pct * 100}%"></i></span>` : ""}</span>
        <span class="vid-meta"><b>${esc(v.title)}</b><small class="muted">${esc(sub)}</small></span>
      </button>
      ${isAdmin() ? `<div class="vid-admin">
        <button data-edit="${v.id || ""}" data-yt="${esc(yt)}" data-pl="${esc(pl)}" title="Tahrirlash">${Icons.get("edit", 17)}</button>
        <button data-move="${v.id || ""}:up" ${i === 0 || !v.id ? "disabled" : ""} title="Yuqoriga">${Icons.get("up", 17)}</button>
        <button data-move="${v.id || ""}:down" ${i === n - 1 || !v.id ? "disabled" : ""} title="Pastga">${Icons.get("down", 17)}</button>
        <button class="danger" data-del="${v.id || ""}" ${v.id ? "" : "disabled"} title="O'chirish">${Icons.get("trash", 17)}</button>
      </div>` : ""}</div>`;
  }

  function fileCard(f) {
    const mb = f.size ? (f.size / 1048576).toFixed(1) + " MB" : "";
    const meta = [String(f.kind || "fayl").toUpperCase(), mb, f.note].filter(Boolean).join(" · ");
    return `<div class="vid">
      <button class="vid-main" ${f.file ? `data-url="${esc(f.file)}"` : `data-file="${f.id}"`}>
        <span class="file-ic">${Icons.get("file", 22)}</span>
        <span class="vid-meta"><b>${esc(f.title)}</b><small class="muted">${esc(meta)}</small></span>
        ${Icons.get("chevron")}
      </button>
      ${isAdmin() && f.id ? `<div class="vid-admin"><button class="danger" data-delfile="${f.id}" title="O'chirish">${Icons.get("trash", 17)}</button></div>` : ""}</div>`;
  }

  // ---------- pleyer ----------
  // YouTube IFrame API — videoning qancha ko'rilganini bilish uchun (API kaliti kerak emas).
  let ytApi = null;
  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytApi) return ytApi;
    ytApi = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => reject(new Error("api"));
      document.head.appendChild(s);
      setTimeout(() => reject(new Error("timeout")), 8000);
    }).catch((e) => { ytApi = null; throw e; });   // keyingi urinishda qaytadan sinaydi
    return ytApi;
  }

  // Har ochilgan pleyerga o'z raqami beriladi: eski pleyerning taymeri yangisiga aralashmasin
  let playSession = 0;
  function detailOpen() { const d = document.getElementById("screen-detail"); return !!d && d.classList.contains("active"); }

  // ---------- video darsni arab tili darsligi bilan bog'lash ----------
  // data.js dagi `letters` va `lesson` maydonlari data_arabic.js ga ishora qiladi:
  // videoning tagida o'sha darsda o'rgatiladigan harflar va 3 ta misol so'z chiqadi.
  function lessonExtras(v) {
    const A = window.ARABIC_DATA;
    if (!A) return "";
    const letters = (v.letters || []).map((n) => A.letters[n - 1]).filter(Boolean);
    const lesson = v.lesson ? A.lessons.find((l) => l.id === v.lesson) : null;
    if (!letters.length && !lesson) return "";
    const items = (lesson && lesson.items) || [];
    const row = (ar, latin, note) => `<div class="theory-row"><span class="ar">${ar}</span>
      <div><b>${esc(latin)}</b><div class="small muted">${esc(note || "")}</div></div></div>`;

    // 3 ta misol so'z: avval o'rgatilayotgan harflarning so'zlari, yetmasa qoidaning misollaridan to'ldiramiz
    const words = letters.slice(0, 3).map((l) => ({ ar: l.ex, latin: l.exLatin, note: l.exMeaning }));
    for (let i = items.length - 1; i >= 0 && words.length < 3; i--) {
      words.push({ ar: items[i].arabic, latin: items[i].latin, note: items[i].note });
    }

    let html = "";
    // Qoida birinchi turadi — masalan 1-darsda avval a/i/u harakatlari, keyin ro va za harflari
    if (lesson) {
      html += `<div class="section-head"><h2 class="section-title">Qoida</h2></div>
        <div class="card"><b>${esc(lesson.title.replace(/^\d+-dars:\s*/, ""))}</b>
          <p class="small muted" style="margin:6px 0 10px">${esc(lesson.intro)}</p>
          ${items.slice(0, 3).map((it) => row(it.arabic, it.latin, it.note)).join("")}</div>`;
    }
    if (letters.length) {
      html += `<div class="section-head"><h2 class="section-title">Bu darsda o'rganiladigan harflar</h2></div>
        <div class="card lt-card">${letters.map((l) => `
          <div class="lt-row">
            <span class="letter-big">${l.iso}</span>
            <div class="lt-info"><b>${esc(l.name)}</b><div class="small muted">o'qilishi: <b>${esc(l.latin)}</b></div>
              <div class="forms"><span><small>oxirida</small><i>${l.fin}</i></span><span><small>o'rtada</small><i>${l.mid}</i></span><span><small>boshida</small><i>${l.ini}</i></span><span><small>alohida</small><i>${l.iso}</i></span></div>
              ${l.noJoin ? `<div class="small warn" style="margin-top:4px">⚠️ Keyingi harfga qo'shilmaydi</div>` : ""}</div>
          </div>`).join("")}</div>`;
    }
    if (words.length) {
      html += `<div class="card"><div class="card-label">Misol so'zlar</div>
        ${words.map((w) => row(w.ar, w.latin, w.note)).join("")}</div>`;
    }
    html += `<button class="menu-item" id="go-arab"><span class="menu-icon t-blue">${Icons.get("letters")}</span>
      <span class="menu-text"><b>Arab tili darsligi</b><small>${lesson ? esc(lesson.title) : "Alifbo, harakatlar, o'qish mashqlari"}</small></span>
      ${Icons.get("chevron", 20)}</button>`;
    return html;
  }

  function play(v) {
    const yt = parseYouTube(v.youtubeId);
    const track = !!yt && !v.playlistId;   // kurs (playlist) da pleyer videolarni almashtiradi — foiz kuzatilmaydi
    const mySession = ++playSession;
    App.openDetailHtml(`<div class="detail-title fade">${esc(v.title)}</div>
      ${v.playlistId ? `<div class="detail-sub">Kurs — pleyerdagi ro'yxatdan keyingi darsga o'tasiz</div>` : ""}
      <div class="video-frame fade"><div id="yt-player"></div></div>
      <div id="yt-status" class="watch-status">${track ? `<div class="progress thin" style="margin:10px 0 6px"><div class="progress-bar" id="yt-bar" style="width:${progressOf(yt) * 100}%"></div></div>
        <p class="small muted" id="yt-text" style="margin:0">Darsni oxirigacha ko'ring — shundan keyin keyingisi ochiladi va ${Nur.W.dars} Nur qo'shiladi.</p>`
        : `<p class="small muted center" style="margin-top:12px">Video YouTube'dan yuklanadi</p>`}</div>
      ${lessonExtras(v)}`);
    const goArab = $("#go-arab");
    if (goArab) goArab.addEventListener("click", () => { haptic(); App.closeDetail(); App.showTab("arab"); });

    const mount = $("#yt-player");
    loadYT().then((YT) => {
      if (mySession !== playSession || !detailOpen()) return;   // foydalanuvchi yopib yoki boshqasini ochib ulgurdi
      const player = new YT.Player("yt-player", {
        videoId: yt || undefined,
        playerVars: Object.assign({ rel: 0, modestbranding: 1, playsinline: 1 }, v.playlistId
          ? { list: v.playlistId, listType: "playlist" } : {}),
        events: { onStateChange: (e) => { if (track && mySession === playSession && e.data === YT.PlayerState.ENDED) finish(1); } },
      });
      const timer = setInterval(() => {
        // Overlay yopildi yoki boshqa video ochildi — ijroni to'xtatib, pleyerni yo'q qilamiz
        // (aks holda video fonda ijro etilaveradi va foiz noto'g'ri yig'iladi)
        if (mySession !== playSession || !detailOpen()) {
          clearInterval(timer);
          try { player.stopVideo(); } catch (e) {}
          try { player.destroy(); } catch (e) {}
          return;
        }
        if (!track) return;
        let d = 0, t = 0;
        try { d = player.getDuration() || 0; t = player.getCurrentTime() || 0; } catch (e) { return; }
        if (d > 0) finish(t / d);
      }, 1000);
    }).catch(() => {
      // API yuklanmadi — oddiy iframe bilan ko'rsatamiz, tugatishni foydalanuvchi tasdiqlaydi
      if (mySession !== playSession || !detailOpen() || !mount) return;
      mount.outerHTML = `<iframe src="${embedUrl(v)}" title="${esc(v.title)}"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      if (!track) return;
      $("#yt-status").innerHTML = `<p class="small muted" style="margin:10px 0 8px">Ko'rilganini avtomatik aniqlab bo'lmadi.
        Darsni to'liq ko'rgach quyidagini bosing.</p><button class="btn ghost wide" id="yt-manual">${Icons.get("check", 17)} Darsni ko'rib bo'ldim</button>`;
      $("#yt-manual").addEventListener("click", () => finish(1));
    });

    function finish(pct) {
      if (mySession !== playSession) return;
      const opened = saveProgress(yt, pct);
      const bar = $("#yt-bar"), txt = $("#yt-text");
      if (bar) bar.style.width = Math.min(100, pct * 100) + "%";
      if (opened) {
        // Video dars ham arab tili darsi bilan bir xil hisoblanadi — «ilm» kategoriyasiga Nur qo'shiladi
        if (window.Nur) Nur.bump("a");
        notify("success");
        const st = $("#yt-status");
        if (st) st.innerHTML = `<p class="ok-text" style="margin:10px 0 0">${Icons.get("check", 17)} Dars tugadi — keyingi dars ochildi
          <span class="nur-chip" style="margin-left:6px">+${Nur.W.dars} Nur</span></p>`;
      } else if (txt && pct < DONE_AT) {
        txt.textContent = `Ko'rildi: ${Math.round(pct * 100)}% — dars ${Math.round(DONE_AT * 100)}% da tugaydi.`;
      }
    }
  }

  // Botga yuklangan material — bot orqali keladi (Telegram ichida saqlanadi, offline o'qiladi)
  function openFile(id) {
    const bot = Api.meta && Api.meta.bot;
    if (!bot) { notify("error"); return; }
    const url = `https://t.me/${bot}?start=file_${id}`;
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, "_blank");
  }
  // Ilova bilan birga kelgan material — tashqi brauzerda ochiladi (PDF ni Telegram webview ishonchli ko'rsatmaydi)
  function openUrl(path) {
    const url = new URL(path, location.href).href;
    if (tg && tg.openLink) tg.openLink(url); else window.open(url, "_blank");
  }

  // ---------- admin: qo'shish / tahrirlash ----------
  function form(v) {
    v = v || { section: section || SECTIONS[0].id, gender: "hamma" };
    const isNew = !v.id;
    let found = null;   // lookup natijasi: {playlistId, count, ...}
    App.openDetailHtml(`
      <div class="detail-title fade">${isNew ? "Yangi video" : "Videoni tahrirlash"}</div>
      <div class="detail-sub">Admin paneli</div>
      <div class="card">
        <label class="field"><span class="small muted">YouTube havolasi (video yoki playlist)</span>
          <input id="v-url" inputmode="url" placeholder="https://youtu.be/… yoki …?list=PL…" value="${esc(v.playlistId ? "https://www.youtube.com/playlist?list=" + v.playlistId : v.youtubeId || "")}"></label>
        <div id="v-preview" class="v-preview"></div>
        <div id="v-playlist"></div>
        <label class="field"><span class="small muted">Sarlavha</span>
          <input id="v-title" maxlength="80" placeholder="Masalan: Bomdod namozi — to'liq ko'rsatma" value="${esc(v.title || "")}"></label>
        <label class="field"><span class="small muted">Bo'lim</span>
          <select id="v-section">${SECTIONS.map((s) => `<option value="${s.id}" ${s.id === v.section ? "selected" : ""}>${esc(s.title)}</option>`).join("")}</select></label>
        <label class="field"><span class="small muted">Kim uchun</span>
          <select id="v-gender">${GENDERS.map((g) => `<option value="${g.id}" ${g.id === (v.gender || "hamma") ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select></label>
        <div class="row2">
          <label class="field"><span class="small muted">Davomiyligi</span><input id="v-dur" maxlength="8" placeholder="12:40" value="${esc(v.duration || "")}"></label>
          <label class="field"><span class="small muted">Izoh</span><input id="v-note" maxlength="40" placeholder="ixtiyoriy" value="${esc(v.note || "")}"></label>
        </div>
      </div>
      <button class="btn primary wide" id="v-save">${isNew ? "Qo'shish" : "Saqlash"}</button>
      ${isNew ? "" : `<button class="btn ghost wide danger" id="v-del">${Icons.get("trash", 17)} O'chirish</button>`}
      <p class="small muted center" style="margin-top:10px">Sarlavha havoladan avtomatik olinadi — kerak bo'lsa o'zgartiring.</p>`);

    const url = $("#v-url"), titleEl = $("#v-title"), prev = $("#v-preview"), plBox = $("#v-playlist");
    const showPreview = () => {
      const yt = parseYouTube(url.value), pl = parsePlaylist(url.value);
      prev.innerHTML = yt || pl
        ? `${yt ? `<img src="${thumb(yt)}" alt="">` : ""}<span class="small ok-text">${Icons.get("check", 15)} ${pl ? "Playlist havolasi" : "Video havolasi"}</span>`
        : url.value.trim() ? `<span class="small danger">Havola tanilmadi — YouTube manzilini to'liq joylashtiring</span>` : "";
      if (!pl) { plBox.innerHTML = ""; found = null; }
      return { yt, pl };
    };
    const lookup = async () => {
      const { pl } = showPreview();
      if (!url.value.trim()) return;
      plBox.innerHTML = pl ? `<div class="pl-box"><span class="spinner"></span> <span class="small muted">Playlist tekshirilmoqda…</span></div>` : "";
      const r = await Api.lookup(url.value);
      if (!r || !r.ok) { plBox.innerHTML = pl ? `<div class="pl-box small muted">Playlistni o'qib bo'lmadi — bitta kurs sifatida qo'shiladi.</div>` : ""; return; }
      found = r;
      if (r.title && !titleEl.value.trim()) titleEl.value = r.title.slice(0, 80);
      if (r.playlistId) {
        plBox.innerHTML = `<div class="pl-box">
          <b>${Icons.get("list", 16)} ${esc(r.playlistTitle || "Playlist")}</b>
          <p class="small muted" style="margin:2px 0 8px">${r.count ? `${r.count} ta dars topildi` : "Darslar ro'yxatini o'qib bo'lmadi"}</p>
          <div class="switch-row" id="v-expand-row"><span class="small">${r.count ? "Har bir darsni alohida qo'shish" : "Alohida qo'shib bo'lmaydi"}</span>
            <span class="switch ${r.count ? "on" : ""}" id="v-expand"><i></i></span></div>
          <p class="small muted" style="margin:0">${r.count ? "O'chirilsa — butun kurs bitta yozuv bo'lib qo'shiladi." : "Kurs bitta yozuv bo'lib qo'shiladi, pleyerda darslar ro'yxati bo'ladi."}</p></div>`;
        const sw = $("#v-expand");
        if (r.count) $("#v-expand-row").addEventListener("click", () => { sw.classList.toggle("on"); haptic(); });
      }
      notify("success");
    };
    url.addEventListener("input", showPreview);
    url.addEventListener("change", lookup);
    url.addEventListener("blur", lookup);
    showPreview();

    $("#v-save").addEventListener("click", async () => {
      const yt = parseYouTube(url.value), pl = parsePlaylist(url.value);
      if (!yt && !pl) { notify("error"); return alert("YouTube havolasi noto'g'ri."); }
      const sw = $("#v-expand");
      const expand = !!(pl && sw && sw.classList.contains("on") && found && found.count);
      if (!expand && !titleEl.value.trim()) { notify("error"); return alert("Sarlavhani kiriting."); }
      const btn = $("#v-save"); btn.disabled = true; btn.textContent = "Saqlanmoqda…";
      const r = await Api.saveVideo({
        id: v.id || null, youtubeId: yt, playlistId: pl, expand,
        title: titleEl.value.trim(), section: $("#v-section").value, gender: $("#v-gender").value,
        duration: $("#v-dur").value.trim(), note: $("#v-note").value.trim(),
      });
      if (r && r.ok) {
        Store.set("videos", r.videos); if (r.files) Store.set("files", r.files);
        notify("success"); section = $("#v-section").value; App.closeDetail();
        if (r.added) alert(`${r.added} ta dars qo'shildi.`);
      } else {
        notify("error"); btn.disabled = false; btn.textContent = isNew ? "Qo'shish" : "Saqlash";
        alert(r && r.error === "playlist_empty" ? "Playlist darslarini o'qib bo'lmadi. «Har bir darsni alohida» ni o'chirib, kurs sifatida qo'shing."
          : "Saqlanmadi. Internetni yoki admin huquqingizni tekshiring.");
      }
    });
    const del = $("#v-del");
    if (del) del.addEventListener("click", () => App.confirm("Bu video o'chirilsinmi?", () => remove(v.id)));
  }

  function applied(r) {
    if (!r || !r.ok) { notify("error"); return false; }
    Store.set("videos", r.videos || []);
    if (r.files) Store.set("files", r.files);
    notify("success");
    return true;
  }
  async function remove(id) { if (applied(await Api.deleteVideo(id))) { App.closeDetail(); render(); } }
  async function move(id, dir) { const r = await Api.moveVideo(id, dir); if (r && r.ok) { Store.set("videos", r.videos); haptic(); render(); } else notify("error"); }
  async function removeFile(id) { if (applied(await Api.deleteFile(id))) render(); }

  // ---------- hodisalar ----------
  function bind(body) {
    body.querySelectorAll("[data-sec]").forEach((b) => b.addEventListener("click", () => { section = b.dataset.sec; haptic(); render(); window.scrollTo(0, 0); }));
    // Indeks bo'yicha to'liq yozuvni olamiz — letters/lesson kabi maydonlar ham pleyerga yetib borsin
    body.querySelectorAll("[data-play]").forEach((b) => b.addEventListener("click", () => {
      const v = inSection(section)[Number(b.dataset.play)];
      if (v) { haptic(); play(v); }
    }));
    body.querySelectorAll("[data-locked]").forEach((b) => b.addEventListener("click", () => {
      notify("error"); alertMsg("Bu dars hali ochilmagan. Avval oldingi darsni oxirigacha ko'ring.");
    }));
    body.querySelectorAll("[data-file]").forEach((b) => b.addEventListener("click", () => { haptic(); openFile(b.dataset.file); }));
    body.querySelectorAll("[data-url]").forEach((b) => b.addEventListener("click", () => { haptic(); openUrl(b.dataset.url); }));
    body.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const v = all().find((x) => String(x.id || "") === b.dataset.edit && parseYouTube(x.youtubeId) === b.dataset.yt && (x.playlistId || "") === b.dataset.pl);
      haptic(); form(v ? Object.assign({}, v) : null);
    }));
    body.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => App.confirm("Bu video o'chirilsinmi?", () => remove(b.dataset.del))));
    body.querySelectorAll("[data-delfile]").forEach((b) => b.addEventListener("click", () => App.confirm("Bu material o'chirilsinmi?", () => removeFile(b.dataset.delfile))));
    body.querySelectorAll("[data-move]").forEach((b) => b.addEventListener("click", () => { const [id, dir] = b.dataset.move.split(":"); move(id, dir); }));
    body.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.act === "back") { section = null; haptic(); render(); window.scrollTo(0, 0); }
      if (b.dataset.act === "add") { haptic(); form(null); }
    }));
  }

  // Pleyer yopilganda ro'yxatni yangilaymiz — ko'rilgan foiz va yangi ochilgan dars ko'rinsin
  App.onTab("video", () => { render(); load(); });
  Api.onSync(() => { if (App.state.tab === "video") render(); });
  return { render, parseYouTube, parsePlaylist, load };
})();
