// Un web de gentil — NOYAU partage (extension + playground demo.html)
// Pur, sans dependance navigateur (sauf le hook d'exposition en bas).
// Detection multilingue + banques de reponses par THEME et INTENSITE.
(() => {
  "use strict";

  // --- normalisation : minuscule, sans accents, apostrophes droites -----------
  const norm = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[‘’ʼ]/g, "'");

  const LANGS = ["fr", "en", "es", "it", "de", "pt", "nl"];

  // --- lexiques "mechants" par langue ----------------------------------------
  const LEX = {
    fr: [
      "connard", "connasse", "salope", "encule", "enfoire", "ta gueule",
      "ferme la", "ferme ta gueule", "la ferme", "ferme ta", "creve",
      "va mourir", "debile", "abruti", "attarde", "imbecile", "cretin",
      "idiot", "stupide", "pauvre type", "nul a chier", "pede", "degage",
      "casse toi", "pourriture", "ordure", "minable", "tocard", "clochard",
      "parasite", "dechet", "sous-merde", "grosse vache", "moche",
      "tu es nul", "t es nul", "tes nul", "personne t aime"
    ],
    en: [
      "stupid", "moron", "loser", "ugly", "dumb", "shut up", "kill yourself",
      "kys", "pathetic", "worthless", "scum", "garbage", "idiot", "freak",
      "disgusting", "i hate you", "you suck", "retard", "trash", "jerk",
      "dumbass", "clown", "get a life", "nobody likes you", "cringe", "dipshit",
      "waste of space"
    ],
    es: [
      "idiota", "imbecil", "estupido", "estupida", "callate", "muerete",
      "basura", "asqueroso", "perdedor", "payaso", "inutil", "gilipollas",
      "cabron", "feo", "fea", "lameculos", "vete", "nadie te quiere",
      "das asco"
    ],
    it: [
      "idiota", "stupido", "stupida", "imbecille", "cretino", "scemo",
      "sfigato", "spazzatura", "schifoso", "brutto", "brutta", "taci",
      "muori", "coglione", "stronzo", "perdente", "nessuno ti vuole", "zitto"
    ],
    de: [
      "idiot", "dummkopf", "vollidiot", "halt die klappe", "halts maul",
      "verschwinde", "loser", "hasslich", "abschaum", "widerlich",
      "niemand mag dich", "stirb", "versager", "depp", "spast", "dumm"
    ],
    pt: [
      "idiota", "imbecil", "estupido", "estupida", "burro", "cala a boca",
      "lixo", "nojento", "feio", "feia", "perdedor", "ninguem gosta de voce",
      "morre", "otario", "palhaco", "vai embora"
    ],
    nl: [
      "idioot", "stommerik", "hou je mond", "verdwijn", "loser", "lelijk",
      "tuig", "walgelijk", "niemand houdt van je", "sterf", "mislukkeling",
      "eikel", "klootzak", "dom"
    ]
  };

  // --- THEMES (mascottes) : une banque de reponses par langue -----------------
  const BANKS = {
    nounours: {
      fr: [
        "🧸 Oh le pauvre chou, on lui a confisqué son câlin du matin ?",
        "🧸 Tellement de haine pour si peu de neurones. Courage, petit.",
        "🧸 J'ai lu ton commentaire à mon doudou. Même lui a eu pitié.",
        "🧸 Ça doit être épuisant d'être à la fois si fâché et si ignoré.",
        "🧸 Câlin OBLIGATOIRE. Tu débordes de besoin d'attention.",
        "🧸 Calme-toi, Sun Tzu du clavier, et va boire ton biberon.",
        "🧸 Quel courage derrière un écran ! Tiens, une médaille en chocolat.",
        "🧸 Trop mignon quand tu fais semblant d'avoir une opinion.",
        "🧸 On dirait que quelqu'un a sauté sa sieste ET son éducation.",
        "🧸 Plein de bisous sur ton petit ego tout fragile.",
        "🧸 Service gentillesse : ton commentaire a été câliné jusqu'à l'évanouissement.",
        "🧸 Aww, le troll a parlé. Quelqu'un lui donne une cacahuète ?",
        "🧸 1 nounours, 2 nounours… respire, ça va passer mon grand.",
        "🧸 Ton clavier méritait tellement mieux que ça."
      ],
      en: [
        "🧸 Aww, did someone skip their nap AND their manners?",
        "🧸 So brave behind a keyboard. Here's a participation cookie.",
        "🧸 Big feelings, tiny point. Have a hug anyway.",
        "🧸 Your comment got hugged into oblivion. You're welcome.",
        "🧸 Imagine being this mad and this ignored. Sending snacks.",
        "🧸 Calm down, keyboard warrior, and sip your juice box.",
        "🧸 Cutest little tantrum I've seen all day.",
        "🧸 Someone needs a nap, a cookie, and a personality.",
        "🧸 Wow, the troll speaks. Quick, fetch it a peanut.",
        "🧸 So much rage and nobody asked. Here's a teddy.",
        "🧸 Hugs for your fragile little ego.",
        "🧸 That keyboard deserved so much better, champ."
      ],
      es: [
        "🧸 Aww, ¿alguien se saltó la siesta Y los modales?",
        "🧸 Cuánta valentía detrás de una pantalla. Toma una galleta.",
        "🧸 Tu comentario ha sido abrazado hasta desaparecer.",
        "🧸 Tanta rabia y nadie preguntó. Ten un osito.",
        "🧸 Cálmate, guerrero del teclado, y bébete tu zumito.",
        "🧸 Qué berrinche más adorable.",
        "🧸 Alguien necesita una siesta y una personalidad.",
        "🧸 Vaya, el troll ha hablado. Que alguien le dé un cacahuete."
      ],
      it: [
        "🧸 Aww, qualcuno ha saltato la pennichella E le buone maniere?",
        "🧸 Quanto coraggio dietro uno schermo. Ecco un biscotto.",
        "🧸 Il tuo commento è stato abbracciato fino a sparire.",
        "🧸 Tanta rabbia e nessuno ha chiesto. Tieni un orsetto.",
        "🧸 Calmati, guerriero della tastiera, e bevi il tuo succo.",
        "🧸 Che capriccio adorabile.",
        "🧸 Qualcuno ha bisogno di un pisolino e di una personalità.",
        "🧸 Wow, il troll ha parlato. Dategli una nocciolina."
      ],
      de: [
        "🧸 Aww, hat jemand den Mittagsschlaf UND die Manieren verpasst?",
        "🧸 So mutig hinter einem Bildschirm. Hier, ein Keks.",
        "🧸 Dein Kommentar wurde zu Tode geknuddelt.",
        "🧸 So viel Wut und keiner hat gefragt. Hier, ein Teddy.",
        "🧸 Beruhig dich, Tastatur-Krieger, und trink dein Saftpäckchen.",
        "🧸 Was für ein süßer kleiner Wutanfall.",
        "🧸 Jemand braucht ein Nickerchen und eine Persönlichkeit.",
        "🧸 Oh, der Troll spricht. Schnell, gebt ihm eine Erdnuss."
      ],
      pt: [
        "🧸 Aww, alguém pulou a soneca E os modos?",
        "🧸 Quanta coragem atrás de uma tela. Toma um biscoito.",
        "🧸 Seu comentário foi abraçado até sumir.",
        "🧸 Tanta raiva e ninguém perguntou. Toma um ursinho.",
        "🧸 Calma, guerreiro do teclado, e bebe teu suquinho.",
        "🧸 Que birra mais fofa.",
        "🧸 Alguém precisa de uma soneca e de uma personalidade.",
        "🧸 Olha, o troll falou. Alguém dá um amendoim pra ele."
      ],
      nl: [
        "🧸 Aww, heeft iemand zijn dutje ÉN zijn manieren overgeslagen?",
        "🧸 Zo dapper achter een scherm. Hier, een koekje.",
        "🧸 Je reactie is doodgeknuffeld.",
        "🧸 Zoveel boosheid en niemand vroeg erom. Hier, een teddybeer.",
        "🧸 Rustig, toetsenbordstrijder, en drink je sapje.",
        "🧸 Wat een schattige driftbui.",
        "🧸 Iemand heeft een dutje en een persoonlijkheid nodig.",
        "🧸 Kijk, de troll praat. Geef hem snel een pinda."
      ]
    },

    chatons: {
      fr: [
        "🐱 Miaou. Traduction : tu as besoin d'un câlin et d'une sieste.",
        "🐱 *te fixe et cligne lentement* … pardonné, gros bêta.",
        "🐱 Ronron thérapeutique activé. Calme-toi, humain.",
        "🐱 J'ai poussé ta colère du bord de la table. Voilà.",
        "🐱 Tu fais le gros dos pour rien. Viens, on se lèche la patte."
      ],
      en: [
        "🐱 Meow. Translation: you need a hug and a nap.",
        "🐱 *slow blinks at you* … forgiven, you big silly.",
        "🐱 Therapeutic purring engaged. Calm down, human.",
        "🐱 I knocked your anger off the table. There.",
        "🐱 All that arching for nothing. Come, let's groom."
      ],
      es: [
        "🐱 Miau. Traducción: necesitas un abrazo y una siesta.",
        "🐱 *parpadeo lento* … perdonado, bobo.",
        "🐱 Ronroneo terapéutico activado. Cálmate, humano."
      ],
      it: [
        "🐱 Miao. Traduzione: ti servono un abbraccio e un pisolino.",
        "🐱 *ti fisso e sbatto le palpebre piano* … perdonato, sciocco.",
        "🐱 Fusa terapeutiche attivate. Calmati, umano."
      ],
      de: [
        "🐱 Miau. Übersetzung: du brauchst eine Umarmung und ein Nickerchen.",
        "🐱 *blinzelt dich langsam an* … verziehen, du Dummerchen.",
        "🐱 Therapeutisches Schnurren aktiviert. Beruhig dich, Mensch."
      ],
      pt: [
        "🐱 Miau. Tradução: você precisa de um abraço e uma soneca.",
        "🐱 *pisca devagar pra você* … perdoado, bobão.",
        "🐱 Ronronar terapêutico ativado. Calma, humano."
      ],
      nl: [
        "🐱 Miauw. Vertaling: jij hebt een knuffel en een dutje nodig.",
        "🐱 *knippert langzaam naar je* … vergeven, dommerd.",
        "🐱 Therapeutisch spinnen geactiveerd. Rustig, mens."
      ]
    },

    meme: {
      fr: [
        "👵 Oh mon poussin, tu as mangé au moins ? Tiens, prends un bonbon.",
        "👵 Viens là que je te pince la joue, vilain ronchon.",
        "👵 De mon temps on disait pas ça, mais je t'aime quand même.",
        "👵 Mets ton écharpe et arrête de crier, tu vas t'enrhumer.",
        "👵 J'ai connu pire que toi, et je leur ai fait des gâteaux."
      ],
      en: [
        "👵 Oh sweetie, did you even eat? Here, have a candy.",
        "👵 Come here so I can pinch that grumpy little cheek.",
        "👵 In my day we didn't say that, but I love you anyway.",
        "👵 Put on a scarf and stop shouting, you'll catch a cold.",
        "👵 I've met worse than you, and I baked them cookies."
      ],
      es: [
        "👵 Ay, mi cielo, ¿has comido? Toma un caramelo.",
        "👵 Ven que te pellizque ese mofletito gruñón.",
        "👵 En mis tiempos no se decía eso, pero te quiero igual."
      ],
      it: [
        "👵 Tesoro, ma hai mangiato? Tieni, una caramella.",
        "👵 Vieni qui che ti pizzico quella guancia musona.",
        "👵 Ai miei tempi non si diceva, ma ti voglio bene lo stesso."
      ],
      de: [
        "👵 Ach, mein Schatz, hast du überhaupt gegessen? Hier, ein Bonbon.",
        "👵 Komm her, ich zwick dir das grummelige Bäckchen.",
        "👵 Zu meiner Zeit sagte man das nicht, aber ich hab dich trotzdem lieb."
      ],
      pt: [
        "👵 Ai, meu anjo, você comeu? Toma uma balinha.",
        "👵 Vem cá que eu belisco essa bochecha rabugenta.",
        "👵 No meu tempo não se dizia isso, mas te amo do mesmo jeito."
      ],
      nl: [
        "👵 Ach, schatje, heb je wel gegeten? Hier, een snoepje.",
        "👵 Kom hier, dan knijp ik even in dat humeurige wangetje.",
        "👵 In mijn tijd zei men dat niet, maar ik hou toch van je."
      ]
    },

    bobross: {
      fr: [
        "🎨 Pas d'erreurs, juste de petits accidents heureux. Respire.",
        "🎨 On ajoute un petit arbre ami juste là, et la colère s'efface.",
        "🎨 Ton commentaire ? Un nuage gris. On le rend tout doux.",
        "🎨 Tape ta colère sur la toile, pas sur les gens. Voilà.",
        "🎨 Chaque troll mérite un petit buisson joyeux pour se cacher."
      ],
      en: [
        "🎨 No mistakes, just happy little accidents. Breathe.",
        "🎨 We'll add a friendly little tree right here, anger gone.",
        "🎨 Your comment? A grey cloud. Let's make it soft.",
        "🎨 Beat the devil out of the canvas, not people. There.",
        "🎨 Every troll deserves a happy little bush to hide in."
      ],
      es: [
        "🎨 No hay errores, solo accidentes felices. Respira.",
        "🎨 Ponemos un arbolito amigo aquí y la rabia se va.",
        "🎨 ¿Tu comentario? Una nube gris. La hacemos suave."
      ],
      it: [
        "🎨 Nessun errore, solo piccoli incidenti felici. Respira.",
        "🎨 Mettiamo un alberello amico qui e la rabbia sparisce.",
        "🎨 Il tuo commento? Una nuvola grigia. La rendiamo morbida."
      ],
      de: [
        "🎨 Keine Fehler, nur kleine glückliche Zufälle. Atme.",
        "🎨 Wir malen hier ein freundliches Bäumchen, Wut weg.",
        "🎨 Dein Kommentar? Eine graue Wolke. Machen wir sie weich."
      ],
      pt: [
        "🎨 Sem erros, só pequenos acidentes felizes. Respira.",
        "🎨 A gente põe uma arvorezinha amiga aqui e a raiva vai embora.",
        "🎨 Seu comentário? Uma nuvem cinza. Vamos deixá-la fofa."
      ],
      nl: [
        "🎨 Geen fouten, alleen vrolijke ongelukjes. Adem.",
        "🎨 We zetten hier een vriendelijk boompje, woede weg.",
        "🎨 Je reactie? Een grijze wolk. We maken 'm zacht."
      ]
    }
  };

  // liste pour l'UI (ordre d'affichage)
  const THEMES = [
    { id: "nounours", emoji: "🧸", label: "Nounours" },
    { id: "chatons", emoji: "🐱", label: "Chatons" },
    { id: "meme", emoji: "👵", label: "Mémé" },
    { id: "bobross", emoji: "🎨", label: "Bob Ross" }
  ];

  // --- INTENSITE --------------------------------------------------------------
  // doux  : pur réconfort (on lâche la mascotte, juste de la tendresse)
  // medium: la banque du thème telle quelle
  // hardcore: banque du thème + une pique finale
  const SOFT = {
    fr: ["💛 Tout va bien se passer, promis.", "💛 Tu vaux mieux que ce commentaire.", "💛 Respire un coup, je suis là.", "💛 Un peu de douceur ne fait de mal à personne."],
    en: ["💛 It's going to be okay, promise.", "💛 You're better than this comment.", "💛 Take a breath, I've got you.", "💛 A little kindness never hurt anyone."],
    es: ["💛 Todo va a estar bien, te lo prometo.", "💛 Vales más que este comentario.", "💛 Respira, estoy aquí.", "💛 Un poco de dulzura no le hace daño a nadie."],
    it: ["💛 Andrà tutto bene, promesso.", "💛 Vali più di questo commento.", "💛 Respira, ci sono io.", "💛 Un po' di dolcezza non fa male a nessuno."],
    de: ["💛 Es wird alles gut, versprochen.", "💛 Du bist mehr wert als dieser Kommentar.", "💛 Atme durch, ich bin da.", "💛 Ein bisschen Sanftheit schadet nie."],
    pt: ["💛 Vai ficar tudo bem, prometo.", "💛 Você vale mais que esse comentário.", "💛 Respira, estou aqui.", "💛 Um pouco de doçura não faz mal a ninguém."],
    nl: ["💛 Het komt allemaal goed, beloofd.", "💛 Je bent meer waard dan deze reactie.", "💛 Haal even adem, ik ben er.", "💛 Een beetje liefde kan geen kwaad."]
  };
  const SAVAGE = {
    fr: ["Ne me remercie pas.", "Bisou quand même, champion du vide.", "C'était cadeau.", "Range ta colère, elle dépasse."],
    en: ["Don't thank me.", "Hug anyway, champ of nothing.", "That one's on the house.", "Tuck that rage back in, it's showing."],
    es: ["No me lo agradezcas.", "Besito igual, campeón del vacío.", "Va de regalo.", "Guarda esa rabia, se te ve."],
    it: ["Non ringraziarmi.", "Bacio comunque, campione del nulla.", "Offre la casa.", "Rimetti via quella rabbia, si vede."],
    de: ["Nicht danken.", "Trotzdem ein Küsschen, Champion des Nichts.", "Geht aufs Haus.", "Pack deine Wut weg, man sieht sie."],
    pt: ["Não precisa agradecer.", "Beijinho mesmo assim, campeão do vazio.", "Esse é cortesia.", "Guarda essa raiva, está aparecendo."],
    nl: ["Niet bedanken.", "Toch een kusje, kampioen van niks.", "Deze is van het huis.", "Stop die woede weg, ze piept eruit."]
  };

  // --- easter egg : le Nounours Légendaire (rare, doré) ----------------------
  const LEGENDARY = {
    fr: ["🌟 ✨ NOUNOURS LÉGENDAIRE ✨ Ta méchanceté a réveillé l'Ours Doré… il te pardonne. 🐻", "🌟 COUP CRITIQUE DE GENTILLESSE ! +100 câlins. ✨"],
    en: ["🌟 ✨ LEGENDARY TEDDY ✨ Your meanness woke the Golden Bear… he forgives you. 🐻", "🌟 CRITICAL HIT OF KINDNESS! +100 hugs. ✨"],
    es: ["🌟 ✨ OSITO LEGENDARIO ✨ Tu maldad despertó al Oso Dorado… te perdona. 🐻", "🌟 ¡GOLPE CRÍTICO DE TERNURA! +100 abrazos. ✨"],
    it: ["🌟 ✨ ORSETTO LEGGENDARIO ✨ La tua cattiveria ha svegliato l'Orso Dorato… ti perdona. 🐻", "🌟 COLPO CRITICO DI GENTILEZZA! +100 abbracci. ✨"],
    de: ["🌟 ✨ LEGENDÄRER TEDDY ✨ Deine Gemeinheit weckte den Goldenen Bären… er vergibt dir. 🐻", "🌟 KRITISCHER TREFFER DER FREUNDLICHKEIT! +100 Umarmungen. ✨"],
    pt: ["🌟 ✨ URSINHO LENDÁRIO ✨ Tua maldade acordou o Urso Dourado… ele te perdoa. 🐻", "🌟 ACERTO CRÍTICO DE TERNURA! +100 abraços. ✨"],
    nl: ["🌟 ✨ LEGENDARISCHE TEDDY ✨ Je gemeenheid wekte de Gouden Beer… hij vergeeft je. 🐻", "🌟 KRITIEKE TREFFER VAN VRIENDELIJKHEID! +100 knuffels. ✨"]
  };

  // --- bulle d'aide localisee -------------------------------------------------
  const HINT = {
    fr: "Un web de gentil — message d'origine masqué (clic pour révéler)",
    en: "Nice Web — original message hidden (click to reveal)",
    es: "Una web amable — mensaje original oculto (clic para revelar)",
    it: "Un web gentile — messaggio originale nascosto (clic per rivelare)",
    de: "Ein nettes Web — Originalnachricht versteckt (klicken zum Anzeigen)",
    pt: "Uma web gentil — mensagem original oculta (clique para revelar)",
    nl: "Een lief web — originele bericht verborgen (klik om te tonen)"
  };

  // --- niveaux (gamification) -------------------------------------------------
  const LEVELS = [
    { min: 0, title: "Nouveau-né nounours" },
    { min: 10, title: "Apprenti Câlin" },
    { min: 50, title: "Gardien du Miel" },
    { min: 150, title: "Maître Câlin" },
    { min: 400, title: "Sensei des Ours" },
    { min: 1000, title: "Légende du Miel" }
  ];

  function levelFor(total) {
    total = total || 0;
    let cur = LEVELS[0];
    let next = null;
    for (let i = 0; i < LEVELS.length; i++) {
      if (total >= LEVELS[i].min) cur = LEVELS[i];
      else { next = LEVELS[i]; break; }
    }
    return { title: cur.title, min: cur.min, next };
  }

  // --- detection --------------------------------------------------------------
  const escapeRe = (w) => norm(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const RES = {};
  for (const lg of LANGS) {
    const alt = LEX[lg].map(escapeRe).join("|");
    RES[lg] = new RegExp("(^|[^\\p{L}])(" + alt + ")([^\\p{L}]|$)", "u");
  }

  function detect(text, preferred) {
    const t = norm(text);
    const order = [preferred, ...LANGS.filter((l) => l !== preferred)].filter(
      (l) => RES[l]
    );
    for (const lg of order) {
      if (RES[lg].test(t)) return lg;
    }
    return null;
  }

  // --- reponse ----------------------------------------------------------------
  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  const pickFrom = (arr, seed) => arr[hash(seed) % arr.length];

  // ~1 commentaire mechant sur 25 reveille le Nounours Legendaire (stable par texte)
  const isLegendary = (seed) => hash(String(seed || "")) % 25 === 0;

  function reply(opts) {
    const o = opts || {};
    const theme = o.theme || "nounours";
    const intensity = o.intensity || "medium";
    const lang = o.lang || "fr";
    const seed = o.seed || "";

    if (o.legendary) return pickFrom(LEGENDARY[lang] || LEGENDARY.en, seed);

    let base;
    if (intensity === "doux") {
      base = pickFrom(SOFT[lang] || SOFT.en, seed);
    } else {
      const banks = BANKS[theme] || BANKS.nounours;
      const bank =
        banks[lang] || banks.en || BANKS.nounours[lang] || BANKS.nounours.en;
      base = pickFrom(bank, seed);
    }
    if (intensity === "hardcore") {
      const pool = SAVAGE[lang] || SAVAGE.en;
      base = base + " " + pickFrom(pool, seed + "#");
    }
    return base;
  }

  function themeEmoji(id) {
    const t = THEMES.find((x) => x.id === id);
    return t ? t.emoji : "🧸";
  }

  const api = {
    LANGS, THEMES, LEVELS, HINT,
    norm, detect, reply, levelFor, themeEmoji, isLegendary
  };

  if (typeof window !== "undefined") window.UWGCore = api;
  if (typeof globalThis !== "undefined") globalThis.UWGCore = api;
})();
