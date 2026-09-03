// ============================================================
//  ARAB TILI moduli — darslar, harf kartalari, o'qish mashqi, test
// ============================================================
window.Arabic = (function () {
  const A = window.ARABIC_DATA;
  const { $, $$, haptic, notify, esc, openDetailHtml, closeDetail } = App;

  function progress() { return Store.get("arab", {}); }          // { l1: 100, l2: 80 }  (test foizi)
  function setProgress(id, pct) {
    const p = progress(), was = p[id] || 0; p[id] = Math.max(was, pct); Store.set("arab", p);
    if (was < 80 && pct >= 80 && window.Nur) Nur.bump("a");       // dars birinchi marta tugatildi (Nur hisobi uchun)
  }
  function letter(n) { return A.letters[n - 1]; }

  // ---------- darslar ro'yxati ----------
  function render() {
    const p = progress(), doneN = A.lessons.filter((l) => (p[l.id] || 0) >= 80).length;
    $("#arab-body").innerHTML = `
      <div class="card hero-card"><span class="tile-icon t-blue" style="margin:0 auto 8px">${Icons.get("letters")}</span><h3>Qur'on o'qishni o'rganamiz</h3>
        <p class="small muted">Alifbodan boshlab Fotiha surasini o'qishgacha — ${A.lessons.length} ta dars.</p>
        <div class="progress"><div class="progress-bar" style="width:${doneN / A.lessons.length * 100}%"></div></div>
        <p class="small">${doneN}/${A.lessons.length} dars tugatildi</p></div>
      <div class="card"><div class="card-label">Alifbo jadvali</div><div class="alphabet">${A.letters.map((l) => `<button class="letter-cell" data-letter="${l.n}"><span class="ar">${l.iso}</span><small>${esc(l.name)}</small></button>`).join("")}</div></div>
      <div class="list">${A.lessons.map((l, i) => {
        const pct = p[l.id] || 0, done = pct >= 80, locked = i > 0 && (p[A.lessons[i - 1].id] || 0) < 80 && !done;
        return `<button class="list-item ${done ? "done" : ""} ${locked ? "locked" : ""}" data-lesson="${l.id}">
          <div class="list-num">${done ? Icons.get("check", 18) : locked ? Icons.get("lock", 16) : i + 1}</div>
          <div class="list-body"><div class="list-title">${esc(l.title)}</div><div class="list-sub">${l.type === "letters" ? "Harflar" : l.type === "theory" ? "Qoida" : "O'qish mashqi"}${pct ? " · test: " + pct + "%" : ""}</div></div>
          ${Icons.get("chevron")}</button>`; }).join("")}</div>
      <p class="small muted center">Keyingi dars oldingi darsning testi 80%+ bo'lganda ochiladi. Xohlasangiz qulflangan darsni ham ochib ko'rishingiz mumkin.</p>`;
    $$("#arab-body [data-lesson]").forEach((b) => b.addEventListener("click", () => openLesson(b.dataset.lesson)));
    $$("#arab-body [data-letter]").forEach((b) => b.addEventListener("click", () => openLetter(Number(b.dataset.letter))));
  }

  // ---------- harf kartasi ----------
  function letterCard(l) {
    return `<div class="letter-card">
      <div class="letter-big">${l.iso}</div>
      <div class="letter-info"><b>${esc(l.name)}</b><div class="small muted">o'qilishi: <b>${esc(l.latin)}</b></div>
        <div class="forms"><span><small>oxirida</small><i>${l.fin}</i></span><span><small>o'rtada</small><i>${l.mid}</i></span><span><small>boshida</small><i>${l.ini}</i></span><span><small>alohida</small><i>${l.iso}</i></span></div>
        <div class="example"><span class="ar">${l.ex}</span> — ${esc(l.exLatin)} <span class="muted">(${esc(l.exMeaning)})</span></div>
        ${l.noJoin ? `<div class="small warn">⚠️ Bu harf o'zidan keyingi harfga qo'shilmaydi</div>` : ""}</div></div>`;
  }
  function openLetter(n) {
    const l = letter(n);
    openDetailHtml(`<div class="detail-title">${esc(l.name)} harfi</div><div class="detail-sub">${n}/28</div>${letterCard(l)}
      <div class="step-nav"><button class="btn ghost" id="lt-prev" ${n === 1 ? "disabled" : ""}>‹ Oldingi</button><button class="btn primary" id="lt-next" ${n === 28 ? "disabled" : ""}>Keyingi ›</button></div>`);
    $("#lt-prev").addEventListener("click", () => openLetter(n - 1));
    $("#lt-next").addEventListener("click", () => openLetter(n + 1));
  }

  // ---------- dars ----------
  function openLesson(id) {
    const l = A.lessons.find((x) => x.id === id);
    let body = `<div class="detail-title fade">${esc(l.title)}</div><div class="block"><p class="small">${esc(l.intro)}</p></div>`;
    if (l.type === "letters") body += l.letters.map((n) => letterCard(letter(n))).join("");
    if (l.type === "theory") {
      body += `<div class="block">${l.items.map((it) => `<div class="theory-row"><span class="ar">${it.arabic}</span><div><b>${esc(it.latin)}</b><div class="small muted">${esc(it.note)}</div></div></div>`).join("")}</div>`;
      if (l.note) body += `<div class="block small">${esc(l.note)}</div>`;
    }
    if (l.type === "practice") {
      body += `<div class="block"><p class="small muted">So'zni bosing — o'qilishi ko'rinadi. O'ngdan chapga o'qing.</p>
        <div class="words">${l.words.map((w, i) => `<button class="word" data-w="${i}"><span class="ar">${w.arabic}</span><small class="hidden-latin">${esc(w.latin)}</small></button>`).join("")}</div>
        <button class="btn ghost wide" id="show-all">Hammasini ko'rsatish</button></div>`;
    }
    body += `<button class="btn primary wide" id="start-quiz">📝 Testni boshlash</button>`;
    openDetailHtml(body);
    $$("#detail-body .word").forEach((b) => b.addEventListener("click", () => { haptic(); b.classList.toggle("open"); }));
    const sa = $("#show-all"); if (sa) sa.addEventListener("click", () => $$("#detail-body .word").forEach((b) => b.classList.add("open")));
    $("#start-quiz").addEventListener("click", () => startQuiz(l));
  }

  // ---------- test ----------
  function buildQuestions(l) {
    const shuffle = (a) => a.slice().sort(() => Math.random() - 0.5);
    let pool;
    if (l.type === "letters") pool = l.letters.map((n) => ({ q: letter(n).iso, a: letter(n).name, opts: () => A.letters.map((x) => x.name) }));
    else if (l.type === "theory") pool = l.items.map((it) => ({ q: it.arabic, a: it.latin, opts: () => l.items.map((x) => x.latin) }));
    else pool = l.words.map((w) => ({ q: w.arabic, a: w.latin, opts: () => l.words.map((x) => x.latin) }));
    return shuffle(pool).slice(0, Math.min(6, pool.length)).map((p) => {
      const wrong = shuffle([...new Set(p.opts().filter((o) => o !== p.a))]).slice(0, 3);
      return { q: p.q, a: p.a, options: shuffle([p.a, ...wrong]) };
    });
  }
  function startQuiz(l) {
    const qs = buildQuestions(l); let i = 0, correct = 0;
    const show = () => {
      if (i >= qs.length) return finish();
      const q = qs[i];
      openDetailHtml(`<div class="detail-title">Test · ${i + 1}/${qs.length}</div><div class="detail-sub">${esc(l.title)}</div>
        <div class="progress"><div class="progress-bar" style="width:${i / qs.length * 100}%"></div></div>
        <div class="quiz-q"><span class="ar">${q.q}</span></div><p class="small muted center">Bu qanday o'qiladi?</p>
        <div class="quiz-opts">${q.options.map((o) => `<button class="quiz-opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`);
      $$("#detail-body .quiz-opt").forEach((b) => b.addEventListener("click", () => {
        const ok = b.dataset.o === q.a;
        $$("#detail-body .quiz-opt").forEach((x) => { x.disabled = true; if (x.dataset.o === q.a) x.classList.add("right"); });
        if (ok) { correct++; notify("success"); } else { b.classList.add("wrong"); notify("error"); }
        setTimeout(() => { i++; show(); }, 700);
      }));
    };
    const finish = () => {
      const pct = Math.round(correct / qs.length * 100); setProgress(l.id, pct);
      openDetailHtml(`<div class="quiz-result"><div class="hero-emoji">${pct >= 80 ? "🏆" : "📚"}</div><h3>${pct}%</h3>
        <p>${correct}/${qs.length} to'g'ri javob</p><p class="small muted">${pct >= 80 ? "Ajoyib! Keyingi dars ochildi." : "80% dan yuqori bo'lsa keyingi dars ochiladi. Darsni qayta ko'rib chiqing."}</p>
        <button class="btn primary wide" id="q-again">Qayta topshirish</button><button class="btn ghost wide" id="q-back">Darslarga qaytish</button></div>`);
      $("#q-again").addEventListener("click", () => startQuiz(l));
      $("#q-back").addEventListener("click", () => { closeDetail(); render(); });
    };
    show();
  }

  App.onTab("arab", render);
  // openLesson/letterCard video.js dan ham ishlatiladi (video darslar bilan birlashtirish uchun)
  return { render, letterCard, openLetter, openLesson };
})();
