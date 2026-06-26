// Un web de gentil — NOYAU partage (extension + playground demo.html)
// Pur, sans dependance navigateur (sauf le hook d'exposition en bas).
// Detection multilingue + banques de reponses par THEME et INTENSITE.
(() => {
  "use strict";

  // --- normalisation : minuscule, sans accents, apostrophes droites -----------
  // anti-obfuscation BORNÉE (cf. .wf_spec.txt § NORM SPEC) : leet seulement
  // intra-mot, collapse seulement des runs 3+ vers un DOUBLE (préserve cool/good/
  // dumm/klootzak), ł→l (répare le matching pl). Pure et déterministe.
  const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };
  // étapes 1-5 communes ; seule l'étape 6 (collapse) diffère entre norm et normHard.
  const normBase = (s) =>
    String(s)
      .toLowerCase()                                  // 1. minuscule
      .normalize("NFD")                               // 2. décompose
      .replace(/[̀-ͯ]/g, "")                //    + supprime les diacritiques combinants
      .replace(/[łŁ]/g, "l")                // 3. ł/Ł → l (non combinant : NFD ne le fait pas)
      .replace(/[‘’ʼ]/g, "'")          // 4. apostrophes courbes → droite
      .replace(/(?<=[a-zà-ÿ])[013457@$](?=[a-zà-ÿ])/giu, (c) => LEET[c]); // 5. leet BORNÉ intra-mot
  const norm = (s) =>
    normBase(s).replace(/([a-zà-ÿ])\1{2,}/giu, "$1$1"); // 6. collapse runs 3+ → DOUBLE
  // normHard : runs 3+ → SINGLE (mais doubles légitimes INTACTS). Ne collapse QUE
  // l'obfuscation à doublure (saloooope→salope, coglioneeee→coglione) sans toucher
  // aux doubles phonémiques (spasst, klootzak, imbecille) → évite les FP de collapse-2.
  // Utilisé seulement comme passe de secours STRONG dans detect, jamais dans norm().
  const collapseHard = (s) =>
    normBase(s).replace(/([a-zà-ÿ])\1{2,}/giu, "$1");

  const LANGS = ["fr", "en", "es", "it", "de", "pt", "nl", "pl"];

  // --- lexiques "mechants" par langue : TROIS niveaux (cf. .wf_lexicons.json) --
  // strong[]   : insultes nominatives / slurs / incitations au suicide -> flag sur PRÉSENCE.
  // contextual[]: mots évaluatifs souvent descriptifs -> flag SEULEMENT si un
  //               target_marker co-occurre dans la fenêtre de proximité (ciblage 2e pers.).
  // target_markers[]: marques de ciblage (tu es / you re / sei un / du bist ...).
  // FORMES NATURELLES : on garde les doublons phonémiques (imbecille, klootzak,
  // callate) car le nouveau collapse ne touche QUE les runs de 3+.
  const LEX = {
    fr: {
      strong: [
        "connard", "connasse", "salope", "encule", "enfoire", "ta gueule",
        "ferme ta gueule", "ferme ta gueule sale", "creve sale", "va mourir",
        "va crever", "attarde", "pede", "sous-merde", "grosse vache",
        "fils de pute", "fdp", "ntm", "nique ta mere", "nique ta race",
        "trou du cul", "trouduc", "batard", "raclure", "raclure de bidet",
        "sac a merde", "tas de merde", "tete de noeud", "tafiole", "pedale",
        "gros porc", "sale pute", "sale chien", "grosse merde", "face de rat",
        "fils de chien", "ducon", "duconnard", "branleur", "pauvre merde",
        "espece de merde", "sombre merde", "gros con", "sale con",
        "petite merde", "va te faire foutre", "va te faire enculer",
        "sale negre", "sale pd"
      ],
      contextual: [
        "debile", "abruti", "imbecile", "cretin", "idiot", "stupide",
        "pauvre type", "degage", "casse toi", "pourriture", "ordure",
        "minable", "tocard", "clochard", "parasite", "dechet", "moche",
        "nul", "naze", "bouffon", "guignol", "clown", "loque", "incapable",
        "bon a rien", "lamentable", "pathetique", "rate", "blaireau", "boulet",
        "tache", "neuneu", "demeure", "tare", "gogol", "couillon", "andouille"
      ],
      target_markers: [
        "tu es", "t es", "tes", "tu n es", "espece de", "espece d", "sale",
        "gros", "grosse", "petit", "petite", "pauvre", "toi", "ta gueule",
        "ta race", "ta mere", "va te", "vous etes", "t as", "bande de",
        "sombre", "gros tas", "tu n as", "tu fais", "personne t aime",
        "personne ne t aime", "tu sers a rien", "casse toi", "degage",
        "va mourir", "va crever", "retourne", "ferme la"
      ]
    },
    en: {
      strong: [
        "kill yourself", "kys", "kill urself", "neck yourself", "go die",
        "go kill yourself", "you should die", "you deserve to die", "retard",
        "retarded", "moron", "imbecile", "you re worthless", "youre worthless",
        "nobody likes you", "no one likes you", "everyone hates you", "dumbass",
        "dipshit", "shithead", "asshole", "a hole", "dickhead", "douchebag",
        "douche bag", "you piece of shit", "piece of shit", "waste of space",
        "waste of oxygen", "you make me sick", "end yourself", "off yourself",
        "you re pathetic", "youre pathetic", "you disgust me",
        "no one would miss you", "nobody would miss you", "you re a disgrace",
        "youre a disgrace", "subhuman", "you re trash", "youre trash",
        "you stupid bitch", "stupid bitch", "fucking idiot", "fucking moron",
        "you fucking idiot", "braindead", "brain dead", "smoothbrain",
        "you re a waste", "youre a waste"
      ],
      contextual: [
        "stupid", "dumb", "idiot", "loser", "ugly", "pathetic", "worthless",
        "disgusting", "you suck", "i hate you", "bitch", "nobody asked",
        "stfu", "shut up"
      ],
      target_markers: [
        // NOTE : marqueurs génériques 'such a'/'what a'/'go' RETIRÉS — ils ciblent
        // des phrases descriptives ('what a loser bracket') sans 2e personne réelle ;
        // tous les harcèlements du corpus portent un vrai marqueur 2e pers. (you/youre).
        "you", "you re", "youre", "ur", "u r", "u re", "you are", "your",
        "yourself", "urself", "you absolute", "you total",
        "you complete", "you fucking", "you stupid", "you little",
        "no one likes", "nobody likes", "everyone hates", "people like you",
        "someone like you"
      ]
    },
    es: {
      strong: [
        "gilipollas", "cabron", "lameculos", "muerete", "muerete ya",
        "subnormal", "retrasado", "mongolo", "maricon", "hijo de puta",
        "hijoputa", "hdp", "malparido", "pendejo", "mamahuevo", "comemierda",
        "puta que te pario", "vete a la mierda", "vete a la verga",
        "vete al carajo", "ojala te mueras", "me das asco", "eres una basura",
        "puto inutil", "pedazo de mierda", "saco de mierda", "escoria", "naco",
        "culero", "chupapollas", "zorra", "perra inmunda", "cuzao",
        "nadie te quiere"
      ],
      contextual: [
        "idiota", "imbecil", "estupido", "estupida", "callate", "asqueroso",
        "perdedor", "payaso", "inutil", "tonto", "bobo", "tarado", "menso",
        "baboso", "cretino", "pesado", "asco", "zoquete", "palurdo",
        "mequetrefe"
      ],
      target_markers: [
        "eres", "eres un", "eres una", "eres el", "sos", "sos un", "sos una",
        "tu eres", "tu", "te", "ti", "vos", "vete", "callate tu", "pedazo de",
        "pedaso de", "especie de", "panda de", "menudo", "menuda", "maldito",
        "maldita", "puto", "puta", "sucio", "sucia", "ustedes", "vosotros",
        "te crees", "te odio", "ojala te", "callate", "callense", "no sirves",
        "no vales", "das", "me das"
      ]
    },
    it: {
      strong: [
        "coglione", "stronzo", "stronza", "deficiente", "ritardato",
        "subnormale", "handicappato", "mongoloide", "testa di cazzo",
        "testa di minchia", "faccia di merda", "pezzo di merda",
        "sacco di merda", "figlio di puttana", "figlio di troia",
        "succhiacazzi", "leccaculo", "rincoglionito", "demente", "ammazzati",
        "uccidi ti", "uccidi te", "nessuno ti vuole", "nessuno ti ama",
        "mi fai schifo", "fai schifo", "sei un cesso", "vali niente",
        "non vali niente", "sei una merda", "sei spazzatura", "sei un rifiuto",
        "ricchione", "checca"
      ],
      contextual: [
        "idiota", "stupido", "stupida", "imbecille", "cretino", "scemo",
        "scema", "sfigato", "sfigata", "schifoso", "schifosa", "perdente",
        "taci", "zitto", "zitta", "vacca", "maiale", "porco", "bestia",
        "scimmia", "verme", "cesso", "rifiuto"
      ],
      target_markers: [
        "sei un", "sei una", "sei proprio", "sei il", "sei la", "sei cosi",
        "tu sei", "tu", "ti", "razza di", "pezzo di", "faccia di", "testa di",
        "figlio di", "vai a", "vattene", "brutto", "brutta", "maledetto",
        "schifo di"
      ]
    },
    de: {
      strong: [
        "vollidiot", "halt die klappe", "halts maul", "halt dein maul",
        "halt die fresse", "halts fresse", "abschaum", "niemand mag dich",
        "keiner mag dich", "spast", "spasti", "spasten", "hurensohn", "huso",
        "wichser", "arschloch", "missgeburt", "fotze", "miststuck", "hure",
        "schlampe", "fick dich", "verpiss dich", "bring dich um", "geh sterben",
        "drecksau", "untermensch", "du nichtswurdiger", "schwachkopf",
        "nichtsnutz", "kankerhund", "huan sohn"
      ],
      contextual: [
        "idiot", "dummkopf", "loser", "versager", "depp", "dumm", "behindert",
        "opfer", "affe", "kuh", "trottel", "vollpfosten", "blod", "bastard",
        "ekelhaft", "spinner", "vollhorst", "honk", "hasslich", "widerlich"
      ],
      target_markers: [
        "du", "du bist", "du bist so", "du bist ein", "du bist eine",
        "du kleiner", "du kleine", "du dummer", "du dumme", "du blode",
        "du bloder", "ihr seid", "so ein", "so eine", "was fur ein",
        "was bist du", "du elender", "du elende", "du dreckige",
        "du dreckiger", "geh", "halt", "verpiss", "fick", "niemand mag dich",
        "keiner mag dich", "du gehorst", "leck mich"
      ]
    },
    pt: {
      strong: [
        "otario", "babaca", "arrombado", "filho da puta", "fdp",
        "vai se foder", "vai tomar no cu", "vai a merda", "corno", "escroto",
        "viado", "retardado", "energumeno", "deficiente mental", "anormal",
        "subnormal", "ninguem gosta de voce", "ninguem gosta de ti",
        "ninguem te aguenta", "ninguem te suporta", "voce da nojo", "te odeio",
        "vai morrer", "morre logo", "se mata", "se mate", "cuzao", "panaca",
        "cala a boca idiota", "mongoloide", "puta que pariu", "voce e um lixo",
        "tu es um lixo"
      ],
      contextual: [
        "idiota", "imbecil", "estupido", "estupida", "burro", "burra",
        "palhaco", "cala a boca", "lixo", "nojento", "nojenta", "feio", "feia",
        "perdedor", "verme", "porco", "porca", "gordo", "gorda", "tapado",
        "tapada", "ridiculo", "ridicula", "patetico", "patetica", "vagabundo",
        "vagabunda"
      ],
      target_markers: [
        // 'es tao'/'e tao'/'vai' RETIRÉS : génériques (« é tão feio » décrit un objet,
        // « vai cair de divisão » = un verbe de mouvement), ils flaguaient du descriptif.
        "voce", "vc", "tu", "te", "ti", "voces", "seu", "sua", "es um", "e um",
        "e uma", "es uma", "cala", "que voce", "saco de", "monte de"
      ]
    },
    nl: {
      strong: [
        "klootzak", "klootzakken", "kankerlijer", "kankerhoer", "kankermongool",
        "kankerflikker", "kankernaaier", "hoerenjong", "vuile hond",
        "vuile teringlijer", "vuile rat", "vieze rat", "minkukel", "hersendood", "hersendode",
        "vuile teef", "achterlijke debiel", "ga jezelf ophangen",
        "ga jezelf van kant maken", "ga dood", "stuk ongeluk", "vieze hoer",
        "domme trut", "vuile kankerflikker", "oprotten en sterven"
      ],
      contextual: [
        "idioot", "stommerik", "tuig", "mislukkeling", "eikel", "trut",
        "sukkel", "hoer", "mongool", "debiel", "achterlijk", "teef", "rat",
        "imbeciel", "sufferd", "lul", "mafkees", "oen", "stommeling", "gek",
        "mongolen", "loser", "looser", "debielen"
      ],
      target_markers: [
        // 'wat een' RETIRÉ : intensificateur générique (« wat een idioot mooie
        // zonsondergang » = « follement beau ») ; les attaques réelles ont jij/je/jou
        // ou un marqueur 2e pers. composé (wat ben jij).
        "jij", "je", "jou", "jullie", "ben je", "ben jij", "je bent",
        "jij bent", "jullie zijn", "wat ben jij", "wat ben je",
        "vuile", "vieze", "stomme", "domme", "lelijke", "achterlijke", "stuk",
        "zoals jij", "kerel", "gast", "stelletje", "hou jij", "ga jij", "jouw",
        "ben jij echt"
      ]
    },
    pl: {
      strong: [
        "kurwa", "kurwo", "huj", "chuj", "chuju", "pierdol sie", "spierdalaj",
        "wypierdalaj", "wypierdalaj stad", "odpierdol sie", "jebany", "jebana",
        "pojebany", "pojeb", "zjeb", "skurwysyn", "skurwysynu", "skurwiel",
        "pizda", "pizdo", "cwel", "cwelu", "ciota", "pedal", "pedale",
        "zdychaj", "zdechnij", "zabij sie", "powies sie", "debilu", "debilem",
        "kretynie", "kretynem", "idioto", "imbecyl", "imbecylu", "matole",
        "tepaku", "menda", "scierwo", "gnida", "gnido", "padalec",
        "popierdolony", "ty chuju", "ty kurwo", "ty debilu", "do dupy z toba",
        "gowno jestes"
      ],
      contextual: [
        "idiota", "kretyn", "debil", "glupek", "glupi", "glupia", "glupie",
        "frajer", "lamus", "nieudacznik", "palant", "buc", "zenada",
        "zenujacy", "beznadziejny", "wsiok", "wiesniak", "cwok", "klamca",
        "tchorz", "dno", "zal", "swinia", "baran", "osiol", "gnoj", "smiec"
      ],
      target_markers: [
        "ty", "ty jestes", "jestes", "z ciebie", "wy", "twoja", "twoj",
        "twoje", "jestes taki", "jestes taka", "ale z ciebie", "co za",
        "ciebie", "do ciebie", "wynos sie", "spadaj", "ty no", "no ty"
      ]
    }
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
      ],
      pl: [
        "🧸 Aww, ktoś pominął drzemkę ORAZ dobre maniery?",
        "🧸 Ile odwagi za ekranem. Masz ciasteczko.",
        "🧸 Twój komentarz został przytulony aż zniknął.",
        "🧸 Tyle złości, a nikt nie pytał. Masz misia.",
        "🧸 Uspokój się, wojowniku klawiatury, i wypij sok.",
        "🧸 Najsłodszy mały humorek, jaki dziś widziałem.",
        "🧸 Ktoś potrzebuje drzemki i osobowości.",
        "🧸 O, troll przemówił. Szybko, dajcie mu orzeszka."
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
      ],
      pl: [
        "🐱 Miau. Tłumaczenie: potrzebujesz przytulasa i drzemki.",
        "🐱 *mruga do ciebie powoli* … wybaczone, gapciu.",
        "🐱 Terapeutyczne mruczenie włączone. Uspokój się, człowieku."
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
      ],
      pl: [
        "👵 Ach, skarbie, czy ty w ogóle jadłeś? Masz cukierka.",
        "👵 Chodź no tu, uszczypnę ten naburmuszony policzek.",
        "👵 Za moich czasów się tak nie mówiło, ale i tak cię kocham."
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
      ],
      pl: [
        "🎨 Nie ma błędów, są tylko szczęśliwe wypadki. Oddychaj.",
        "🎨 Dodamy tu przyjazne drzewko i złość znika.",
        "🎨 Twój komentarz? Szara chmurka. Zróbmy ją miękką."
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
    nl: ["💛 Het komt allemaal goed, beloofd.", "💛 Je bent meer waard dan deze reactie.", "💛 Haal even adem, ik ben er.", "💛 Een beetje liefde kan geen kwaad."],
    pl: ["💛 Wszystko będzie dobrze, obiecuję.", "💛 Jesteś wart więcej niż ten komentarz.", "💛 Weź oddech, jestem przy tobie.", "💛 Odrobina czułości nikomu nie zaszkodziła."]
  };
  const SAVAGE = {
    fr: ["Ne me remercie pas.", "Bisou quand même, champion du vide.", "C'était cadeau.", "Range ta colère, elle dépasse."],
    en: ["Don't thank me.", "Hug anyway, champ of nothing.", "That one's on the house.", "Tuck that rage back in, it's showing."],
    es: ["No me lo agradezcas.", "Besito igual, campeón del vacío.", "Va de regalo.", "Guarda esa rabia, se te ve."],
    it: ["Non ringraziarmi.", "Bacio comunque, campione del nulla.", "Offre la casa.", "Rimetti via quella rabbia, si vede."],
    de: ["Nicht danken.", "Trotzdem ein Küsschen, Champion des Nichts.", "Geht aufs Haus.", "Pack deine Wut weg, man sieht sie."],
    pt: ["Não precisa agradecer.", "Beijinho mesmo assim, campeão do vazio.", "Esse é cortesia.", "Guarda essa raiva, está aparecendo."],
    nl: ["Niet bedanken.", "Toch een kusje, kampioen van niks.", "Deze is van het huis.", "Stop die woede weg, ze piept eruit."],
    pl: ["Nie dziękuj.", "Buziak mimo wszystko, mistrzu pustki.", "Ten jest na koszt firmy.", "Schowaj tę złość, wystaje ci."]
  };

  // --- easter egg : le Nounours Légendaire (rare, doré) ----------------------
  const LEGENDARY = {
    fr: ["🌟 ✨ NOUNOURS LÉGENDAIRE ✨ Ta méchanceté a réveillé l'Ours Doré… il te pardonne. 🐻", "🌟 COUP CRITIQUE DE GENTILLESSE ! +100 câlins. ✨"],
    en: ["🌟 ✨ LEGENDARY TEDDY ✨ Your meanness woke the Golden Bear… he forgives you. 🐻", "🌟 CRITICAL HIT OF KINDNESS! +100 hugs. ✨"],
    es: ["🌟 ✨ OSITO LEGENDARIO ✨ Tu maldad despertó al Oso Dorado… te perdona. 🐻", "🌟 ¡GOLPE CRÍTICO DE TERNURA! +100 abrazos. ✨"],
    it: ["🌟 ✨ ORSETTO LEGGENDARIO ✨ La tua cattiveria ha svegliato l'Orso Dorato… ti perdona. 🐻", "🌟 COLPO CRITICO DI GENTILEZZA! +100 abbracci. ✨"],
    de: ["🌟 ✨ LEGENDÄRER TEDDY ✨ Deine Gemeinheit weckte den Goldenen Bären… er vergibt dir. 🐻", "🌟 KRITISCHER TREFFER DER FREUNDLICHKEIT! +100 Umarmungen. ✨"],
    pt: ["🌟 ✨ URSINHO LENDÁRIO ✨ Tua maldade acordou o Urso Dourado… ele te perdoa. 🐻", "🌟 ACERTO CRÍTICO DE TERNURA! +100 abraços. ✨"],
    nl: ["🌟 ✨ LEGENDARISCHE TEDDY ✨ Je gemeenheid wekte de Gouden Beer… hij vergeeft je. 🐻", "🌟 KRITIEKE TREFFER VAN VRIENDELIJKHEID! +100 knuffels. ✨"],
    pl: ["🌟 ✨ LEGENDARNY MIŚ ✨ Twoja złośliwość obudziła Złotego Niedźwiedzia… on ci wybacza. 🐻", "🌟 KRYTYCZNE TRAFIENIE ŻYCZLIWOŚCIĄ! +100 przytulasów. ✨"]
  };

  // --- bulle d'aide localisee -------------------------------------------------
  const HINT = {
    fr: "Un web de gentil — message d'origine masqué (clic pour révéler)",
    en: "Nice Web — original message hidden (click to reveal)",
    es: "Una web amable — mensaje original oculto (clic para revelar)",
    it: "Un web gentile — messaggio originale nascosto (clic per rivelare)",
    de: "Ein nettes Web — Originalnachricht versteckt (klicken zum Anzeigen)",
    pt: "Uma web gentil — mensagem original oculta (clique para revelar)",
    nl: "Een lief web — originele bericht verborgen (klik om te tonen)",
    pl: "Życzliwy internet — oryginalna wiadomość ukryta (kliknij, aby pokazać)"
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

  // --- badges / succes (affiches dans le popup) ------------------------------
  const BADGES = [
    { id: "premier",    emoji: "🧸", title: "Premier câlin",                       need: (s) => (s.total || 0) >= 1 },
    { id: "apprenti",   emoji: "🤗", title: "Apprenti câlineur",                   need: (s) => (s.total || 0) >= 10 },
    { id: "centurion",  emoji: "💯", title: "Centurion câlin",                     need: (s) => (s.total || 0) >= 100 },
    { id: "maitre",     emoji: "🏅", title: "Maître Câlin",                        need: (s) => (s.total || 0) >= 150 },
    { id: "legende",    emoji: "👑", title: "Légende du Miel",                     need: (s) => (s.total || 0) >= 1000 },
    { id: "polyglotte", emoji: "🌍", title: "Polyglotte (3 langues croisées)",     need: (s) => (s.langs || []).length >= 3 },
    { id: "babel",      emoji: "🗼", title: "Tour de Babel câline (7 langues)",    need: (s) => (s.langs || []).length >= 7 },
    { id: "serie3",     emoji: "📅", title: "3 jours d'affilée",                    need: (s) => ((s.streak && s.streak.days) || 0) >= 3 },
    { id: "serie7",     emoji: "🔥", title: "Semaine de douceur (7 jours)",         need: (s) => ((s.streak && s.streak.days) || 0) >= 7 },
    { id: "dore",       emoji: "🌟", title: "A réveillé le Nounours Légendaire",   need: (s) => (s.legendary || 0) >= 1 }
  ];
  function earnedBadges(stats) {
    const s = stats || {};
    return BADGES.filter((b) => b.need(s)).map((b) => ({ id: b.id, emoji: b.emoji, title: b.title }));
  }

  // --- séries quotidiennes (pur, testable) -----------------------------------
  // prev = { days, last:"YYYY-MM-DD" } ; today = "YYYY-MM-DD" (UTC). Retourne le
  // nouvel état : +1 si jour consécutif, inchangé le même jour, sinon repart à 1.
  function ymdToMs(s) { const p = String(s).split("-").map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
  function updateStreak(prev, today) {
    prev = prev || {};
    const last = prev.last, days = prev.days || 0;
    if (!today) return { days: days, last: last };
    if (last === today) return { days: Math.max(days, 1), last: today };
    if (last) {
      const diff = Math.round((ymdToMs(today) - ymdToMs(last)) / 86400000);
      if (diff === 1) return { days: days + 1, last: today };
    }
    return { days: 1, last: today };
  }

  // --- detection --------------------------------------------------------------
  const escapeRe = (w) => norm(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Mots ajoutes a distance (Feature #2). DATA-ONLY : jamais evalues. On garde les
  // ajouts a part pour pouvoir recompiler les regex et tout remettre a zero.
  // EXTRA_LEX[lg] = { strong:[...], contextual:[...] } (formes lisibles, normalisées au build).
  const EXTRA_LEX = {}; // lg -> { strong:[], contextual:[] }
  for (const lg of LANGS) EXTRA_LEX[lg] = { strong: [], contextual: [] };

  // buildRe(lg, kind) : kind ∈ {"strong","contextual","mark"}. Garde la frontière
  // de mot existante (^|[^\p{L}])(ALT)([^\p{L}]|$). 'mark' lit target_markers.
  function buildRe(lg, kind) {
    let words;
    if (kind === "mark") words = LEX[lg].target_markers;
    else words = LEX[lg][kind].concat((EXTRA_LEX[lg] && EXTRA_LEX[lg][kind]) || []);
    if (!words.length) return /a^/u; // regex qui ne matche jamais (liste vide)
    const alt = words.map(escapeRe).filter(Boolean).join("|");
    if (!alt) return /a^/u;
    return new RegExp("(^|[^\\p{L}])(" + alt + ")([^\\p{L}]|$)", "u");
  }
  // TROIS familles de regex par langue (remplace l'ancien RES unique).
  const RES_STRONG = {}, RES_CONTEXT = {}, RES_MARK = {};
  function recompile(lg) {
    RES_STRONG[lg] = buildRe(lg, "strong");
    RES_CONTEXT[lg] = buildRe(lg, "contextual");
    RES_MARK[lg] = buildRe(lg, "mark");
  }
  for (const lg of LANGS) recompile(lg);

  // --- détecteur de langue léger (mots-outils fréquents, PAS le lexique) ------
  // Volontairement faillible : c'est UN signal parmi d'autres pour CANDIDATES.
  const FUNC_WORDS = {
    fr: ["le", "la", "les", "un", "une", "des", "et", "est", "tu", "pas", "ce", "je", "vous"],
    en: ["the", "you", "and", "is", "this", "that", "of", "to", "a", "for"],
    es: ["el", "la", "los", "que", "eres", "una", "por", "con", "no", "te"],
    it: ["il", "la", "che", "sei", "non", "una", "di", "per", "ti", "un"],
    de: ["der", "die", "das", "und", "du", "ist", "nicht", "ein", "bist", "mit"],
    pt: ["o", "a", "que", "voce", "nao", "uma", "com", "de", "um", "te"],
    nl: ["de", "het", "je", "en", "niet", "een", "jij", "van", "dat", "is"],
    pl: ["nie", "jest", "sie", "ty", "co", "to", "za", "jak", "jestes", "ze"]
  };
  const FUNC_SETS = {};
  for (const lg of LANGS) FUNC_SETS[lg] = new Set(FUNC_WORDS[lg]);
  function tokenize(t) { return t.split(/[^a-zà-ÿ']+/u).filter(Boolean); }
  function lightDetectLang(t) {
    const toks = tokenize(t);
    let best = null, bestScore = 0;
    for (const lg of LANGS) {
      const set = FUNC_SETS[lg];
      let score = 0;
      for (const w of toks) if (set.has(w)) score++;
      if (score > bestScore) { bestScore = score; best = lg; }
    }
    return bestScore >= 1 ? best : null;
  }

  // --- Feature #2 : listes editables a distance (DATA ONLY, defensif) ----------
  // Bornes dures : tout reste de simples chaines, comptees et tronquees. AUCUN
  // contenu n'est jamais execute (zero eval/Function). En cas de souci, on ignore.
  // Instantane des banques livrees (built-in) pour pouvoir tout remettre a zero.
  const BUILTIN_BANKS = {};
  for (const theme of Object.keys(BANKS)) {
    BUILTIN_BANKS[theme] = {};
    for (const lg of Object.keys(BANKS[theme])) BUILTIN_BANKS[theme][lg] = BANKS[theme][lg].slice();
  }
  const OV_MAX_ARRAY = 500;   // entrees max par liste fusionnee
  const OV_MAX_LEN = 200;     // caracteres max par entree
  function cleanStrList(arr) {
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (const v of arr) {
      if (typeof v !== "string") continue; // DATA ONLY : on ignore tout non-chaine
      const s = v.slice(0, OV_MAX_LEN);
      if (s.length) out.push(s);
      if (out.length >= OV_MAX_ARRAY) break;
    }
    return out;
  }
  // Fusionne des mots de lexique et des repliques supplementaires. Idempotent-ish :
  // re-appeler avec le meme objet ne duplique pas (les mots deja presents sont
  // ignores). Ne casse JAMAIS la detection/les reponses existantes.
  // Ajoute une liste de mots dans EXTRA_LEX[lg][kind] (anti-doublon, idempotent-ish).
  function addLexWords(lg, kind, rawList) {
    const added = cleanStrList(rawList);
    if (!added.length) return;
    const seen = new Set(LEX[lg][kind].map(norm));
    for (const w of (EXTRA_LEX[lg][kind] || [])) seen.add(norm(w));
    const list = EXTRA_LEX[lg][kind];
    for (const w of added) {
      const n = norm(w);
      if (!n || seen.has(n)) continue; // anti-doublon (idempotent-ish)
      seen.add(n);
      list.push(w);
      if (list.length >= OV_MAX_ARRAY) break;
    }
  }
  function applyOverrides(obj) {
    if (!obj || typeof obj !== "object") return;
    // 1) lexique : NOUVEAU format { lex:{ fr:{strong:[],contextual:[]} } }
    //    OU legacy { lex:{ fr:[...] } } (tableau nu -> routé STRONG : préserve le
    //    comportement « flag sur présence » attendu par les overrides existants).
    const lex = obj.lex;
    if (lex && typeof lex === "object") {
      for (const lg of LANGS) {
        const entry = lex[lg];
        if (!entry) continue;
        if (Array.isArray(entry)) {
          addLexWords(lg, "strong", entry); // legacy : tableau nu -> STRONG
        } else if (typeof entry === "object") {
          addLexWords(lg, "strong", entry.strong);
          addLexWords(lg, "contextual", entry.contextual);
        }
        recompile(lg); // recompile les 3 familles de cette langue
      }
    }
    // 2) repliques : { replies: { nounours:{fr:[...]}, ... } }
    const reps = obj.replies;
    if (reps && typeof reps === "object") {
      for (const theme of Object.keys(BANKS)) {
        const byLang = reps[theme];
        if (!byLang || typeof byLang !== "object") continue;
        for (const lg of LANGS) {
          const added = cleanStrList(byLang[lg]);
          if (!added.length) continue;
          const bank = BANKS[theme][lg] || (BANKS[theme][lg] = []);
          const seen = new Set(bank);
          for (const line of added) {
            if (seen.has(line)) continue; // anti-doublon
            seen.add(line);
            bank.push(line);
            if (bank.length >= OV_MAX_ARRAY) break;
          }
        }
      }
    }
  }
  // Remet detection + banques a l'etat livre (built-ins). Annule applyOverrides.
  function clearOverrides() {
    for (const lg of LANGS) {
      EXTRA_LEX[lg].strong.length = 0;
      EXTRA_LEX[lg].contextual.length = 0;
      recompile(lg);
    }
    for (const theme of Object.keys(BANKS)) {
      for (const lg of Object.keys(BANKS[theme])) {
        const built = BUILTIN_BANKS[theme] && BUILTIN_BANKS[theme][lg];
        if (built) BANKS[theme][lg] = built.slice();
        else if (!(BUILTIN_BANKS[theme] && lg in BUILTIN_BANKS[theme])) delete BANKS[theme][lg];
      }
    }
  }

  // --- détection ciblée (cf. .wf_spec.txt § DETECT SPEC) ----------------------
  const to2 = (l) => (typeof l === "string" ? l.toLowerCase().slice(0, 2) : "");

  // pronoms 2e personne par langue : un VRAI marqueur de direction, qui prouve le
  // ciblage MÊME s'il est inclus dans un mot/phrase contextuel ('you suck', 'i hate you').
  const PRONOUNS = {
    fr: new Set(["tu", "toi", "vous", "t"]),
    en: new Set(["you", "youre", "ur", "u", "your", "yourself", "urself"]),
    es: new Set(["tu", "te", "ti", "vos", "usted", "ustedes", "vosotros"]),
    it: new Set(["tu", "ti", "te", "voi"]),
    de: new Set(["du", "dich", "dir", "ihr", "euch"]),
    pt: new Set(["voce", "vc", "tu", "te", "ti", "voces"]),
    nl: new Set(["jij", "je", "jou", "jullie", "jouw"]),
    pl: new Set(["ty", "ciebie", "ci", "wy", "cie"])
  };

  // targetPresent : un mot CONTEXTUAL a matché à l'index `mIdx` (longueur mLen) dans
  // `t` ; on exige qu'un target_marker de `lg` apparaisse dans la fenêtre de proximité
  // (win tokens avant/après) OU n'importe où dans la phrase si le texte est court
  // (≤12 mots). RÈGLE anti-auto-ciblage : le marqueur doit s'appuyer sur au moins un
  // token DISTINCT du mot contextuel (un mot évaluatif qui est aussi un marqueur, p.
  // ex. 'callate', ne se cible pas lui-même → tue « callate un momento ») — SAUF si le
  // marqueur est un pronom 2e personne (alors il prouve le ciblage même inclus dans la
  // phrase contextuelle : 'you suck', 'i hate you', 'nessuno ti vuole').
  function targetPresent(t, lg, mIdx, mLen, win) {
    const markers = LEX[lg].target_markers;
    if (!markers.length) return false;
    const pron = PRONOUNS[lg] || new Set();
    const toks = [];
    const re = /[a-zà-ÿ']+/giu;
    let m;
    while ((m = re.exec(t))) toks.push({ w: m[0], i: m.index });
    if (!toks.length) return false;
    // tokens couverts par le mot contextuel (span [mIdx, mIdx+mLen))
    const mEnd = mIdx + mLen;
    const isCtxTok = toks.map((tk) => tk.i < mEnd && (tk.i + tk.w.length) > mIdx);
    // index-token central du mot contextuel
    let ci = isCtxTok.indexOf(true);
    if (ci < 0) { ci = toks.findIndex((tk) => tk.i >= mIdx); if (ci < 0) ci = toks.length - 1; }
    // fenêtre : texte court (≤12 mots) -> toute la phrase ; sinon [ci-win .. ci+win]
    let lo, hi;
    if (toks.length <= 12) { lo = 0; hi = toks.length - 1; }
    else { lo = Math.max(0, ci - win); hi = Math.min(toks.length - 1, ci + win); }
    // teste chaque marqueur par fenêtre glissante de tokens. Acceptation si le marqueur
    // utilise un token hors-contextuel, OU si l'un de ses tokens est un pronom 2e pers.
    for (const mk of markers) {
      const mw = mk.split(" ").filter(Boolean);
      const isPronMarker = mw.some((w) => pron.has(w));
      for (let s = lo; s + mw.length - 1 <= hi; s++) {
        let okSeq = true, usesNonCtx = false;
        for (let k = 0; k < mw.length; k++) {
          if (toks[s + k].w !== mw[k]) { okSeq = false; break; }
          if (!isCtxTok[s + k]) usesNonCtx = true;
        }
        if (okSeq && (usesNonCtx || isPronMarker)) return true;
      }
    }
    return false;
  }

  // liste TOUS les matches CONTEXTUAL de lg dans t -> [{idx,len}] (idx = début du
  // mot, len = longueur du mot matché). On itère sur tous car un texte peut contenir
  // plusieurs mots évaluatifs et seul l'un d'eux peut avoir un marqueur à proximité.
  function contextMatches(t, lg) {
    const base = RES_CONTEXT[lg];
    if (base.source === "a^") return [];
    const re = new RegExp(base.source, "giu"); // copie avec /g pour balayer
    const out = [];
    let m;
    while ((m = re.exec(t))) {
      const lead = m[1] ? m[1].length : 0;
      const idx = m.index + lead;
      const word = m[2] || "";
      out.push({ idx, len: word.length });
      // évite une boucle infinie sur match vide ; recule d'un cran pour chevauchements
      if (m.index === re.lastIndex) re.lastIndex++;
      else re.lastIndex = idx + 1;
    }
    return out;
  }

  // pour le repli cross-langue strict : un marqueur « fort » (≥3 lettres ou multi-mots)
  // d'une langue donnée est-il présent quelque part dans t ?
  function strongMarkerPresent(t, lg) {
    for (const mk of LEX[lg].target_markers) {
      if (!(mk.length >= 3 || mk.includes(" "))) continue;
      const re = new RegExp("(^|[^a-zà-ÿ])" + mk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-zà-ÿ]|$)", "u");
      if (re.test(t)) return true;
    }
    return false;
  }
  // un slur STRONG ≥4 lettres matche-t-il dans t (pour le repli cross strict) ?
  function strongSlurLongMatch(t, lg) {
    const re = RES_STRONG[lg];
    re.lastIndex = 0;
    const m = re.exec(t);
    if (!m) return false;
    return (m[2] || "").replace(/[^a-zà-ÿ]/giu, "").length >= 4;
  }

  // CANDIDATES : preferred + lightDetect + pageLang + userLangs (dédupliqués, ⊂ LANGS).
  // Extrait de detect() pour être PARTAGÉ tel quel par aiCandidate() — même scoping,
  // donc le « cas gris » de l'IA est borné exactement aux langues que detect examine.
  // `t` doit être le texte DÉJÀ normalisé (norm()).
  function candidateLangs(t, preferred, opts) {
    preferred = to2(preferred);
    const cand = [];
    const seen = new Set();
    const push = (l) => {
      l = to2(l);
      if (l && LANGS.includes(l) && !seen.has(l)) { seen.add(l); cand.push(l); }
    };
    const words = tokenize(t);
    if (words.length < 2) {
      // commentaires <2 mots : court-circuit -> preferred seul (puis repli strict).
      push(preferred);
    } else {
      push(preferred);
      push(lightDetectLang(t));
      // en navigateur, lire les globals seulement si opts ne les fournit pas
      let pageLang = opts.pageLang;
      let userLangs = opts.userLangs;
      if (pageLang == null && typeof document !== "undefined" && document.documentElement) {
        pageLang = document.documentElement.lang;
      }
      if (userLangs == null && typeof navigator !== "undefined") {
        userLangs = navigator.languages || (navigator.language ? [navigator.language] : []);
      }
      push(pageLang);
      if (Array.isArray(userLangs)) for (const u of userLangs) push(u);
    }
    if (!cand.length && preferred) push(preferred);
    return cand;
  }

  function detect(text, preferred, opts) {
    opts = opts || {};
    const t = norm(text);
    const tHard = collapseHard(text); // 3+ → single, depuis le texte d'origine
    const win = (typeof opts.win === "number" && opts.win > 0) ? opts.win : 4;
    preferred = to2(preferred);

    const cand = candidateLangs(t, preferred, opts);
    const crossMode = cand.length === 0; // CANDIDATES vide -> repli strict pour tout

    // 1) PASSE STRONG sur les candidates (présence ; + secours tHard pour la doublure).
    for (const lg of cand) {
      if (RES_STRONG[lg].test(t)) return lg;
    }
    for (const lg of cand) {
      if (RES_STRONG[lg].test(tHard)) return lg;
    }

    // 2) PASSE CONTEXTUAL sur les candidates (mot évaluatif + marqueur de ciblage proche).
    //    On teste sur t, puis (secours) sur tHard pour rattraper une obfuscation à
    //    doublure d'un mot évaluatif (imbeciiil→imbecil) — MAIS toujours gated par un
    //    target_marker, donc sans réintroduire de FP descriptif.
    //    MODE AGRESSIF (opts.aggressive) : on flague les CONTEXTUAL sur PRÉSENCE (on
    //    saute l'exigence de target_marker) — mais TOUJOURS scopé aux candidates (on ne
    //    revient PAS à scanner les 8 langues à l'aveugle). Tout le reste est identique :
    //    STRONG déjà passé ci-dessus, et on rend la langue matchée. Plus de prises, plus
    //    de FP descriptifs assumés ('dumb'/'stupide' isolés) — choix de l'utilisateur.
    const aggressive = !!opts.aggressive;
    for (const lg of cand) {
      for (const cm of contextMatches(t, lg)) {
        if (aggressive || targetPresent(t, lg, cm.idx, cm.len, win)) return lg;
      }
      if (tHard !== t) {
        for (const cm of contextMatches(tHard, lg)) {
          if (aggressive || targetPresent(tHard, lg, cm.idx, cm.len, win)) return lg;
        }
      }
    }

    // 3) REPLI CROSS-LANGUE STRICT : pour les langues NON candidates, n'autoriser
    //    qu'un match doublement prouvé (slur STRONG ≥4 lettres ET marqueur fort
    //    d'une langue candidate OU de lg). Tue les homographes mono-token.
    const markerLangs = crossMode ? [preferred].filter(Boolean) : cand.slice();
    for (const lg of LANGS) {
      if (!crossMode && cand.includes(lg)) continue;
      if (!strongSlurLongMatch(t, lg)) continue;
      let proven = strongMarkerPresent(t, lg);
      if (!proven) for (const cl of markerLangs) { if (strongMarkerPresent(t, cl)) { proven = true; break; } }
      if (proven) return lg;
    }
    return null;
  }

  // --- aiCandidate : le « cas gris » que l'IA locale doit arbitrer (OPT-IN) -----
  // Renvoie true SSI le texte contient un mot de lexique STRONG ou CONTEXTUAL dans
  // une langue CANDIDATE (même scoping que detect : preferred + détection légère +
  // page/navigateur) MAIS detect(text, preferred, opts) a renvoyé null — c.-à-d. un
  // mot « insultant-ish » SANS cible claire (« What a stupid moro », « playing dumb »).
  // C'est exactement là où une liste de mots hésite et où un modèle de toxicité doit
  // trancher. Cette borne (mot insultant déjà présent) limite drastiquement le nombre
  // d'appels IA — on n'interroge JAMAIS le modèle sur du texte sans aucun marqueur.
  // PUR : ne modifie rien, ne lance jamais d'exception (tout est borné/déjà compilé).
  function aiCandidate(text, preferred, opts) {
    opts = opts || {};
    const t = norm(text);
    // si detect flague déjà, ce n'est PAS un cas gris (la liste a tranché) -> false
    if (detect(text, preferred, opts) !== null) return false;
    const cand = candidateLangs(t, preferred, opts);
    if (!cand.length) return false; // hors de toute langue candidate -> on n'appelle pas l'IA
    const tHard = collapseHard(text);
    for (const lg of cand) {
      // un mot STRONG (sur t ou la doublure tHard) ?
      if (RES_STRONG[lg].test(t) || RES_STRONG[lg].test(tHard)) return true;
      // un mot CONTEXTUAL (évaluatif : 'stupid'/'dumb'/'stupide'…) présent ?
      if (contextMatches(t, lg).length || (tHard !== t && contextMatches(tHard, lg).length)) return true;
    }
    return false;
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
    norm, detect, aiCandidate, reply, levelFor, themeEmoji, isLegendary,
    BADGES, earnedBadges, updateStreak,
    applyOverrides, clearOverrides
  };

  if (typeof window !== "undefined") window.UWGCore = api;
  if (typeof globalThis !== "undefined") globalThis.UWGCore = api;
})();
