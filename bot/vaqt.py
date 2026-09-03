"""
Namoz vaqtlari hisoblagichi — O'zbekiston musulmonlari idorasi usuli.
webapp/vaqt.js bilan BIR XIL algoritm: ikkalasini birga o'zgartiring.

Formula (rasmiy taqvim tekshirilib ochilgan):
  kenglik 41.31°N hamma hudud uchun; uzunlik — joyning o'zi;
  bomdod/xufton — quyosh ufqdan 15.5° pastda; asr — Hanafiy (soya 2); shom — botish + 3 daqiqa.
Tekshiruv: 30 744 ta vaqt, 99.7% rasmiy jadval bilan 1 daqiqa ichida. Internet kerak emas.
"""
from __future__ import annotations

import math
from datetime import date

LAT = 41.31
ANGLE = 15.5
SHOM_PLUS = 3
ASR_SHADOW = 2
TZ = 5


def _julian(y: int, m: int, d: int) -> float:
    if m <= 2:
        y -= 1
        m += 12
    a = y // 100
    b = 2 - a + a // 4
    return math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + d + b - 1524.5


def _solar(jd: float) -> tuple[float, float]:
    """NOAA: (deklinatsiya°, vaqt tenglamasi daqiqada)."""
    t = (jd - 2451545) / 36525
    l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
    m = 357.52911 + t * (35999.05029 - 0.0001537 * t)
    e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
    c = (math.sin(math.radians(m)) * (1.914602 - t * (0.004817 + 0.000014 * t))
         + math.sin(math.radians(2 * m)) * (0.019993 - 0.000101 * t)
         + math.sin(math.radians(3 * m)) * 0.000289)
    omega = 125.04 - 1934.136 * t
    lam = l0 + c - 0.00569 - 0.00478 * math.sin(math.radians(omega))
    eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
    eps = eps0 + 0.00256 * math.cos(math.radians(omega))
    decl = math.degrees(math.asin(math.sin(math.radians(eps)) * math.sin(math.radians(lam))))
    y = math.tan(math.radians(eps / 2)) ** 2
    eot = 4 * math.degrees(
        y * math.sin(2 * math.radians(l0)) - 2 * e * math.sin(math.radians(m))
        + 4 * e * y * math.sin(math.radians(m)) * math.cos(2 * math.radians(l0))
        - 0.5 * y * y * math.sin(4 * math.radians(l0)) - 1.25 * e * e * math.sin(2 * math.radians(m))
    )
    return decl, eot


def _event(y: int, m: int, d: int, lng: float, zenith: float, morning: bool) -> float | None:
    decl, eot = _solar(_julian(y, m, d) + 0.5 - lng / 360)
    cos_h = ((math.cos(math.radians(zenith)) - math.sin(math.radians(LAT)) * math.sin(math.radians(decl)))
             / (math.cos(math.radians(LAT)) * math.cos(math.radians(decl))))
    if cos_h > 1 or cos_h < -1:
        return None
    h = math.degrees(math.acos(cos_h))
    noon = 720 - 4 * lng - eot + TZ * 60
    return noon - 4 * h if morning else noon + 4 * h


def _noon(y: int, m: int, d: int, lng: float) -> float:
    _, eot = _solar(_julian(y, m, d) + 0.5 - lng / 360)
    return 720 - 4 * lng - eot + TZ * 60


def _asr(y: int, m: int, d: int, lng: float) -> float | None:
    decl, _ = _solar(_julian(y, m, d) + 0.5 - lng / 360)
    alt = math.degrees(math.atan(1 / (ASR_SHADOW + math.tan(abs(math.radians(LAT - decl))))))
    return _event(y, m, d, lng, 90 - alt, False)


def _fmt(minutes: float | None) -> str:
    if minutes is None:
        return "--:--"
    t = math.floor(minutes + 0.5) % 1440  # JS Math.round bilan bir xil (Python round() juftga yaxlitlaydi)
    return f"{t // 60:02d}:{t % 60:02d}"


def times(day: date, lng: float) -> dict[str, str]:
    """Sana va uzunlik → {'bomdod': 'HH:MM', 'quyosh', 'peshin', 'asr', 'shom', 'xufton'}."""
    y, m, d = day.year, day.month, day.day
    shom = _event(y, m, d, lng, 90.833, False)
    return {
        "bomdod": _fmt(_event(y, m, d, lng, 90 + ANGLE, True)),
        "quyosh": _fmt(_event(y, m, d, lng, 90.833, True)),
        "peshin": _fmt(_noon(y, m, d, lng)),
        "asr": _fmt(_asr(y, m, d, lng)),
        "shom": _fmt(None if shom is None else shom + SHOM_PLUS),
        "xufton": _fmt(_event(y, m, d, lng, 90 + ANGLE, False)),
    }
