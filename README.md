# 🕌 Bomdod namozi — Telegram Mini App

Bomdod namozini erkaklar va ayollar uchun qadam-baqadam o'rgatadigan Telegram bot + Mini App.

## Loyiha tuzilishi

```
bomdodnamozappbot/
├── webapp/               ← Mini App (oddiy HTML/CSS/JS, hech qanday build kerak emas)
│   ├── index.html
│   ├── styles.css
│   ├── app.js            ← yadro: tablar, namoz qadamlari, suralar, video, vaqt
│   ├── store.js          ← saqlash: Telegram CloudStorage + localStorage
│   ├── vaqt.js           ← namoz vaqtlari hisoblagichi (Muftiyat usuli, internetsiz)
│   ├── zikr.js           ← tong/tun zikrlari, tasbih, 30 kunlik odat dasturi
│   ├── arabic.js         ← arab tili darslari va testlar
│   ├── qazo.js           ← qazo namozlar hisobi
│   ├── nur.js            ← Nur ballari, darajalar, nishonlar (serversiz ishlaydi)
│   ├── api.js            ← reyting serveri bilan aloqa (apiUrl bo'sh bo'lsa — o'chiq)
│   ├── reyting.js        ← Reyting ekrani: natijalarim, liga, jamoa, do'stlar
│   ├── video.js          ← Video darslar: bo'limlar, pleyer va admin paneli
│   ├── data.js           ← KONTENT: suralar, duolar, qadamlar, videolar, materiallar, shaharlar
│   ├── files/            ← ilova bilan birga tarqaladigan materiallar
│   │   └── muallim_soniy.pdf   ← «Muallim soniy» darsligi (44 bet)
│   ├── data_zikr.js      ← KONTENT: tong/tun zikrlari, tasbih, odat dasturi haftalari
│   └── data_arabic.js    ← KONTENT: 28 harf, 11 ta dars
├── bot/                  ← Telegram bot (Python, aiogram 3)
│   ├── bot.py
│   ├── api.py            ← Mini App uchun HTTP API (bot bilan bir jarayonda)
│   ├── db.py             ← SQLite: foydalanuvchilar, kunlik Nur, jamoalar, videolar, materiallar
│   ├── vaqt.py           ← namoz vaqtlari — vaqt.js bilan bir xil algoritm (/vaqt uchun)
│   ├── requirements.txt
│   └── .env.example
└── README.md
```

## Mini App imkoniyatlari

- Bosh sahifada erkak / ayol tanlanadi (keyin eslab qoladi, chip orqali almashtirish mumkin)
- **Namoz qadam-baqadam**: 13 ta qadam, har birida erkak va ayol uchun farqlar alohida; sunnat / farz niyati
- **Zikrlar**
  - 🌅 Tong (14 ta) va 🌙 Tun (15 ta) zikrlari — har biri hisoblagich bilan: bosib sanaysiz, sanoq to'lganda avtomatik keyingisiga o'tadi
  - 📿 Tasbih — 8 xil zikr, katta tugma, kunlik natijalar
  - 🌱 **30 kunlik odat dasturi** — 4 hafta, yuk sekin oshadi (1-hafta: 3 ta zikr + 33 tasbih … 4-hafta: to'liq). Kunlik vazifalar avtomatik belgilanadi, 🔥 streak, 30 kunlik nuqtali xarita
- **Arab tili** — 28 harf (4 shakli, misol so'z bilan), 11 ta dars: alifbo → harakatlar → tanvin → sukun/shadda → madd → quyoshiy/oyiy harflar → Fotiha, Ixlos, Kavsarni o'qish mashqi. Har darsda test, 80%+ bo'lsa keyingi dars ochiladi
- **Qazo namozlar** — 6 namoz bo'yicha hisob (+/−), yil/oy/kun bo'yicha hisoblash yordamchisi, kunlik reja va "qachon tugaydi" prognozi, qazo niyati matni
- **Suralar va duolar**: arabcha (oyat raqamlari bilan), lotincha o'qilishi, ma'nosi; A+/A− shrift
- **Video darslar** — 11 ta bo'lim (tahorat, bomdoddan xuftongacha, juma, nafl, arab tili, zikr…).
  Kichik rasmli ro'yxat, video pleyerda ochiladi. Har video «hammaga / erkaklar / ayollar» deb belgilanadi.
  Playlist ham qo'shiladi — bitta **kurs** sifatida yoki darslarga yoyib. Arab tili bo'limida
  **«Muallimi soniy» (18 ta dars, arabicuz kanali)** allaqachon qo'shilgan
- **Materiallar** — PDF kitoblar. Arab tili bo'limida **«Muallim soniy» darsligi (44 bet)** bor —
  video darslar shu kitob bo'yicha o'tilgan. Yangi kitobni botga yuklab ham qo'shsa bo'ladi
- **Ketma-ket darslar** — arab tili bo'limida darslar zanjir bo'lib ochiladi: har birini oxirigacha
  ko'rmaguningizcha keyingisi qulflangan turadi. Ko'rilgan foiz YouTube pleyeridan o'qiladi
- **Video dars + darslik birlashmasi** — har bir video tagida o'sha darsda o'rgatiladigan harflar
  (4 shakli bilan) va 3 ta misol so'z chiqadi; dars tugaganda arab tili darslari bilan bir xil Nur beriladi
- **Namoz vaqtlari** — 6 ta vaqt va hijriy sana. **GPS** bo'yicha yoki 13 ta shahardan. Ilovaning o'zida,
  O'zbekiston musulmonlari idorasi usuli bilan hisoblanadi — internet kerak emas, rasmiy taqvim bilan 99.7% mos
- **Reyting (Nur)** — zikr, tasbih, qazo, dars va kunlik vazifalar uchun ball; daraja (Sham → Chiroq → Mash'al → Yulduz → Oy → Quyosh), 12 ta nishon, haftalik ustunli grafik.
  Musobaqa: **liga** (bir darajadagilar), **jamoa** (Telegram guruhi), **do'stlar**. Har dushanba hisob nolga tushadi
- Progress **Telegram CloudStorage**'da saqlanadi — foydalanuvchining barcha qurilmalarida sinxron; brauzerda test qilganda localStorage ishlaydi
- Telegram mavzusiga (dark/light) moslashadi, orqaga tugmasi, haptic, tasdiqlash dialoglari

## Bot imkoniyatlari

- `/start` — tanishuv, «Ilovani ochish» tugmasi
- `/vaqt [shahar]` — bugungi 6 ta namoz vaqti (ilova bilan bir xil hisob, `vaqt.py`)
- `/eslatma` — **tong (06:00) va tun (18:00) zikri eslatmalarini** yoqish/o'chirish. Har kuni boshqa zikr matni bilan keladi, ilovani ochish tugmasi bilan. Vaqtlarni `.env` da `MORNING_HOUR` / `EVENING_HOUR` orqali o'zgartirasiz
- Eslatma yoqqan foydalanuvchilar `bot/users.json` da saqlanadi (git'ga qo'shilmaydi)
- `/reyting` — haftalik Nur natijasi va o'rin; guruhda yozilsa — jamoa jadvali
- `/jamoa` — guruhda yozilsa, guruh **jamoaga** aylanadi (a'zolar bir tugma bilan qo'shiladi)
- Yakshanba kuni **haftalik xulosa** yuboriladi (`WEEKLY_HOUR`)
- Reyting API (`api.py`) bot bilan bir jarayonda `API_PORT` da ishlaydi; `db.py` — SQLite (`bot/reyting.db`)

## Video darslar va admin paneli

Videolar **bo'limlarga** ajratilgan. Bo'limlar ro'yxati `webapp/data.js` dagi `videoSections` da —
tahorat, bomdod, peshin, asr, shom, xufton, juma, nafl, arab tili, zikr, boshqa. Bo'lim qo'shish yoki
nomini o'zgartirish uchun shu ro'yxatni tahrirlaysiz.

Videoni **ikki yo'l bilan** qo'shish mumkin:

### 1. Admin paneli orqali (tavsiya etiladi)

Server ulangan bo'lsa, videolarni to'g'ridan-to'g'ri ilovadan qo'shasiz — qayta deploy qilish shart emas.

1. Botga `/id` yozing — Telegram ID ingizni beradi
2. Serverdagi `.env` faylida `ADMIN_IDS=` qatoriga o'sha raqamni yozing (bir nechta bo'lsa vergul bilan)
3. Botni qayta ishga tushiring
4. Ilovada **Video darslar** bo'limini oching — «Video qo'shish» tugmasi paydo bo'ladi

Formada YouTube havolasini joylashtirasiz (`youtu.be/…`, `watch?v=…`, `shorts/…` — hammasi tushuniladi),
**sarlavha avtomatik to'ladi**, bo'lim va «kim uchun» ni tanlaysiz. Qo'shilgan videolarni o'sha yerda
tahrirlash, tartibini o'zgartirish (↑ ↓) va o'chirish mumkin. O'zgarish barcha foydalanuvchilarga darhol yetadi.

> Admin huquqini **server tekshiradi**. Ilovadagi tugmalar shunchaki interfeys — `ADMIN_IDS` da yo'q odam
> so'rov yuborsa ham server rad etadi.

### 2. Kodga qo'lda yozish (serversiz)

`webapp/data.js` dagi `videos` ro'yxatiga qo'shasiz:

```js
videos: [
  { section: "bomdod", title: "Bomdod namozi — to'liq ko'rsatma", youtubeId: "AbCdEfGhIjK", duration: "12:40", gender: "hamma" },
  { section: "tahorat", title: "Tahorat olish (ayollar)", youtubeId: "XyZ12345678", duration: "5:05", gender: "ayol" },
],
```

`youtubeId` — havoladagi `v=` dan keyingi 11 belgi. `gender`: `hamma` | `erkak` | `ayol`.
Bu usulda har o'zgarishdan keyin Mini App ni qayta joylash kerak.

Ikkala manba **birlashtirilib** ko'rsatiladi. Server ulangan bo'lsa ro'yxat keshlanadi — internetsiz ham ochiladi.


### Ketma-ket darslar (zanjir)

Bo'limga `sequential: true` qo'ysangiz, darslar **ketma-ket** ochiladi — oldingisi to'liq
ko'rilmaguncha keyingisi qulflangan turadi:

```js
{ id: "arab", title: "Arab tili va tajvid", icon: "letters", sequential: true },
```

Hozir bu **arab tili** bo'limida yoqilgan — «Muallim soniy» 18 ta darsi tartib bilan o'tiladi.

Qanday ishlaydi:

- Video **YouTube IFrame API** orqali ochiladi (API kaliti kerak emas), ko'rilgan vaqt kuzatib boriladi
- **90%** ko'rilsa yoki video oxirigacha yetsa — dars tugagan hisoblanadi va keyingisi ochiladi
- Ro'yxatda: tugagan darsda ✓, ko'rilayotganida tagida tilla chiziq (foiz), qulflanganida 🔒
- Progress `watched` kalitida **CloudStorage**'da saqlanadi — barcha qurilmalarda bir xil
- Agar YouTube API yuklanmasa, «Darsni ko'rib bo'ldim» tugmasi chiqadi — hech kim qulf ortida qolmaydi
- **Adminlarga qulf ishlamaydi** — kontentni tekshirish uchun hamma dars ochiq

Kurs (playlist) yozuvlari zanjirga kirmaydi — pleyer ichida videolar almashgani uchun foizni ishonchli
o'lchab bo'lmaydi. Ketma-ketlik kerak bo'lsa playlistni darslarga yoyib qo'shing.

### Video dars + arab tili darsligi

Video darslar ilovaning **o'z arab tili darsligi** bilan bog'langan. `data.js` dagi video yozuviga
ikkita maydon qo'shiladi:

```js
{ section: "arab", title: "2 dars miym, ta, nun harflari", youtubeId: "a8JhMDLBoLM",
  duration: "6:40", gender: "hamma", letters: [24,3,25] },
```

- **`letters: [n]`** — shu darsda o'rgatiladigan harflar (`data_arabic.js` dagi 1..28 raqamlari).
  Pleyerda videoning tagida har bir harf **4 shakli bilan** (alohida / boshida / o'rtada / oxirida) chiqadi.
- **`lesson: "lN"`** — mos keladigan nazariy dars (harakatlar, madd, shadda, tanvin, shamsiya…).
  Uning qoidasi va misollari ko'rsatiladi.

Tartib videodagidek: avval **qoida** (agar bo'lsa), keyin **harflar**, oxirida **3 ta misol so'z**.
So'zlar avval o'rgatilayotgan harflarniki (م → مَاءٌ «suv»), yetmasa qoidaning misollari bilan to'ldiriladi.
Masalan 1-dars: avval a/i/u harakatlari (بَ بِ بُ), keyin ро va za harflari, so'ngra رَبٌّ, زَكَاةٌ, كُتُبٌ.
Oxirida to'liq darslikka o'tish tugmasi.

«Muallim soniy» ning 18 ta darsi **28 ta harfning hammasiga** taqsimlangan — biror harf tushib qolmagan
va takrorlanmagan. Yangi video qo'shsangiz, shu ikki maydonni to'ldirsangiz bo'ldi.

**Nur:** video dars tugaganda ilovaning o'z arab tili darslari bilan **bir xil** ball beriladi —
`ilm` kategoriyasiga **40 Nur** (kunlik chegara 120, ya'ni kuniga 3 ta dars).

### Playlist (kurs) qo'shish

YouTube playlist havolasini (`…?list=PL…`) admin formasiga joylashtirsangiz, server playlistni tekshiradi
va ikki variantni taklif qiladi:

- **Har bir darsni alohida** (default) — playlist ichidagi videolar bitta-bitta yozuv bo'lib qo'shiladi.
  Foydalanuvchi «1-dars, 2-dars…» ro'yxatini ko'radi. Eng qulay ko'rinish.
- **Bitta kurs** — playlist bitta yozuv bo'ladi, pleyerda YouTube'ning o'z darslar ro'yxati bilan ochiladi.
  Playlistga keyin yangi dars qo'shilsa — o'zi paydo bo'ladi.

> YouTube bir so'rovda ~100 tagacha element beradi. Undan uzun playlistlar to'liq yoyilmasligi mumkin —
> qolganini qo'lda qo'shasiz yoki kurs sifatida qoldirasiz.

Arab tili bo'limida **«Muallimi soniy»** kursining 18 ta darsi `data.js` ga yozib qo'yilgan —
server ulanmagan bo'lsa ham ishlaydi. Sarlavhalar YouTube'dagidek, faqat ortiqcha bo'shliqlar
va takrorlangan «| Muallimi soniy» qo'shimchasi olib tashlangan.

## Materiallar (PDF kitoblar)

Materiallarni **ikki yo'l bilan** qo'shish mumkin.

### 1. Ilova bilan birga (serversiz)

Faylni `webapp/files/` papkasiga qo'yasiz va `data.js` dagi `materials` ro'yxatiga yozasiz:

```js
materials: [
  { section: "arab", title: "Muallim soniy — darslik", file: "files/muallim_soniy.pdf",
    kind: "pdf", size: 4413633, note: "44 bet · video darslar shu kitob bo'yicha o'tilgan" },
],
```

Fayl Mini App bilan birga joylashtiriladi (GitHub Pages ham uzatadi). Foydalanuvchi kartochkani bosganda
kitob **tashqi brauzerda** ochiladi — Telegram'ning ichki oynasi PDF ni ishonchli ko'rsatmaydi.

**«Muallim soniy» darsligi allaqachon shu yo'l bilan qo'shilgan** — hech narsa sozlash shart emas.

> GitHub Pages'da fayl chegarasi 100 MB. Katta kitoblar uchun ikkinchi usulni ishlating.

### 2. Bot orqali (server kerak)

Kitob **Telegram'ning o'zida** saqlanadi — bazada faqat `file_id` turadi, fayl hosting kerak emas.

1. Admin botga (shaxsiy chatda) PDF faylni yuboradi
2. Bot «Qaysi bo'limga qo'shilsin?» deb bo'limlar ro'yxatini beradi
3. Tanlaysiz — ilovada o'sha bo'limda **«Materiallar»** kartochkasi paydo bo'ladi
4. Foydalanuvchi bosadi → bot ochiladi va faylni yuboradi (yuklab oladi, offline o'qiydi)

Fayl nomi sarlavha bo'ladi; boshqa nom kerak bo'lsa faylni **izoh (caption) bilan** yuboring.
Telegram bot fayl chegarasi — 50 MB. O'chirish: material kartochkasidagi 🗑 tugmasi.

Ikkala manba birlashtirilib ko'rsatiladi.

## Internetga joylash — GitHub Pages + Railway

Ikki qism: **Mini App** (statik, bepul, GitHub Pages) va **bot + API** (Railway, ~$5/oy, Hobby rejasi).
Bot o'chib qolsa ham ilovaning asosiy qismi (vaqtlar, zikr, darslar, videolar) ishlayveradi — faqat reyting va admin to'xtaydi.

### 1. Kodni GitHub'ga yuklash

```bash
git init
git add .
git commit -m "Bomdod namozi"
git branch -M main
git remote add origin https://github.com/USERNAME/bomdodnamozappbot.git
git push -u origin main
```

`.gitignore` tufayli `.env`, `reyting.db`, `users.json` yuklanmaydi — token va baza repozitoriyga tushmaydi.

### 2. Mini App → GitHub Pages (bepul)

1. Repozitoriyda **Settings → Pages → Source: GitHub Actions** ni tanlang
2. `.github/workflows/pages.yml` o'zi ishga tushadi (yoki **Actions** bo'limida qo'lda «Run workflow»)
3. 1–2 daqiqada manzil chiqadi: `https://USERNAME.github.io/bomdodnamozappbot/`

Workflow har deploy'da script'larga `?v=<commit>` qo'shadi — Telegram eski JS ni keshda ushlab qolmaydi.

### 3. Bot + API → Railway

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo** → repozitoriyni tanlang
2. **Settings → Source → Root Directory:** `bot` (Dockerfile shu yerda)
3. **Variables** — quyidagilarni kiriting:

   | Nomi | Qiymati |
   |---|---|
   | `BOT_TOKEN` | @BotFather bergan token |
   | `WEBAPP_URL` | 2-qadamdagi Pages manzili (oxirida `/` bilan) |
   | `ADMIN_IDS` | Telegram ID (botga `/id` yozing), vergul bilan |
   | `DATA_DIR` | `/data` |

   `PORT` ni Railway o'zi beradi — yozmang.
4. **Volume:** servis ustida o'ng tugma → **Add Volume** → Mount path: `/data`. **Shart** — volume'siz har deploy'da baza o'chadi
5. **Settings → Networking → Generate Domain** → `https://xxx.up.railway.app`
6. Tekshirish: brauzerda `https://xxx.up.railway.app/api/ping` → `{"ok": true}`
7. **Replicas — faqat 1.** Bot polling rejimida ishlaydi; ikkita nusxa Telegram bilan urishadi

Deploy loglarida `Bot @nomi ishga tushdi ... ma'lumotlar: /data` qatori chiqishi kerak.

### 4. Ilovani serverga ulash

`webapp/data.js` da:

```js
apiUrl: "https://xxx.up.railway.app",
```

`git push` — Pages o'zi qayta joylaydi. Endi ilovadagi **Reyting** va **Video → Video qo'shish** (admin) ishlaydi.

### 5. Zaxira (bepul)

Bot har **dushanba 03:00** da `reyting.db` nusxasini birinchi adminga Telegram orqali yuboradi (`BACKUP_DAY` bilan sozlanadi).
Hoziroq olish: botga `/backup`. Tiklash: faylni Railway volume'dagi `/data/reyting.db` o'rniga qo'yib, servisni qayta ishga tushiring.

### Lokal ishga tushirish (sinov uchun)

```bash
cd bot
pip install -r requirements.txt
cp .env.example .env        # BOT_TOKEN va WEBAPP_URL ni to'ldiring, DATA_DIR ni bo'sh qoldiring
python bot.py
```

Bot buyruqlari: `/start`, `/app`, `/vaqt Samarqand`, `/eslatma`, `/reyting`, `/jamoa`, `/id`, `/backup`, `/help`.

### BotFather'da qo'shimcha sozlash (ixtiyoriy)

- `/setmenubutton` → botni tanlang → WEBAPP_URL ni kiriting → tugma nomi: `Ilova`
- Buyruqlar ro'yxatini bot ishga tushganda **o'zi** o'rnatadi — BotFather'da qo'lda kiritish shart emas
- Guruhda ishlashi uchun: `/setjoingroups` → `Enable` (jamoa funksiyasi uchun kerak)

### Yuk va narx

1 000 faol foydalanuvchi — bitta so'rov ~9 ms, server ~3% band; 10 000 da ham `users.total` keshi tufayli
so'rovlar foydalanuvchi soniga bog'liq emas. Railway Hobby ($5/oy, ichida $5 kredit) — bu bot oyiga ~$1–3 ishlatadi.
Haqiqiy bepul kerak bo'lsa — Oracle Cloud Always Free VM (o'zingiz boshqarasiz); Render free yaramaydi (bot uxlab qoladi, disk yo'q).

## Reyting va maxfiylik

Reytingsiz ham ilova to'liq ishlaydi — Nur, daraja va nishonlar telefonning o'zida hisoblanadi.
Musobaqa (liga, jamoa, do'stlar) server ulanganda yonadi — yuqoridagi **«Internetga joylash»** bo'limiga qarang.

**Jamoa qilish:** botni Telegram guruhiga qo'shing → guruhda `/jamoa` yozing → a'zolar «Qo'shilish» tugmasini bosadi.

### Maxfiylik

- Serverga faqat **kunlik umumiy Nur**, ism va daraja yuboriladi.
- Qazo namozlar soni, qaysi zikr o'qilgani, tasbih va dars natijalari serverga **umuman yuborilmaydi** — telefonda qoladi.
- Reytingda **anonim** ko'rinish mumkin («Anonim #NNN»), o'z o'rningizni esa o'zingiz ko'rasiz.
- Har so'rov Telegram `initData` orqali bot tokeni bilan tekshiriladi — boshqa odam nomidan ball yozib bo'lmaydi.
- Kunlik ball kategoriya bo'yicha chegaralangan (`nur.js` dagi `CAP` va `api.py` dagi `CAPS` bir xil) — server ularni qayta qo'llaydi.

## Keyingi bosqich uchun g'oyalar

- Boshqa namozlar (peshin, asr, shom, xufton) va tahorat bo'limi
- Audio qori bilan suralar va zikrlarni tinglash (data.js ga `audio` maydoni qo'shib)
- Arab tili: harflar talaffuzi uchun audio, 12+ darslar (tajvid asoslari)
- Eslatmani foydalanuvchi shahridagi bomdod vaqtiga bog'lash
- Ramazon uchun maxsus tadbirlar va jamoaviy maqsad («bu hafta jamiyat N Nur to'pladi» kengaytmasi)
- 1v1 duel: «7 kun — kim ko'proq qazo o'qiydi?»

## Namoz vaqtlari

Vaqtlar **ilovaning o'zida** hisoblanadi (`webapp/vaqt.js`), API ham, server ham kerak emas.
Formula O'zbekiston musulmonlari idorasi rasmiy taqvimini tekshirib ochilgan:

| Parametr | Qiymat |
|---|---|
| Kenglik | **41.31°N** — hamma hudud uchun bir xil (rasmiy taqvim shunday tuzilgan) |
| Uzunlik | joyning o'zi — GPS yoki shahar |
| Bomdod / Xufton | quyosh ufqdan **15.5°** pastda |
| Quyosh / Peshin | astronomik chiqish / quyosh tushi |
| Asr | **Hanafiy** (soya = 2) |
| Shom | botish **+3 daqiqa** |

Tekshiruv: 14 hudud × 366 kun × 6 vaqt = **30 744 ta vaqt** rasmiy jadval bilan solishtirildi —
**99.7% 1 daqiqa ichida**, 75% aynan, eng katta farq 2 daqiqa (yaxlitlash).

### GPS

«📍 Joylashuvim» tanlansa, joylashuv Telegram (`LocationManager`, Bot API 8.0+) yoki brauzer orqali olinadi.
Rasmiy usulda faqat **uzunlik** ishlatiladi — kenglik hamma uchun 41.31 qoladi. Shuning uchun natija
Muftiyat taqvimi va mahalliy masjid azoni bilan mos, lekin viloyat markazidan uzoq tumanda **joyning o'z
uzunligiga** ko'ra to'g'rilanadi (viloyat jadvalidan aniqroq). Joy `geo` kalitida saqlanadi va bir soatdan
so'ng jimgina yangilanadi. Ruxsat berilmasa — shaharlar ro'yxati.

### Shaharlar

`data.js` dagi `cities` ro'yxatida `lng` — rasmiy jadvalda shu hudud uchun ishlatiladigan uzunlik
(jadvaldan tiklangan). Diqqat: Nukus uchun jadval **60.24°E** ga tuzilgan (shahar 59.61 da) — shuning uchun
«Nukus» tanlanganda rasmiy jadval, GPS'da esa joyning o'zi olinadi.

### Hijriy sana

Brauzerning o'zidan (`Intl`, Umm al-Qura taqvimi) — muslim.uz bilan mos. Server yo'q.

### Qayta tekshirish

Yangi yil taqvimi chiqqanda formulani qayta tekshirish mumkin — rasmiy ma'lumotni JSON ko'rinishida
namoz-vaqti.uz beradi (Din ishlari qo'mitasi xulosasi asosida):

```
https://namoz-vaqti.uz/index.php?format=json&lang=lotin&period=year&region=toshkent
```

`bot/vaqt.py` — xuddi shu algoritm Python'da (`/vaqt` buyrug'i). **Ikkalasini birga o'zgartiring.**
