"""
Mini App uchun HTTP API — bot bilan BIR jarayonda (aiohttp) ishlaydi, alohida server shart emas.

  GET  /api/ping
  POST /api/sync    — { name, anon, total, days: [{ d, zikr, tasbih, qazo, ilm, odat }] }
                      har kategoriya CAPS bilan chegaralanib qo'shiladi, faqat kunlik JAMI saqlanadi
  GET  /api/board?scope=liga|team|friends[&team=CHAT_ID]

XAVFSIZLIK: har so'rovda X-Init-Data sarlavhasi (Telegram initData) bo'lishi shart —
bot tokeni bilan HMAC-SHA256 orqali tekshiriladi; 24 soatdan eski initData rad etiladi.
Shu tufayli foydalanuvchi o'zini boshqa odam qilib ko'rsata olmaydi.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import re
import time
import urllib.parse
from datetime import date, datetime
from zoneinfo import ZoneInfo

import aiohttp
from aiohttp import web

import db

# webapp/nur.js dagi CAP bilan BIR XIL bo'lishi shart
CAPS = {"zikr": 120, "tasbih": 200, "qazo": 300, "ilm": 120, "odat": 110}
IMPORT_CAP = 5000        # birinchi ulanishda ilovadan qabul qilinadigan avvalgi jami Nur (maksimum)
MAX_DAYS_BACK = 7        # necha kun orqaga natija qabul qilinadi
SYNC_MIN_INTERVAL = 3.0  # soniya — bitta foydalanuvchi uchun /sync oralig'i
_last_sync: dict[int, float] = {}

VIDEO_SECTIONS = {  # webapp/data.js dagi videoSections id lari bilan bir xil
    "tahorat", "bomdod", "peshin", "asr", "shom", "xufton", "juma", "nafl", "arab", "zikr", "boshqa",
}
GENDERS = {"hamma", "erkak", "ayol"}
YT_RE = re.compile(
    r"(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/|v/)|youtu\.be/)([\w-]{11})"
)


PL_RE = re.compile(r"[?&]list=([\w-]{12,})")
PLAYLIST_MAX = 200


def parse_youtube(value: str) -> str:
    """Havoladan YouTube video ID sini ajratadi (yoki toza ID ni qaytaradi)."""
    s = str(value or "").strip()
    if re.fullmatch(r"[\w-]{11}", s):
        return s
    m = YT_RE.search(s)
    return m.group(1) if m else ""


def parse_playlist(value: str) -> str:
    """Havoladagi list= parametridan playlist ID sini ajratadi."""
    s = str(value or "").strip()
    if re.fullmatch(r"(?:PL|UU|OL|LL|FL|RD)[\w-]{10,}", s):
        return s
    m = PL_RE.search(s)
    return m.group(1) if m else ""


DUR_RE = re.compile(r"^\d{1,2}:\d{2}(?::\d{2})?$")


def _walk_renderers(node, out: list) -> None:
    """
    ytInitialData ichidan playlist elementlarini yig'adi.
    YouTube 2025-yilda `lockupViewModel` ga o'tdi; eski `playlistVideoRenderer` ham qo'llab-quvvatlanadi.
    """
    if isinstance(node, dict):
        lk = node.get("lockupViewModel")
        if isinstance(lk, dict) and lk.get("contentId"):
            out.append(("lockup", lk))
        old = node.get("playlistVideoRenderer")
        if isinstance(old, dict) and old.get("videoId"):
            out.append(("legacy", old))
        for v in node.values():
            _walk_renderers(v, out)
    elif isinstance(node, list):
        for v in node:
            _walk_renderers(v, out)


def _find_duration(node, depth: int = 0) -> str:
    """Element ichidan birinchi «mm:ss» ko'rinishidagi matnni topadi (thumbnail badge)."""
    if depth > 8 or node is None:
        return ""
    if isinstance(node, dict):
        t = node.get("text")
        if isinstance(t, str) and DUR_RE.match(t):
            return t
        for v in node.values():
            found = _find_duration(v, depth + 1)
            if found:
                return found
    elif isinstance(node, list):
        for v in node:
            found = _find_duration(v, depth + 1)
            if found:
                return found
    return ""


def _title_of(kind: str, r: dict) -> str:
    if kind == "lockup":
        t = ((r.get("metadata") or {}).get("lockupMetadataViewModel") or {}).get("title") or {}
    else:
        t = r.get("title") or {}
    if isinstance(t, dict):
        if isinstance(t.get("content"), str):
            return t["content"]
        if isinstance(t.get("simpleText"), str):
            return t["simpleText"]
        runs = t.get("runs")
        if isinstance(runs, list) and runs and isinstance(runs[0], dict):
            return str(runs[0].get("text") or "")
    return ""


async def fetch_playlist_items(list_id: str) -> list[dict]:
    """
    Playlist ichidagi darslarni oladi (YouTube API kaliti kerak emas — sahifadagi ytInitialData dan).
    YouTube birinchi javobda ~100 ta element beradi; qolganini olish uchun API kaliti kerak.
    Xato bo'lsa bo'sh ro'yxat qaytaradi — chaqiruvchi playlistni bitta yozuv sifatida qo'shadi.
    """
    url = f"https://www.youtube.com/playlist?list={urllib.parse.quote(list_id)}&hl=en"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as r:
                if r.status != 200:
                    return []
                html_text = await r.text()
    except Exception as e:  # noqa: BLE001
        logging.warning("Playlist olinmadi %s: %s", list_id, e)
        return []

    m = re.search(r"ytInitialData\s*=\s*(\{.+?\})\s*;\s*</script>", html_text, re.S)
    if not m:
        return []
    try:
        data = json.loads(m.group(1))
    except ValueError:
        return []

    renderers: list = []
    _walk_renderers(data, renderers)
    items, seen = [], set()
    for kind, r in renderers:
        if kind == "lockup":
            if r.get("contentType") not in (None, "LOCKUP_CONTENT_TYPE_VIDEO"):
                continue
            vid = str(r.get("contentId") or "")
        else:
            vid = str(r.get("videoId") or "")
        title = _title_of(kind, r)
        if not re.fullmatch(r"[\w-]{11}", vid) or not title or vid in seen:
            continue
        seen.add(vid)
        duration = str((r.get("lengthText") or {}).get("simpleText") or "") if kind == "legacy" else ""
        if not duration:
            duration = _find_duration(r)
        items.append({"yt": vid, "title": " ".join(title.split())[:80], "duration": duration[:8]})
        if len(items) >= PLAYLIST_MAX:
            break
    return items


# ---------- Telegram initData tekshiruvi ----------
def validate_init_data(init_data: str, bot_token: str, max_age: int = 86400) -> dict | None:
    """To'g'ri bo'lsa user (dict), aks holda None."""
    if not init_data:
        return None
    try:
        parsed = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
    except ValueError:
        return None
    received = parsed.pop("hash", None)
    if not received:
        return None
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calc = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc, received):
        return None
    try:
        if max_age and time.time() - int(parsed.get("auth_date", "0")) > max_age:
            return None
        user = json.loads(parsed.get("user", "{}"))
    except (ValueError, TypeError):
        return None
    return user if isinstance(user, dict) and user.get("id") else None


def _today(tz: ZoneInfo) -> date:
    return datetime.now(tz).date()


def _parse_day(value) -> date | None:
    try:
        return date.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None


def _cors(resp: web.StreamResponse, origin: str) -> web.StreamResponse:
    resp.headers["Access-Control-Allow-Origin"] = origin
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Init-Data"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Max-Age"] = "86400"
    return resp


@web.middleware
async def middleware(request: web.Request, handler):
    cfg = request.app["cfg"]
    if request.method == "OPTIONS":  # CORS preflight
        return _cors(web.Response(status=204), cfg["origin"])
    if request.path != "/api/ping":
        user = validate_init_data(request.headers.get("X-Init-Data", ""), cfg["token"])
        if not user:
            return _cors(web.json_response({"error": "unauthorized"}, status=401), cfg["origin"])
        request["user"] = user
    try:
        resp = await handler(request)
    except web.HTTPException:
        raise
    except Exception:  # noqa: BLE001
        logging.exception("API xatosi: %s %s", request.method, request.path)
        resp = web.json_response({"error": "server"}, status=500)
    return _cors(resp, cfg["origin"])


# ---------- handlerlar ----------
async def ping(request: web.Request) -> web.Response:
    return web.json_response({"ok": True, "time": int(time.time())})


async def sync(request: web.Request) -> web.Response:
    cfg = request.app["cfg"]
    user = request["user"]
    uid = int(user["id"])

    now = time.time()
    if now - _last_sync.get(uid, 0.0) < SYNC_MIN_INTERVAL:
        return web.json_response({"error": "too_fast"}, status=429)
    if len(_last_sync) > 5000:  # eskirgan yozuvlarni tozalash (xotira o'smasligi uchun)
        for k in [k for k, t in _last_sync.items() if now - t > 300]:
            _last_sync.pop(k, None)
    _last_sync[uid] = now

    try:
        body = await request.json()
        if not isinstance(body, dict):
            raise ValueError("dict emas")
    except Exception:  # noqa: BLE001
        return web.json_response({"error": "bad_json"}, status=400)

    today = _today(cfg["tz"])
    name = str(body.get("name") or user.get("first_name") or "").strip()[:24]
    anon = bool(body.get("anon"))

    # Kunlik natijalar: faqat oxirgi 7 kun, kelajak yo'q, har kategoriya chegaralangan; faqat jami saqlanadi
    rows: list[tuple[str, int]] = []
    for item in list(body.get("days") or [])[: MAX_DAYS_BACK + 1]:
        if not isinstance(item, dict):
            continue
        day = _parse_day(item.get("d"))
        if day is None or day > today or (today - day).days > MAX_DAYS_BACK:
            continue
        nur = 0
        for cat, cap in CAPS.items():
            try:
                v = int(item.get(cat, 0) or 0)
            except (TypeError, ValueError):
                v = 0
            nur += max(0, min(cap, v))
        rows.append((day.isoformat(), nur))

    is_new = db.upsert_user(uid, name, anon)
    if is_new:
        # Ilovani serverdan oldin ishlatganlar avvalgi natijasini bir marta olib o'tadi (chegara bilan)
        try:
            claimed = int(body.get("total", 0) or 0)
        except (TypeError, ValueError):
            claimed = 0
        base = max(0, min(IMPORT_CAP, claimed - sum(n for _, n in rows)))
        if base:
            db.set_base(uid, base)
    if rows:
        db.upsert_days(uid, rows)

    total = db.user_total(uid)
    mon, sun = db.week_range(today)
    liga = db.board("liga", uid, today, limit=0)  # faqat o'rin va soni uchun
    return web.json_response({
        "ok": True,
        "total": total,
        "level": db.level_index(total),
        "week": {"from": mon, "to": sun, "nur": liga["me"]["nur"], "rank": liga["me"]["rank"], "size": liga["size"]},
        "teams": db.user_teams(uid),
        "friends": len(db.friends_of(uid)),
        "invite": f"https://t.me/{cfg['bot']}?start=f_{uid}",
        "bot": cfg["bot"],
        "community": liga["community"],
        "isAdmin": uid in cfg["admins"],
    })


async def board(request: web.Request) -> web.Response:
    cfg = request.app["cfg"]
    user = request["user"]
    uid = int(user["id"])
    scope = request.query.get("scope", "liga")
    if scope not in ("liga", "team", "friends"):
        scope = "liga"
    try:
        team_id = int(request.query["team"]) if request.query.get("team") else None
    except ValueError:
        team_id = None
    db.ensure_user(uid, str(user.get("first_name") or ""))
    return web.json_response(db.board(scope, uid, _today(cfg["tz"]), team_id))


# ---------- video katalogi ----------
def _is_admin(request: web.Request) -> bool:
    return int(request["user"]["id"]) in request.app["cfg"]["admins"]


async def content(request: web.Request) -> web.Response:
    """Barcha foydalanuvchilar uchun video katalogi va materiallar. Filtrlashni Mini App qiladi."""
    return web.json_response({
        "ok": True, "videos": db.list_videos(), "files": db.list_files(), "isAdmin": _is_admin(request),
    })


async def _admin_body(request: web.Request) -> tuple[dict | None, web.Response | None]:
    if not _is_admin(request):
        return None, web.json_response({"error": "forbidden"}, status=403)
    try:
        body = await request.json()
        if not isinstance(body, dict):
            raise ValueError
    except Exception:  # noqa: BLE001
        return None, web.json_response({"error": "bad_json"}, status=400)
    return body, None


def _catalog() -> dict:
    return {"ok": True, "videos": db.list_videos(), "files": db.list_files()}


async def admin_video(request: web.Request) -> web.Response:
    """
    Video qo'shish yoki tahrirlash. id berilsa — tahrirlanadi.
    expand=true va playlistId berilsa — playlist ichidagi darslar alohida-alohida qo'shiladi.
    """
    body, err = await _admin_body(request)
    if err:
        return err
    section = str(body.get("section") or "boshqa")
    if section not in VIDEO_SECTIONS:
        section = "boshqa"
    gender = str(body.get("gender") or "hamma")
    if gender not in GENDERS:
        gender = "hamma"
    playlist = parse_playlist(body.get("playlistId") or "")

    if body.get("expand") and playlist:
        items = await fetch_playlist_items(playlist)
        if not items:
            return web.json_response({"error": "playlist_empty"}, status=502)
        added = db.add_videos_bulk(section, gender, items)
        return web.json_response(dict(_catalog(), added=added))

    yt = parse_youtube(body.get("youtubeId"))
    title = str(body.get("title") or "").strip()[:80]
    if not title or (not yt and not playlist):
        return web.json_response({"error": "bad_video"}, status=400)
    try:
        vid = int(body["id"]) if body.get("id") else None
    except (TypeError, ValueError):
        vid = None
    db.save_video(
        vid, section, title, yt, str(body.get("duration") or "").strip()[:8],
        gender, str(body.get("note") or "").strip()[:40], playlist,
    )
    return web.json_response(_catalog())


async def admin_video_delete(request: web.Request) -> web.Response:
    body, err = await _admin_body(request)
    if err:
        return err
    try:
        db.delete_video(int(body["id"]))
    except (KeyError, TypeError, ValueError):
        return web.json_response({"error": "bad_id"}, status=400)
    return web.json_response(_catalog())


async def admin_video_move(request: web.Request) -> web.Response:
    body, err = await _admin_body(request)
    if err:
        return err
    direction = "up" if body.get("dir") == "up" else "down"
    try:
        db.move_video(int(body["id"]), direction)
    except (KeyError, TypeError, ValueError):
        return web.json_response({"error": "bad_id"}, status=400)
    return web.json_response(_catalog())


async def admin_file_delete(request: web.Request) -> web.Response:
    body, err = await _admin_body(request)
    if err:
        return err
    try:
        db.delete_file(int(body["id"]))
    except (KeyError, TypeError, ValueError):
        return web.json_response({"error": "bad_id"}, status=400)
    return web.json_response(_catalog())


async def _oembed_title(url: str) -> str:
    api = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(url, safe="")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(api, timeout=aiohttp.ClientTimeout(total=8)) as r:
                if r.status == 200:
                    return str((await r.json()).get("title") or "")
    except Exception as e:  # noqa: BLE001
        logging.warning("oEmbed olinmadi %s: %s", url, e)
    return ""


async def admin_lookup(request: web.Request) -> web.Response:
    """
    Havolani tekshiradi: video yoki playlist ekanini aniqlaydi va sarlavhani oladi.
    YouTube oEmbed ishlatiladi — API kaliti kerak emas. Serverdan so'raladi, ya'ni CORS muammosi yo'q.
    """
    body, err = await _admin_body(request)
    if err:
        return err
    raw = str(body.get("url") or "")
    yt, playlist = parse_youtube(raw), parse_playlist(raw)
    if not yt and not playlist:
        return web.json_response({"error": "bad_url"}, status=400)

    out = {"ok": True, "youtubeId": yt, "playlistId": playlist, "title": "", "playlistTitle": "", "count": 0}
    if yt:
        out["title"] = await _oembed_title(f"https://www.youtube.com/watch?v={yt}")
    if playlist:
        out["playlistTitle"] = await _oembed_title(f"https://www.youtube.com/playlist?list={playlist}")
        out["count"] = len(await fetch_playlist_items(playlist))
        if not out["title"]:
            out["title"] = out["playlistTitle"]
    return web.json_response(out)


def create_app(bot_token: str, bot_username: str, webapp_url: str, tz: ZoneInfo, admins: set[int] | None = None) -> web.Application:
    """CORS faqat Mini App joylashgan origin uchun ochiladi (WEBAPP_URL dan olinadi)."""
    origin = "*"
    parts = urllib.parse.urlsplit(webapp_url or "")
    if parts.scheme and parts.netloc:
        origin = f"{parts.scheme}://{parts.netloc}"
    app = web.Application(middlewares=[middleware])
    app["cfg"] = {"token": bot_token, "bot": bot_username, "origin": origin, "tz": tz, "admins": admins or set()}
    app.router.add_get("/api/ping", ping)
    app.router.add_post("/api/sync", sync)
    app.router.add_get("/api/board", board)
    app.router.add_get("/api/content", content)
    app.router.add_post("/api/admin/video", admin_video)
    app.router.add_post("/api/admin/video/delete", admin_video_delete)
    app.router.add_post("/api/admin/video/move", admin_video_move)
    app.router.add_post("/api/admin/file/delete", admin_file_delete)
    app.router.add_post("/api/admin/lookup", admin_lookup)
    return app
