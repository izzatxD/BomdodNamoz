// ============================================================
//  QAZO NAMOZLAR moduli — o'tkazib yuborilgan namozlar hisobi
// ============================================================
window.Qazo = (function () {
  const { $, $$, haptic, notify, esc } = App;
  const PRAYERS = [
    { id: "bomdod", title: "Bomdod", rak: 2, icon: "🌅" },
    { id: "peshin", title: "Peshin", rak: 4, icon: "☀️" },
    { id: "asr",    title: "Asr",    rak: 4, icon: "🌤️" },
    { id: "shom",   title: "Shom",   rak: 3, icon: "🌆" },
    { id: "xufton", title: "Xufton", rak: 4, icon: "🌙" },
    { id: "vitr",   title: "Vitr",   rak: 3, icon: "⭐" },
  ];

  // q: { left: {bomdod: 120,...}, total: {bomdod: 300,...}, plan: 1 }
  function data() { return Store.get("qazo", { left: {}, total: {}, plan: 1 }); }
  function save(q) { Store.set("qazo", q); }

  function render() {
    const q = data();
    const left = PRAYERS.reduce((s, p) => s + (q.left[p.id] || 0), 0);
    const total = PRAYERS.reduce((s, p) => s + (q.total[p.id] || 0), 0);
    $("#qazo-total-num").textContent = left;
    $("#qazo-progress").style.width = total ? ((total - left) / total * 100) + "%" : "0%";
    const maxLeft = Math.max(...PRAYERS.map((p) => q.left[p.id] || 0), 0);
    $("#qazo-plan").textContent = left
      ? `Kuniga ${q.plan} tadan o'qisangiz — taxminan ${Math.ceil(maxLeft / q.plan)} kunda (${(Math.ceil(maxLeft / q.plan) / 30).toFixed(1)} oy) tugaydi. Jami o'qildi: ${total - left}.`
      : "Qazo yo'q — alhamdulillah! Yoki hisoblash yordamchisidan foydalaning.";
    $("#plan-num").textContent = q.plan;
    $("#qazo-list").innerHTML = PRAYERS.map((p) => {
      const n = q.left[p.id] || 0, t = q.total[p.id] || 0;
      return `<div class="qazo-row">
        <div class="qazo-icon">${p.icon}</div>
        <div class="qazo-body"><b>${p.title}</b><small class="muted">${p.rak} rakat${t ? ` · ${t - n}/${t} o'qildi` : ""}</small>
          <div class="progress thin"><div class="progress-bar" style="width:${t ? (t - n) / t * 100 : 0}%"></div></div></div>
        <div class="stepper"><button data-q="${p.id}:-1" ${n ? "" : "disabled"}>−</button><span>${n}</span><button data-q="${p.id}:1">+</button></div>
      </div>`; }).join("");
    $$("#qazo-list [data-q]").forEach((b) => b.addEventListener("click", () => {
      const [id, d] = b.dataset.q.split(":"), delta = Number(d), q = data();
      q.left[id] = Math.max(0, (q.left[id] || 0) + delta);
      if (delta < 0 && window.Nur) Nur.bump("q");                   // bugun 1 ta qazo o'qildi (Nur hisobi uchun)
      if (delta > 0) q.total[id] = (q.total[id] || 0) + 1;         // yangi qazo qo'shildi
      if (delta < 0 && q.left[id] === 0 && (q.total[id] || 0) > 0) notify("success"); // bu namoz tugadi
      haptic(delta < 0 ? "medium" : "light"); save(q); render();
    }));
  }

  function calc() {
    const y = Number($("#calc-y").value) || 0, m = Number($("#calc-m").value) || 0, d = Number($("#calc-d").value) || 0;
    const days = y * 365 + m * 30 + d;
    if (!days) return;
    App.confirm(`${days} kunlik qazo qo'shilsinmi? (har namozdan ${days} ta)`, () => {
      const q = data();
      PRAYERS.forEach((p) => { q.left[p.id] = (q.left[p.id] || 0) + days; q.total[p.id] = (q.total[p.id] || 0) + days; });
      save(q); notify("success"); render();
      $("#calc-y").value = 0; $("#calc-m").value = 0; $("#calc-d").value = 0;
    });
  }

  $("#calc-btn").addEventListener("click", calc);
  $("#plan-minus").addEventListener("click", () => { const q = data(); q.plan = Math.max(1, q.plan - 1); save(q); render(); });
  $("#plan-plus").addEventListener("click", () => { const q = data(); q.plan = Math.min(20, q.plan + 1); save(q); render(); });
  $("#qazo-reset").addEventListener("click", () => App.confirm("Barcha qazo hisobi o'chirilsinmi?", () => { save({ left: {}, total: {}, plan: 1 }); render(); }));

  App.onTab("qazo", render);
  return { render };
})();
