// ============================================================
//  ICONS — inline SVG (24x24, stroke). Emoji o'rniga — har telefonda bir xil ko'rinadi.
//  Ishlatish: Icons.get("home")  →  <svg ...>
// ============================================================
window.Icons = (function () {
  const P = {
    home:     '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    mosque:   '<path d="M4 20h16"/><path d="M6 20v-6a6 6 0 0 1 12 0v6"/><path d="M12 8c-2-2-2-4 0-5 2 1 2 3 0 5z"/><path d="M12 8v6"/><path d="M3 20v-8"/><path d="M21 20v-8"/><path d="M3 12l-1-2 1-2 1 2z"/><path d="M21 12l-1-2 1-2 1 2z"/>',
    beads:    '<circle cx="12" cy="4" r="1.6"/><circle cx="17.5" cy="6.5" r="1.6"/><circle cx="20" cy="12" r="1.6"/><circle cx="17.5" cy="17.5" r="1.6"/><circle cx="6.5" cy="17.5" r="1.6"/><circle cx="4" cy="12" r="1.6"/><circle cx="6.5" cy="6.5" r="1.6"/><path d="M12 19v3"/><circle cx="12" cy="19" r="1.6"/>',
    letters:  '<path d="M4 18V6h8"/><path d="M4 12h6"/><path d="M14 18l3-9 3 9"/><path d="M15.5 14.5h3"/>',
    book:     '<path d="M12 6c-1.5-1.3-4-2-8-2v14c4 0 6.5.7 8 2 1.5-1.3 4-2 8-2V4c-4 0-6.5.7-8 2z"/><path d="M12 6v14"/>',
    video:    '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M8 15h3"/>',
    sunrise:  '<path d="M12 3v4"/><path d="M5 11l1.5 1.5"/><path d="M19 11l-1.5 1.5"/><path d="M3 18h18"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M9 6l3-3 3 3"/>',
    moon:     '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sun:      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    sprout:   '<path d="M12 22V10"/><path d="M12 14c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 10c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>',
    check:    '<path d="m5 12 4 4L19 7"/>',
    chevron:  '<path d="m9 6 6 6-6 6"/>',
    back:     '<path d="m15 6-6 6 6 6"/>',
    flame:    '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-8 0 4-4 6-4 12 0 4 3 7 7 7z"/>',
    star:     '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    lock:     '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    refresh:  '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    user:     '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bell:     '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    pin:      '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
    hands:    '<path d="M7 13V6a2 2 0 0 1 4 0v6"/><path d="M11 12V4a2 2 0 0 1 4 0v8"/><path d="M15 12V7a2 2 0 0 1 4 0v7a7 7 0 0 1-14 0v-3a2 2 0 0 1 4 0"/>',
    play:     '<path d="M7 5v14l11-7z"/>',
    info:     '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    // reyting / Nur
    trophy:   '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4"/><path d="M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4"/><path d="M9 17h6v4H9z"/>',
    medal:    '<circle cx="12" cy="15" r="5"/><path d="M8.5 11 6 3h4l2 5 2-5h4l-2.5 8"/>',
    crown:    '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/><path d="M7 15h10"/>',
    users:    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 5"/>',
    chart:    '<path d="M5 20v-6"/><path d="M12 20V6"/><path d="M19 20v-10"/><path d="M3 20h18"/>',
    shield:   '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    share:    '<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7h14v-7"/>',
    eyeoff:   '<path d="M3 3l18 18"/><path d="M10.5 6.2A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a15 15 0 0 1-3.2 3.6"/><path d="M6.6 6.6C4 8.4 3 12 3 12s4 6 9 6c1.3 0 2.5-.3 3.6-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    // video / admin
    drop:     '<path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3z"/>',
    dawn:     '<path d="M3 18h18"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M12 3v3"/><path d="M5.6 8.6l1.4 1.4"/><path d="M18.4 8.6L17 10"/>',
    sunset:   '<path d="M12 11V3"/><path d="M9 6l3 3 3-3"/><path d="M5 13l1.5-1.5"/><path d="M19 13l-1.5-1.5"/><path d="M3 18h18"/><path d="M7 18a5 5 0 0 1 10 0"/>',
    plus:     '<path d="M12 5v14"/><path d="M5 12h14"/>',
    edit:     '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m14 6 4 4"/>',
    trash:    '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
    up:       '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
    down:     '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
    link:     '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
    list:     '<path d="M4 7h11"/><path d="M4 12h11"/><path d="M4 17h7"/><path d="m16 14 5 3-5 3z"/>',
    file:     '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    candle:   '<path d="M12 2c1.3 1.6 1.3 3 0 4.5-1.3-1.5-1.3-2.9 0-4.5z"/><path d="M12 6.5V9"/><rect x="9" y="9" width="6" height="12" rx="1.5"/><path d="M6 21h12"/>',
    lamp:     '<path d="M12 3c1.3 1.6 1.3 3 0 4.5-1.3-1.5-1.3-2.9 0-4.5z"/><path d="M12 7.5V11"/><path d="M4 12h13a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M17 12l3-2"/><path d="M12 16v3"/><path d="M8 21h8"/>',
  };
  function get(name, size) {
    return `<svg class="ic" width="${size || 24}" height="${size || 24}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.info}</svg>`;
  }
  // HTML dagi <i data-icon="home"></i> larni SVG ga almashtiradi
  function mount(root) {
    (root || document).querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = get(el.dataset.icon, el.dataset.size); el.removeAttribute("data-icon"); });
  }
  return { get, mount };
})();
