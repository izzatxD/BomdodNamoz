"""
Bomdod namozi — Telegram bot (aiogram 3)
=========================================
• Mini App'ni ochadigan tugmalar
• Bomdod vaqti (/vaqt)
• Tongi va tungi zikrlar uchun kunlik eslatmalar (/eslatma)
• Reyting: jamoa (/jamoa), do'stlar, haftalik xulosa; Mini App uchun HTTP API (api.py + db.py)

Ishga tushirish:
    pip install -r requirements.txt
    cp .env.example .env      # BOT_TOKEN va WEBAPP_URL ni to'ldiring
    python bot.py
"""

import asyncio
import html
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from aiohttp import web
from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import (
    BotCommand,
    CallbackQuery,
    FSInputFile,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    MenuButtonWebApp,
    Message,
    ReplyKeyboardMarkup,
    WebAppInfo,
)
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

load_dotenv()  # avval .env — api/db import paytida DATA_DIR va boshqalarni o'qiydi

import api  # noqa: E402
import db  # noqa: E402
import vaqt  # noqa: E402

def env_str(name: str, default: str = "") -> str:
    """Muhit o'zgaruvchisi. Ba'zi panellar qiymatni tirnoq bilan uzatadi — ularni olib tashlaymiz."""
    return os.getenv(name, "").strip().strip("\"'").strip() or default


def env_ids(name: str) -> set[int]:
    """Vergul bilan ajratilgan Telegram ID lar. Tirnoq, bo'shliq va bo'sh qiymatlarga chidamli."""
    out: set[int] = set()
    for part in os.getenv(name, "").replace(";", ",").split(","):
        cleaned = part.strip().strip("\"'").strip()
        if cleaned.isdigit():
            out.add(int(cleaned))
    return out


BOT_TOKEN = env_str("BOT_TOKEN")
# Mini App manzili. Ko'rsatilmasa — shu repozitoriyning GitHub Pages manzili.
WEBAPP_URL = env_str("WEBAPP_URL", "https://izzatxd.github.io/BomdodNamoz/")
TZ = ZoneInfo(os.getenv("TZ", "Asia/Tashkent"))
MORNING_HOUR = int(os.getenv("MORNING_HOUR", "6"))    # tongi zikr eslatmasi (soat)
EVENING_HOUR = int(os.getenv("EVENING_HOUR", "18"))   # tungi zikr eslatmasi (soat)
USERS_FILE = db.DATA_DIR / "users.json"  # DATA_DIR — Railway volume (masalan /data); bo'lmasa bot/ papkasi
API_PORT = int(os.getenv("PORT") or os.getenv("API_PORT") or "8080")  # Mini App shu portga murojaat qiladi (hosting PORT bersa — o'sha)
WEEKLY_HOUR = int(os.getenv("WEEKLY_HOUR", "20"))  # yakshanba kuni haftalik reyting xulosasi (soat)
# Super adminlar — ilovadagi Video bo'limida «Video qo'shish» paneli faqat shularga ko'rinadi.
# Telegram ID ni bilish uchun botga /id yozing.
ADMIN_IDS = env_ids("ADMIN_IDS")
BOT_USERNAME = ""  # main() da to'ldiriladi
BACKUP_DAY = env_str("BACKUP_DAY", "mon")  # haftalik baza zaxirasi adminga yuboriladigan kun (mon..sun, "" — o'chiq)

if not BOT_TOKEN:
    # Diagnostika: o'zgaruvchi umuman kelmadimi yoki kelib, qiymati bo'shmi?
    if "BOT_TOKEN" not in os.environ:
        holat = "jarayonga UMUMAN yetib kelmadi — Variables da saqlanmagan yoki bu deploy undan oldin boshlangan"
    elif not os.environ["BOT_TOKEN"].strip():
        holat = "keldi, lekin QIYMATI BO'SH — Variables da nomi bor, qiymati yo'q"
    else:
        holat = "keldi, lekin faqat tirnoq/bo'shliqdan iborat"
    # Qiymatlar emas, faqat nomlar — sirlar logga tushmasin
    tashqi = sorted(
        k for k in os.environ
        if not k.startswith(("_", "LC_", "LS_"))
        and k not in {"PATH", "PWD", "HOME", "HOSTNAME", "TERM", "SHLVL", "LANG", "GPG_KEY"}
        and not k.startswith("PYTHON")
    )
    raise SystemExit(
        "\n"
        "  BOT_TOKEN ko'rsatilmagan — bot ishga tushmaydi.\n"
        "\n"
        f"  Holat: {holat}\n"
        f"  Jarayondagi o'zgaruvchilar ({len(tashqi)} ta): {', '.join(tashqi) or '(hech qanday)'}\n"
        "\n"
        "  Railway: servis → Variables → Raw Editor:\n"
        "      BOT_TOKEN=@BotFather bergan token\n"
        "      ADMIN_IDS=Telegram ID ingiz\n"
        "  Yozgach «Update Variables» ni bosing — shundan keyingina yangi deploy boshlanadi.\n"
        "\n"
        f"  WEBAPP_URL (hozir): {WEBAPP_URL}\n"
        "  Lokal ishlatish uchun: bot/.env faylini .env.example dan nusxalang.\n"
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

if not db.DATA_DIR_PERSISTENT:
    logging.warning(
        "DIQQAT: doimiy disk topilmadi, ma'lumot %s da saqlanmoqda. "
        "Hostingda bu HAR DEPLOY'DA O'CHADI — Railway'da Volume qo'shing (mount path: /data).",
        db.DATA_DIR,
    )
if not ADMIN_IDS:
    logging.warning("ADMIN_IDS bo'sh — /stat, /backup va ilovadagi video paneli hech kimga ochiq emas.")
router = Router()

# Shaharlar — rasmiy taqvimda shu hudud uchun ishlatiladigan uzunlik (webapp/data.js bilan BIR XIL).
# Kenglik kerak emas: rasmiy usulda hamma hudud 41.31°N da hisoblanadi (vaqt.py).
CITIES: dict[str, tuple[str, float]] = {
    "toshkent": ("Toshkent", 69.24), "samarqand": ("Samarqand", 66.99),
    "buxoro": ("Buxoro", 64.49), "andijon": ("Andijon", 72.24),
    "farg'ona": ("Farg'ona", 71.74), "fargona": ("Farg'ona", 71.74),
    "namangan": ("Namangan", 71.74), "qarshi": ("Qarshi", 65.74),
    "nukus": ("Nukus", 60.24), "urganch": ("Urganch", 60.74),
    "termiz": ("Termiz", 67.24), "jizzax": ("Jizzax", 67.74),
    "navoiy": ("Navoiy", 65.49), "guliston": ("Guliston", 68.74),
}

# Materiallar va videolar bo'limlari — webapp/data.js dagi videoSections bilan bir xil bo'lishi shart
SECTIONS: dict[str, str] = {
    "tahorat": "Tahorat va g'usl",
    "bomdod": "Bomdod namozi",
    "peshin": "Peshin namozi",
    "asr": "Asr namozi",
    "shom": "Shom namozi",
    "xufton": "Xufton namozi",
    "juma": "Juma va hayit",
    "nafl": "Nafl namozlar",
    "arab": "Arab tili va tajvid",
    "zikr": "Zikr va duolar",
    "boshqa": "Boshqa darslar",
}

# Admin yuborgan, lekin bo'limi hali tanlanmagan fayllar: {admin_id: (file_id, nom, tur, hajm)}
_pending_files: dict[int, tuple[str, str, str, int]] = {}

# Eslatmalar bilan yuboriladigan qisqa zikrlar (kunlar bo'yicha almashib turadi)
MORNING_TIPS = [
    ("Sayyidul istig'for", "Allohumma anta robbiy laa ilaaha illaa ant, xolaqtaniy va ana 'abduk..."),
    ("Hasbiyalloh (7 marta)", "Hasbiyallohu laa ilaaha illaa huva 'alayhi tavakkaltu va huva robbul 'arshil 'aziym."),
    ("Bismillaahillaziy (3 marta)", "Bismillaahillaziy laa yazurru ma'asmihii shay'un fil arzi va laa fis-samaa'..."),
    ("Asbahnaa", "Asbahnaa va asbahal mulku lillaah, val hamdu lillaah..."),
]
EVENING_TIPS = [
    ("Amsaynaa", "Amsaynaa va amsal mulku lillaah, val hamdu lillaah..."),
    ("A'uuzu bikalimaatillaah (3 marta)", "A'uuzu bikalimaatillaahit-taammaati min sharri maa xolaq."),
    ("Oyatul Kursiy", "Kechqurun o'qigan kishi tonggacha himoyada bo'ladi."),
    ("Ixlos, Falaq, Nos (3 martadan)", "Har narsadan kifoya qiladi."),
]


# ---------- foydalanuvchilar (eslatma yoqqanlar) ----------
def load_users() -> dict:
    if USERS_FILE.exists():
        try:
            return json.loads(USERS_FILE.read_text("utf-8"))
        except Exception:  # noqa: BLE001
            return {}
    return {}


def save_users(users: dict) -> None:
    USERS_FILE.write_text(json.dumps(users, ensure_ascii=False, indent=1), "utf-8")


USERS = load_users()  # {"chat_id": {"remind": true, "name": "..."}}


# ---------- klaviaturalar ----------
def main_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🕌 Ilovani ochish", web_app=WebAppInfo(url=WEBAPP_URL))],
            [KeyboardButton(text="🕐 Bomdod vaqti"), KeyboardButton(text="🔔 Eslatma")],
            [KeyboardButton(text="📊 Reyting"), KeyboardButton(text="ℹ️ Yordam")],
        ],
        resize_keyboard=True,
    )


def sections_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🧎 Namoz qadam-baqadam", web_app=WebAppInfo(url=WEBAPP_URL))],
            [InlineKeyboardButton(text="📿 Zikrlar va odat dasturi", web_app=WebAppInfo(url=WEBAPP_URL))],
            [InlineKeyboardButton(text="🔤 Arab tili darsligi", web_app=WebAppInfo(url=WEBAPP_URL))],
            [InlineKeyboardButton(text="🗓️ Qazo namozlar", web_app=WebAppInfo(url=WEBAPP_URL))],
        ]
    )


def remind_keyboard(on: bool) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[
            InlineKeyboardButton(text="🔕 O'chirish" if on else "🔔 Yoqish", callback_data="remind:off" if on else "remind:on")
        ]]
    )


def app_url(tab: str | None = None) -> str:
    """Mini App manzili; tab berilsa ilova o'sha bo'limda ochiladi (masalan ?tab=reyting)."""
    if not tab:
        return WEBAPP_URL
    return WEBAPP_URL + ("&" if "?" in WEBAPP_URL else "?") + "tab=" + tab


def open_app_keyboard(text: str = "📿 Zikrni boshlash", tab: str | None = None) -> InlineKeyboardMarkup:
    """Faqat shaxsiy chatda ishlaydi — Telegram web_app tugmalarini guruhda ko'rsatmaydi."""
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=text, web_app=WebAppInfo(url=app_url(tab)))]])


def link_app_keyboard(text: str, tab: str) -> InlineKeyboardMarkup:
    """Guruhlar uchun: botga o'tkazadi, bot esa ilovani kerakli bo'limda ochadigan tugma beradi."""
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=text, url=f"https://t.me/{BOT_USERNAME}?start=app_{tab}")]])


def team_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="➕ Qo'shilish", callback_data="team:join"),
        InlineKeyboardButton(text="📊 Reyting", callback_data="team:board"),
    ]])


def team_text(title: str | None, n: int) -> str:
    return (
        f"👥 <b>{html.escape(title or 'Jamoa')}</b> jamoasi\n\n"
        f"A'zolar: <b>{n}</b>\n\n"
        "«Qo'shilish»ni bosing — ilovadagi Nur natijangiz jamoa reytingiga qo'shiladi. "
        "Reytingga faqat haftalik umumiy Nur chiqadi, har dushanba hisob yangidan boshlanadi."
    )


# ---------- namoz vaqti ----------
def city_times(city_key: str) -> tuple[str, dict[str, str]] | None:
    """Shahar → (nomi, bugungi 6 vaqt). Hisob vaqt.py da — internet kerak emas."""
    c = CITIES.get(city_key)
    if not c:
        return None
    name, lng = c
    return name, vaqt.times(datetime.now(TZ).date(), lng)


# ---------- handlerlar ----------
@router.message(CommandStart())
async def cmd_start(message: Message, command: CommandObject) -> None:
    user = message.from_user
    name = user.first_name if user else "do'stim"
    USERS.setdefault(str(message.chat.id), {"remind": False, "name": name})
    save_users(USERS)
    if user:
        db.ensure_user(user.id, name)
    if message.chat.type != "private":
        # Guruhda web_app tugmalarini Telegram qabul qilmaydi — botga havola beramiz
        await message.answer(
            "Assalomu alaykum! 🕌 Ilovani shaxsiy chatda oching.\n"
            "Bu guruhni jamoaga aylantirish uchun <code>/jamoa</code> yozing.",
            parse_mode="HTML",
        )
        return
    arg = (command.args or "").strip() if command else ""
    if arg.startswith("app_"):  # guruhdagi havoladan: ilovani kerakli bo'limda ochish
        await message.answer("Ilovani ochish 👇", reply_markup=open_app_keyboard("📊 Reytingni ochish", arg[4:] or None))
        return
    if arg.startswith("file_"):  # ilovadagi material kartochkasi
        await send_material(message, arg[5:])
        return
    if arg.startswith("f_") and user:  # do'st taklifi: https://t.me/BOT?start=f_123456
        await accept_friend(message, user, arg[2:])
    await message.answer(
        f"Assalomu alaykum, {name}! 🕌\n\n"
        "Bu ilova orqali:\n"
        "🧎 <b>Bomdod namozini</b> qadam-baqadam o'rganasiz (erkak/ayol)\n"
        "📿 <b>Tongi va tungi zikrlarni</b> hisoblagich bilan o'qiysiz\n"
        "🌱 <b>30 kunlik dastur</b> bilan zikr odatini shakllantirasiz\n"
        "🔤 <b>Arab alifbosini</b> o'rganib, Qur'on o'qishni boshlaysiz\n"
        "🗓️ <b>Qazo namozlaringizni</b> hisoblab borasiz\n"
        "📊 <b>Nur</b> to'plab, oila va do'stlar bilan yaxshilikda musobaqalashasiz\n\n"
        "Boshlash uchun pastdagi <b>«Ilovani ochish»</b> tugmasini bosing 👇",
        reply_markup=main_keyboard(),
        parse_mode="HTML",
    )


@router.message(Command("help"))
@router.message(F.text == "ℹ️ Yordam")
async def cmd_help(message: Message) -> None:
    if message.chat.type != "private":
        await message.answer(
            "Buyruqlar: <code>/vaqt</code> — bomdod vaqti, <code>/jamoa</code> — guruhni jamoaga aylantirish, "
            "<code>/reyting</code> — jamoa reytingi.",
            parse_mode="HTML",
        )
        return
    await message.answer(
        "<b>Buyruqlar:</b>\n"
        "/start — boshlash\n"
        "/app — ilovani ochish\n"
        "/vaqt — Toshkent uchun bomdod vaqti\n"
        "/vaqt Samarqand — boshqa shahar uchun\n"
        "/eslatma — tongi va tungi zikr eslatmalarini yoqish/o'chirish\n"
        "/reyting — bu haftalik Nur natijangiz va o'rningiz\n"
        "/jamoa — guruhda yozilsa, guruh jamoaga aylanadi (haftalik musobaqa)\n"
        "/id — Telegram ID ingiz (admin qilish uchun)\n"
        "/backup — bazaning nusxasi (faqat admin)\n"
        "/stat — foydalanuvchi statistikasi (faqat admin)\n\n"
        "Bo'limni tanlang:",
        reply_markup=sections_keyboard(),
        parse_mode="HTML",
    )


@router.message(Command("app"))
async def cmd_app(message: Message) -> None:
    if message.chat.type != "private":
        await message.answer("Ilovani shaxsiy chatda oching 👇", reply_markup=link_app_keyboard("🕌 Ilovani ochish", "home"))
        return
    await message.answer("Bo'limni tanlang 👇", reply_markup=sections_keyboard())


@router.message(Command("vaqt"))
@router.message(F.text == "🕐 Bomdod vaqti")
async def cmd_vaqt(message: Message) -> None:
    parts = (message.text or "").split(maxsplit=1)
    city = parts[1].strip().lower() if len(parts) > 1 and not parts[0].startswith("🕐") else "toshkent"
    res = city_times(city)
    if not res:
        cities = ", ".join(v[0] for k, v in CITIES.items() if k != "fargona")
        await message.answer(
            f"«{city.capitalize()}» shahri topilmadi.\n\n"
            f"Mavjud shaharlar: {cities}\n\nMasalan: <code>/vaqt Buxoro</code>",
            parse_mode="HTML",
        )
        return
    name, t = res
    today = datetime.now(TZ).strftime("%d.%m.%Y")
    await message.answer(
        f"📍 <b>{name}</b> — {today}\n\n"
        f"🌙 Bomdod: <b>{t['bomdod']}</b>\n"
        f"🌅 Quyosh chiqishi: <b>{t['quyosh']}</b>\n"
        f"☀️ Peshin: <b>{t['peshin']}</b>\n"
        f"🌤 Asr: <b>{t['asr']}</b>\n"
        f"🌆 Shom: <b>{t['shom']}</b>\n"
        f"🌙 Xufton: <b>{t['xufton']}</b>\n\n"
        "<i>O'zbekiston musulmonlari idorasi usuli, Hanafiy mazhabi.</i>",
        parse_mode="HTML",
    )


@router.message(Command("eslatma"))
@router.message(F.text == "🔔 Eslatma")
async def cmd_eslatma(message: Message) -> None:
    u = USERS.setdefault(str(message.chat.id), {"remind": False})
    on = u.get("remind", False)
    await message.answer(
        "🔔 <b>Zikr eslatmalari</b>\n\n"
        f"Holat: <b>{'yoqilgan ✅' if on else 'o‘chirilgan'}</b>\n\n"
        f"Yoqilsa har kuni soat <b>{MORNING_HOUR:02d}:00</b> da tongi zikr va "
        f"<b>{EVENING_HOUR:02d}:00</b> da tungi zikr uchun eslatma keladi (Toshkent vaqti).\n"
        "Odat shakllantirishda eng muhim narsa — har kuni bir xil vaqtda eslatish.",
        reply_markup=remind_keyboard(on),
        parse_mode="HTML",
    )


@router.callback_query(F.data.startswith("remind:"))
async def cb_remind(query: CallbackQuery) -> None:
    on = query.data == "remind:on"
    u = USERS.setdefault(str(query.message.chat.id), {})
    u["remind"] = on
    save_users(USERS)
    await query.message.edit_reply_markup(reply_markup=remind_keyboard(on))
    await query.answer("Eslatma yoqildi ✅" if on else "Eslatma o'chirildi")



# ---------- reyting / jamoa / do'stlar ----------
async def accept_friend(message: Message, user, inviter_raw: str) -> None:
    """Do'st taklifi havolasi (/start f_ID) bosilganda — ikki tomonlama do'stlik."""
    try:
        inviter = int(inviter_raw)
    except ValueError:
        return
    if inviter == user.id:
        await message.answer("Bu sizning o'z taklif havolangiz 🙂 Uni do'stingizga yuboring.")
        return
    inv = db.get_user(inviter)
    if inv is None:
        await message.answer("Taklif havolasi noto'g'ri yoki eskirgan.")
        return
    inv_name = html.escape((inv["name"] or "").strip() or "Do'stingiz")
    if not db.add_friend(inviter, user.id):
        await message.answer(f"Siz {inv_name} bilan allaqachon do'stsiz ✅", parse_mode="HTML")
        return
    await message.answer(
        f"🤝 <b>{inv_name}</b> bilan do'st bo'ldingiz — endi Reytingda bir-biringizni ko'rasiz.",
        reply_markup=open_app_keyboard("📊 Reytingni ochish", "reyting"),
        parse_mode="HTML",
    )
    accepted = html.escape(user.first_name or "Do'stingiz")
    try:
        await message.bot.send_message(
            inviter,
            f"🎉 <b>{accepted}</b> taklifingizni qabul qildi — endi do'stlar reytingida birgasiz!",
            reply_markup=open_app_keyboard("📊 Reytingni ochish", "reyting"),
            parse_mode="HTML",
        )
    except Exception as e:  # noqa: BLE001
        logging.warning("Taklif qiluvchiga xabar yuborilmadi %s: %s", inviter, e)


@router.message(Command("reyting"))
@router.message(F.text == "📊 Reyting")
async def cmd_reyting(message: Message) -> None:
    user = message.from_user
    if not user:
        return
    today = datetime.now(TZ).date()
    if message.chat.type in ("group", "supergroup"):
        await send_team_board(message, today, user.id)
        return
    db.ensure_user(user.id, user.first_name or "")
    total = db.user_total(user.id)
    b = db.board("liga", user.id, today, limit=0)
    me = b["me"]
    if not total and not me["nur"]:
        await message.answer(
            "Hali natija yo'q. Ilovada zikr, tasbih yoki dars qiling — Nur to'planadi va reytingga qo'shilasiz 🌱",
            reply_markup=open_app_keyboard("📊 Reytingni ochish", "reyting"),
        )
        return
    lines = [
        f"📊 <b>Bu hafta:</b> {me['nur']} Nur",
        f"🏅 {b['title']}: " + (f"<b>{me['rank']}-o'rin</b> / {b['size']}" if me["rank"] else "hali o'rin yo'q — bugun boshlang"),
        f"✨ Jami: {total} Nur · {db.level_name(db.level_index(total))} darajasi",
    ]
    for t in db.user_teams(user.id):
        tb = db.board("team", user.id, today, t["id"], limit=0)
        if tb["me"] and tb["me"]["rank"]:
            lines.append(f"👥 {html.escape(t['title'])}: <b>{tb['me']['rank']}-o'rin</b> / {tb['size']}")
    await message.answer("\n".join(lines), reply_markup=open_app_keyboard("📊 Reytingni ochish", "reyting"), parse_mode="HTML")



# ---------- materiallar (admin PDF va boshqa fayllarni yuklaydi) ----------
@router.message(F.document, F.chat.type == "private")
async def on_admin_document(message: Message) -> None:
    """Admin botga fayl yuborsa — qaysi bo'limga qo'shishni so'raymiz."""
    user = message.from_user
    if not user or user.id not in ADMIN_IDS:
        await message.answer("Fayllarni faqat adminlar qo'sha oladi.")
        return
    doc = message.document
    name = doc.file_name or "Material"
    title = (message.caption or name.rsplit(".", 1)[0]).strip()[:80]
    kind = (name.rsplit(".", 1)[-1] if "." in name else "fayl").lower()[:12]
    _pending_files[user.id] = (doc.file_id, title, kind, doc.file_size or 0)
    rows = [
        [InlineKeyboardButton(text=t, callback_data=f"file:{k}")]
        for k, t in SECTIONS.items()
    ]
    await message.answer(
        f"📎 <b>{html.escape(title)}</b>\n"
        f"{kind.upper()} · {(doc.file_size or 0) // 1024} KB\n\n"
        "Qaysi bo'limga qo'shilsin?",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows),
        parse_mode="HTML",
    )


@router.callback_query(F.data.startswith("file:"))
async def cb_file_section(query: CallbackQuery) -> None:
    uid = query.from_user.id
    if uid not in ADMIN_IDS:
        await query.answer("Ruxsat yo'q")
        return
    pending = _pending_files.pop(uid, None)
    if pending is None:
        await query.answer("Fayl topilmadi — qaytadan yuboring")
        return
    section = query.data.split(":", 1)[1]
    if section not in SECTIONS:
        section = "boshqa"
    file_id, title, kind, size = pending
    fid = db.add_file(section, title, file_id, kind, size)
    if query.message:
        await query.message.edit_text(
            f"✅ <b>{html.escape(title)}</b> qo'shildi\n\n"
            f"Bo'lim: <b>{html.escape(SECTIONS[section])}</b>\n"
            f"Ilovada shu bo'limda «Materiallar» sifatida ko'rinadi (#{fid}).",
            parse_mode="HTML",
        )
    await query.answer("Qo'shildi ✅")


async def send_material(message: Message, fid_raw: str) -> None:
    """Ilovadagi material kartochkasi bosilganda: /start file_N → faylni yuboramiz."""
    try:
        row = db.get_file(int(fid_raw))
    except ValueError:
        row = None
    if row is None:
        await message.answer("Bu material topilmadi — ehtimol o'chirilgan.")
        return
    try:
        await message.answer_document(row["file_id"], caption=f"📎 {html.escape(row['title'])}", parse_mode="HTML")
    except Exception as e:  # noqa: BLE001
        logging.warning("Material yuborilmadi %s: %s", fid_raw, e)
        await message.answer("Faylni yuborib bo'lmadi. Keyinroq urinib ko'ring.")


# ---------- baza zaxirasi (bepul: fayl adminning Telegram'iga yuboriladi) ----------
async def send_backup(bot: Bot, chat_id: int) -> bool:
    tmp = db.DATA_DIR / "reyting-backup.db"
    try:
        db.backup_to(tmp)
        size = tmp.stat().st_size
        stamp = datetime.now(TZ).strftime("%Y-%m-%d %H:%M")
        await bot.send_document(
            chat_id, FSInputFile(tmp, filename=f"reyting-{stamp[:10]}.db"),
            caption=f"🗄 Baza zaxirasi — {stamp} · {size // 1024} KB\nTiklash: faylni serverdagi DATA_DIR/reyting.db o'rniga qo'ying.",
        )
        return True
    except Exception as e:  # noqa: BLE001
        logging.warning("Zaxira yuborilmadi %s: %s", chat_id, e)
        return False
    finally:
        try:
            tmp.unlink(missing_ok=True)
        except Exception:  # noqa: BLE001
            pass


async def weekly_backup(bot: Bot) -> None:
    for admin_id in sorted(ADMIN_IDS):
        if await send_backup(bot, admin_id):
            break  # bittasiga yetsa kifoya


# ---------- admin statistikasi ----------
BLOCKS = "▁▂▃▄▅▆▇█"
WEEKDAYS_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"]


def spark(values: list[int]) -> str:
    """Kichik ustunli grafik — Telegram xabarida ko'rinadi."""
    top = max(values) or 1
    return "".join(BLOCKS[min(len(BLOCKS) - 1, v * (len(BLOCKS) - 1) // top)] for v in values)


@router.message(Command("stat"))
async def cmd_stat(message: Message) -> None:
    """Adminlar uchun: nechta foydalanuvchi bor va qanchasi kunlik faol."""
    user = message.from_user
    if not user or user.id not in ADMIN_IDS:
        await message.answer("Bu buyruq faqat adminlar uchun.")
        return
    today = datetime.now(TZ).date()
    s = db.stats(today)
    total = s["users"] or 1
    pct = lambda n: f"{n * 100 // total}%"  # noqa: E731

    peak = max((n for _, n in s["chart"]), default=0) or 1
    bar = lambda n: ("█" * max(1, n * 12 // peak)) if n else "·"  # noqa: E731
    chart = "\n".join(
        f"   {WEEKDAYS_SHORT[d.weekday()]}  {bar(n)}  {n}" for d, n in s["chart"]
    )
    avg = (s["nur_today"] // s["dau"]) if s["dau"] else 0
    reminders = sum(1 for u in USERS.values() if u.get("remind"))

    # Disk holati. "vaqtinchalik" chiqsa — Volume ulanmagan va baza har deploy'da o'chadi.
    since = db.data_since()
    if db.DATA_DIR_PERSISTENT and since:
        days_up = (int(datetime.now(TZ).timestamp()) - since) // 86400
        disk = f"doimiy · {days_up} kundan beri" if days_up else "doimiy · bugundan"
    elif db.DATA_DIR_PERSISTENT:
        disk = "doimiy"
    else:
        disk = "⚠️ VAQTINCHALIK — har deploy'da o'chadi"

    week_spark = spark([n for _, n in s["chart"]])
    lines = [
        f"📊 <b>Statistika</b> — {today.strftime('%d.%m.%Y')}",
        "",
        "👥 <b>Foydalanuvchilar</b>",
        f"   Jami: <b>{s['users']}</b>",
        f"   Bugun faol: <b>{s['dau']}</b> ({pct(s['dau'])})",
        f"   Haftalik faol: <b>{s['wau']}</b> ({pct(s['wau'])})",
        f"   Har kuni (7/7): <b>{s['loyal']}</b>",
        f"   Yangi: bugun {s['new_today']}, haftada {s['new_week']}",
        "",
        f"📈 <b>Oxirgi 7 kun</b>  {week_spark}",
        chart,
        "",
        "✨ <b>Nur</b>",
        f"   Bugun: {s['nur_today']:,}",
        f"   Bu hafta: {s['nur_week']:,}",
        f"   O'rtacha: {avg} Nur/kishi",
        "",
        f"🤝 Jamoalar: {s['teams']} ({s['team_members']} a'zo) · Do'stlik: {s['friend_pairs']}",
        f"🔔 Eslatma yoqganlar: {reminders}",
        f"🎬 Videolar: {s['videos']} · Kitoblar: {s['files']}",
        f"🗄 Baza: {s['db_kb']} KB · {disk}",
    ]
    await message.answer("\n".join(lines), parse_mode="HTML")


@router.message(Command("backup"))
async def cmd_backup(message: Message) -> None:
    """Admin uchun: bazaning nusxasini hoziroq yuboradi."""
    user = message.from_user
    if not user or user.id not in ADMIN_IDS:
        await message.answer("Bu buyruq faqat adminlar uchun.")
        return
    if not await send_backup(message.bot, message.chat.id):
        await message.answer("Zaxira nusxasini yuborib bo'lmadi — loglarga qarang.")


@router.message(Command("id"))
async def cmd_id(message: Message) -> None:
    """Admin qilish uchun kerak: shu ID ni .env dagi ADMIN_IDS ga yozasiz."""
    user = message.from_user
    if not user:
        return
    mark = " — siz adminsiz ✅" if user.id in ADMIN_IDS else ""
    await message.answer(
        f"Sizning Telegram ID ingiz: <code>{user.id}</code>{mark}\n\n"
        "Admin qilish uchun bu raqamni serverdagi <code>.env</code> faylining "
        "<code>ADMIN_IDS</code> qatoriga qo'shing va botni qayta ishga tushiring.",
        parse_mode="HTML",
    )


@router.message(Command("jamoa"))
async def cmd_jamoa(message: Message) -> None:
    if message.chat.type not in ("group", "supergroup"):
        await message.answer(
            "👥 <b>Jamoa</b> — oila yoki do'stlar guruhi bilan haftalik musobaqa.\n\n"
            "1. Botni Telegram guruhingizga qo'shing\n"
            "2. Guruhda <code>/jamoa</code> yozing\n"
            "3. A'zolar «Qo'shilish» tugmasini bosadi\n\n"
            "Shundan so'ng ilovaning Reyting bo'limida guruh jadvali paydo bo'ladi.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
                InlineKeyboardButton(text="➕ Botni guruhga qo'shish", url=f"https://t.me/{BOT_USERNAME}?startgroup=jamoa")
            ]]),
            parse_mode="HTML",
        )
        return
    db.create_team(message.chat.id, message.chat.title or "Jamoa")
    if message.from_user:
        db.ensure_user(message.from_user.id, message.from_user.first_name or "")
        db.add_member(message.chat.id, message.from_user.id)
    n = len(db.team_members(message.chat.id))
    await message.answer(team_text(message.chat.title, n), reply_markup=team_keyboard(), parse_mode="HTML")


@router.callback_query(F.data == "team:join")
async def cb_team_join(query: CallbackQuery) -> None:
    chat = query.message.chat if query.message else None
    if chat is None or chat.type not in ("group", "supergroup"):
        await query.answer("Bu tugma faqat guruhda ishlaydi")
        return
    db.create_team(chat.id, chat.title or "Jamoa")
    db.ensure_user(query.from_user.id, query.from_user.first_name or "")
    new = db.add_member(chat.id, query.from_user.id)
    if new:
        try:
            await query.message.edit_text(team_text(chat.title, len(db.team_members(chat.id))), reply_markup=team_keyboard(), parse_mode="HTML")
        except Exception:  # noqa: BLE001
            pass
    await query.answer("Jamoaga qo'shildingiz ✅" if new else "Siz allaqachon jamoadasiz")


@router.callback_query(F.data == "team:board")
async def cb_team_board(query: CallbackQuery) -> None:
    if query.message:
        await send_team_board(query.message, datetime.now(TZ).date(), query.from_user.id)
    await query.answer()


async def send_team_board(message: Message, today, uid: int) -> None:
    """Guruhga jamoa reytingini yuboradi (TOP-10 + so'ragan kishining o'rni)."""
    chat_id = message.chat.id
    if not db.team_title(chat_id):
        await message.answer("Bu guruh hali jamoa emas — <code>/jamoa</code> yozing.", parse_mode="HTML")
        return
    b = db.board("team", uid, today, chat_id, limit=10, require_member=False)
    if not b["rows"]:
        await message.answer("Jamoada hali a'zo yo'q — «Qo'shilish» tugmasini bosing.", reply_markup=team_keyboard())
        return
    medals = {1: "🥇", 2: "🥈", 3: "🥉"}
    lines = [f"👥 <b>{html.escape(b['title'])}</b> — bu hafta", ""]
    for r in b["rows"]:
        lines.append(f"{medals.get(r['rank'], str(r['rank']) + '.')} {html.escape(r['name'])} — <b>{r['nur']}</b>")
    me = b["me"]
    if me and me["rank"] and me["rank"] > len(b["rows"]):
        lines += ["…", f"{me['rank']}. {html.escape(me['name'])} — <b>{me['nur']}</b>"]
    lines += ["", f"Jami {b['size']} a'zo · reyting har dushanba yangilanadi"]
    await message.answer("\n".join(lines), reply_markup=link_app_keyboard("📊 Ilovada ko'rish", "reyting"), parse_mode="HTML")


@router.message(F.web_app_data)
async def on_webapp_data(message: Message) -> None:
    await message.answer(f"Ilovadan ma'lumot keldi: <code>{message.web_app_data.data}</code>", parse_mode="HTML")


@router.message(F.chat.type == "private")
async def fallback(message: Message) -> None:
    """Faqat shaxsiy chatda — guruhlarda bot begona xabarlarga javob bermaydi."""
    await message.answer("Tushunmadim 🙂 Pastdagi tugmalardan foydalaning.", reply_markup=main_keyboard())


# ---------- eslatmalar ----------
async def send_reminders(bot: Bot, kind: str) -> None:
    day = datetime.now(TZ).timetuple().tm_yday
    if kind == "tong":
        title, tip = MORNING_TIPS[day % len(MORNING_TIPS)]
        text = (
            "🌅 <b>Xayrli tong!</b> Tongi zikrlar vaqti.\n\n"
            f"Bugungi zikr: <b>{title}</b>\n<i>{tip}</i>\n\n"
            "Ilovada hisoblagich bilan o'qing va odat zanjirini uzmang 🔥"
        )
    else:
        title, tip = EVENING_TIPS[day % len(EVENING_TIPS)]
        text = (
            "🌙 <b>Xayrli kech!</b> Tungi zikrlar vaqti.\n\n"
            f"Bugungi zikr: <b>{title}</b>\n<i>{tip}</i>\n\n"
            "5 daqiqa ajrating — bugungi vazifani yakunlang ✅"
        )
    sent = 0
    for chat_id, u in list(USERS.items()):
        if not u.get("remind"):
            continue
        try:
            await bot.send_message(int(chat_id), text, reply_markup=open_app_keyboard(), parse_mode="HTML")
            sent += 1
            await asyncio.sleep(0.05)  # Telegram limitiga rioya
        except Exception as e:  # noqa: BLE001
            logging.warning("Eslatma yuborilmadi %s: %s", chat_id, e)
            if "blocked" in str(e).lower() or "chat not found" in str(e).lower():
                u["remind"] = False
    save_users(USERS)
    logging.info("%s eslatmasi %d kishiga yuborildi", kind, sent)



async def send_weekly(bot: Bot) -> None:
    """Yakshanba kechqurun: shu hafta faol bo'lganlarga natija va o'rin."""
    today = datetime.now(TZ).date()
    mon, sun = db.week_range(today)
    sent = 0
    for uid in db.active_users(mon, sun):
        b = db.board("liga", uid, today, limit=0)
        me = b["me"]
        lines = ["📊 <b>Hafta yakuni</b>", "", f"Bu hafta <b>{me['nur']} Nur</b> to'pladingiz."]
        if me["rank"]:
            lines.append(f"🏅 {b['title']}: <b>{me['rank']}-o'rin</b> / {b['size']}")
        for t in db.user_teams(uid):
            tb = db.board("team", uid, today, t["id"], limit=0)
            if tb["me"] and tb["me"]["rank"]:
                lines.append(f"👥 {html.escape(t['title'])}: <b>{tb['me']['rank']}-o'rin</b> / {tb['size']}")
        lines += ["", "Ertaga yangi hafta — hisob nolga tushadi. Bismillah! 🌱"]
        try:
            await bot.send_message(uid, "\n".join(lines), reply_markup=open_app_keyboard("📊 Reytingni ochish", "reyting"), parse_mode="HTML")
            sent += 1
            await asyncio.sleep(0.05)
        except Exception as e:  # noqa: BLE001
            logging.warning("Haftalik xulosa yuborilmadi %s: %s", uid, e)
    logging.info("Haftalik xulosa %d kishiga yuborildi", sent)


# ---------- ishga tushirish ----------
async def main() -> None:
    global BOT_USERNAME
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(router)

    me = await bot.get_me()
    BOT_USERNAME = me.username or ""
    await bot.set_chat_menu_button(menu_button=MenuButtonWebApp(text="Ilova", web_app=WebAppInfo(url=WEBAPP_URL)))
    await bot.set_my_commands([
        BotCommand(command="start", description="Boshlash"),
        BotCommand(command="app", description="Ilovani ochish"),
        BotCommand(command="reyting", description="Haftalik Nur natijam"),
        BotCommand(command="jamoa", description="Guruhni jamoaga aylantirish"),
        BotCommand(command="vaqt", description="Bomdod vaqti"),
        BotCommand(command="eslatma", description="Zikr eslatmalari"),
        BotCommand(command="id", description="Telegram ID im"),
        BotCommand(command="stat", description="Statistika (admin)"),
        BotCommand(command="help", description="Yordam"),
    ])

    # Reyting API — Mini App shu yerga murojaat qiladi (webapp/data.js → apiUrl). Bot bilan bir jarayonda.
    runner = web.AppRunner(api.create_app(BOT_TOKEN, BOT_USERNAME, WEBAPP_URL, TZ, ADMIN_IDS))
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", API_PORT).start()

    scheduler = AsyncIOScheduler(timezone=TZ)
    scheduler.add_job(send_reminders, CronTrigger(hour=MORNING_HOUR, minute=0), args=[bot, "tong"])
    scheduler.add_job(send_reminders, CronTrigger(hour=EVENING_HOUR, minute=0), args=[bot, "tun"])
    scheduler.add_job(send_weekly, CronTrigger(day_of_week="sun", hour=WEEKLY_HOUR, minute=0), args=[bot])
    if BACKUP_DAY and ADMIN_IDS:
        scheduler.add_job(weekly_backup, CronTrigger(day_of_week=BACKUP_DAY, hour=3, minute=0), args=[bot])
    scheduler.start()

    logging.info(
        "Bot @%s ishga tushdi. WebApp: %s | API port: %d | ma'lumotlar: %s | eslatmalar: %02d:00 va %02d:00 | haftalik xulosa: yak %02d:00",
        BOT_USERNAME, WEBAPP_URL, API_PORT, db.DATA_DIR, MORNING_HOUR, EVENING_HOUR, WEEKLY_HOUR,
    )
    try:
        await dp.start_polling(bot)
    finally:
        await runner.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
