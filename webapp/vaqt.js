// ============================================================
//  VAQT — namoz vaqtlari hisoblagichi. Internet kerak emas.
//
//  O'zbekiston musulmonlari idorasi taqvimi tekshirilib ochilgan formula:
//    • kenglik  — 41.31°N, HAMMA hudud uchun bir xil (rasmiy taqvim shunday tuzilgan)
//    • uzunlik  — joyning o'zi (GPS yoki shahar)
//    • bomdod / xufton — quyosh ufqdan 15.5° pastda
//    • quyosh — astronomik chiqish, peshin — quyosh tushi
//    • asr — Hanafiy (soya = 2 baravar)
//    • shom — botish + 3 daqiqa
//  Tekshiruv: 14 hudud × 366 kun × 6 vaqt = 30 744 ta vaqt — 99.7% rasmiy jadval bilan 1 daqiqa ichida.
//  bot/vaqt.py — xuddi shu algoritm (Python). Ikkalasi bir xil bo'lishi shart.
// ============================================================
window.Vaqt = (function () {
  const LAT = 41.31, ANGLE = 15.5, SHOM_PLUS = 3, ASR_SHADOW = 2, TZ = 5;
  const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  // NOAA: quyosh deklinatsiyasi va vaqt tenglamasi (daqiqada)
  function solar(jd) {
    const t = (jd - 2451545) / 36525;
    const L0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
    const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    const C = Math.sin(rad(M)) * (1.914602 - t * (0.004817 + 0.000014 * t))
            + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * t) + Math.sin(rad(3 * M)) * 0.000289;
    const omega = 125.04 - 1934.136 * t;
    const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega));
    const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
    const eps = eps0 + 0.00256 * Math.cos(rad(omega));
    const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
    const y = Math.tan(rad(eps / 2)) ** 2;
    const eot = 4 * deg(y * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M))
      + 4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0))
      - 0.5 * y * y * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
    return { decl, eot };
  }

  function noon(y, m, d, lng) { return 720 - 4 * lng - solar(julian(y, m, d) + 0.5 - lng / 360).eot + TZ * 60; }

  // Quyosh berilgan zenit burchagiga yetadigan vaqt (daqiqada). morning — tongda, aks holda kechqurun
  function event(y, m, d, lng, zenith, morning) {
    const { decl, eot } = solar(julian(y, m, d) + 0.5 - lng / 360);
    const cosH = (Math.cos(rad(zenith)) - Math.sin(rad(LAT)) * Math.sin(rad(decl))) / (Math.cos(rad(LAT)) * Math.cos(rad(decl)));
    if (cosH > 1 || cosH < -1) return null;
    const H = deg(Math.acos(cosH)), n = 720 - 4 * lng - eot + TZ * 60;
    return morning ? n - 4 * H : n + 4 * H;
  }

  function asr(y, m, d, lng) {
    const { decl } = solar(julian(y, m, d) + 0.5 - lng / 360);
    const alt = deg(Math.atan(1 / (ASR_SHADOW + Math.tan(Math.abs(rad(LAT - decl))))));
    return event(y, m, d, lng, 90 - alt, false);
  }

  function fmt(min) {
    if (min === null || isNaN(min)) return "--:--";
    let t = Math.round(min) % 1440; if (t < 0) t += 1440;
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  }

  // Asosiy funksiya: sana (Date) va uzunlik → 6 ta vaqt ("HH:MM")
  function times(date, lng) {
    const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
    return {
      bomdod: fmt(event(y, m, d, lng, 90 + ANGLE, true)),
      quyosh: fmt(event(y, m, d, lng, 90.833, true)),
      peshin: fmt(noon(y, m, d, lng)),
      asr:    fmt(asr(y, m, d, lng)),
      shom:   fmt(event(y, m, d, lng, 90.833, false) + SHOM_PLUS),
      xufton: fmt(event(y, m, d, lng, 90 + ANGLE, false)),
    };
  }

  // Hijriy sana — brauzerning o'zidan (Umm al-Qura taqvimi; muslim.uz bilan mos keladi)
  function hijri(date) {
    for (const cal of ["islamic-umalqura", "islamic-tbla", "islamic"]) {
      try {
        const parts = new Intl.DateTimeFormat("en-u-ca-" + cal, { day: "numeric", month: "numeric", year: "numeric" }).formatToParts(date);
        const g = (t) => parseInt((parts.find((x) => x.type === t) || {}).value, 10);
        if (g("day") && g("month") && g("year")) return { day: g("day"), month: g("month"), year: g("year") };
      } catch (e) {}
    }
    return null;
  }

  return { times, hijri, LAT, ANGLE, SHOM_PLUS };
})();
