// ============================================================
//  NUR moduli — harakat va davomiylik o'lchovi: ball, daraja, nishonlar
//  Nur savobni EMAS, faqat harakat va davomiylikni o'lchaydi.
//  Hisob mavjud yozuvlardan olinadi: days{} (zikr.js), qazo{} (qazo.js), arab{} (arabic.js)
//  days[kun] = { t: tong zikrlari, n: tun zikrlari, s: {tasbih: soni}, ok: vazifalar to'liq,
//                q: bugun o'qilgan qazo, a: bugun tugatilgan darslar }
//  Chegaralar (CAP) bot/api.py bilan BIR XIL bo'lishi shart — server ularni qayta qo'llaydi.
// ============================================================
window.Nur = (function () {
  const Z = window.ZIKR_DATA, A = window.ARABIC_DATA;

  // Kunlik chegaralar (kategoriya bo'yicha) — davomiylik hajmdan muhim, "farm" qilib bo'lmaydi.
  // Tamoyil: eng katta ulush kunlik vazifalarga (odat dasturi) tegishli, chunki odatni o'sha shakllantiradi.
  // zikr: 118 — barcha tong (14) va tun (15) zikrlarining aniq qiymati, ortiga joy qoldirilmagan.
  const CAP = { zikr: 118, tasbih: 150, qazo: 150, ilm: 120, odat: 200 };
  // Vaznlar
  // odat: bazaviy 60 + streak bonusi (kuniga 4, 35 kunda 140 ga to'yinadi) = 200
  const W = { zikr: 2, zikrFull: 30, tasbih33: 5, qazo: 15, dars: 40, odat: 60, streak: 4, streakMax: 140 };

  // Darajalar — jami Nur bo'yicha (ligada ham shu daraja bo'yicha guruhlanadi)
  const LEVELS = [
    { id: "sham",   name: "Sham",    min: 0,     icon: "candle" },
    { id: "chiroq", name: "Chiroq",  min: 500,   icon: "lamp" },
    { id: "mashal", name: "Mash'al", min: 1500,  icon: "flame" },
    { id: "yulduz", name: "Yulduz",  min: 4000,  icon: "star" },
    { id: "oy",     name: "Oy",      min: 10000, icon: "moon" },
    { id: "quyosh", name: "Quyosh",  min: 25000, icon: "sun" },
  ];

  // Nishonlar — bir marta olinadi, "badges" kalitida sanasi bilan saqlanadi. private: faqat egasiga ko'rinadi
  const BADGES = [
    { id: "first",    name: "Ilk qadam",      desc: "Birinchi Nur to'plandi",                icon: "sprout",   test: (c) => c.total > 0 },
    { id: "streak7",  name: "Bir hafta",      desc: "7 kun ketma-ket kunlik vazifalar",      icon: "flame",    test: (c) => c.maxStreak >= 7 },
    { id: "streak30", name: "30 kun",         desc: "30 kunlik dastur uzilishsiz",           icon: "trophy",   test: (c) => c.maxStreak >= 30 },
    { id: "streak40", name: "Qirq kun",       desc: "40 kun ketma-ket — odat mustahkam",     icon: "crown",    test: (c) => c.maxStreak >= 40 },
    { id: "tong",     name: "Tong sohibi",    desc: "Bir kunda barcha tong zikrlari",         icon: "sunrise",  test: (c) => c.tongFull },
    { id: "tun",      name: "Tun sohibi",     desc: "Bir kunda barcha tun zikrlari",          icon: "moon",     test: (c) => c.tunFull },
    { id: "tasbih1k", name: "Ming tasbih",    desc: "Bir kunda 1000 marta tasbih",            icon: "beads",    test: (c) => c.maxTaps >= 1000 },
    { id: "qazo100",  name: "Qarz to'lovchi", desc: "100 ta qazo namoz o'qildi",              icon: "calendar", test: (c) => c.qazoDone >= 100, private: true },
    { id: "qazo0",    name: "Qarzsiz",        desc: "Barcha qazo namozlar tugatildi",         icon: "check",    test: (c) => c.qazoTotal > 0 && c.qazoLeft === 0, private: true },
    { id: "alifbo",   name: "Alifbo",         desc: "Alifbo darslari tugatildi (1–4)",        icon: "letters",  test: (c) => c.lessons >= 4 },
    { id: "qori",     name: "Qori yo'lida",   desc: "Barcha arab tili darslari tugatildi",    icon: "book",     test: (c) => c.lessons >= A.lessons.length },
    { id: "yulduz",   name: "Yulduz",         desc: "Yulduz darajasiga yetildi (4000 Nur)",   icon: "star",     test: (c) => c.total >= 4000 },
  ];

  function days() { return Store.get("days", {}); }
  function taps(rec) { return Object.values((rec && rec.s) || {}).reduce((a, b) => a + (Number(b) || 0), 0); }

  // Shu kunga qadar ketma-ket bajarilgan kunlar (shu kun ham kiradi)
  function streakAt(d, dateStr) {
    let n = 0; const cur = new Date(dateStr + "T00:00:00");
    while ((d[Store.dateKey(cur)] || {}).ok) { n++; cur.setDate(cur.getDate() - 1); }
    return n;
  }
  // Joriy streak: bugun hali tugamagan bo'lsa kechadan sanaladi (zikr.js bilan bir xil mantiq)
  function streak() {
    const d = days(), cur = new Date();
    if (!(d[Store.dateKey(cur)] || {}).ok) cur.setDate(cur.getDate() - 1);
    return streakAt(d, Store.dateKey(cur));
  }

  // Bir kunlik Nur — kategoriya bo'yicha, chegaralangan
  function dayScore(rec, streakOnDay) {
    rec = rec || {};
    const tongN = Z.tong.length, tunN = Z.tun.length;
    const t = Math.min(Number(rec.t) || 0, tongN), n = Math.min(Number(rec.n) || 0, tunN);
    const raw = {
      zikr: (t + n) * W.zikr + (t >= tongN ? W.zikrFull : 0) + (n >= tunN ? W.zikrFull : 0),
      tasbih: Math.floor(taps(rec) / 33) * W.tasbih33,
      qazo: (Number(rec.q) || 0) * W.qazo,
      ilm: (Number(rec.a) || 0) * W.dars,
      odat: rec.ok ? W.odat + Math.min(W.streakMax, (streakOnDay || 0) * W.streak) : 0,
    };
    const s = {}; let total = 0;
    Object.keys(CAP).forEach((k) => { s[k] = Math.min(CAP[k], Math.max(0, raw[k])); total += s[k]; });
    s.total = total;
    return s;
  }
  function scoreOn(d, k) { return dayScore(d[k], streakAt(d, k)); }
  function today() { return scoreOn(days(), Store.today()); }

  // Jami Nur. days{} 45 kundan keyin tozalanadi — shuning uchun o'tgan kunlar "nur" kalitiga yig'ib boriladi
  function total() {
    const d = days(), td = Store.today();
    const acc = Store.get("nur", { total: 0, upto: "" });
    let changed = false;
    Object.keys(d).sort().forEach((k) => {
      if (k < td && k > acc.upto) { acc.total += scoreOn(d, k).total; acc.upto = k; changed = true; }
    });
    if (changed) Store.set("nur", acc);
    return acc.total + scoreOn(d, td).total;
  }

  function level(tot) {
    if (tot == null) tot = total();
    let i = LEVELS.length - 1;
    while (i > 0 && tot < LEVELS[i].min) i--;
    const cur = LEVELS[i], next = LEVELS[i + 1] || null;
    return { index: i, cur, next, total: tot, toNext: next ? next.min - tot : 0, pct: next ? (tot - cur.min) / (next.min - cur.min) : 1 };
  }

  // Hafta (dushanba → yakshanba). offset = -1 bo'lsa o'tgan hafta
  function week(offset) {
    const d = days(), td = Store.today(), now = new Date(td + "T00:00:00");
    const mon = new Date(now); mon.setDate(now.getDate() - (now.getDay() + 6) % 7 + 7 * (offset || 0));
    const list = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(mon); dt.setDate(mon.getDate() + i); const k = Store.dateKey(dt);
      list.push({ date: k, today: k === td, future: k > td, score: k > td ? null : scoreOn(d, k) });
    }
    return { from: list[0].date, to: list[6].date, days: list, total: list.reduce((s, x) => s + (x.score ? x.score.total : 0), 0) };
  }

  // Oxirgi n kun (serverga yuborish uchun) — faqat kategoriya bo'yicha Nur, tafsilotlarsiz
  function lastDays(n) {
    const d = days(), td = Store.today(), out = [];
    for (let i = n - 1; i >= 0; i--) {
      const dt = new Date(td + "T00:00:00"); dt.setDate(dt.getDate() - i);
      const k = Store.dateKey(dt), s = scoreOn(d, k);
      if (s.total) { const o = Object.assign({ d: k }, s); delete o.total; out.push(o); }
    }
    return out;
  }

  // Boshqa modullar chaqiradi: Nur.bump("q") — bugun 1 ta qazo o'qildi; Nur.bump("a") — dars birinchi marta tugatildi
  function bump(field, delta) {
    const d = days(), td = Store.today();
    d[td] = d[td] || { s: {} };
    d[td][field] = Math.max(0, (Number(d[td][field]) || 0) + (delta == null ? 1 : delta));
    Store.set("days", d);
  }

  // ---------- nishonlar ----------
  function context() {
    const d = days(), q = Store.get("qazo", { left: {}, total: {} }), arab = Store.get("arab", {});
    const c = { total: total(), maxStreak: 0, tongFull: false, tunFull: false, maxTaps: 0, activeDays: 0 };
    Object.keys(d).forEach((k) => {
      const r = d[k] || {};
      c.maxStreak = Math.max(c.maxStreak, streakAt(d, k));
      if ((r.t || 0) >= Z.tong.length) c.tongFull = true;
      if ((r.n || 0) >= Z.tun.length) c.tunFull = true;
      c.maxTaps = Math.max(c.maxTaps, taps(r));
      if (scoreOn(d, k).total) c.activeDays++;
    });
    const sum = (o) => Object.values(o || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    c.qazoTotal = sum(q.total); c.qazoLeft = sum(q.left); c.qazoDone = c.qazoTotal - c.qazoLeft;
    c.lessons = A.lessons.filter((l) => (arab[l.id] || 0) >= 80).length;
    return c;
  }
  function badges() {
    const earned = Store.get("badges", {}), c = context(), td = Store.today();
    let changed = false;
    BADGES.forEach((b) => { if (!earned[b.id] && b.test(c)) { earned[b.id] = td; changed = true; } });
    if (changed) Store.set("badges", earned);
    return BADGES.map((b) => ({ id: b.id, name: b.name, desc: b.desc, icon: b.icon, private: !!b.private, earned: earned[b.id] || null, isNew: earned[b.id] === td }));
  }

  return { CAP, W, LEVELS, dayScore, streakAt, streak, today, week, lastDays, total, level, badges, bump, context };
})();
