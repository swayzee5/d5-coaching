import { db } from "@/lib/db";
import { redirect } from "next/navigation";

const EXERCISES = [
  // PECTORAUX
  { name: "Développé couché barre", muscles: ["Pectoraux","Triceps","Épaules"], equipment: ["Barre"], description: "Allongé banc plat, prise légèrement plus large que les épaules. Descendre la barre vers le milieu du sternum en 3s, coudes à 45°, puis pousser en expirant. Omoplates serrées, pieds au sol." },
  { name: "Développé couché haltères", muscles: ["Pectoraux","Triceps","Épaules"], equipment: ["Haltères"], description: "Même mouvement qu'avec la barre mais amplitude plus grande. Descendre jusqu'à l'étirement complet des pectoraux, pousser en ramenant les haltères ensemble en haut." },
  { name: "Développé incliné", muscles: ["Pectoraux","Épaules"], equipment: ["Barre","Haltères"], description: "Banc incliné à 30-45°. Cible le haut des pectoraux. Pousser en angle vers le haut. Éviter plus de 45° d'inclinaison." },
  { name: "Développé décliné", muscles: ["Pectoraux"], equipment: ["Barre","Haltères"], description: "Banc décliné, tête en bas. Cible le bas des pectoraux. Pieds bloqués sous les rouleaux." },
  { name: "Écarté couché", muscles: ["Pectoraux"], equipment: ["Haltères"], description: "Allongé banc plat, bras tendus au-dessus. Ouvrir en arc de cercle jusqu'à l'étirement des pectoraux, coudes légèrement fléchis. Revenir lentement." },
  { name: "Pec deck / butterfly", muscles: ["Pectoraux"], equipment: ["Machines"], description: "Assis, coudes à hauteur des épaules sur les appuis. Amener les bras vers le centre en contractant les pectoraux. Revenir lentement." },
  { name: "Câble croisé", muscles: ["Pectoraux"], equipment: ["Machines"], description: "Poulies hautes, un câble dans chaque main. Croiser les mains devant le corps en contractant les pectoraux. Légère inclinaison du buste en avant." },
  { name: "Push-up", muscles: ["Pectoraux","Triceps","Épaules"], equipment: [], description: "Mains légèrement plus larges que les épaules, corps gainé. Descendre la poitrine vers le sol, coudes à 45°. Expirer en poussant." },
  { name: "Push-up diamant", muscles: ["Pectoraux","Triceps"], equipment: [], description: "Mains en triangle sous le sternum. Coudes proches du corps à la descente. Accent sur les triceps et le centre des pectoraux." },
  { name: "Push-up décliné", muscles: ["Pectoraux","Épaules"], equipment: [], description: "Pieds surelevés sur une chaise ou un banc. Cible le haut des pectoraux et les épaules." },
  { name: "Dips pectoraux", muscles: ["Pectoraux","Triceps"], equipment: [], description: "Barres parallèles, buste incliné en avant à 30°. Descendre jusqu'à l'étirement des pectoraux, remonter en poussant." },
  { name: "Pull-over", muscles: ["Pectoraux","Dos"], equipment: ["Haltères"], description: "Allongé transversalement sur un banc. Haltère à deux mains au-dessus de la poitrine. Descendre derrière la tête en arc de cercle, coudes légèrement fléchis." },
  // DOS
  { name: "Traction prise large", muscles: ["Dos","Biceps"], equipment: [], description: "Suspendu à la barre, prise pronation large. Tirer les coudes vers le bas et l'extérieur jusqu'au menton au-dessus de la barre. Descendre lentement." },
  { name: "Traction prise neutre", muscles: ["Dos","Biceps"], equipment: [], description: "Poignées parallèles face à face. Tirer en amenant les coudes vers les hanches. Moins de stress sur les épaules." },
  { name: "Traction supination", muscles: ["Dos","Biceps"], equipment: [], description: "Prise supination (paumes vers soi), prise serrée. Plus d'activation des biceps. Amener le menton au-dessus de la barre." },
  { name: "Rowing barre", muscles: ["Dos","Biceps"], equipment: ["Barre"], description: "Debout, buste penché à 45°, dos plat. Tirer la barre vers le nombril, coudes proches du corps. Ne pas balancer le dos." },
  { name: "Rowing haltère unilatéral", muscles: ["Dos","Biceps"], equipment: ["Haltères"], description: "Un genou et une main sur le banc, dos horizontal. Tirer l'haltère vers la hanche. Bien contracter le dos en haut de chaque rep." },
  { name: "Tirage vertical prise large", muscles: ["Dos","Biceps"], equipment: ["Machines"], description: "Assis à la poulie haute, prise pronation large. Tirer vers le haut du buste en ramenant les coudes vers le bas." },
  { name: "Tirage vertical prise serrée", muscles: ["Dos","Biceps"], equipment: ["Machines"], description: "Poulie haute, prise neutre serrée. Tirer vers le bas de la gorge, coudes vers les hanches." },
  { name: "Tirage horizontal câble", muscles: ["Dos","Biceps"], equipment: ["Machines"], description: "Assis face à la poulie basse, dos droit. Tirer vers le ventre en serrant les omoplates." },
  { name: "Rowing machine assise", muscles: ["Dos","Biceps"], equipment: ["Machines"], description: "Machine de rowing assise, poitrine contre le support. Tirer les poignées vers les hanches, bien serrer les omoplates." },
  { name: "Soule vé de terre", muscles: ["Dos","Fessiers","Ischio-jambiers"], equipment: ["Barre"], description: "Pieds à largeur de hanches, barre au-dessus des pieds. Dos plat, hanches en arrière. Pousser le sol pour monter. Barre proche du corps." },
  { name: "Soule vé de terre roumain", muscles: ["Ischio-jambiers","Fessiers","Dos"], equipment: ["Barre","Haltères"], description: "Debout, dos plat. Descendre les haltères le long des jambes, jambes semi-tendues. Remonter en contractant les fessiers." },
  { name: "Good morning", muscles: ["Dos","Ischio-jambiers"], equipment: ["Barre"], description: "Barre sur la nuque. Fléchir le buste en avant en poussant les hanches en arrière, dos plat. Remonter en contractant les lombaires." },
  { name: "Superman", muscles: ["Dos","Fessiers"], equipment: [], description: "Allongé face au sol, bras tendus devant. Lever simultanément les bras et les jambes. Tenir 2s en haut, descendre lentement." },
  { name: "Tirage élastique", muscles: ["Dos","Biceps"], equipment: ["Élastiques"], description: "Élastique fixé à hauteur de poitrine. Tirer vers soi en ramenant les coudes en arrière et en serrant les omoplates." },
  // ÉPAULES
  { name: "Développé militaire barre", muscles: ["Épaules","Triceps"], equipment: ["Barre"], description: "Debout ou assis, barre à hauteur des clavicules. Pousser vers le haut jusqu'à extension complète. Contracter les abdos pour stabiliser." },
  { name: "Développé militaire haltères", muscles: ["Épaules","Triceps"], equipment: ["Haltères"], description: "Assis ou debout, haltères à hauteur des oreilles. Pousser vers le haut en rapprochant légèrement les haltères en haut." },
  { name: "Élévation latérale", muscles: ["Épaules"], equipment: ["Haltères"], description: "Debout, haltères sur les côtés. Monter les bras en croix jusqu'à hauteur des épaules, coudes légèrement fléchis. Pause 1s en haut." },
  { name: "Élévation frontale", muscles: ["Épaules"], equipment: ["Haltères","Barre"], description: "Debout, haltères devant les cuisses. Lever les bras devant soi jusqu'à hauteur des épaules. Contrôler la descente." },
  { name: "Oiseau / élévation arrière", muscles: ["Épaules"], equipment: ["Haltères"], description: "Buste penché à 90°, haltères qui pendent. Lever les bras sur les côtés en contractant les deltoïdes postérieurs." },
  { name: "Arnold press", muscles: ["Épaules","Triceps"], equipment: ["Haltères"], description: "Haltères à hauteur du visage, paumes vers soi. Monter en tournant les poignets. Travaille les 3 faisceaux du deltoïde." },
  { name: "Face pull", muscles: ["Épaules","Dos"], equipment: ["Machines","Élastiques"], description: "Corde à la poulie haute. Tirer vers le visage en écartant les mains et en ramenant les coudes en arrière." },
  { name: "Upright row", muscles: ["Épaules","Trapèze"], equipment: ["Barre","Haltères"], description: "Barre ou haltères, prise serrée. Tirer vers le menton en écartant les coudes." },
  { name: "Shrugs", muscles: ["Trapèze"], equipment: ["Barre","Haltères"], description: "Barre ou haltères devant soi. Hausser les épaules vers les oreilles. Tenir 1s en haut. Descendre lentement." },
  { name: "Élévation latérale élastique", muscles: ["Épaules"], equipment: ["Élastiques"], description: "Élastique sous le pied. Lever le bras sur le côté jusqu'à hauteur des épaules. Idéal pour finir un entraînement." },
  // BICEPS
  { name: "Curl haltères alternés", muscles: ["Biceps"], equipment: ["Haltères"], description: "Debout, haltères le long du corps. Fléchir un bras à la fois en supinant le poignet en montant. Ne pas balancer le corps." },
  { name: "Curl barre EZ", muscles: ["Biceps"], equipment: ["Barre"], description: "Barre EZ ou droite. Coudes fixes contre le corps. Fléchir en expirant. Descendre lentement jusqu'à extension quasi-complète." },
  { name: "Curl incliné", muscles: ["Biceps"], equipment: ["Haltères"], description: "Allongé sur banc incliné à 45-60°. Les bras pendent derrière le corps. Excellent étirement du biceps." },
  { name: "Curl marteau", muscles: ["Biceps"], equipment: ["Haltères"], description: "Prise neutre (pouce vers le haut). Fléchir le coude sans supiner. Travaille le brachial et le brachioradial." },
  { name: "Curl concentré", muscles: ["Biceps"], equipment: ["Haltères"], description: "Assis, coude appuyé contre l'intérieur de la cuisse. Fléchir lentement. Isolation maximale du biceps." },
  { name: "Curl câble", muscles: ["Biceps"], equipment: ["Machines"], description: "Poulie basse, barre ou corde. Tension constante tout au long du mouvement. Coudes fixes." },
  { name: "Curl élastique", muscles: ["Biceps"], equipment: ["Élastiques"], description: "Élastique sous les pieds. Fléchir les deux bras simultanément ou alternativement." },
  // TRICEPS
  { name: "Dips triceps", muscles: ["Triceps"], equipment: [], description: "Mains sur un banc ou des barres parallèles, corps droit. Descendre en fléchissant les coudes, remonter en poussant." },
  { name: "Extension nuque haltère", muscles: ["Triceps"], equipment: ["Haltères"], description: "Debout ou assis, haltère à deux mains derrière la tête. Coudes pointés vers le haut. Étendre les bras vers le haut." },
  { name: "Barre au front", muscles: ["Triceps"], equipment: ["Barre"], description: "Allongé, barre EZ tenue bras tendus. Fléchir les coudes en amenant la barre vers le front. Coudes fixes. Skull crusher." },
  { name: "Pushdown câble corde", muscles: ["Triceps"], equipment: ["Machines"], description: "Poulie haute, corde. Coudes fixés contre le corps. Pousser vers le bas et légèrement écarter la corde en bas." },
  { name: "Pushdown câble barre", muscles: ["Triceps"], equipment: ["Machines"], description: "Poulie haute, barre droite ou V. Coudes fixes. Pousser vers le bas jusqu'à extension complète." },
  { name: "Kickback triceps", muscles: ["Triceps"], equipment: ["Haltères"], description: "Buste penché à 90°, coude à hauteur des hanches. Étendre le bras vers l'arrière jusqu'à extension. Maintenir le coude fixe." },
  { name: "Close grip bench press", muscles: ["Triceps","Pectoraux"], equipment: ["Barre"], description: "Développé couché prise serrée (30cm entre les mains). Coudes proches du corps à la descente." },
  { name: "Extension triceps élastique", muscles: ["Triceps"], equipment: ["Élastiques"], description: "Élastique fixé en haut. Extension des bras vers le bas, coudes fixes. Bon substitut au câble." },
  // ABDOMINAUX
  { name: "Crunch", muscles: ["Abdominaux"], equipment: [], description: "Allongé, genoux fléchis, mains derrière la tête. Fléchir le haut du dos en contractant les abdos. Ne pas tirer sur la nuque." },
  { name: "Crunch bicycle", muscles: ["Abdominaux","Abdominaux obliques"], equipment: [], description: "Alterner coude vers genou opposé en mouvement de pédalage. Contrôler la rotation. Ne pas tirer sur la nuque." },
  { name: "Planche", muscles: ["Abdominaux"], equipment: [], description: "Position planche sur les coudes ou mains tendues. Corps aligné de la tête aux talons. Contracter abdos et fessiers. Position statique." },
  { name: "Planche latérale", muscles: ["Abdominaux","Abdominaux obliques"], equipment: [], description: "Appui sur un coude et le bord du pied. Corps droit, hanches souvelées. Contracter les obliques." },
  { name: "Leg raise", muscles: ["Abdominaux"], equipment: [], description: "Allongé ou suspendu à une barre. Lever les jambes tendues jusqu'à la verticale. Descendre lentement sans toucher le sol." },
  { name: "Mountain climbers", muscles: ["Abdominaux"], equipment: [], description: "Position planche. Ramener les genoux vers la poitrine en alternance rapidement. Corps stable, hanches basses." },
  { name: "Russian twist", muscles: ["Abdominaux","Abdominaux obliques"], equipment: [], description: "Assis, pieds décollés du sol, buste incliné à 45°. Tourner le buste de gauche à droite. Avec ou sans poids." },
  { name: "Ab wheel rollout", muscles: ["Abdominaux"], equipment: ["Roulette abdos"], description: "À genoux, roulette devant soi. Rouler vers l'avant en gardant le dos plat. Revenir en contractant les abdos." },
  { name: "Crunch à la poulie", muscles: ["Abdominaux"], equipment: ["Machines"], description: "À genoux face à la poulie haute. Corde derrière la nuque. Fléchir le buste vers le bas en contractant les abdos." },
  { name: "Hollow body", muscles: ["Abdominaux"], equipment: [], description: "Allongé, bras tendus derrière la tête. Lever simultanément les bras, épaules et jambes en creusant les abdos." },
  { name: "Gainage sur ballon", muscles: ["Abdominaux"], equipment: ["Ballon suisse"], description: "Avant-bras sur le ballon, corps en planche. Le ballon crée une instabilité qui intensifie le gainage." },
  { name: "Crunch sur ballon", muscles: ["Abdominaux"], equipment: ["Ballon suisse"], description: "Dos sur le ballon, lombaires en appui. Effectuer des crunchs avec une amplitude plus grande qu'au sol." },
  // QUADRICEPS
  { name: "Squat barre", muscles: ["Quadriceps","Fessiers"], equipment: ["Barre"], description: "Barre sur la nuque, pieds à largeur d'épaules. Descendre en poussant les genoux dans l'axe des pieds, cuisses parallèles au sol. Monter en poussant fort." },
  { name: "Squat gobelet", muscles: ["Quadriceps","Fessiers"], equipment: ["Haltères","Kettlebell"], description: "Haltère ou kettlebell contre la poitrine à deux mains. Descendre profond, coudes entre les genoux." },
  { name: "Fentes avant", muscles: ["Quadriceps","Fessiers"], equipment: ["Haltères"], description: "Grand pas en avant, genou avant à 90°, genou arrière proche du sol. Revenir en poussant sur le talon avant." },
  { name: "Fentes arrière", muscles: ["Quadriceps","Fessiers"], equipment: ["Haltères"], description: "Pas en arrière, genou arrière proche du sol. Moins de stress sur le genou avant. Pousser sur la jambe avant." },
  { name: "Fentes latérales", muscles: ["Quadriceps","Adducteurs","Fessiers"], equipment: ["Haltères"], description: "Grand pas sur le côté, s'asseoir sur la jambe fléchie, l'autre jambe tendue. Revenir en poussant." },
  { name: "Squat bulgare", muscles: ["Quadriceps","Fessiers"], equipment: ["Haltères","Barre"], description: "Pied arrière surelevé sur un banc. Descendre en fléchissant le genou avant. Excellent unilatéral." },
  { name: "Presse à cuisses", muscles: ["Quadriceps","Fessiers"], equipment: ["Machines"], description: "Allongé sur la machine, pieds sur la plateforme à largeur d'épaules. Pousser en étendant les jambes." },
  { name: "Leg extension", muscles: ["Quadriceps"], equipment: ["Machines"], description: "Assis sur la machine, cheville sous le rouleau. Étendre les jambes jusqu'à la quasi-extension. Isolation des quadriceps." },
  { name: "Squat sauté", muscles: ["Quadriceps","Fessiers"], equipment: [], description: "Descendre en squat puis exploser vers le haut. Réception souple sur les orteils d'abord." },
  { name: "Wall sit", muscles: ["Quadriceps"], equipment: [], description: "Dos contre le mur, genoux à 90°, cuisses parallèles au sol. Position statique. Tenir le plus longtemps possible." },
  { name: "Step-up", muscles: ["Quadriceps","Fessiers"], equipment: ["Haltères"], description: "Monter sur un banc ou une marche avec un pied, l'autre suit. Descendre lentement. Alterner les jambes." },
  // FESSIERS / ISCHIO
  { name: "Hip thrust", muscles: ["Fessiers","Ischio-jambiers"], equipment: ["Barre","Haltères"], description: "Épaules sur un banc, barre sur les hanches. Pousser les hanches vers le haut en contractant fort les fessiers. Tenir 1s en haut." },
  { name: "Glute bridge", muscles: ["Fessiers","Ischio-jambiers"], equipment: [], description: "Allongé au sol, genoux fléchis, pieds à plat. Pousser les hanches vers le haut en contractant les fessiers." },
  { name: "Leg curl couché", muscles: ["Ischio-jambiers"], equipment: ["Machines"], description: "Allongé sur la machine, cheville sous le rouleau. Fléchir les genoux en contractant les ischio-jambiers." },
  { name: "Nordic curl", muscles: ["Ischio-jambiers"], equipment: [], description: "À genoux, pieds maintenus au sol. Descendre le corps vers l'avant le plus lentement possible en résistant avec les ischio-jambiers." },
  { name: "Kickback fessier", muscles: ["Fessiers"], equipment: ["Élastiques"], description: "En quadrupédie, élastique autour de la cheville. Pousser la jambe vers l'arrière et le haut en contractant les fessiers." },
  { name: "Abduction hanche", muscles: ["Fessiers","Abducteurs"], equipment: ["Machines","Élastiques"], description: "Machine d'abduction ou élastique. Écarter la jambe sur le côté. Excellent pour les fessiers latéraux." },
  { name: "Donkey kick", muscles: ["Fessiers"], equipment: [], description: "Quadrupédie, genoux à 90°. Pousser le talon vers le plafond en contractant les fessiers. Hanches stables, dos plat." },
  { name: "Leg press pieds hauts", muscles: ["Fessiers","Ischio-jambiers"], equipment: ["Machines"], description: "Presse à cuisses avec les pieds placés haut sur la plateforme. Transfère le travail vers les fessiers." },
  // MOLLETS
  { name: "Mollets debout", muscles: ["Mollets"], equipment: ["Machines","Haltères"], description: "Debout, avant des pieds sur une marche. Descendre les talons sous le niveau de la marche, puis monter le plus haut possible." },
  { name: "Mollets assis", muscles: ["Mollets"], equipment: ["Machines"], description: "Assis sur la machine, genoux sous les appuis. Lever les talons. Cible le soléaire. Descendre complètement à chaque rep." },
  { name: "Mollets au mur", muscles: ["Mollets"], equipment: [], description: "Mains au mur, une jambe tendue derrière. S'étirer en poussant le talon au sol, puis se lever sur la pointe." },
  // CARDIO / FULL BODY
  { name: "Burpees", muscles: ["Quadriceps","Pectoraux","Abdominaux"], equipment: [], description: "Squat, poser les mains au sol, sauter les pieds en arrière, faire une pompe, ramener les pieds, sauter avec les bras en l'air. Enchaîner sans pause." },
  { name: "Squat tourné", muscles: ["Quadriceps","Fessiers","Abdominaux"], equipment: [], description: "Descendre en squat, en remontant faire une rotation du buste avec les bras tendus. Alterner les côtés." },
  { name: "Jumping jacks", muscles: ["Quadriceps","Épaules"], equipment: [], description: "Sauter en écartant pieds et bras simultanément, puis revenir. Exercice cardio simple pour l'échauffement ou les circuits." },
  { name: "Corde à sauter", muscles: ["Mollets","Quadriceps"], equipment: ["Corde à sauter"], description: "Sauter à la corde à rythme régulier. Excellent cardio, travaille la coordination et les mollets." },
  { name: "Kettlebell swing", muscles: ["Fessiers","Ischio-jambiers","Dos"], equipment: ["Kettlebell"], description: "Pieds à largeur d'épaules, kettlebell entre les pieds. Balancer en poussant les hanches en arrière puis vers l'avant. Explosif." },
  { name: "Box jump", muscles: ["Quadriceps","Fessiers"], equipment: [], description: "Face à une boîte ou un banc. Descendre en squat puis exploser vers le haut. Réception souple avec les genoux fléchis." },
  { name: "Sprint 30m", muscles: ["Quadriceps","Fessiers","Ischio-jambiers"], equipment: [], description: "Sprint sur 30 mètres à vitesse maximale. Récupération complète entre chaque. Travailler la puissance et la vitesse." },
  { name: "Gainage dynamique", muscles: ["Abdominaux"], equipment: [], description: "Alterner position planche haute et basse sans poser les genoux. Maintenir le corps aligné." },
  // CARDIO MACHINES
  { name: "Marche", muscles: ["Quadriceps","Mollets"], equipment: [], description: "Marche à allure soutenue en extérieur ou sur tapis. FCmax cible : 50-65%. Idéale pour la récupération active et la combustion des graisses en aérobie continu." },
  { name: "Marche inclinée", muscles: ["Fessiers","Quadriceps","Mollets"], equipment: ["Tapis de course"], description: "Marche sur tapis avec inclinaison 10-15%. Sollicite davantage les fessiers que la marche plate. FCmax : 60-75%. Ne pas s'accrocher aux barres." },
  { name: "Course sur tapis", muscles: ["Quadriceps","Ischio-jambiers","Mollets"], equipment: ["Tapis de course"], description: "Course à vitesse modérée à élevée sur tapis de course. Possible en régime continu ou en intervalles. Ne pas tenir les barres pour conserver une bonne posture." },
  { name: "Vélo stationnaire", muscles: ["Quadriceps","Fessiers","Mollets"], equipment: ["Vélo stationnaire"], description: "Pédalage assis, résistance légère à élevée. Selle à hauteur de hanche. Cadence cible : 70-90 tours/min. Travail aérobie ou intervalles." },
  { name: "Vélo spinning", muscles: ["Quadriceps","Fessiers","Ischio-jambiers","Mollets"], equipment: ["Vélo stationnaire"], description: "Séance intensive sur vélo de spinning. Alterner résistances et positions assis/debout. Très efficace pour la dépense calorique et la VO2max." },
  { name: "Vélo elliptique", muscles: ["Quadriceps","Fessiers","Épaules","Dos"], equipment: ["Vélo elliptique"], description: "Mouvement elliptique sans impact sur les articulations. Utiliser les poignées mobiles pour un travail full body. Posture droite, regard droit devant." },
  { name: "Rameur", muscles: ["Dos","Quadriceps","Abdominaux","Épaules","Biceps"], equipment: ["Rameur"], description: "60% jambes, 20% dos, 20% bras. Pousser les jambes d'abord, puis basculer le buste, puis tirer la poignée vers le ventre. Cadence cible : 24-28 coups/min." },
  { name: "SkiErg", muscles: ["Épaules","Dos","Abdominaux","Triceps"], equipment: ["SkiErg"], description: "Tirer les poignées de haut en bas en fléchissant le buste, comme en ski de fond. Excellent cardio haut du corps. Rythme 20-30 coups/min." },
  { name: "Machine escalier", muscles: ["Quadriceps","Fessiers","Mollets","Ischio-jambiers"], equipment: ["Machine escalier"], description: "Monter des marches en mouvement continu. Ne pas s'appuyer sur les barres latérales. Intensité réglable, très efficace pour les fessiers et le cardio." },
  { name: "Natation", muscles: ["Dos","Épaules","Abdominaux","Quadriceps"], equipment: [], description: "Nager en crawl, brasse ou dos crawlé à rythme soutenu. Cardio à faible impact sur les articulations. Excellent pour la récupération et l'endurance générale." },
];

export default async function SeedExercisesPage() {
  const existing = await db.exerciseLibrary.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));

  const toInsert = EXERCISES.filter(
    (ex) => !existingNames.has(ex.name.toLowerCase())
  );

  if (toInsert.length > 0) {
    await db.exerciseLibrary.createMany({ data: toInsert });
  }

  redirect("/exercices");
}
