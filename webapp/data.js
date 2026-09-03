// ============================================================
//  BOMDOD NAMOZ — Mini App kontenti
//  Bu faylni tahrirlab suralar, videolar va qadamlarni o'zgartirishingiz mumkin.
// ============================================================

window.APP_DATA = {

  // ---------- REYTING SERVERI ----------
  // Bot serverining HTTPS manzili (bot/api.py shu yerda ishlaydi), masalan: "https://bomdod-bot.up.railway.app"
  // Bo'sh qoldirilsa — reyting o'chiq, ilova faqat shaxsiy natijalarni (Nur, daraja, nishonlar) ko'rsatadi.
  apiUrl: "https://bomdodnamoz-production.up.railway.app",

  // ---------- VIDEO DARSLAR ----------
  // Bo'limlar — Video tabidagi kartochkalar. Tartibi shu yerdagidek chiqadi.
  // icon: icons.js dagi nom. Bo'limni qo'shish/olib tashlash uchun shu ro'yxatni tahrirlang.
  videoSections: [
    { id: "tahorat", title: "Tahorat va g'usl",     icon: "drop",    desc: "Tahorat, g'usl, tayammum, muhim shartlar" },
    { id: "bomdod",  title: "Bomdod namozi",        icon: "sunrise", desc: "2 rakat sunnat + 2 rakat farz" },
    { id: "peshin",  title: "Peshin namozi",        icon: "sun",     desc: "4 sunnat + 4 farz + 2 sunnat" },
    { id: "asr",     title: "Asr namozi",           icon: "sun",     desc: "4 rakat farz" },
    { id: "shom",    title: "Shom namozi",          icon: "sunset",  desc: "3 rakat farz + 2 rakat sunnat" },
    { id: "xufton",  title: "Xufton namozi",        icon: "moon",    desc: "4 farz + 2 sunnat + 3 vitr" },
    { id: "juma",    title: "Juma va hayit",        icon: "mosque",  desc: "Juma, Ramazon va Qurbon hayit namozlari" },
    { id: "nafl",    title: "Nafl namozlar",        icon: "star",    desc: "Tahajjud, duho, istixora, avvobin, tasbih" },
    // sequential: darslar ketma-ket ochiladi — oldingisi to'liq ko'rilmaguncha keyingisi qulflangan
    { id: "arab",    title: "Arab tili va tajvid",  icon: "letters", desc: "Harflar, harakatlar, Qur'on o'qish qoidalari", sequential: true },
    { id: "zikr",    title: "Zikr va duolar",       icon: "beads",   desc: "Tongi va tungi zikrlar, kundalik duolar" },
    { id: "boshqa",  title: "Boshqa darslar",       icon: "book",    desc: "Umumiy mavzular" },
  ],

  // Videolar. Ikki yo'l bilan qo'shiladi:
  //   1) Admin panel orqali (Video bo'limi → «Video qo'shish») — server ulangan bo'lsa, eng qulayi
  //   2) Shu yerga qo'lda — server kerak emas, lekin har safar qayta deploy qilinadi
  // gender: "hamma" | "erkak" | "ayol"
  // letters: [n] — shu darsda o'rgatiladigan harflar (data_arabic.js dagi raqamlar 1..28)
  // lesson: "lN"  — mos keladigan nazariy dars (data_arabic.js dagi lessons id si)
  // Ikkalasi pleyerda videoning tagida harf kartochkalari va misol so'zlar bo'lib chiqadi.
  // { section: "bomdod", title: "Bomdod namozi", youtubeId: "AbCdEfGhIjK", duration: "12:40", gender: "hamma" }
  // Playlist (kurs) uchun: playlistId qo'shiladi — pleyerda darslar ro'yxati bilan ochiladi.
  // youtubeId — kurs muqovasi uchun birinchi darsning ID si (ixtiyoriy).
  videos: [
    // ---- Tahorat (REGISTON TV) — erkak va ayol uchun bir xil ----
    { section: "tahorat", title: "Tahorat qanday qilinadi", youtubeId: "DGeyIaJ1308", gender: "hamma" },
    { section: "tahorat", title: "G'usl qilish tartibi", youtubeId: "9x0wuXhIH5M", gender: "hamma", note: "Muhammad Ayyub domla" },

    // ---- Erkaklar namozi (5 mahal namoz to'liq o'qish tartibi playlisti) ----
    { section: "bomdod", title: "Bomdod namozi — erkaklar uchun",     youtubeId: "RnKtl_mEvEI", duration: "18:20", gender: "erkak" },
    { section: "peshin", title: "Peshin namozi — erkaklar uchun",      youtubeId: "KEnDKj9jo-0", duration: "34:21", gender: "erkak" },
    { section: "asr",    title: "Asr namozi — erkaklar uchun",         youtubeId: "B6RxssjqayI", duration: "16:11", gender: "erkak" },
    { section: "shom",   title: "Shom namozi — erkaklar uchun",        youtubeId: "Zvvk1-BXkkk", duration: "20:39", gender: "erkak" },
    { section: "xufton", title: "Xufton namozi — erkaklar uchun",      youtubeId: "UWo-XEu_Mbo", duration: "33:40", gender: "erkak" },

    // ---- Ayollar namozi (AYOLLAR NAMOZI playlisti) ----
    { section: "bomdod", title: "Bomdod namozi — ayollar uchun",     youtubeId: "vsVRsEUEcOM", duration: "13:22", gender: "ayol" },
    { section: "peshin", title: "Peshin namozi — ayollar uchun",      youtubeId: "e8BKMmU4ZoQ", duration: "28:19", gender: "ayol" },
    { section: "asr",    title: "Asr namozi — ayollar uchun",         youtubeId: "vb3rtkIsv_E", duration: "11:12", gender: "ayol" },
    { section: "shom",   title: "Shom namozi — ayollar uchun",        youtubeId: "Jls60RY3u6Q", duration: "15:34", gender: "ayol" },
    { section: "xufton", title: "Xufton namozi — ayollar uchun",      youtubeId: "W2HKZ1RaJ_0", duration: "27:29", gender: "ayol" },
    { section: "xufton", title: "Vitr vojib namozi — ayollar uchun",  youtubeId: "y6s3NNPP_5A", duration: "10:49", gender: "ayol" },
    // ---- Muallimi soniy (arabicuz kanali) — 18 ta dars ----
    // Butun kursni bitta yozuv sifatida ochish uchun quyidagi qatorni izohdan chiqaring:
    // { section: "arab", title: "Muallimi soniy — to'liq kurs", playlistId: "PL0x5yk5Iop2S4CmanzSdQ1Ctb00qTBHOy", youtubeId: "vjsuonSdsFM", gender: "hamma" },
    { section: "arab", title: "1 dars a, i, u harakatlari va ro za harflari", youtubeId: "vjsuonSdsFM", duration: "8:40", gender: "hamma", note: "Muallimi soniy", letters: [10,11], lesson: "l5" },
    { section: "arab", title: "2 dars miym, ta, nun harflari", youtubeId: "a8JhMDLBoLM", duration: "6:40", gender: "hamma", note: "Muallimi soniy", letters: [24,3,25] },
    { section: "arab", title: "3 dars ya ba kaf harfari", youtubeId: "NDCehMV8wBs", duration: "9:40", gender: "hamma", note: "Muallimi soniy", letters: [28,2,22] },
    { section: "arab", title: "4 dars lam, vav,ha harflari", youtubeId: "rpfvhhg6NK8", duration: "7:10", gender: "hamma", note: "Muallimi soniy", letters: [23,27,26] },
    { section: "arab", title: "5 dars fa, qof, shiyn harflari", youtubeId: "HuiCN-hbH1c", duration: "7:57", gender: "hamma", note: "Muallimi soniy", letters: [20,21,13] },
    { section: "arab", title: "6 dars siyn, sa, sod harflari", youtubeId: "pe55W5Tfrgc", duration: "8:04", gender: "hamma", note: "Muallimi soniy", letters: [12,4,14] },
    { section: "arab", title: "7 dars to, jim, xo harflari", youtubeId: "wyDWg3XnaqU", duration: "7:00", gender: "hamma", note: "Muallimi soniy", letters: [16,5,7] },
    { section: "arab", title: "8 dars ha, g'oyn, a'yn harflari", youtubeId: "_lSfg3ba0bM", duration: "7:09", gender: "hamma", note: "Muallimi soniy", letters: [6,19,18] },
    { section: "arab", title: "9 dars dal, dod harflari", youtubeId: "YX6lbBPz5QE", duration: "7:24", gender: "hamma", note: "Muallimi soniy", letters: [8,15] },
    { section: "arab", title: "10 dars zal va zo harflari", youtubeId: "4dx0lzcgsjo", duration: "9:11", gender: "hamma", note: "Muallimi soniy", letters: [9,17] },
    { section: "arab", title: "11 DARS CHO'ZIB O'QISH", youtubeId: "2AcWX9L4Ze8", duration: "7:17", gender: "hamma", note: "Muallimi soniy", lesson: "l8" },
    { section: "arab", title: "12 DARS uch va undan ko'p harflik so'zlarni cho'zib o'qish", youtubeId: "s02Huqa-Qdo", duration: "16:54", gender: "hamma", note: "Muallimi soniy", lesson: "l8" },
    { section: "arab", title: "13 DARS TASHDIDLI HARFLAR", youtubeId: "V5JIuNSB17Q", duration: "10:57", gender: "hamma", note: "Muallimi soniy", lesson: "l7" },
    { section: "arab", title: "14 DARS TANVINLI VA TANVINLI TASHDIDLI HARFLAR", youtubeId: "sYXJQiVp9_Q", duration: "10:07", gender: "hamma", note: "Muallimi soniy", lesson: "l6" },
    { section: "arab", title: "15 DARS ALIF VA HAMZA", youtubeId: "61POaxpVPk8", duration: "9:50", gender: "hamma", note: "Muallimi soniy", letters: [1] },
    { section: "arab", title: "16 dars yozilmasada o'qiladigan harflar", youtubeId: "-X1GUuq3gh8", duration: "9:08", gender: "hamma", note: "Muallimi soniy", lesson: "l8" },
    { section: "arab", title: "17 dars Shamsiya va qamariya", youtubeId: "IsxBV4x2yIE", duration: "12:30", gender: "hamma", note: "Muallimi soniy", lesson: "l9" },
    { section: "arab", title: "18 dars Ulab o'qish va vaqf to'xtash", youtubeId: "bhEamdQnaW4", duration: "9:17", gender: "hamma", note: "Muallimi soniy" },
  ],

  // ---------- MATERIALLAR (kitob, PDF) ----------
  // Ilova bilan birga tarqaladi — server kerak emas. Fayl `webapp/files/` papkasida turadi.
  // Admin botga yuklagan materiallar bularning ustiga qo'shilib ko'rsatiladi.
  // file — webapp papkasiga nisbatan yo'l. size — baytda (faqat ko'rsatish uchun).
  materials: [
    {
      section: "arab",
      title: "Muallim soniy — darslik",
      file: "files/muallim_soniy.pdf",
      kind: "pdf",
      size: 4413633,
      note: "44 bet · video darslar shu kitob bo'yicha o'tilgan" },
  ],

  // ---------- NAMOZDA O'QILADIGAN ZIKR VA DUOLAR ----------
  zikrlar: [
    {
      id: "sano",
      title: "Sano",
      when: "Takbirdan so'ng, qiyomda (faqat 1-rakatda)",
      arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ وَتَبَارَكَ اسْمُكَ وَتَعَالَى جَدُّكَ وَلَا إِلَهَ غَيْرُكَ",
      latin: "Subhaanakallohumma va bihamdika va tabaarokasmuka va ta'aalaa jadduka va laa ilaaha g'oyruk.",
      meaning: "Ey Alloh, Sen barcha nuqsonlardan poksan, Senga hamd bo'lsin. Isming muborakdir, shon-shuhrating yuksakdir va Sendan o'zga iloh yo'qdir."
    },
    {
      id: "taavvuz",
      title: "Ta'avvuz va Basmala",
      when: "Sanodan so'ng, Fotihadan oldin",
      arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ ۝ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      latin: "A'uuzu billaahi minash-shaytonir-rojiym. Bismillaahir-rohmaanir-rohiym.",
      meaning: "Quvilgan shaytondan Allohdan panoh so'rayman. Mehribon va rahmli Alloh nomi bilan."
    },
    {
      id: "ruku",
      title: "Ruku tasbihi",
      when: "Rukuda 3 marta",
      arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ",
      latin: "Subhaana robbiyal 'aziym.",
      meaning: "Ulug' Robbim barcha nuqsonlardan pokdir."
    },
    {
      id: "qavma",
      title: "Rukudan turganda",
      when: "Rukudan qad rostlaganda",
      arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ ۝ رَبَّنَا لَكَ الْحَمْدُ",
      latin: "Sami'allohu liman hamidah. Robbanaa lakal hamd.",
      meaning: "Alloh Unga hamd aytganni eshitdi. Ey Robbimiz, hamd Sengadir."
    },
    {
      id: "sajda",
      title: "Sajda tasbihi",
      when: "Har sajdada 3 marta",
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      latin: "Subhaana robbiyal a'laa.",
      meaning: "Eng Oliy Robbim barcha nuqsonlardan pokdir."
    },
    {
      id: "tashahhud",
      title: "Tashahhud (Attahiyyot)",
      when: "Har 2 rakatdan so'ng o'tirishda",
      arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
      latin: "Attahiyyaatu lillaahi vas-solavaatu vat-toyyibaat. Assalaamu 'alayka ayyuhan-nabiyyu va rohmatullohi va barokaatuh. Assalaamu 'alaynaa va 'alaa 'ibaadillaahis-soolihiyn. Ashhadu an laa ilaaha illalloh va ashhadu anna Muhammadan 'abduhu va rosuuluh.",
      meaning: "Barcha ta'zimlar, namozlar va yaxshi amallar Allohga xosdir. Ey Nabiy, sizga salom, Allohning rahmati va barakoti bo'lsin. Bizga va Allohning solih bandalariga salom bo'lsin. Guvohlik beramanki, Allohdan o'zga iloh yo'q va guvohlik beramanki, Muhammad Uning bandasi va elchisidir."
    },
    {
      id: "salavot",
      title: "Salavot (Durud)",
      when: "Oxirgi o'tirishda, tashahhuddan so'ng",
      arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ ۝ اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ",
      latin: "Allohumma solli 'alaa Muhammadin va 'alaa aali Muhammad, kamaa sollayta 'alaa Ibroohiyma va 'alaa aali Ibroohiym, innaka hamiydum majiyd. Allohumma baarik 'alaa Muhammadin va 'alaa aali Muhammad, kamaa baarokta 'alaa Ibroohiyma va 'alaa aali Ibroohiym, innaka hamiydum majiyd.",
      meaning: "Ey Alloh, Ibrohimga va uning oilasiga rahmat qilganingdek, Muhammadga va uning oilasiga ham rahmat qil. Albatta, Sen maqtovga loyiq va ulug'san. Ey Alloh, Ibrohimga va uning oilasiga baraka berganingdek, Muhammadga va uning oilasiga ham baraka ber. Albatta, Sen maqtovga loyiq va ulug'san."
    },
    {
      id: "robbana",
      title: "Duo (Robbanaa)",
      when: "Salavotdan so'ng, salomdan oldin",
      arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
      latin: "Robbanaa aatinaa fid-dunyaa hasanatav va fil-aaxiroti hasanatav va qinaa 'azaaban-naar.",
      meaning: "Ey Robbimiz, bizga dunyoda ham yaxshilik ber, oxiratda ham yaxshilik ber va bizni do'zax azobidan saqla."
    },
    {
      id: "salom",
      title: "Salom",
      when: "Namoz oxirida o'ngga, so'ng chapga",
      arabic: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ",
      latin: "Assalaamu 'alaykum va rohmatulloh.",
      meaning: "Sizlarga salom va Allohning rahmati bo'lsin."
    },
  ],

  // ---------- SURALAR ----------
  suralar: [
    {
      id: "fotiha", number: 1, title: "Fotiha surasi", ayahs: 7, required: true,
      note: "Har rakatda albatta o'qiladi",
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
      latin: "Bismillaahir-rohmaanir-rohiym. Alhamdu lillaahi robbil 'aalamiyn. Ar-rohmaanir-rohiym. Maaliki yavmid-diyn. Iyyaaka na'budu va iyyaaka nasta'iyn. Ihdinas-sirootol mustaqiym. Sirootollaziyna an'amta 'alayhim g'oyril mag'zuubi 'alayhim valaz-zoolliyn. (Omin)",
      meaning: "Mehribon va rahmli Alloh nomi bilan. Barcha hamd olamlar Robbi Allohgadir. U mehribon va rahmlidir. Jazo kunining egasidir. Senggagina ibodat qilamiz va Sendangina yordam so'raymiz. Bizni to'g'ri yo'lga boshlagin. Sen ne'mat berganlarning yo'liga — g'azabga uchraganlarning ham, adashganlarning ham emas."
    },
    {
      id: "ixlos", number: 112, title: "Ixlos surasi", ayahs: 4, required: false,
      note: "Eng qisqa va ko'p o'qiladigan zam suralardan",
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
      latin: "Bismillaahir-rohmaanir-rohiym. Qul huvallohu ahad. Allohus-somad. Lam yalid va lam yuulad. Va lam yakul lahuu kufuvan ahad.",
      meaning: "Mehribon va rahmli Alloh nomi bilan. Ayt: U Alloh yagonadir. Alloh hech kimga muhtoj emas, hamma Unga muhtojdir. U tug'magan va tug'ilmagan. Va Unga hech kim teng emas."
    },
    {
      id: "falaq", number: 113, title: "Falaq surasi", ayahs: 5, required: false,
      note: "",
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ",
      latin: "Bismillaahir-rohmaanir-rohiym. Qul a'uuzu birobbil falaq. Min sharri maa xolaq. Va min sharri g'oosiqin izaa vaqob. Va min sharrin-naffaasaati fil 'uqod. Va min sharri haasidin izaa hasad.",
      meaning: "Mehribon va rahmli Alloh nomi bilan. Ayt: Tong Robbidan panoh so'rayman. U yaratgan narsalar yomonligidan. Qorong'ulik cho'kkan tun yomonligidan. Tugunlarga dam soluvchilar yomonligidan. Va hasad qilgan hasadchining yomonligidan."
    },
    {
      id: "nas", number: 114, title: "Nos surasi", ayahs: 6, required: false,
      note: "",
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ",
      latin: "Bismillaahir-rohmaanir-rohiym. Qul a'uuzu birobbin-naas. Malikin-naas. Ilaahin-naas. Min sharril vasvaasil xonnaas. Allaziy yuvasvisu fiy suduurin-naas. Minal jinnati van-naas.",
      meaning: "Mehribon va rahmli Alloh nomi bilan. Ayt: Odamlar Robbidan panoh so'rayman. Odamlar Podshohidan. Odamlar Ilohidan. Yashirinib oluvchi vasvasachining yomonligidan. U odamlar ko'ngliga vasvasa soladi. U jinlardan va odamlardandir."
    },
    {
      id: "kavsar", number: 108, title: "Kavsar surasi", ayahs: 3, required: false,
      note: "Qur'ondagi eng qisqa sura",
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ ۝ فَصَلِّ لِرَبِّكَ وَانْحَرْ ۝ إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ",
      latin: "Bismillaahir-rohmaanir-rohiym. Innaa a'toynaakal kavsar. Fasolli lirobbika vanhar. Inna shaani'aka huval abtar.",
      meaning: "Mehribon va rahmli Alloh nomi bilan. Albatta, Biz senga Kavsarni berdik. Bas, Robbing uchun namoz o'qi va qurbonlik qil. Albatta, senga adovat qilguvchining o'zi zurriyotsizdir."
    },
    {
      id: "asr", number: 103, title: "Asr surasi", ayahs: 3, required: false,
      note: "",
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ وَالْعَصْرِ ۝ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ ۝ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ",
      latin: "Bismillaahir-rohmaanir-rohiym. Val 'asr. Innal insaana lafiy xusr. Illallaziyna aamanuu va 'amilus-soolihaati va tavaasav bil haqqi va tavaasav bis-sobr.",
      meaning: "Mehribon va rahmli Alloh nomi bilan. Asr (zamon)ga qasam. Albatta, inson ziyondadir. Magar iymon keltirgan, solih amallar qilgan, bir-birlariga haqni tavsiya qilgan va bir-birlariga sabrni tavsiya qilganlar mustasno."
    },
    {
      id: "fil", number: 105, title: "Fil surasi", ayahs: 5, required: false,
      note: "",
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ ۝ أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ ۝ وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ ۝ تَرْمِيهِم بِحِجَارَةٍ مِّن سِجِّيلٍ ۝ فَجَعَلَهُمْ كَعَصْفٍ مَّأْكُولٍ",
      latin: "Bismillaahir-rohmaanir-rohiym. Alam taro kayfa fa'ala robbuka bi ashaabil fiyl. Alam yaj'al kaydahum fiy tazliyl. Va arsala 'alayhim toyron abaabiyl. Tarmiyhim bihijaarotim min sijjiyl. Faja'alahum ka'asfim ma'kuul.",
      meaning: "Mehribon va rahmli Alloh nomi bilan. Robbing fil egalarini nima qilganini ko'rmadingmi? Ularning makrini zoye ketkazmadimi? Ularning ustiga to'p-to'p qushlarni yubordi. Ular sopol toshlar bilan otdilar. Bas, ularni yeyilgan somon kabi qilib qo'ydi."
    },
    {
      id: "quraysh", number: 106, title: "Quraysh surasi", ayahs: 4, required: false,
      note: "",
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ لِإِيلَافِ قُرَيْشٍ ۝ إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ ۝ فَلْيَعْبُدُوا رَبَّ هَٰذَا الْبَيْتِ ۝ الَّذِي أَطْعَمَهُم مِّن جُوعٍ وَآمَنَهُم مِّنْ خَوْفٍ",
      latin: "Bismillaahir-rohmaanir-rohiym. Li iylaafi quraysh. Iylaafihim rihlatash-shitaa'i vas-soyf. Falya'buduu robba haazal bayt. Allaziy at'amahum min juu'iv va aamanahum min xovf.",
      meaning: "Mehribon va rahmli Alloh nomi bilan. Quraysh oshnaligi uchun. Ularning qish va yoz safariga oshnaligi uchun. Bas, ular mana shu Baytning Robbiga ibodat qilsinlar. U ularni ochlikdan to'ydirgan va qo'rquvdan omon qilgan Zotdir."
    },
    {
      id: "nasr", number: 110, title: "Nasr surasi", ayahs: 3, required: false,
      note: "",
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ ۝ وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا ۝ فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ ۖ إِنَّهُ كَانَ تَوَّابًا",
      latin: "Bismillaahir-rohmaanir-rohiym. Izaa jaa'a nasrullohi val fath. Va ro'aytan-naasa yadxuluuna fiy diynillaahi afvaajaa. Fasabbih bihamdi robbika vastag'firh, innahuu kaana tavvaabaa.",
      meaning: "Mehribon va rahmli Alloh nomi bilan. Allohning nusrati va fath kelganda. Va odamlarning Alloh diniga to'p-to'p bo'lib kirayotganini ko'rganingda. Robbingga hamd ila tasbih ayt va Undan mag'firat so'ra. Albatta, U tavbalarni qabul qiluvchidir."
    },
  ],

  // ---------- BOMDOD NAMOZI QADAM-BAQADAM ----------
  // Har qadamda "erkak" va "ayol" uchun alohida izoh bo'lishi mumkin.
  // Agar farq bo'lmasa, faqat "text" ishlatiladi.
  namoz: {
    intro: "Bomdod namozi 4 rakat: avval 2 rakat sunnat, so'ng 2 rakat farz o'qiladi. Ikkalasi ham bir xil tartibda, faqat niyat farq qiladi.",
    sunnatNiyat: "Niyat qildim Alloh rizoligi uchun bomdod namozining ikki rakat sunnatini o'qishga, yuzimni qiblaga qaratib. Allohu akbar.",
    farzNiyat: "Niyat qildim Alloh rizoligi uchun bomdod namozining ikki rakat farzini o'qishga, yuzimni qiblaga qaratib. Allohu akbar.",
    steps: [
      {
        title: "Tayyorgarlik",
        icon: "🧴",
        text: "Tahoratli bo'ling, toza joyda, qiblaga qarab turing. Avrat yopiq bo'lishi shart.",
        erkak: "Erkaklar uchun kindikdan tizzagacha yopiq bo'lishi shart. Bosh kiyim (do'ppi) sunnat.",
        ayol: "Ayollar uchun yuz, kaft va oyoq panjasidan tashqari butun badan yopiq bo'lishi shart. Sochlar ham to'liq berkitiladi.",
        zikr: null
      },
      {
        title: "Niyat va takbir",
        icon: "🤲",
        text: "Dil bilan niyat qiling (tilda aytish ham mumkin), so'ng «Allohu akbar» deb qo'llarni ko'taring.",
        erkak: "Qo'llar quloq yumshog'iga tegadigan darajada ko'tariladi, kaftlar qiblaga qaragan holda.",
        ayol: "Qo'llar faqat yelka barobarigacha ko'tariladi, barmoqlar yopiq.",
        zikr: null
      },
      {
        title: "Qiyom — qo'l bog'lash",
        icon: "🧍",
        text: "Takbirdan so'ng qo'llarni bog'lab, sajda joyiga qarab turing.",
        erkak: "O'ng qo'l chap qo'l ustiga qo'yilib, kindik ostida bog'lanadi. O'ng qo'lning bosh va kichik barmog'i bilan chap bilak ushlab olinadi.",
        ayol: "Qo'llar ko'krak ustida bog'lanadi: o'ng kaft chap kaft ustiga qo'yiladi, bilak ushlanmaydi.",
        zikr: "sano"
      },
      {
        title: "Ta'avvuz, Basmala va Fotiha",
        icon: "📖",
        text: "Sanodan so'ng «A'uuzu billaahi...», «Bismillaahi...» va Fotiha surasini o'qing. Oxirida ichida «Omin» deng.",
        erkak: null, ayol: null,
        zikr: "taavvuz", sura: "fotiha"
      },
      {
        title: "Zam sura",
        icon: "📗",
        text: "Fotihadan so'ng Qur'ondan biror sura (masalan, Ixlos, Kavsar yoki Asr) o'qing. Bu 1- va 2-rakatda qilinadi.",
        erkak: null, ayol: null,
        zikr: null, sura: "ixlos"
      },
      {
        title: "Ruku",
        icon: "🙇",
        text: "«Allohu akbar» deb rukuga egiling va 3 marta tasbih ayting.",
        erkak: "Bel tekis bo'lguncha egiladi, qo'llar tizzani mahkam ushlaydi, barmoqlar ochiq, tirsaklar yondan uzoq.",
        ayol: "Bel to'liq tekislanmaydi — biroz egilib, qo'llar tizzaga qo'yiladi, barmoqlar yopiq, tirsaklar tanaga yaqin.",
        zikr: "ruku"
      },
      {
        title: "Qavma — rukudan turish",
        icon: "🧍",
        text: "«Sami'allohu liman hamidah» deb tik turing va «Robbanaa lakal hamd» deng.",
        erkak: null, ayol: null,
        zikr: "qavma"
      },
      {
        title: "Birinchi sajda",
        icon: "🛐",
        text: "«Allohu akbar» deb sajdaga boring. Peshona va burun yerga tegsin, 3 marta tasbih ayting.",
        erkak: "Tirsaklar yerdan va tanadan uzoq tutiladi, qorin sondan ajralgan holda, oyoq barmoqlari qiblaga qaratib tik turadi.",
        ayol: "Tirsaklar yerga qo'yilib, tana iloji boricha yig'ilgan holatda bo'ladi — qorin songa yopishadi, oyoqlar o'ng tomonga chiqarilgan holda.",
        zikr: "sajda"
      },
      {
        title: "Jalsa — ikki sajda orasida o'tirish",
        icon: "🧎",
        text: "«Allohu akbar» deb o'tiring, bir lahza xotirjam turing.",
        erkak: "Chap oyoq ustiga o'tiriladi, o'ng oyoq tik holda, barmoqlari qiblaga qaratilgan.",
        ayol: "Ikkala oyoq o'ng tomonga chiqarilib, chap son ustiga o'tiriladi (tavarruk).",
        zikr: null
      },
      {
        title: "Ikkinchi sajda",
        icon: "🛐",
        text: "Yana «Allohu akbar» deb sajda qiling, 3 marta tasbih ayting. Shu bilan 1-rakat tugadi.",
        erkak: null, ayol: null,
        zikr: "sajda"
      },
      {
        title: "Ikkinchi rakat",
        icon: "🔁",
        text: "«Allohu akbar» deb turing. Sano o'qilmaydi — to'g'ridan-to'g'ri Basmala, Fotiha, zam sura, ruku va ikki sajda takrorlanadi.",
        erkak: null, ayol: null,
        zikr: null
      },
      {
        title: "Qa'da — oxirgi o'tirish",
        icon: "🧎",
        text: "2-sajdadan so'ng o'tiring va Tashahhud, Salavot va Robbanaa duosini o'qing.",
        erkak: "Chap oyoq ustiga o'tiriladi, o'ng oyoq tik. Tashahhudda «laa ilaaha» deganda o'ng ko'rsatkich barmoq ko'tariladi.",
        ayol: "Tavarruk holatida o'tiriladi. Ko'rsatkich barmoq ko'tarish xuddi shunday.",
        zikr: "tashahhud"
      },
      {
        title: "Salom",
        icon: "🕊️",
        text: "Avval o'ng yelkaga, so'ng chap yelkaga qarab «Assalaamu 'alaykum va rohmatulloh» deng. Namoz tugadi.",
        erkak: null, ayol: null,
        zikr: "salom"
      },
    ],
    after: "Sunnatdan so'ng qisqa tanaffus qilib, farz niyatini qilib xuddi shu tartibda 2 rakat farzni o'qing. Namozdan so'ng tasbih (33 marta Subhanalloh, 33 marta Alhamdulillah, 33 marta Allohu akbar) va duo qilish sunnat."
  },

  // ---------- NAMOZ VAQTLARI UCHUN SHAHARLAR ----------
  // ---------- SHAHARLAR (namoz vaqti uchun) ----------
  // lng — O'zbekiston musulmonlari idorasi taqvimida shu hudud uchun ishlatiladigan uzunlik
  //       (rasmiy jadvaldan tiklangan; Nukus uchun jadval 60.24°E ga tuzilgan, shahar 59.61 da).
  // lat — faqat "eng yaqin shahar" ni topish uchun; hisobda ishlatilmaydi (rasmiy usulda kenglik hamma uchun 41.31).
  // Vaqt vaqt.js da hisoblanadi, internet kerak emas.
  cities: [
    { name: "Toshkent",   lat: 41.2995, lng: 69.24 },
    { name: "Samarqand",  lat: 39.6542, lng: 66.99 },
    { name: "Buxoro",     lat: 39.7681, lng: 64.49 },
    { name: "Andijon",    lat: 40.7821, lng: 72.24 },
    { name: "Farg'ona",   lat: 40.3842, lng: 71.74 },
    { name: "Namangan",   lat: 40.9983, lng: 71.74 },
    { name: "Qarshi",     lat: 38.8606, lng: 65.74 },
    { name: "Nukus",      lat: 42.4531, lng: 60.24 },
    { name: "Urganch",    lat: 41.5500, lng: 60.74 },
    { name: "Termiz",     lat: 37.2242, lng: 67.24 },
    { name: "Jizzax",     lat: 40.1158, lng: 67.74 },
    { name: "Navoiy",     lat: 40.0844, lng: 65.49 },
    { name: "Guliston",   lat: 40.4897, lng: 68.74 },
  ]
};
