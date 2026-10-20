/**
 * Les séances et programmes types, écrits à la main.
 *
 * Trois règles ont présidé à leur composition, et chacune vient d'une erreur
 * passée :
 *
 *   1. **Uniquement des noms qui existent dans la bibliothèque du coach**, à
 *      la lettre près. La génération par mots-clés produisait des séances
 *      pleines d'exercices introuvables — l'utilisateur ouvrait une séance et
 *      trouvait des noms sans vidéo.
 *   2. **Uniquement des exercices filmés.** Une démonstration manquante, pour
 *      quelqu'un qui reprend après dix ans, c'est un exercice fait de travers
 *      ou pas fait du tout.
 *   3. **La machine avant la charge libre.** Pour des hommes de quarante à
 *      soixante ans qui s'entraînent sans personne pour les corriger, la
 *      machine demande moins de technique et se charge progressivement sans
 *      mettre l'épaule ou le bas du dos en jeu. La charge libre n'apparaît que
 *      là où rien ne la remplace : squat, soulevé de terre, développés à
 *      angles.
 *
 * Aucune vidéo n'est stockée ici. Les séances ne portent qu'un nom ; le
 * rattachement à la bibliothèque est posé à l'attribution, et l'application lit
 * la vidéo et la description là-bas. Une vidéo refilmée apparaît donc chez tous
 * les clients sans rien reconstruire.
 */

export type ExerciceType = {
  /** Nom exact dans exercise_library. */
  nom: string;
  series: number;
  reps: string;
  repos: number;
  note?: string;
};

export type SeanceType = {
  nom: string;
  categorie: string;
  dureeMinutes: number;
  exercices: ExerciceType[];
};

export type ProgrammeType = {
  nom: string;
  description: string;
  /** Six semaines : la durée d'un bloc chez ce coach. */
  semaines: number;
  /** Noms de séances types, dans l'ordre de la semaine. */
  seances: string[];
};

/* ========================================================================
 * DOS — 3 séances
 * ===================================================================== */

const DOS: SeanceType[] = [
  {
    nom: "Dos — Largeur",
    categorie: "Dos",
    dureeMinutes: 55,
    exercices: [
      { nom: "Tirage vertical prise large", series: 4, reps: "10", repos: 90, note: "Tirer avec les coudes vers le bas, pas avec les mains." },
      { nom: "Tirage prise large sur machine", series: 3, reps: "12", repos: 75 },
      { nom: "Tirage horizontal prise large (poulie)", series: 3, reps: "12", repos: 75, note: "Serrer les omoplates en fin de course." },
      { nom: "Pull over en supination (poulie)", series: 3, reps: "15", repos: 60, note: "Bras presque tendus, le mouvement vient des dorsaux." },
      { nom: "Face pull assis (poulie)", series: 3, reps: "15", repos: 60 },
      { nom: "Extensions des lombaires", series: 3, reps: "15", repos: 45, note: "Sans hyperextension : on s'arrête à l'alignement." },
    ],
  },
  {
    nom: "Dos — Épaisseur",
    categorie: "Dos",
    dureeMinutes: 55,
    exercices: [
      { nom: "Tirage penché sur machine guidée", series: 4, reps: "10", repos: 90, note: "Buste fixe, le dos ne se balance pas." },
      { nom: "Tirage horizontal prise serrée", series: 4, reps: "10", repos: 90 },
      { nom: "Tirage barre T", series: 3, reps: "10", repos: 90 },
      { nom: "Tirage unilatéral en supination sur machine", series: 3, reps: "12 par bras", repos: 60 },
      { nom: "Extensions du dos avec haltères", series: 3, reps: "12", repos: 60 },
      { nom: "Shrugs", series: 3, reps: "15", repos: 45, note: "Monter les épaules, pas rouler : la rotation n'apporte rien." },
    ],
  },
  {
    nom: "Dos — Unilatéral & gainage",
    categorie: "Dos",
    dureeMinutes: 50,
    exercices: [
      { nom: "Tirage vertical unilatéral sur machine", series: 4, reps: "10 par bras", repos: 75 },
      { nom: "Tirage unilatéral penché (haltère)", series: 3, reps: "10 par bras", repos: 75, note: "Un point d'appui, dos plat, pas de rotation du buste." },
      { nom: "Tirage vertical prise serrée", series: 3, reps: "12", repos: 75 },
      { nom: "Pull-over", series: 3, reps: "12", repos: 60 },
      { nom: "Face pull assis (poulie)", series: 3, reps: "15", repos: 60 },
      { nom: "Planche", series: 3, reps: "45 secondes", repos: 45, note: "Fessiers serrés, ne pas creuser le bas du dos." },
    ],
  },
];

/* ========================================================================
 * DOS / BICEPS — 3 séances
 * ===================================================================== */

const DOS_BICEPS: SeanceType[] = [
  {
    nom: "Dos & Biceps — Machines",
    categorie: "Dos",
    dureeMinutes: 55,
    exercices: [
      { nom: "Tirage vertical prise large", series: 4, reps: "10", repos: 90 },
      { nom: "Tirage horizontal prise serrée", series: 3, reps: "12", repos: 75 },
      { nom: "Tirage prise serrée sur machine", series: 3, reps: "12", repos: 60 },
      { nom: "Bicep curl sur machine", series: 3, reps: "12", repos: 60 },
      { nom: "Bicep curl à la poulie basse", series: 3, reps: "12", repos: 60, note: "La poulie garde la tension sur toute l'amplitude." },
      { nom: "Curl incliné", series: 3, reps: "12", repos: 45, note: "L'étirement du biceps que la poulie ne donne pas." },
    ],
  },
  {
    nom: "Dos & Biceps — Charge",
    categorie: "Dos",
    dureeMinutes: 60,
    exercices: [
      { nom: "Tirage penché sur machine guidée", series: 4, reps: "10", repos: 90 },
      { nom: "Tirage vertical prise serrée", series: 3, reps: "12", repos: 75 },
      { nom: "Face pull assis (poulie)", series: 3, reps: "15", repos: 60 },
      { nom: "Bicep curl debout barre Z", series: 4, reps: "10", repos: 60, note: "Coudes collés au corps, pas d'élan des hanches." },
      { nom: "Bicep curl marteau avec haltères", series: 3, reps: "12", repos: 45 },
      { nom: "Curl concentré", series: 3, reps: "12 par bras", repos: 45 },
    ],
  },
  {
    nom: "Dos & Biceps — Unilatéral",
    categorie: "Dos",
    dureeMinutes: 55,
    exercices: [
      { nom: "Tirage prise large sur machine", series: 4, reps: "10", repos: 90 },
      { nom: "Tirage horizontal prise large (poulie)", series: 3, reps: "12", repos: 75 },
      { nom: "Tirage unilatéral en supination sur machine", series: 3, reps: "12 par bras", repos: 60 },
      { nom: "Biceps curl unilatéral sur machine", series: 3, reps: "12 par bras", repos: 60 },
      { nom: "Bicep curl unilatéral (poulie)", series: 3, reps: "12 par bras", repos: 45 },
      { nom: "Biceps curl inversé debout avec haltères", series: 3, reps: "12", repos: 45, note: "Travaille l'avant-bras autant que le biceps." },
    ],
  },
];

/* ========================================================================
 * BRAS — 3 séances
 * ===================================================================== */

const BRAS: SeanceType[] = [
  {
    nom: "Bras — Volume",
    categorie: "Bras",
    dureeMinutes: 45,
    exercices: [
      { nom: "Bicep curl sur machine", series: 4, reps: "10", repos: 60 },
      { nom: "Dips triceps sur machine", series: 4, reps: "10", repos: 60, note: "Coudes collés au corps : dès qu'ils s'écartent, l'effort part dans l'épaule." },
      { nom: "Bicep curl à la poulie basse", series: 3, reps: "12", repos: 45 },
      { nom: "Extensions Triceps Poulie Haute En Supination", series: 3, reps: "12", repos: 45 },
      { nom: "Curl incliné", series: 3, reps: "12", repos: 45 },
      { nom: "Extension des triceps couché sur le dos", series: 3, reps: "12", repos: 45 },
    ],
  },
  {
    nom: "Bras — Unilatéral",
    categorie: "Bras",
    dureeMinutes: 45,
    exercices: [
      { nom: "Biceps curl unilatéral sur machine", series: 4, reps: "10 par bras", repos: 60 },
      { nom: "Extensions Triceps Unilatérales En Supination", series: 4, reps: "10 par bras", repos: 60 },
      { nom: "Bicep curl unilatéral (poulie)", series: 3, reps: "12 par bras", repos: 45 },
      { nom: "Extensions triceps unilatérale vers l’arrière", series: 3, reps: "12 par bras", repos: 45 },
      { nom: "Curl concentré", series: 3, reps: "12 par bras", repos: 45 },
      { nom: "Extensions unilatérales triceps assis", series: 3, reps: "12 par bras", repos: 45 },
    ],
  },
  {
    nom: "Bras — Barres & poids de corps",
    categorie: "Bras",
    dureeMinutes: 45,
    exercices: [
      { nom: "Bicep curl debout barre Z", series: 4, reps: "10", repos: 75 },
      { nom: "Dips triceps aux barres", series: 4, reps: "8-10", repos: 75, note: "Buste vertical. Assistance ou pieds au sol si besoin." },
      { nom: "Bicep Curl Zottman", series: 3, reps: "12", repos: 45 },
      { nom: "Triceps tate press", series: 3, reps: "12", repos: 45 },
      { nom: "Bicep curl marteau avec haltères", series: 3, reps: "12", repos: 45 },
      { nom: "Pompes triceps", series: 3, reps: "maximum", repos: 60 },
    ],
  },
];

/* ========================================================================
 * JAMBES — 3 séances
 * ===================================================================== */

const JAMBES: SeanceType[] = [
  {
    nom: "Jambes — Quadriceps",
    categorie: "Jambes",
    dureeMinutes: 60,
    exercices: [
      { nom: "Leg press horizontal", series: 4, reps: "12", repos: 90, note: "Descends seulement jusqu'où ton bassin reste collé au siège." },
      { nom: "Hack squat", series: 3, reps: "10", repos: 90 },
      { nom: "Leg extension", series: 3, reps: "15", repos: 60, note: "Sans verrouiller le genou en haut." },
      { nom: "Fentes sur machine guidée", series: 3, reps: "10 par jambe", repos: 75 },
      { nom: "Adductions sur machine", series: 3, reps: "15", repos: 45 },
      { nom: "Extension mollets sur machine guidée", series: 4, reps: "15", repos: 45 },
    ],
  },
  {
    nom: "Jambes — Chaîne postérieure",
    categorie: "Jambes",
    dureeMinutes: 60,
    exercices: [
      { nom: "Deadlift roumain barre", series: 4, reps: "10", repos: 90, note: "Dos plat, hanches en arrière, jambes presque tendues." },
      { nom: "Leg curl couché", series: 4, reps: "12", repos: 60 },
      { nom: "Extensions de hanches avec barre (hip thrust)", series: 3, reps: "12", repos: 75 },
      { nom: "Leg curl assis", series: 3, reps: "12", repos: 60 },
      { nom: "Abductions sur machine", series: 3, reps: "15", repos: 45, note: "C'est le retour qui travaille : ne laisse pas la pile claquer." },
      { nom: "Mollets assis", series: 4, reps: "15", repos: 45 },
    ],
  },
  {
    nom: "Jambes — Unilatéral & stabilité",
    categorie: "Jambes",
    dureeMinutes: 55,
    exercices: [
      { nom: "Leg press", series: 4, reps: "12", repos: 90 },
      { nom: "Bulgarian split squat", series: 3, reps: "10 par jambe", repos: 75, note: "Le genou avant reste au-dessus du pied." },
      { nom: "Step-up", series: 3, reps: "12 par jambe", repos: 60 },
      { nom: "Fentes latérales", series: 3, reps: "10 par côté", repos: 60 },
      { nom: "Kick back sur machine", series: 3, reps: "15 par jambe", repos: 45 },
      { nom: "Extensions des mollets debout", series: 4, reps: "15", repos: 45 },
    ],
  },
];

/* ========================================================================
 * PECTORAUX — 3 séances
 * ===================================================================== */

const PECS: SeanceType[] = [
  {
    nom: "Pectoraux — Machines",
    categorie: "Pectoraux",
    dureeMinutes: 50,
    exercices: [
      { nom: "Développé assis pectoraux", series: 4, reps: "10", repos: 90, note: "Omoplates serrées contre le dossier, coudes sous la ligne des épaules." },
      { nom: "Développé assis sur machine", series: 3, reps: "12", repos: 75 },
      { nom: "Pec Fly sur machine", series: 3, reps: "12", repos: 60, note: "L'angle du coude ne bouge pas : sinon c'est un développé." },
      { nom: "Câble croisé", series: 3, reps: "15", repos: 60 },
      { nom: "Dips pectoraux", series: 3, reps: "10", repos: 60, note: "Buste penché en avant. Assistance si besoin." },
      { nom: "Pompes classiques", series: 2, reps: "maximum", repos: 60, note: "En finition, sans aller à l'échec complet." },
    ],
  },
  {
    nom: "Pectoraux — Angles",
    categorie: "Pectoraux",
    dureeMinutes: 55,
    exercices: [
      { nom: "Développé incliné", series: 4, reps: "10", repos: 90, note: "L'angle que le parc de machines ne remplace pas." },
      { nom: "Développé couché", series: 3, reps: "10", repos: 90 },
      { nom: "Développé décliné", series: 3, reps: "12", repos: 75 },
      { nom: "Pec fly du bas vers le haut (poulie)", series: 3, reps: "15", repos: 60 },
      { nom: "Écarté incliné haltères", series: 3, reps: "12", repos: 60 },
      { nom: "Pompes inclinées", series: 2, reps: "maximum", repos: 60 },
    ],
  },
  {
    nom: "Pectoraux — Haltères & poulies",
    categorie: "Pectoraux",
    dureeMinutes: 55,
    exercices: [
      { nom: "Développé couché haltères", series: 4, reps: "10", repos: 90 },
      { nom: "Développé incliné haltères", series: 3, reps: "10", repos: 90 },
      { nom: "Pec fly (poulie)", series: 3, reps: "15", repos: 60 },
      { nom: "Écarté couché", series: 3, reps: "12", repos: 60, note: "Bras légèrement fléchis, chercher l'étirement." },
      { nom: "Pull-over", series: 3, reps: "12", repos: 60 },
      { nom: "Pompes diamant", series: 2, reps: "maximum", repos: 60 },
    ],
  },
];

/* ========================================================================
 * PECTORAUX / TRICEPS — 3 séances
 * ===================================================================== */

const PECS_TRICEPS: SeanceType[] = [
  {
    nom: "Pectoraux & Triceps — Machines",
    categorie: "Pectoraux",
    dureeMinutes: 55,
    exercices: [
      { nom: "Développé assis pectoraux", series: 4, reps: "10", repos: 90 },
      { nom: "Pec Fly sur machine", series: 3, reps: "12", repos: 60 },
      { nom: "Câble croisé", series: 3, reps: "15", repos: 45 },
      { nom: "Dips triceps sur machine", series: 3, reps: "10", repos: 60 },
      { nom: "Extensions Triceps Poulie Haute En Supination", series: 3, reps: "12", repos: 45 },
      { nom: "Extension triceps au-dessus tête", series: 3, reps: "12", repos: 45 },
    ],
  },
  {
    nom: "Pectoraux & Triceps — Charge",
    categorie: "Pectoraux",
    dureeMinutes: 60,
    exercices: [
      { nom: "Développé couché", series: 4, reps: "8-10", repos: 90 },
      { nom: "Développé incliné haltères", series: 3, reps: "10", repos: 90 },
      { nom: "Écarté couché", series: 3, reps: "12", repos: 60 },
      { nom: "Dips triceps aux barres", series: 3, reps: "10", repos: 75 },
      { nom: "Extension des triceps couché sur le dos", series: 3, reps: "12", repos: 45 },
      { nom: "Triceps tate press", series: 3, reps: "12", repos: 45 },
    ],
  },
  {
    nom: "Pectoraux & Triceps — Poulies",
    categorie: "Pectoraux",
    dureeMinutes: 50,
    exercices: [
      { nom: "Développé assis sur machine", series: 4, reps: "10", repos: 90 },
      { nom: "Pec fly du haut vers le bas (poulie)", series: 3, reps: "12", repos: 60 },
      { nom: "Pompes déclinées", series: 3, reps: "maximum", repos: 60 },
      { nom: "Overhead Extensions Triceps Poulie Haute", series: 3, reps: "12", repos: 45 },
      { nom: "Extensions Triceps Croisés", series: 3, reps: "12", repos: 45 },
      { nom: "Pompes triceps", series: 2, reps: "maximum", repos: 60 },
    ],
  },
];

/* ========================================================================
 * PUSH — 2 séances
 * ===================================================================== */

const PUSH: SeanceType[] = [
  {
    nom: "Push — Machines",
    categorie: "Push / Pull / Legs",
    dureeMinutes: 55,
    exercices: [
      { nom: "Développé assis pectoraux", series: 4, reps: "10", repos: 90 },
      { nom: "Développé épaules sur machine", series: 3, reps: "10", repos: 90, note: "Poignées à hauteur d'épaules, pas plus haut." },
      { nom: "Pec Fly sur machine", series: 3, reps: "12", repos: 60 },
      { nom: "Élévations latérales sur machine", series: 3, reps: "15", repos: 45 },
      { nom: "Dips triceps sur machine", series: 3, reps: "12", repos: 60 },
      { nom: "Extensions Triceps Poulie Haute En Supination", series: 3, reps: "12", repos: 45 },
    ],
  },
  {
    nom: "Push — Charge libre",
    categorie: "Push / Pull / Legs",
    dureeMinutes: 60,
    exercices: [
      { nom: "Développé couché", series: 4, reps: "8-10", repos: 90 },
      { nom: "Développé militaire barre", series: 3, reps: "10", repos: 90, note: "Côtes basses, ne pas creuser le dos pour pousser." },
      { nom: "Développé incliné haltères", series: 3, reps: "10", repos: 75 },
      { nom: "Élévations latérales haltères", series: 3, reps: "15", repos: 45, note: "Léger. Monter à hauteur d'épaule, pas plus haut." },
      { nom: "Dips triceps aux barres", series: 3, reps: "10", repos: 60 },
      { nom: "Extension des triceps couché sur le dos", series: 3, reps: "12", repos: 45 },
    ],
  },
];

/* ========================================================================
 * PULL — 2 séances
 * ===================================================================== */

const PULL: SeanceType[] = [
  {
    nom: "Pull — Machines",
    categorie: "Push / Pull / Legs",
    dureeMinutes: 55,
    exercices: [
      { nom: "Tirage vertical prise large", series: 4, reps: "10", repos: 90 },
      { nom: "Tirage horizontal prise serrée", series: 3, reps: "12", repos: 75 },
      { nom: "Tirage prise serrée sur machine", series: 3, reps: "12", repos: 60 },
      { nom: "Face pull assis (poulie)", series: 3, reps: "15", repos: 45 },
      { nom: "Bicep curl sur machine", series: 3, reps: "12", repos: 60 },
      { nom: "Bicep curl marteau avec haltères", series: 3, reps: "12", repos: 45 },
    ],
  },
  {
    nom: "Pull — Charge libre",
    categorie: "Push / Pull / Legs",
    dureeMinutes: 60,
    exercices: [
      { nom: "Tractions prise large", series: 4, reps: "maximum", repos: 90, note: "Assistance si besoin : la qualité avant le nombre." },
      { nom: "Tirage penché sur machine guidée", series: 3, reps: "10", repos: 90 },
      { nom: "Tirage vertical unilatéral poulie", series: 3, reps: "12 par bras", repos: 60 },
      { nom: "Shrugs", series: 3, reps: "15", repos: 45 },
      { nom: "Bicep curl debout barre Z", series: 3, reps: "10", repos: 60 },
      { nom: "Curl incliné", series: 3, reps: "12", repos: 45 },
    ],
  },
];

/* ========================================================================
 * HAUT DU CORPS — 3 séances
 * ===================================================================== */

const HAUT: SeanceType[] = [
  {
    nom: "Haut du corps — Machines",
    categorie: "Full Body",
    dureeMinutes: 55,
    exercices: [
      { nom: "Développé assis pectoraux", series: 4, reps: "10", repos: 90 },
      { nom: "Tirage prise large sur machine", series: 4, reps: "10", repos: 90 },
      { nom: "Développé épaules sur machine", series: 3, reps: "12", repos: 75 },
      { nom: "Tirage horizontal prise serrée", series: 3, reps: "12", repos: 75 },
      { nom: "Bicep curl sur machine", series: 3, reps: "12", repos: 60 },
      { nom: "Dips triceps sur machine", series: 3, reps: "12", repos: 60 },
    ],
  },
  {
    nom: "Haut du corps — Barres & haltères",
    categorie: "Full Body",
    dureeMinutes: 60,
    exercices: [
      { nom: "Développé couché", series: 4, reps: "10", repos: 90 },
      { nom: "Tirage vertical prise large", series: 4, reps: "10", repos: 90 },
      { nom: "Développé militaire haltères", series: 3, reps: "10", repos: 75 },
      { nom: "Rowing penché en avant avec haltères", series: 3, reps: "10", repos: 75, note: "Dos plat, buste incliné à 45°." },
      { nom: "Bicep curl debout barre Z", series: 3, reps: "12", repos: 45 },
      { nom: "Extension des triceps couché sur le dos", series: 3, reps: "12", repos: 45 },
    ],
  },
  {
    nom: "Haut du corps — Poulies & unilatéral",
    categorie: "Full Body",
    dureeMinutes: 55,
    exercices: [
      { nom: "Développé assis sur machine", series: 4, reps: "10", repos: 90 },
      { nom: "Tirage vertical unilatéral sur machine", series: 3, reps: "12 par bras", repos: 75 },
      { nom: "Pec fly (poulie)", series: 3, reps: "12", repos: 60 },
      { nom: "Tirage horizontal prise large (poulie)", series: 3, reps: "12", repos: 75 },
      { nom: "Élévations latérales unilatérales à la poulie", series: 3, reps: "15 par bras", repos: 45 },
      { nom: "Extensions Triceps Unilatérales En Supination", series: 3, reps: "12 par bras", repos: 45 },
    ],
  },
];

/* ========================================================================
 * BAS DU CORPS — 3 séances
 * ===================================================================== */

const BAS: SeanceType[] = [
  {
    nom: "Bas du corps — Machines",
    categorie: "Jambes",
    dureeMinutes: 55,
    exercices: [
      { nom: "Leg press horizontal", series: 4, reps: "12", repos: 90 },
      { nom: "Leg curl couché", series: 4, reps: "12", repos: 60 },
      { nom: "Leg extension", series: 3, reps: "15", repos: 60 },
      { nom: "Abductions sur machine", series: 3, reps: "15", repos: 45 },
      { nom: "Adductions sur machine", series: 3, reps: "15", repos: 45 },
      { nom: "Mollets assis", series: 4, reps: "15", repos: 45 },
    ],
  },
  {
    nom: "Bas du corps — Charge libre",
    categorie: "Jambes",
    dureeMinutes: 65,
    exercices: [
      { nom: "Squat barre", series: 4, reps: "10", repos: 120, note: "Descendre autant que les genoux et les hanches le permettent." },
      { nom: "Deadlift roumain barre", series: 3, reps: "10", repos: 90 },
      { nom: "Fentes avec barre", series: 3, reps: "10 par jambe", repos: 75 },
      { nom: "Extensions de hanches avec barre (hip thrust)", series: 3, reps: "12", repos: 75 },
      { nom: "Extensions des mollets debout", series: 4, reps: "15", repos: 45 },
      { nom: "Extensions des lombaires", series: 3, reps: "15", repos: 45 },
    ],
  },
  {
    nom: "Bas du corps — Unilatéral",
    categorie: "Jambes",
    dureeMinutes: 55,
    exercices: [
      { nom: "Bulgarian split squat", series: 4, reps: "10 par jambe", repos: 75 },
      { nom: "Leg press", series: 3, reps: "12", repos: 90 },
      { nom: "Step-up", series: 3, reps: "12 par jambe", repos: 60 },
      { nom: "Leg curl assis", series: 3, reps: "12", repos: 60 },
      { nom: "Kick back sur machine", series: 3, reps: "15 par jambe", repos: 45 },
      { nom: "Extensions mollets sur machine guidée assis", series: 4, reps: "15", repos: 45 },
    ],
  },
];

export const SEANCES_TYPES: SeanceType[] = [
  ...DOS,
  ...DOS_BICEPS,
  ...BRAS,
  ...JAMBES,
  ...PECS,
  ...PECS_TRICEPS,
  ...PUSH,
  ...PULL,
  ...HAUT,
  ...BAS,
];

/* ========================================================================
 * PROGRAMMES — 6 semaines chacun
 * ===================================================================== */

/**
 * Quatre blocs de six semaines, du plus accessible au plus exigeant.
 *
 * Six semaines parce que c'est la durée d'un bloc chez ce coach, et qu'un
 * accompagnement de six mois en contient quatre : on change de bloc, on ne
 * refait pas la même chose pendant six mois.
 *
 * Le premier bloc est entièrement sur machines. Quelqu'un qui reprend après
 * dix ans n'a pas à apprendre le squat barre la première semaine — il a à
 * revenir trois fois par semaine, et c'est déjà beaucoup.
 */
export const PROGRAMMES_TYPES: ProgrammeType[] = [
  {
    nom: "Bloc 1 — Reprise, 3 séances",
    description:
      "Six semaines pour réinstaller l'habitude. Tout sur machines : moins de technique à apprendre, moins de risque, et une charge qui monte sans danger. Trois séances par semaine, jamais deux jours de suite.",
    semaines: 6,
    seances: ["Haut du corps — Machines", "Bas du corps — Machines", "Haut du corps — Poulies & unilatéral"],
  },
  {
    nom: "Bloc 2 — Haut / Bas, 4 séances",
    description:
      "Six semaines, quatre séances. Le volume monte et la charge libre apparaît là où elle n'a pas d'équivalent guidé : squat, soulevé de terre, développés à angles.",
    semaines: 6,
    seances: [
      "Haut du corps — Machines",
      "Bas du corps — Machines",
      "Haut du corps — Barres & haltères",
      "Bas du corps — Charge libre",
    ],
  },
  {
    nom: "Bloc 3 — Push / Pull / Jambes",
    description:
      "Six semaines sur trois séances qui se répètent. Chaque groupe est travaillé une fois par semaine avec assez de volume pour progresser, et assez de repos pour récupérer à cet âge.",
    semaines: 6,
    seances: ["Push — Machines", "Pull — Machines", "Jambes — Quadriceps"],
  },
  {
    nom: "Bloc 4 — Split 4 jours",
    description:
      "Six semaines, quatre séances ciblées. Pour quelqu'un qui tient depuis plusieurs blocs et veut travailler chaque groupe en profondeur.",
    semaines: 6,
    seances: [
      "Pectoraux & Triceps — Charge",
      "Dos & Biceps — Charge",
      "Jambes — Chaîne postérieure",
      "Haut du corps — Poulies & unilatéral",
    ],
  },
];
