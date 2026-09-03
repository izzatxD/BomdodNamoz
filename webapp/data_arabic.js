// ============================================================
//  ARAB TILI DARSLIGI — Qur'on o'qishni o'rganish (alifbodan Fotihagacha)
// ============================================================

window.ARABIC_DATA = {

  // 28 harf: nomi, alohida / boshida / o'rtada / oxirida shakli, o'qilishi, misol
  letters: [
    { n: 1,  name: "Alif",  iso: "ا", ini: "ا", mid: "ـا", fin: "ـا", latin: "a / aa", ex: "أَبٌ", exLatin: "abun", exMeaning: "ota", noJoin: true },
    { n: 2,  name: "Ba",    iso: "ب", ini: "بـ", mid: "ـبـ", fin: "ـب", latin: "b", ex: "بَابٌ", exLatin: "baabun", exMeaning: "eshik" },
    { n: 3,  name: "Ta",    iso: "ت", ini: "تـ", mid: "ـتـ", fin: "ـت", latin: "t", ex: "تِينٌ", exLatin: "tiynun", exMeaning: "anjir" },
    { n: 4,  name: "Sa",    iso: "ث", ini: "ثـ", mid: "ـثـ", fin: "ـث", latin: "s (tilni tishlar orasiga qo'yib)", ex: "ثَوْبٌ", exLatin: "savbun", exMeaning: "kiyim" },
    { n: 5,  name: "Jim",   iso: "ج", ini: "جـ", mid: "ـجـ", fin: "ـج", latin: "j", ex: "جَنَّةٌ", exLatin: "jannatun", exMeaning: "jannat" },
    { n: 6,  name: "Ha",    iso: "ح", ini: "حـ", mid: "ـحـ", fin: "ـح", latin: "h (tomoqdan, qattiq)", ex: "حَمْدٌ", exLatin: "hamdun", exMeaning: "maqtov" },
    { n: 7,  name: "Xo",    iso: "خ", ini: "خـ", mid: "ـخـ", fin: "ـخ", latin: "x", ex: "خَيْرٌ", exLatin: "xoyrun", exMeaning: "yaxshilik" },
    { n: 8,  name: "Dal",   iso: "د", ini: "د", mid: "ـد", fin: "ـد", latin: "d", ex: "دِينٌ", exLatin: "diynun", exMeaning: "din", noJoin: true },
    { n: 9,  name: "Zal",   iso: "ذ", ini: "ذ", mid: "ـذ", fin: "ـذ", latin: "z (tilni tishlar orasiga qo'yib)", ex: "ذِكْرٌ", exLatin: "zikrun", exMeaning: "zikr", noJoin: true },
    { n: 10, name: "Ro",    iso: "ر", ini: "ر", mid: "ـر", fin: "ـر", latin: "r", ex: "رَبٌّ", exLatin: "robbun", exMeaning: "Robb", noJoin: true },
    { n: 11, name: "Zay",   iso: "ز", ini: "ز", mid: "ـز", fin: "ـز", latin: "z", ex: "زَكَاةٌ", exLatin: "zakaatun", exMeaning: "zakot", noJoin: true },
    { n: 12, name: "Sin",   iso: "س", ini: "سـ", mid: "ـسـ", fin: "ـس", latin: "s", ex: "سَلَامٌ", exLatin: "salaamun", exMeaning: "salom" },
    { n: 13, name: "Shin",  iso: "ش", ini: "شـ", mid: "ـشـ", fin: "ـش", latin: "sh", ex: "شَمْسٌ", exLatin: "shamsun", exMeaning: "quyosh" },
    { n: 14, name: "Sod",   iso: "ص", ini: "صـ", mid: "ـصـ", fin: "ـص", latin: "s (qalin)", ex: "صَبْرٌ", exLatin: "sobrun", exMeaning: "sabr" },
    { n: 15, name: "Dod",   iso: "ض", ini: "ضـ", mid: "ـضـ", fin: "ـض", latin: "d (qalin)", ex: "ضَوْءٌ", exLatin: "zov'un", exMeaning: "nur" },
    { n: 16, name: "To",    iso: "ط", ini: "طـ", mid: "ـطـ", fin: "ـط", latin: "t (qalin)", ex: "طَيِّبٌ", exLatin: "toyyibun", exMeaning: "pok, yaxshi" },
    { n: 17, name: "Zo",    iso: "ظ", ini: "ظـ", mid: "ـظـ", fin: "ـظ", latin: "z (qalin)", ex: "ظِلٌّ", exLatin: "zillun", exMeaning: "soya" },
    { n: 18, name: "Ayn",   iso: "ع", ini: "عـ", mid: "ـعـ", fin: "ـع", latin: "' (tomoqdan)", ex: "عِلْمٌ", exLatin: "'ilmun", exMeaning: "ilm" },
    { n: 19, name: "G'ayn", iso: "غ", ini: "غـ", mid: "ـغـ", fin: "ـغ", latin: "g'", ex: "غَفُورٌ", exLatin: "g'ofuurun", exMeaning: "kechiruvchi" },
    { n: 20, name: "Fa",    iso: "ف", ini: "فـ", mid: "ـفـ", fin: "ـف", latin: "f", ex: "فَجْرٌ", exLatin: "fajrun", exMeaning: "tong" },
    { n: 21, name: "Qof",   iso: "ق", ini: "قـ", mid: "ـقـ", fin: "ـق", latin: "q", ex: "قُرْآنٌ", exLatin: "qur'aanun", exMeaning: "Qur'on" },
    { n: 22, name: "Kaf",   iso: "ك", ini: "كـ", mid: "ـكـ", fin: "ـك", latin: "k", ex: "كِتَابٌ", exLatin: "kitaabun", exMeaning: "kitob" },
    { n: 23, name: "Lam",   iso: "ل", ini: "لـ", mid: "ـلـ", fin: "ـل", latin: "l", ex: "لَيْلٌ", exLatin: "laylun", exMeaning: "kecha" },
    { n: 24, name: "Mim",   iso: "م", ini: "مـ", mid: "ـمـ", fin: "ـم", latin: "m", ex: "مَاءٌ", exLatin: "maa'un", exMeaning: "suv" },
    { n: 25, name: "Nun",   iso: "ن", ini: "نـ", mid: "ـنـ", fin: "ـن", latin: "n", ex: "نُورٌ", exLatin: "nuurun", exMeaning: "nur" },
    { n: 26, name: "Ha (yumshoq)", iso: "ه", ini: "هـ", mid: "ـهـ", fin: "ـه", latin: "h (yumshoq)", ex: "هُدًى", exLatin: "hudan", exMeaning: "hidoyat" },
    { n: 27, name: "Vov",   iso: "و", ini: "و", mid: "ـو", fin: "ـو", latin: "v / uu", ex: "وَرْدٌ", exLatin: "vardun", exMeaning: "gul", noJoin: true },
    { n: 28, name: "Ya",    iso: "ي", ini: "يـ", mid: "ـيـ", fin: "ـي", latin: "y / iy", ex: "يَدٌ", exLatin: "yadun", exMeaning: "qo'l" },
  ],

  // Darslar. type: "letters" (harflar), "theory" (qoida + misollar), "practice" (o'qish mashqi)
  lessons: [
    {
      id: "l1", title: "1-dars: Alifbo (1-qism)", type: "letters", letters: [1,2,3,4,5,6,7],
      intro: "Arab alifbosida 28 ta harf bor. O'ngdan chapga yoziladi va o'qiladi. Har bir harfning so'zdagi o'rniga qarab 4 xil shakli bo'ladi: alohida, boshida, o'rtada va oxirida."
    },
    {
      id: "l2", title: "2-dars: Alifbo (2-qism)", type: "letters", letters: [8,9,10,11,12,13,14],
      intro: "Bu guruhda 4 ta harf (د ذ ر ز) o'zidan keyingi harfga qo'shilmaydi — ular faqat oldingi harfga bog'lanadi."
    },
    {
      id: "l3", title: "3-dars: Alifbo (3-qism)", type: "letters", letters: [15,16,17,18,19,20,21],
      intro: "«Qalin» harflar (ص ض ط ظ) va tomoqdan chiqadigan harflar (ع غ) — o'zbek tilida yo'q tovushlar. Videoda talaffuzni diqqat bilan eshiting."
    },
    {
      id: "l4", title: "4-dars: Alifbo (4-qism)", type: "letters", letters: [22,23,24,25,26,27,28],
      intro: "Oxirgi 7 ta harf. Vov (و) va Ya (ي) ham undosh, ham cho'ziq unli vazifasini bajaradi — buni 8-darsda ko'ramiz."
    },
    {
      id: "l5", title: "5-dars: Harakatlar (fatha, kasra, damma)", type: "theory",
      intro: "Arab yozuvida qisqa unlilar harf ustiga yoki ostiga qo'yiladigan belgilar bilan ifodalanadi. Bularga «harakat» deyiladi.",
      items: [
        { arabic: "بَ", latin: "ba", note: "Fatha — harf ustidagi qiya chiziq, «a» tovushini beradi" },
        { arabic: "بِ", latin: "bi", note: "Kasra — harf ostidagi qiya chiziq, «i» tovushini beradi" },
        { arabic: "بُ", latin: "bu", note: "Damma — harf ustidagi kichik «vov», «u» tovushini beradi" },
        { arabic: "كَتَبَ", latin: "kataba", note: "yozdi — uchta fatha" },
        { arabic: "عَلِمَ", latin: "'alima", note: "bildi — fatha, kasra, fatha" },
        { arabic: "كُتُبٌ", latin: "kutubun", note: "kitoblar — ikkita damma" },
      ]
    },
    {
      id: "l6", title: "6-dars: Tanvin (-an, -in, -un)", type: "theory",
      intro: "Harakat ikki marta yozilsa, oxiriga «n» tovushi qo'shiladi. Bu «tanvin» deyiladi va faqat so'z oxirida keladi.",
      items: [
        { arabic: "بً", latin: "ban", note: "Fatha tanvin — ikkita fatha" },
        { arabic: "بٍ", latin: "bin", note: "Kasra tanvin — ikkita kasra" },
        { arabic: "بٌ", latin: "bun", note: "Damma tanvin — ikkita damma" },
        { arabic: "كِتَابًا", latin: "kitaaban", note: "fatha tanvindan keyin odatda alif yoziladi" },
        { arabic: "رَحِيمٍ", latin: "rohiymin", note: "rahmli" },
        { arabic: "عَظِيمٌ", latin: "'aziymun", note: "ulug'" },
      ]
    },
    {
      id: "l7", title: "7-dars: Sukun va Shadda", type: "theory",
      intro: "Sukun (ْ) — harf ustidagi kichik doira, harfda unli yo'qligini bildiradi. Shadda (ّ) — harf ikki marta o'qilishini bildiradi.",
      items: [
        { arabic: "أَبْ", latin: "ab", note: "Sukun: «b» unlisiz, «a» ga qo'shilib o'qiladi" },
        { arabic: "الْحَمْدُ", latin: "al-hamdu", note: "«l» va «m» harflarida sukun" },
        { arabic: "رَبِّ", latin: "robbi", note: "Shadda: «b» ikki marta — rob-bi" },
        { arabic: "إِنَّ", latin: "inna", note: "«n» ikki marta — in-na" },
        { arabic: "مُحَمَّدٌ", latin: "muhammadun", note: "«m» ikki marta" },
        { arabic: "اللَّهُ", latin: "allohu", note: "«l» ikki marta" },
      ]
    },
    {
      id: "l8", title: "8-dars: Madd — cho'ziq unlilar", type: "theory",
      intro: "Fathadan keyin alif (ا), kasradan keyin ya (ي), dammadan keyin vov (و) kelsa — unli cho'zib (2 baravar uzun) o'qiladi.",
      items: [
        { arabic: "بَا", latin: "baa", note: "fatha + alif = aa" },
        { arabic: "بِي", latin: "biy", note: "kasra + ya = iy" },
        { arabic: "بُو", latin: "buu", note: "damma + vov = uu" },
        { arabic: "قَالَ", latin: "qoola", note: "aytdi" },
        { arabic: "نَسْتَعِينُ", latin: "nasta'iynu", note: "yordam so'raymiz — Fotihadan" },
        { arabic: "يَقُولُ", latin: "yaquulu", note: "aytadi" },
        { arabic: "الرَّحْمَٰنِ", latin: "ar-rohmaani", note: "kichik tik alif (ٰ) ham «aa» deb cho'ziladi" },
      ]
    },
    {
      id: "l9", title: "9-dars: Quyoshiy va oyiy harflar (ال)", type: "theory",
      intro: "«Al» (ال) artikli so'z boshida keladi. Agar undan keyin «quyoshiy» harf kelsa, «l» o'qilmaydi va keyingi harf ikkilanadi. «Oyiy» harflarda «l» o'qiladi.",
      items: [
        { arabic: "الْقَمَرُ", latin: "al-qomaru", note: "oy — «q» oyiy harf, «l» o'qiladi" },
        { arabic: "الشَّمْسُ", latin: "ash-shamsu", note: "quyosh — «sh» quyoshiy, «l» o'qilmaydi" },
        { arabic: "الرَّحِيمِ", latin: "ar-rohiymi", note: "«r» quyoshiy" },
        { arabic: "الْعَالَمِينَ", latin: "al-'aalamiyna", note: "«'ayn» oyiy" },
        { arabic: "النَّاسِ", latin: "an-naasi", note: "«n» quyoshiy" },
        { arabic: "الْحَمْدُ", latin: "al-hamdu", note: "«h» oyiy" },
      ],
      note: "Quyoshiy harflar (14 ta): ت ث د ذ ر ز س ش ص ض ط ظ ل ن. Qolganlari — oyiy."
    },
    {
      id: "l10", title: "10-dars: Mashq — Fotiha surasini o'qiymiz", type: "practice",
      intro: "Endi o'rgangan barcha qoidalarni Fotiha surasida qo'llaymiz. Har bir so'zni bosib, o'qilishini tekshiring.",
      words: [
        { arabic: "بِسْمِ", latin: "bismi" }, { arabic: "اللَّهِ", latin: "llaahi" }, { arabic: "الرَّحْمَٰنِ", latin: "ar-rohmaani" }, { arabic: "الرَّحِيمِ", latin: "ar-rohiym" },
        { arabic: "الْحَمْدُ", latin: "al-hamdu" }, { arabic: "لِلَّهِ", latin: "lillaahi" }, { arabic: "رَبِّ", latin: "robbi" }, { arabic: "الْعَالَمِينَ", latin: "l-'aalamiyn" },
        { arabic: "مَالِكِ", latin: "maaliki" }, { arabic: "يَوْمِ", latin: "yavmi" }, { arabic: "الدِّينِ", latin: "d-diyn" },
        { arabic: "إِيَّاكَ", latin: "iyyaaka" }, { arabic: "نَعْبُدُ", latin: "na'budu" }, { arabic: "وَإِيَّاكَ", latin: "va iyyaaka" }, { arabic: "نَسْتَعِينُ", latin: "nasta'iyn" },
        { arabic: "اهْدِنَا", latin: "ihdinaa" }, { arabic: "الصِّرَاطَ", latin: "s-sirooto" }, { arabic: "الْمُسْتَقِيمَ", latin: "l-mustaqiym" },
        { arabic: "صِرَاطَ", latin: "sirooto" }, { arabic: "الَّذِينَ", latin: "llaziyna" }, { arabic: "أَنْعَمْتَ", latin: "an'amta" }, { arabic: "عَلَيْهِمْ", latin: "'alayhim" },
        { arabic: "غَيْرِ", latin: "g'oyri" }, { arabic: "الْمَغْضُوبِ", latin: "l-mag'zuubi" }, { arabic: "عَلَيْهِمْ", latin: "'alayhim" }, { arabic: "وَلَا", latin: "va laa" }, { arabic: "الضَّالِّينَ", latin: "z-zoolliyn" },
      ]
    },
    {
      id: "l11", title: "11-dars: Mashq — Ixlos va Kavsar", type: "practice",
      intro: "Yana ikkita qisqa sura. Shadda va maddga e'tibor bering.",
      words: [
        { arabic: "قُلْ", latin: "qul" }, { arabic: "هُوَ", latin: "huva" }, { arabic: "اللَّهُ", latin: "llaahu" }, { arabic: "أَحَدٌ", latin: "ahad" },
        { arabic: "اللَّهُ", latin: "allohu" }, { arabic: "الصَّمَدُ", latin: "s-somad" },
        { arabic: "لَمْ", latin: "lam" }, { arabic: "يَلِدْ", latin: "yalid" }, { arabic: "وَلَمْ", latin: "va lam" }, { arabic: "يُولَدْ", latin: "yuulad" },
        { arabic: "وَلَمْ", latin: "va lam" }, { arabic: "يَكُنْ", latin: "yakun" }, { arabic: "لَهُ", latin: "lahuu" }, { arabic: "كُفُوًا", latin: "kufuvan" }, { arabic: "أَحَدٌ", latin: "ahad" },
        { arabic: "إِنَّا", latin: "innaa" }, { arabic: "أَعْطَيْنَاكَ", latin: "a'toynaaka" }, { arabic: "الْكَوْثَرَ", latin: "l-kavsar" },
        { arabic: "فَصَلِّ", latin: "fasolli" }, { arabic: "لِرَبِّكَ", latin: "lirobbika" }, { arabic: "وَانْحَرْ", latin: "vanhar" },
        { arabic: "إِنَّ", latin: "inna" }, { arabic: "شَانِئَكَ", latin: "shaani'aka" }, { arabic: "هُوَ", latin: "huva" }, { arabic: "الْأَبْتَرُ", latin: "l-abtar" },
      ]
    },
  ]
};
