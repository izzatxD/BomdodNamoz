"""
Reyting ma'lumotlar bazasi — SQLite (Python standart kutubxonasi, qo'shimcha o'rnatish kerak emas).
Fayl: bot/reyting.db (git'ga qo'shilmaydi).

MAXFIYLIK: foydalanuvchi bo'yicha faqat KUNLIK UMUMIY Nur saqlanadi.
Zikr, tasbih, qazo va dars tafsilotlari serverga umuman kelmaydi — api.py kategoriya yig'indilarini
chegaralab qo'shadi va faqat kunlik jamini shu yerga yozadi.
"""
from __future__ import annotations

import os
import sqlite3
import time
from datetime import date, datetime, timedelta
from pathlib import Path

# Ma'lumotlar papkasi. Tartib:
#   1) DATA_DIR muhit o'zgaruvchisi (aniq ko'rsatilgan bo'lsa)
#   2) /data — Railway volume odatda shu yerga ulanadi; mavjud va yoziladigan bo'lsa o'zi topiladi
#   3) bot/ papkasi — lokal ishlash uchun. Hostingda bu VAQTINCHALIK: har deploy'da baza yo'qoladi!
def _pick_data_dir() -> tuple[Path, bool]:
    """(papka, doimiymi) — doimiy bo'lmasa bot ishga tushganda ogohlantiradi."""
    env = os.getenv("DATA_DIR")
    if env:
        p = Path(env)
        p.mkdir(parents=True, exist_ok=True)
        return p, True
    vol = Path("/data")
    if vol.is_dir() and os.access(vol, os.W_OK):
        return vol, True
    return Path(__file__).parent, False


DATA_DIR, DATA_DIR_PERSISTENT = _pick_data_dir()
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_FILE = DATA_DIR / "reyting.db"

# Darajalar — webapp/nur.js dagi LEVELS bilan BIR XIL bo'lishi shart
LEVELS = [("Sham", 0), ("Chiroq", 500), ("Mash'al", 1500), ("Yulduz", 4000), ("Oy", 10000), ("Quyosh", 25000)]

# Shu haftada faol odam soni shundan kam bo'lsa — liga darajalarga bo'linmaydi,
# hamma bitta "Umumiy reyting" da ko'rinadi. Aks holda kichik jamoada har daraja
# bo'sh jadval bo'lib qoladi va musobaqa his qilinmaydi.
LEAGUE_MIN_USERS = 30

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id      INTEGER PRIMARY KEY,          -- Telegram user id
  name    TEXT    NOT NULL DEFAULT '',
  anon    INTEGER NOT NULL DEFAULT 0,   -- 1 bo'lsa reytingda "Anonim #NNN" ko'rinadi
  base    INTEGER NOT NULL DEFAULT 0,   -- birinchi ulanishda ilovadan qabul qilingan avvalgi jami (chegaralangan)
  total   INTEGER NOT NULL DEFAULT 0,   -- base + SUM(daily.nur) — keshlangan; har yozuvda faqat shu odamniki yangilanadi
  created INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS daily (
  user_id INTEGER NOT NULL,
  day     TEXT    NOT NULL,             -- YYYY-MM-DD
  nur     INTEGER NOT NULL DEFAULT 0,   -- kunlik UMUMIY Nur (tafsilotsiz)
  PRIMARY KEY (user_id, day)
);
-- Qoplovchi indeks: week_scores() faqat indeksdan o'qiydi, jadvalga tushmaydi (o'lchovda 1.8–3.3× tez)
CREATE INDEX IF NOT EXISTS daily_day_user ON daily(day, user_id, nur);
DROP INDEX IF EXISTS daily_day;
CREATE TABLE IF NOT EXISTS teams (
  chat_id INTEGER PRIMARY KEY,          -- Telegram guruh id
  title   TEXT    NOT NULL DEFAULT '',
  created INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS members (
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (chat_id, user_id)
);
CREATE TABLE IF NOT EXISTS friends (
  a INTEGER NOT NULL,
  b INTEGER NOT NULL,
  PRIMARY KEY (a, b)
);
CREATE TABLE IF NOT EXISTS videos (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  section  TEXT    NOT NULL DEFAULT 'boshqa',   -- webapp/data.js dagi videoSections id si
  title    TEXT    NOT NULL DEFAULT '',
  yt       TEXT    NOT NULL DEFAULT '',         -- YouTube video ID (11 belgi)
  duration TEXT    NOT NULL DEFAULT '',
  gender   TEXT    NOT NULL DEFAULT 'hamma',    -- hamma | erkak | ayol
  note     TEXT    NOT NULL DEFAULT '',
  ord      INTEGER NOT NULL DEFAULT 0,          -- bo'lim ichidagi tartib
  created  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS videos_section ON videos(section, ord);
CREATE TABLE IF NOT EXISTS files (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  section  TEXT    NOT NULL DEFAULT 'boshqa',
  title    TEXT    NOT NULL DEFAULT '',
  file_id  TEXT    NOT NULL DEFAULT '',         -- Telegram file_id — fayl Telegram serverida turadi
  kind     TEXT    NOT NULL DEFAULT 'pdf',
  size     INTEGER NOT NULL DEFAULT 0,
  ord      INTEGER NOT NULL DEFAULT 0,
  created  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS files_section ON files(section, ord);
CREATE TABLE IF NOT EXISTS broadcasts (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  admin    INTEGER NOT NULL DEFAULT 0,
  segment  TEXT    NOT NULL DEFAULT 'hamma',     -- hamma | faol | uxlagan
  preview  TEXT    NOT NULL DEFAULT '',          -- matnning boshi (80 belgi)
  total    INTEGER NOT NULL DEFAULT 0,           -- nechta kishiga mo'ljallangan
  sent     INTEGER NOT NULL DEFAULT 0,
  blocked  INTEGER NOT NULL DEFAULT 0,
  failed   INTEGER NOT NULL DEFAULT 0,
  created  INTEGER NOT NULL DEFAULT 0,
  finished INTEGER NOT NULL DEFAULT 0
);
"""

# Keyingi versiyalarda qo'shilgan ustunlar — mavjud bazani buzmasdan qo'shiladi
MIGRATIONS = [
    ("videos", "playlist", "TEXT NOT NULL DEFAULT ''"),  # YouTube playlist ID (bo'sh bo'lsa — oddiy video)
    ("users", "total", "INTEGER NOT NULL DEFAULT 0"),     # keshlangan jami Nur (all_totals() endi jadvalni qo'shib chiqmaydi)
    ("users", "blocked", "INTEGER NOT NULL DEFAULT 0"),   # botni bloklagan — eslatma va e'lon yuborilmaydi
]

_conn: sqlite3.Connection | None = None


def conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.executescript(SCHEMA)
        for table, column, decl in MIGRATIONS:
            have = {r["name"] for r in _conn.execute(f"PRAGMA table_info({table})").fetchall()}
            if column not in have:
                _conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")
                if (table, column) == ("users", "total"):  # eski bazada bir marta to'ldiramiz
                    _conn.execute(
                        "UPDATE users SET total = base + COALESCE((SELECT SUM(nur) FROM daily WHERE user_id = users.id), 0)"
                    )
        _conn.commit()
    return _conn


def backup_to(path: Path) -> Path:
    """Bazaning izchil nusxasi (WAL bilan ham xavfsiz) — Telegram orqali adminga yuborish uchun."""
    if path.exists():
        path.unlink()
    conn().execute("VACUUM INTO ?", (str(path),))
    return path


# ---------- daraja / hafta ----------
def level_index(total: int) -> int:
    idx = 0
    for i, (_, min_nur) in enumerate(LEVELS):
        if total >= min_nur:
            idx = i
    return idx


def level_name(idx: int) -> str:
    return LEVELS[max(0, min(len(LEVELS) - 1, idx))][0]


def week_range(today: date) -> tuple[str, str]:
    """Dushanba → yakshanba (ISO sanalar)."""
    mon = today - timedelta(days=today.weekday())
    return mon.isoformat(), (mon + timedelta(days=6)).isoformat()


# ---------- foydalanuvchilar ----------
def get_user(uid: int) -> sqlite3.Row | None:
    return conn().execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()


def upsert_user(uid: int, name: str, anon: bool) -> bool:
    """Yaratadi yoki ism/anonimni yangilaydi. True — yangi foydalanuvchi."""
    c = conn()
    now = int(time.time())
    is_new = c.execute("SELECT 1 FROM users WHERE id=?", (uid,)).fetchone() is None
    c.execute(
        "INSERT INTO users (id, name, anon, created, updated) VALUES (?,?,?,?,?) "
        "ON CONFLICT(id) DO UPDATE SET name=excluded.name, anon=excluded.anon, updated=excluded.updated",
        (uid, name[:24], 1 if anon else 0, now, now),
    )
    c.commit()
    return is_new


def ensure_user(uid: int, name: str) -> None:
    """Botdan kelgan foydalanuvchini ro'yxatga oladi (bor bo'lsa hech narsa o'zgarmaydi)."""
    c = conn()
    now = int(time.time())
    c.execute("INSERT OR IGNORE INTO users (id, name, created, updated) VALUES (?,?,?,?)", (uid, name[:24], now, now))
    c.commit()


def _refresh_total(c: sqlite3.Connection, uid: int) -> None:
    """Faqat bitta foydalanuvchining jamini qayta hisoblaydi (uning ~365 qatori) — boshqalarga tegmaydi."""
    c.execute(
        "UPDATE users SET total = base + COALESCE((SELECT SUM(nur) FROM daily WHERE user_id = users.id), 0) WHERE id=?",
        (uid,),
    )


def set_base(uid: int, base: int) -> None:
    c = conn()
    c.execute("UPDATE users SET base=? WHERE id=?", (base, uid))
    _refresh_total(c, uid)
    c.commit()


def upsert_days(uid: int, rows: list[tuple[str, int]]) -> None:
    c = conn()
    c.executemany(
        "INSERT INTO daily (user_id, day, nur) VALUES (?,?,?) ON CONFLICT(user_id, day) DO UPDATE SET nur=excluded.nur",
        [(uid, day, nur) for day, nur in rows],
    )
    _refresh_total(c, uid)
    c.commit()


def data_since() -> int:
    """Ma'lumot papkasi BIRINCHI marta yozilgan vaqt (unix). Deploy'dan keyin ham
    o'zgarmasa — disk haqiqatan doimiy. Volume ulanmagan bo'lsa har deploy'da
    yangi qiymat chiqadi, chunki konteyner bilan birga fayl ham o'chadi."""
    f = DATA_DIR / ".since"
    try:
        if f.exists():
            return int((f.read_text().strip() or "0"))
        now = int(time.time())
        f.write_text(str(now))
        return now
    except Exception:  # noqa: BLE001
        return 0


# ---------- e'lonlar (admin) va bloklaganlar ----------
def set_blocked(uid: int, flag: bool) -> None:
    """Foydalanuvchi botni bloklagan (yoki qaytib keldi). Bloklaganlarga hech narsa yuborilmaydi."""
    c = conn()
    c.execute("UPDATE users SET blocked=? WHERE id=?", (1 if flag else 0, uid))
    c.commit()


def recipients(segment: str, today: date) -> list[int]:
    """
    E'lon oluvchilar. Bloklaganlar hech qachon kirmaydi.
      hamma   — ro'yxatdagi hamma
      faol    — shu hafta Nur to'plaganlar
      uxlagan — 14 kundan beri hech narsa qilmaganlar (kamida 14 kun oldin qo'shilgan)
    """
    c = conn()
    if segment == "faol":
        mon, sun = week_range(today)
        rows = c.execute(
            "SELECT DISTINCT d.user_id AS id FROM daily d JOIN users u ON u.id = d.user_id "
            "WHERE d.day BETWEEN ? AND ? AND d.nur > 0 AND u.blocked = 0",
            (mon, sun),
        ).fetchall()
    elif segment == "uxlagan":
        rows = c.execute(
            "SELECT id FROM users WHERE blocked = 0 AND id > 0 AND created < ? "
            "AND id NOT IN (SELECT DISTINCT user_id FROM daily WHERE day >= ? AND nur > 0)",
            (int(time.time()) - 14 * 86400, (today - timedelta(days=14)).isoformat()),
        ).fetchall()
    else:
        rows = c.execute("SELECT id FROM users WHERE blocked = 0 AND id > 0").fetchall()
    return [int(r["id"]) for r in rows]


def import_users(ids: list[int]) -> int:
    """Eski bot platformasidan eksport qilingan ID ro'yxati. Bor bo'lganlarga tegmaydi.
    Qaytaradi: yangi qo'shilganlar soni. Ular «Hammaga» e'loniga kiradi."""
    c = conn()
    now = int(time.time())
    before = c.total_changes
    c.executemany(
        "INSERT OR IGNORE INTO users (id, name, created, updated) VALUES (?, '', ?, ?)",
        [(i, now, now) for i in ids if i > 0],
    )
    c.commit()
    return c.total_changes - before


def segment_counts(today: date) -> dict[str, int]:
    return {seg: len(recipients(seg, today)) for seg in ("hamma", "faol", "uxlagan")}


def add_broadcast(admin: int, segment: str, preview: str, total: int) -> int:
    c = conn()
    cur = c.execute(
        "INSERT INTO broadcasts (admin, segment, preview, total, created) VALUES (?,?,?,?,?)",
        (admin, segment, preview[:80], total, int(time.time())),
    )
    c.commit()
    return int(cur.lastrowid)


def finish_broadcast(bid: int, sent: int, blocked: int, failed: int) -> None:
    c = conn()
    c.execute(
        "UPDATE broadcasts SET sent=?, blocked=?, failed=?, finished=? WHERE id=?",
        (sent, blocked, failed, int(time.time()), bid),
    )
    c.commit()


def last_broadcast() -> dict | None:
    r = conn().execute("SELECT * FROM broadcasts ORDER BY id DESC LIMIT 1").fetchone()
    return {k: r[k] for k in r.keys()} if r is not None else None


def admin_stats(today: date, tz, days: int = 30) -> dict:
    """
    Admin sahifasi uchun: stats() + oxirgi N kunlik qatorlar + darajalar taqsimoti.
    MAXFIYLIK: faqat yig'indilar — bitta foydalanuvchining ma'lumoti chiqmaydi.
    """
    c = conn()
    start = today - timedelta(days=days - 1)
    rows = c.execute(
        "SELECT day, COUNT(DISTINCT user_id) AS n, COALESCE(SUM(nur), 0) AS nur FROM daily "
        "WHERE day BETWEEN ? AND ? AND nur > 0 GROUP BY day",
        (start.isoformat(), today.isoformat()),
    ).fetchall()
    by_day = {r["day"]: (int(r["n"]), int(r["nur"])) for r in rows}

    # Yangi qo'shilganlar — mahalliy kun bo'yicha
    new_by_day: dict[str, int] = {}
    since_ts = int(datetime.combine(start, datetime.min.time(), tzinfo=tz).timestamp())
    for r in c.execute("SELECT created FROM users WHERE created >= ?", (since_ts,)).fetchall():
        k = datetime.fromtimestamp(int(r["created"]), tz).date().isoformat()
        new_by_day[k] = new_by_day.get(k, 0) + 1

    series = []
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        n, nur = by_day.get(d, (0, 0))
        series.append({"d": d, "dau": n, "nur": nur, "new": new_by_day.get(d, 0)})

    levels = [0] * len(LEVELS)
    for r in c.execute("SELECT total FROM users").fetchall():
        levels[level_index(int(r["total"]))] += 1

    out = stats(today)
    out.pop("chart", None)  # date obyektlari — JSON ga chiqmaydi; o'rniga series bor
    out.update({
        "series": series,
        "levels": [{"name": LEVELS[i][0], "n": levels[i]} for i in range(len(LEVELS))],
        "blocked": int((c.execute("SELECT COUNT(*) FROM users WHERE blocked = 1").fetchone() or [0])[0] or 0),
        "since": data_since(),
        "persistent": DATA_DIR_PERSISTENT,
        "last_broadcast": last_broadcast(),
    })
    return out


def user_count() -> int:
    """Ro'yxatdagi foydalanuvchilar soni. /api/ping shu bilan bazaning tirikligini ko'rsatadi."""
    c = conn()
    return int((c.execute("SELECT COUNT(*) FROM users").fetchone() or [0])[0] or 0)


def user_total(uid: int) -> int:
    row = conn().execute("SELECT total FROM users WHERE id=?", (uid,)).fetchone()
    return int(row["total"]) if row else 0


def all_totals() -> dict[int, int]:
    # Keshlangan ustundan — foydalanuvchi soni oshsa ham daily jadvalini qo'shib chiqmaydi
    rows = conn().execute("SELECT id, total FROM users").fetchall()
    return {int(r["id"]): int(r["total"]) for r in rows}


def week_scores(mon: str, sun: str, uids: list[int] | None = None) -> dict[int, int]:
    c = conn()
    if uids is None:
        rows = c.execute(
            "SELECT user_id, SUM(nur) AS n FROM daily WHERE day BETWEEN ? AND ? GROUP BY user_id", (mon, sun)
        ).fetchall()
    elif not uids:
        return {}
    elif len(uids) > 400:
        # Ko'p bo'lsa IN(...) o'rniga hammasini olib Python'da filtrlaymiz (SQLite parametr chegarasi)
        wanted = set(uids)
        rows = [r for r in c.execute(
            "SELECT user_id, SUM(nur) AS n FROM daily WHERE day BETWEEN ? AND ? GROUP BY user_id", (mon, sun)
        ).fetchall() if int(r["user_id"]) in wanted]
    else:
        marks = ",".join("?" * len(uids))
        rows = c.execute(
            f"SELECT user_id, SUM(nur) AS n FROM daily WHERE day BETWEEN ? AND ? AND user_id IN ({marks}) GROUP BY user_id",
            (mon, sun, *uids),
        ).fetchall()
    return {int(r["user_id"]): int(r["n"]) for r in rows}


def names(uids: list[int]) -> dict[int, sqlite3.Row]:
    if not uids:
        return {}
    if len(uids) > 400:  # SQLite parametr chegarasi
        wanted = set(uids)
        rows = [r for r in conn().execute("SELECT id, name, anon FROM users").fetchall() if int(r["id"]) in wanted]
    else:
        marks = ",".join("?" * len(uids))
        rows = conn().execute(f"SELECT id, name, anon FROM users WHERE id IN ({marks})", uids).fetchall()
    return {int(r["id"]): r for r in rows}


def display_name(row: sqlite3.Row | None, for_self: bool = False) -> str:
    """Reytingda ko'rinadigan ism. Anonim bo'lsa boshqalarga "Anonim #NNN" (o'ziga — o'z ismi)."""
    if row is None:
        return "Foydalanuvchi"
    if row["anon"] and not for_self:
        return f"Anonim #{int(row['id']) % 900 + 100}"
    return (row["name"] or "").strip()[:24] or ("Siz" if for_self else "Foydalanuvchi")


# ---------- jamoalar (Telegram guruhlari) ----------
def create_team(chat_id: int, title: str) -> None:
    c = conn()
    c.execute(
        "INSERT INTO teams (chat_id, title, created) VALUES (?,?,?) ON CONFLICT(chat_id) DO UPDATE SET title=excluded.title",
        (chat_id, (title or "Jamoa")[:48], int(time.time())),
    )
    c.commit()


def team_title(chat_id: int) -> str:
    row = conn().execute("SELECT title FROM teams WHERE chat_id=?", (chat_id,)).fetchone()
    return row["title"] if row else ""


def add_member(chat_id: int, uid: int) -> bool:
    """True — yangi qo'shildi, False — allaqachon a'zo."""
    c = conn()
    cur = c.execute("INSERT OR IGNORE INTO members (chat_id, user_id, joined) VALUES (?,?,?)", (chat_id, uid, int(time.time())))
    c.commit()
    return cur.rowcount > 0


def is_member(chat_id: int, uid: int) -> bool:
    return conn().execute("SELECT 1 FROM members WHERE chat_id=? AND user_id=?", (chat_id, uid)).fetchone() is not None


def team_members(chat_id: int) -> list[int]:
    return [int(r["user_id"]) for r in conn().execute("SELECT user_id FROM members WHERE chat_id=?", (chat_id,)).fetchall()]


def user_teams(uid: int) -> list[dict]:
    rows = conn().execute(
        "SELECT t.chat_id AS id, t.title, (SELECT COUNT(*) FROM members x WHERE x.chat_id = t.chat_id) AS members "
        "FROM teams t JOIN members m ON m.chat_id = t.chat_id WHERE m.user_id=? ORDER BY m.joined",
        (uid,),
    ).fetchall()
    return [{"id": int(r["id"]), "title": r["title"], "members": int(r["members"])} for r in rows]


# ---------- do'stlar ----------
def add_friend(a: int, b: int) -> bool:
    """Ikki tomonlama do'stlik. True — yangi, False — allaqachon do'st."""
    if a == b:
        return False
    c = conn()
    cur = c.execute("INSERT OR IGNORE INTO friends (a, b) VALUES (?,?)", (a, b))
    c.execute("INSERT OR IGNORE INTO friends (a, b) VALUES (?,?)", (b, a))
    c.commit()
    return cur.rowcount > 0


def friends_of(uid: int) -> list[int]:
    return [int(r["b"]) for r in conn().execute("SELECT b FROM friends WHERE a=?", (uid,)).fetchall()]


# ---------- umumiy ----------
def community_week(mon: str, sun: str) -> int:
    row = conn().execute("SELECT COALESCE(SUM(nur), 0) AS s FROM daily WHERE day BETWEEN ? AND ?", (mon, sun)).fetchone()
    return int(row["s"])


def active_users(mon: str, sun: str) -> list[int]:
    rows = conn().execute("SELECT DISTINCT user_id FROM daily WHERE day BETWEEN ? AND ? AND nur > 0", (mon, sun)).fetchall()
    return [int(r["user_id"]) for r in rows]


# ---------- video darslar ----------
def list_videos() -> list[dict]:
    rows = conn().execute("SELECT * FROM videos ORDER BY section, ord, id").fetchall()
    return [
        {
            "id": int(r["id"]), "section": r["section"], "title": r["title"], "youtubeId": r["yt"],
            "duration": r["duration"], "gender": r["gender"], "note": r["note"],
            "playlistId": r["playlist"],
        }
        for r in rows
    ]


def save_video(
    vid: int | None, section: str, title: str, yt: str, duration: str, gender: str, note: str, playlist: str = ""
) -> int:
    c = conn()
    if vid:
        c.execute(
            "UPDATE videos SET section=?, title=?, yt=?, duration=?, gender=?, note=?, playlist=? WHERE id=?",
            (section, title, yt, duration, gender, note, playlist, vid),
        )
        c.commit()
        return vid
    row = c.execute("SELECT COALESCE(MAX(ord), 0) + 1 AS n FROM videos WHERE section=?", (section,)).fetchone()
    cur = c.execute(
        "INSERT INTO videos (section, title, yt, duration, gender, note, playlist, ord, created) VALUES (?,?,?,?,?,?,?,?,?)",
        (section, title, yt, duration, gender, note, playlist, int(row["n"]), int(time.time())),
    )
    c.commit()
    return int(cur.lastrowid)


def add_videos_bulk(section: str, gender: str, items: list[dict]) -> int:
    """Playlistni darslarga yoyib qo'shadi. items: [{yt, title, duration}]. Takrorlanganini o'tkazib yuboradi."""
    c = conn()
    have = {r["yt"] for r in c.execute("SELECT yt FROM videos WHERE section=?", (section,)).fetchall()}
    row = c.execute("SELECT COALESCE(MAX(ord), 0) AS n FROM videos WHERE section=?", (section,)).fetchone()
    ordn, now, added = int(row["n"]), int(time.time()), 0
    for it in items:
        yt = str(it.get("yt") or "")
        title = str(it.get("title") or "").strip()[:80]
        if not yt or not title or yt in have:
            continue
        ordn += 1
        have.add(yt)
        c.execute(
            "INSERT INTO videos (section, title, yt, duration, gender, note, playlist, ord, created) VALUES (?,?,?,?,?,?,'',?,?)",
            (section, title, yt, str(it.get("duration") or "")[:8], gender, "", ordn, now),
        )
        added += 1
    c.commit()
    return added


# ---------- materiallar (PDF va boshqa fayllar) ----------
# Fayl Telegram serverida turadi, bazada faqat file_id saqlanadi — hosting kerak emas.
def list_files() -> list[dict]:
    rows = conn().execute("SELECT * FROM files ORDER BY section, ord, id").fetchall()
    return [
        {"id": int(r["id"]), "section": r["section"], "title": r["title"], "kind": r["kind"], "size": int(r["size"])}
        for r in rows
    ]


def get_file(fid: int) -> sqlite3.Row | None:
    return conn().execute("SELECT * FROM files WHERE id=?", (fid,)).fetchone()


def add_file(section: str, title: str, file_id: str, kind: str, size: int) -> int:
    c = conn()
    row = c.execute("SELECT COALESCE(MAX(ord), 0) + 1 AS n FROM files WHERE section=?", (section,)).fetchone()
    cur = c.execute(
        "INSERT INTO files (section, title, file_id, kind, size, ord, created) VALUES (?,?,?,?,?,?,?)",
        (section, title[:80], file_id, kind[:12], max(0, size), int(row["n"]), int(time.time())),
    )
    c.commit()
    return int(cur.lastrowid)


def delete_file(fid: int) -> bool:
    c = conn()
    cur = c.execute("DELETE FROM files WHERE id=?", (fid,))
    c.commit()
    return cur.rowcount > 0


def delete_video(vid: int) -> bool:
    c = conn()
    cur = c.execute("DELETE FROM videos WHERE id=?", (vid,))
    c.commit()
    return cur.rowcount > 0


def move_video(vid: int, direction: str) -> bool:
    """Bo'lim ichida qo'shnisi bilan o'rin almashadi."""
    c = conn()
    row = c.execute("SELECT id, section, ord FROM videos WHERE id=?", (vid,)).fetchone()
    if row is None:
        return False
    if direction == "up":
        nb = c.execute(
            "SELECT id, ord FROM videos WHERE section=? AND (ord < ? OR (ord = ? AND id < ?)) ORDER BY ord DESC, id DESC LIMIT 1",
            (row["section"], row["ord"], row["ord"], row["id"]),
        ).fetchone()
    else:
        nb = c.execute(
            "SELECT id, ord FROM videos WHERE section=? AND (ord > ? OR (ord = ? AND id > ?)) ORDER BY ord ASC, id ASC LIMIT 1",
            (row["section"], row["ord"], row["ord"], row["id"]),
        ).fetchone()
    if nb is None:
        return False
    # Teng ord bo'lsa almashtirish ko'rinmaydi — qo'shniga farqli qiymat beramiz
    a, b = int(row["ord"]), int(nb["ord"])
    if a == b:
        b = a - 1 if direction == "up" else a + 1
    c.execute("UPDATE videos SET ord=? WHERE id=?", (b, row["id"]))
    c.execute("UPDATE videos SET ord=? WHERE id=?", (a, nb["id"]))
    c.commit()
    return True


# ---------- admin statistikasi ----------
def stats(today: date) -> dict:
    """Adminlar uchun umumiy ko'rsatkichlar. Bitta foydalanuvchining ma'lumoti chiqmaydi — faqat yig'indilar."""
    c = conn()
    mon, sun = week_range(today)
    td = today.isoformat()
    week_ago = (today - timedelta(days=6)).isoformat()
    now = int(time.time())
    one = lambda sql, args=(): (c.execute(sql, args).fetchone() or [0])[0] or 0  # noqa: E731

    # Kunlik faollik: oxirgi 7 kun bo'yicha nechta odam Nur to'plagan
    rows = c.execute(
        "SELECT day, COUNT(DISTINCT user_id) AS n FROM daily WHERE day BETWEEN ? AND ? AND nur > 0 GROUP BY day",
        (week_ago, td),
    ).fetchall()
    by_day = {r["day"]: int(r["n"]) for r in rows}
    chart = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        chart.append((d, by_day.get(d.isoformat(), 0)))

    # Oxirgi 7 kunning hammasida faol bo'lganlar — eng sodiq yadro
    loyal = one(
        "SELECT COUNT(*) FROM (SELECT user_id FROM daily WHERE day BETWEEN ? AND ? AND nur > 0 "
        "GROUP BY user_id HAVING COUNT(DISTINCT day) = 7)",
        (week_ago, td),
    )
    return {
        "users": one("SELECT COUNT(*) FROM users"),
        "new_today": one("SELECT COUNT(*) FROM users WHERE created >= ?", (now - 86400,)),
        "new_week": one("SELECT COUNT(*) FROM users WHERE created >= ?", (now - 7 * 86400,)),
        "dau": by_day.get(td, 0),
        "wau": one("SELECT COUNT(DISTINCT user_id) FROM daily WHERE day BETWEEN ? AND ? AND nur > 0", (week_ago, td)),
        "loyal": loyal,
        "chart": chart,
        "nur_today": one("SELECT SUM(nur) FROM daily WHERE day = ?", (td,)),
        "nur_week": one("SELECT SUM(nur) FROM daily WHERE day BETWEEN ? AND ?", (mon, sun)),
        "teams": one("SELECT COUNT(*) FROM teams"),
        "team_members": one("SELECT COUNT(*) FROM members"),
        "friend_pairs": one("SELECT COUNT(*) FROM friends") // 2,
        "videos": one("SELECT COUNT(*) FROM videos"),
        "files": one("SELECT COUNT(*) FROM files"),
        "db_kb": (DB_FILE.stat().st_size // 1024) if DB_FILE.exists() else 0,
    }


# ---------- reyting jadvali ----------
def board(
    scope: str,
    uid: int,
    today: date,
    team_chat_id: int | None = None,
    limit: int = 30,
    require_member: bool = True,
) -> dict:
    """
    scope:  liga    — bir darajadagi, shu hafta faol bo'lgan foydalanuvchilar
            team    — guruh a'zolari (0 Nur bo'lsa ham ko'rinadi)
            friends — men + do'stlarim
    Qaytaradi: {title, from, to, level, size, rows: [{rank, name, level, nur, me}], me: {...}, community}
    Boshqalar haqida faqat: ko'rinadigan ism, daraja, haftalik jami Nur. Tafsilot yo'q.
    """
    mon, sun = week_range(today)
    totals = all_totals()
    my_level = level_index(totals.get(uid, 0))
    community = community_week(mon, sun)
    empty = {"title": "", "from": mon, "to": sun, "level": my_level, "size": 0, "rows": [], "me": None, "community": community}

    if scope == "team":
        if team_chat_id is None:
            teams = user_teams(uid)
            team_chat_id = teams[0]["id"] if teams else None
        if team_chat_id is None or not team_title(team_chat_id):
            return empty
        if require_member and not is_member(team_chat_id, uid):
            return empty
        pool, title, include_zero = team_members(team_chat_id), team_title(team_chat_id), True
    elif scope == "friends":
        pool, title, include_zero = [uid] + friends_of(uid), "Do'stlar", True
    else:
        scope = "liga"
        # Liga daraja bo'yicha bo'linadi — lekin faqat odam yetarli bo'lganda.
        # Boshida (yoki faollik pasayganda) bo'linish jadvalni bo'm-bo'sh qoldiradi,
        # shuning uchun hamma bitta umumiy reytingda ko'rsatiladi.
        active = active_users(mon, sun)
        if len(active) < LEAGUE_MIN_USERS:
            pool, title = list(totals.keys()), "Umumiy reyting"
        else:
            pool, title = [u for u, t in totals.items() if level_index(t) == my_level], f"{level_name(my_level)} ligasi"
        include_zero = False

    scores = week_scores(mon, sun, pool)
    ranked = [(u, scores.get(u, 0)) for u in pool if include_zero or scores.get(u, 0) > 0]
    ranked.sort(key=lambda x: (-x[1], x[0]))  # Nur kamayishi bo'yicha; teng bo'lsa barqaror tartib
    info = names([u for u, _ in ranked] + [uid])

    rows, me = [], None
    for i, (u, nur) in enumerate(ranked, 1):
        row = {"rank": i, "name": display_name(info.get(u), for_self=(u == uid)), "level": level_index(totals.get(u, 0)), "nur": nur, "me": u == uid}
        if u == uid:
            me = row
        if i <= limit:
            rows.append(row)
    if me is None:
        me = {"rank": None, "name": display_name(info.get(uid), for_self=True), "level": my_level, "nur": scores.get(uid, 0), "me": True}

    size = len(friends_of(uid)) if scope == "friends" else len(ranked)
    return {"title": title, "from": mon, "to": sun, "level": my_level, "size": size, "rows": rows, "me": me, "community": community}
