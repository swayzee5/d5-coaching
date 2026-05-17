import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const EXERCISES: { name: string; description: string; muscles: string[] }[] = [
  // PECTORAUX
  { name: "Développé couché haltères", description: "Allôngé sur un banc, pousser les haltères vers le haut en contrôlant la descente.", muscles: ["Pectoraux", "Triceps", "Épaules"] },
  { name: "Développé incliné haltères", description: "Banc incliné 30-45°, insiste sur le haut des pectoraux.", muscles: ["Pectoraux", "Triceps", "Épaules"] },
  { name: "Développé décliné haltères", description: "Banc décliné, insiste sur le bas des pectoraux.", muscles: ["Pectoraux", "Triceps"] },
  { name: "Écarté couché haltères", description: "Bras écartés en arc de cercle, étirement maximal des pectoraux.", muscles: ["Pectoraux"] },
  { name: "Écarté incliné haltères", description: "Banc incliné, écarté pour cibler le haut des pectoraux.", muscles: ["Pectoraux"] },
  { name: "Pompes classiques", description: "Au sol, corps droit, descendre jusqu'à toucher le sol.", muscles: ["Pectoraux", "Triceps", "Épaules"] },
  { name: "Pompes inclinées", description: "Mains sur une surface élevée, cible le bas des pectoraux.", muscles: ["Pectoraux", "Triceps"] },
  { name: "Pompes déclinées", description: "Pieds sur une surface élevée, cible le haut des pectoraux.", muscles: ["Pectoraux", "Triceps", "Épaules"] },
  { name: "Pompes diamant", description: "Mains en forme de diamant sous la poitrine, charge les triceps.", muscles: ["Pectoraux", "Triceps"] },
  { name: "Dips pectoraux", description: "Aux barres parallèles, s'incliner vers l'avant pour cibler les pectoraux.", muscles: ["Pectoraux", "Triceps"] },
  { name: "Câble croisé bas vers haut", description: "Poulies basses, croiser les bras en arc de cercle vers le haut.", muscles: ["Pectoraux"] },
  { name: "Câble croisé haut vers bas", description: "Poulies hautes, croiser les bras vers le bas.", muscles: ["Pectoraux"] },
  { name: "Pull-over haltère", description: "Allôngé transversalement sur le banc, descendre le haltère derrière la tête.", muscles: ["Pectoraux", "Dos"] },
  { name: "Peck deck machine", description: "Machine papillon, rapprocher les bras en arc de cercle.", muscles: ["Pectoraux"] },
  { name: "Développé machine", description: "Machine guidée, mouvement de poussée horizontal.", muscles: ["Pectoraux", "Triceps"] },
  // DOS
  { name: "Tractions prise large", description: "Prise pronation large, tirer jusqu'au menton. Travaille le grand dorsal.", muscles: ["Dos", "Biceps"] },
  { name: "Tractions prise neutre", description: "Prise neutre (paumes face à face), plus dégageant pour les épaules.", muscles: ["Dos", "Biceps"] },
  { name: "Tractions prise supination", description: "Prise supination étroite, plus de sollicitation biceps.", muscles: ["Dos", "Biceps"] },
  { name: "Rowing barre", description: "Dos incliné, tirer la barre vers le nombril. Travaille le milieu du dos.", muscles: ["Dos", "Biceps"] },
  { name: "Rowing haltère unilatéral", description: "Un genou sur le banc, tirer le haltère vers la hanche.", muscles: ["Dos", "Biceps"] },
  { name: "Rowing câble assis", description: "Câble bas, tirer la poignée vers l'abdomen en gardant le dos droit.", muscles: ["Dos", "Biceps"] },
  { name: "Tirage vertical prise large", description: "Poulies hautes, tirer la barre jusqu'à la poitrine, prise écarte.", muscles: ["Dos", "Biceps"] },
  { name: "Tirage vertical prise étroite", description: "Prise étroite ou neutre, tirer jusqu'à la poitrine.", muscles: ["Dos", "Biceps"] },
  { name: "Face pull", description: "Câble à hauteur de visage, tirer vers le visage en écartant les coudes.", muscles: ["Dos", "Épaules"] },
  { name: "Shrugs haltères", description: "Hausser les épaules avec des haltères pour cibler les trapèzes.", muscles: ["Dos"] },
  { name: "Shrugs barre", description: "Hausser les épaules avec une barre, prise pronation.", muscles: ["Dos"] },
  { name: "Hyperextension", description: "Sur le banc romain, élever le buste depuis la position fléchie.", muscles: ["Dos", "Fessiers", "Ischio-jambiers"] },
  { name: "Superman", description: "Allôngé face au sol, lever simultanément bras et jambes.", muscles: ["Dos", "Fessiers"] },
  { name: "Deadlift conventionnel", description: "Soulever la barre depuis le sol avec dos droit, mouvement fondamental.", muscles: ["Dos", "Fessiers", "Ischio-jambiers", "Quadriceps"] },
  { name: "Deadlift sumo", description: "Pieds écartés, prise étroite, plus de sollicitation des fessiers et adducteurs.", muscles: ["Dos", "Fessiers", "Ischio-jambiers"] },
  // ÉPAULES
  { name: "Développé militaire barre", description: "Debout ou assis, pousser la barre au-dessus de la tête.", muscles: ["Épaules", "Triceps"] },
  { name: "Développé militaire haltères", description: "Pousser les haltères au-dessus de la tête en alternatif ou simultané.", muscles: ["Épaules", "Triceps"] },
  { name: "Élévations latérales haltères", description: "Lever les bras sur les côtés jusqu'à l'épaule, coudes légèrement fléchis.", muscles: ["Épaules"] },
  { name: "Élévations frontales haltères", description: "Lever les bras devant soi jusqu'à hauteur des épaules.", muscles: ["Épaules"] },
  { name: "Oiseau haltères", description: "Penché en avant, élever les bras sur les côtés pour le delta postérieur.", muscles: ["Épaules", "Dos"] },
  { name: "Arnold press", description: "Développé avec rotation des poignets, nommé d'après Arnold Schwarzenegger.", muscles: ["Épaules", "Triceps"] },
  { name: "Élévations latérales câble", description: "Câble bas, lever le bras sur le côté pour tension constante.", muscles: ["Épaules"] },
  { name: "Upright row haltères", description: "Tirer les haltères vers le menton en écartant les coudes.", muscles: ["Épaules", "Dos"] },
  { name: "Rotation externe élastique", description: "Coude à 90°, tourner l'avant-bras vers l'extérieur contre la résistance.", muscles: ["Épaules"] },
  { name: "Développé machine épaules", description: "Machine guidée pour le développé épaules.", muscles: ["Épaules", "Triceps"] },
  // BICEPS
  { name: "Curl haltères alternés", description: "Curl alternatif avec haltères, contrôler la descente.", muscles: ["Biceps"] },
  { name: "Curl barre", description: "Curl avec barre droite, prise supination.", muscles: ["Biceps"] },
  { name: "Curl barre EZ", description: "Barre EZ pour moins de stress sur les poignets.", muscles: ["Biceps"] },
  { name: "Curl marteau", description: "Prise neutre (pouce vers le haut), travaille le brachial antérieur.", muscles: ["Biceps"] },
  { name: "Curl concentré", description: "Assis, coude sur la cuisse, flexion complète pour le pic biceps.", muscles: ["Biceps"] },
  { name: "Curl câble", description: "Câble bas, tension constante tout au long du mouvement.", muscles: ["Biceps"] },
  { name: "Curl incliné haltères", description: "Assis sur banc incliné, bras pendants derrière, étirement maximal.", muscles: ["Biceps"] },
  { name: "Curl spider", description: "Allongé sur banc incliné face vers le bas, curl strict.", muscles: ["Biceps"] },
  { name: "Curl machine", description: "Machine à curl, mouvement guidé pour isolation.", muscles: ["Biceps"] },
  { name: "Curl 21s", description: "7 reps demi-amplitude bas + 7 reps demi-amplitude haut + 7 reps complètes.", muscles: ["Biceps"] },
  // TRICEPS
  { name: "Dips triceps aux barres", description: "Corps droit (vertical), descendre et pousser pour les triceps.", muscles: ["Triceps"] },
  { name: "Dips banc", description: "Mains sur le banc derrière soi, descendre et monter.", muscles: ["Triceps"] },
  { name: "Extensions triceps câble corde", description: "Corde au câble haut, pousser vers le bas en écartant la corde.", muscles: ["Triceps"] },
  { name: "Extensions triceps câble barre", description: "Barre droite au câble haut, pousser vers le bas.", muscles: ["Triceps"] },
  { name: "Skull crusher barre EZ", description: "Allongé, amener la barre vers le front en pliant les coudes.", muscles: ["Triceps"] },
  { name: "Skull crusher haltères", description: "Version haltères du skull crusher, moins de stress sur les poignets.", muscles: ["Triceps"] },
  { name: "Kick-back haltères", description: "Penché en avant, coude à 90°, extension complète du bras vers l'arrière.", muscles: ["Triceps"] },
  { name: "Extension triceps au-dessus tête", description: "Haltère ou câble, bras au-dessus de la tête, extension complète.", muscles: ["Triceps"] },
  { name: "Close grip bench press", description: "Développé couché prise serrée, focus triceps.", muscles: ["Triceps", "Pectoraux"] },
  // ABDOMINAUX
  { name: "Crunch", description: "Allongé, mains derrière la tête, soulever les épaules du sol.", muscles: ["Abdominaux"] },
  { name: "Crunch inversé", description: "Ramener les genoux vers la poitrine en décollant les hanches.", muscles: ["Abdominaux"] },
  { name: "Crunch oblique", description: "Rotation du buste pour cibler les obliques.", muscles: ["Abdominaux"] },
  { name: "Planche", description: "Position de pompe tenue, corps parfaitement droit, gainage.", muscles: ["Abdominaux"] },
  { name: "Planche latérale", description: "Sur le côté, appui avant-bras et pied, corps droit.", muscles: ["Abdominaux"] },
  { name: "Planche dynamique", description: "Alterner bras tendus et avant-bras depuis la position de planche.", muscles: ["Abdominaux"] },
  { name: "Russian twist", description: "Assis, jambes levées, rotation du buste avec ou sans poids.", muscles: ["Abdominaux"] },
  { name: "Mountain climber", description: "Position de pompe, alterner les genoux vers la poitrine rapidement.", muscles: ["Abdominaux"] },
  { name: "Bicycle crunch", description: "Crunch avec rotation et extension des jambes en alternance.", muscles: ["Abdominaux"] },
  { name: "Leg raises", description: "Allongé, lever les jambes tendues jusqu'à 90° en gardant le bas du dos au sol.", muscles: ["Abdominaux"] },
  { name: "Hanging leg raises", description: "Suspendu à une barre, lever les genoux ou jambes tendues.", muscles: ["Abdominaux"] },
  { name: "Ab wheel rollout", description: "Genoux au sol, rouler la roue vers l'avant en gardant le gainage.", muscles: ["Abdominaux"] },
  { name: "Dead bug", description: "Allongé, bras tendus, alterner extension bras/jambe opposés.", muscles: ["Abdominaux"] },
  { name: "Bird dog", description: "À 4 pattes, tendre le bras droit et la jambe gauche simultanément.", muscles: ["Abdominaux", "Dos"] },
  { name: "V-up", description: "Lever simultanément les bras et les jambes tendus pour former un V.", muscles: ["Abdominaux"] },
  { name: "Hollow body hold", description: "Allongé, creuser le ventre, lever légèrement bras et jambes.", muscles: ["Abdominaux"] },
  { name: "Crunch câble", description: "À genoux face au câble haut, fléchir le buste vers le bas.", muscles: ["Abdominaux"] },
  // QUADRICEPS
  { name: "Squat barre", description: "Barre sur les trapèzes, descendre jusqu'à ce que les cuisses soient parallèles au sol.", muscles: ["Quadriceps", "Fessiers", "Ischio-jambiers"] },
  { name: "Squat haltères", description: "Haltères en main, même technique que le squat barre.", muscles: ["Quadriceps", "Fessiers"] },
  { name: "Squat gobelet", description: "Haltère tenu contre la poitrine, idéal pour la technique.", muscles: ["Quadriceps", "Fessiers"] },
  { name: "Squat sumo", description: "Pieds très écartés, orteils tournés vers l'extérieur.", muscles: ["Quadriceps", "Fessiers", "Ischio-jambiers"] },
  { name: "Fentes avant haltères", description: "Pas en avant, descendre le genou arrière vers le sol.", muscles: ["Quadriceps", "Fessiers"] },
  { name: "Fentes marchées", description: "Avancer en effectuant des fentes continues.", muscles: ["Quadriceps", "Fessiers"] },
  { name: "Fentes latérales", description: "Pas sur le côté, plier une jambe en gardant l'autre tendue.", muscles: ["Quadriceps", "Fessiers", "Ischio-jambiers"] },
  { name: "Fentes arrière haltères", description: "Reculer une jambe pour la fente, plus de stabilité.", muscles: ["Quadriceps", "Fessiers"] },
  { name: "Leg press", description: "Machine, pousser la plateforme loin de soi avec les jambes.", muscles: ["Quadriceps", "Fessiers"] },
  { name: "Extension jambes machine", description: "Machine à extension, isolation des quadriceps.", muscles: ["Quadriceps"] },
  { name: "Hack squat", description: "Machine hack squat, equivalent squat guidé.", muscles: ["Quadriceps", "Fessiers"] },
  { name: "Bulgarian split squat", description: "Pied arrière sur le banc, descendre en fente profonde.", muscles: ["Quadriceps", "Fessiers"] },
  { name: "Step-up", description: "Monter sur une box en poussant avec la jambe avant.", muscles: ["Quadriceps", "Fessiers"] },
  { name: "Wall sit", description: "Dos au mur, jambes à 90°, tenir la position statique.", muscles: ["Quadriceps"] },
  { name: "Box squat", description: "Squat jusqu'à s'asseoir sur une box, excellent pour la technique.", muscles: ["Quadriceps", "Fessiers"] },
  // ISCHIO-JAMBIERS
  { name: "Leg curl couché machine", description: "Allongé sur la machine, ramener les talons vers les fessiers.", muscles: ["Ischio-jambiers"] },
  { name: "Leg curl assis machine", description: "Assis sur la machine, même mouvement que couché.", muscles: ["Ischio-jambiers"] },
  { name: "Deadlift roumain barre", description: "Jambes quasi tendues, descendre la barre le long des jambes.", muscles: ["Ischio-jambiers", "Fessiers", "Dos"] },
  { name: "Deadlift roumain haltères", description: "Version haltères, meilleure amplitude de mouvement.", muscles: ["Ischio-jambiers", "Fessiers"] },
  { name: "Nordic curl", description: "Genoux au sol, pieds retenus, descendre le buste vers le sol.", muscles: ["Ischio-jambiers"] },
  { name: "Good morning", description: "Barre sur les trapèzes, incliner le buste en avant dos droit.", muscles: ["Ischio-jambiers", "Dos"] },
  { name: "Glute ham raise", description: "Sur le banc GHR, monter depuis les ischio-jambiers et les fessiers.", muscles: ["Ischio-jambiers", "Fessiers"] },
  { name: "Curl jambe élastique", description: "Élastique à la cheville, ramener le talon vers les fessiers.", muscles: ["Ischio-jambiers"] },
  // FESSIERS
  { name: "Hip thrust barre", description: "Dos appuyé sur le banc, barre sur les hanches, pousser les hanches vers le haut.", muscles: ["Fessiers", "Ischio-jambiers"] },
  { name: "Hip thrust haltère", description: "Version haltère du hip thrust, idéal sans barre.", muscles: ["Fessiers"] },
  { name: "Glute bridge", description: "Allongé, pieds au sol, pousser les hanches vers le haut.", muscles: ["Fessiers", "Ischio-jambiers"] },
  { name: "Glute bridge unilatéral", description: "Une jambe tendue, pousser les hanches avec une seule jambe.", muscles: ["Fessiers"] },
  { name: "Kickback câble", description: "Câble à la cheville, pousser la jambe vers l'arrière.", muscles: ["Fessiers"] },
  { name: "Abduction machine", description: "Machine d'abduction, écarter les jambes contre la résistance.", muscles: ["Fessiers"] },
  { name: "Clamshell élastique", description: "Allongé sur le côté, élastique aux genoux, ouvrir comme une coquille.", muscles: ["Fessiers"] },
  { name: "Monster walk élastique", description: "Élastique aux genoux, marcher en crabe en gardant la tension.", muscles: ["Fessiers"] },
  { name: "Donkey kick", description: "À 4 pattes, pousser un talon vers le plafond en gardant le genou fléchi.", muscles: ["Fessiers"] },
  { name: "Fire hydrant", description: "À 4 pattes, lever la jambe sur le côté comme un chien à un poteau.", muscles: ["Fessiers"] },
  { name: "Squat pulse", description: "Squat bas, petites oscillations de quelques centimètres.", muscles: ["Fessiers", "Quadriceps"] },
  { name: "Step-up latéral", description: "Monter sur la box depuis le côté.", muscles: ["Fessiers", "Quadriceps"] },
  // MOLLETS
  { name: "Mollets debout machine", description: "Machine à mollets debout, descendre le talon puis monter sur la pointe.", muscles: ["Mollets"] },
  { name: "Mollets assis machine", description: "Machine à mollets assis, cible le soléaire.", muscles: ["Mollets"] },
  { name: "Mollets debout haltères", description: "Haltères en main, se hausser sur la pointe des pieds.", muscles: ["Mollets"] },
  { name: "Mollets unilatéral", description: "Sur une jambe, se hausser sur la pointe du pied pour plus d'intensité.", muscles: ["Mollets"] },
  { name: "Mollets sur marche", description: "Debout sur le bord d'une marche, descendre le talon en dessous puis monter.", muscles: ["Mollets"] },
  { name: "Mollets leg press", description: "À la machine leg press, pousser uniquement avec les orteils.", muscles: ["Mollets"] },
  { name: "Saut à la corde", description: "Cardio et mollets, rester sur la pointe des pieds.", muscles: ["Mollets"] },
  // CARDIO / MOBILITÉ
  { name: "Burpee", description: "Squat, planche, pompe, squat jump — exercice complet haute intensité.", muscles: ["Cardio / Mobilité"] },
  { name: "Jump squat", description: "Squat avec saut explosif à la montée.", muscles: ["Cardio / Mobilité", "Quadriceps", "Fessiers"] },
  { name: "Box jump", description: "Sauter sur une box depuis le sol, atterrir en squat.", muscles: ["Cardio / Mobilité", "Quadriceps", "Fessiers"] },
  { name: "Kettlebell swing", description: "Balancer le kettlebell devant soi en poussant depuis les hanches.", muscles: ["Cardio / Mobilité", "Fessiers", "Ischio-jambiers"] },
  { name: "Jumping jack", description: "Sauter en écartant bras et jambes simultanément.", muscles: ["Cardio / Mobilité"] },
  { name: "High knees", description: "Courir sur place en montant les genoux haut.", muscles: ["Cardio / Mobilité"] },
  { name: "Inchworm", description: "Marcher avec les mains depuis la position debout jusqu'à la planche.", muscles: ["Cardio / Mobilité"] },
  { name: "Worlds greatest stretch", description: "Fente + rotation du buste + extension, mobilité complète.", muscles: ["Cardio / Mobilité"] },
  { name: "Hip 90/90", description: "Assis au sol, jambes en 90°, rotation des hanches pour la mobilité.", muscles: ["Cardio / Mobilité"] },
  { name: "Foam roller dos", description: "Rouler lentement sur le foam roller le long de la colonne.", muscles: ["Cardio / Mobilité"] },
  // RETOUR BLESSURE — ÉPAULE
  { name: "Rotation externe isométrique épaule", description: "Coude à 90°, appuyer le poing contre un mur vers l'extérieur, tenir 10s.", muscles: ["Retour blessure - Épaule"] },
  { name: "Rotation interne isométrique épaule", description: "Coude à 90°, appuyer le poing contre un mur vers l'intérieur, tenir 10s.", muscles: ["Retour blessure - Épaule"] },
  { name: "Pendule Codman", description: "Penché en avant, laisser le bras pendre et faire de petits cercles.", muscles: ["Retour blessure - Épaule"] },
  { name: "Scapular push-up", description: "En position de planche, pincer et écarter les omoplates sans plier les coudes.", muscles: ["Retour blessure - Épaule"] },
  { name: "Wall slide", description: "Dos au mur, faire glisser les bras vers le haut en gardant contact avec le mur.", muscles: ["Retour blessure - Épaule"] },
  { name: "Prone Y T W", description: "Allongé face au sol, lever les bras en Y, T puis W pour les stabilisateurs.", muscles: ["Retour blessure - Épaule"] },
  { name: "Banded pull-apart", description: "Élastique tenu devant soi, tirer vers l'arrière en écartant les bras.", muscles: ["Retour blessure - Épaule"] },
  { name: "Shoulder CARs", description: "Rotation articulaire contrôlée de l'épaule, mobilité active complète.", muscles: ["Retour blessure - Épaule"] },
  { name: "Face pull léger élastique", description: "Élastique à hauteur du visage, tirer en ouvrant les coudes, charge légère.", muscles: ["Retour blessure - Épaule"] },
  { name: "Élévation latérale légère", description: "Élévation latérale avec très peu de poids, amplitude contrôlée.", muscles: ["Retour blessure - Épaule"] },
  // RETOUR BLESSURE — GENOU
  { name: "Quad set isométrique", description: "Allongé, contracter le quadriceps en poussant le genou vers le sol, tenir 10s.", muscles: ["Retour blessure - Genou"] },
  { name: "Straight leg raise", description: "Allongé, lever la jambe tendue à 45° en contractant le quadriceps.", muscles: ["Retour blessure - Genou"] },
  { name: "Terminal knee extension élastique", description: "Élastique derrière le genou, extension finale du genou.", muscles: ["Retour blessure - Genou"] },
  { name: "Mini squat contrôlé", description: "Squat limité à 30-40° de flexion, progressif et contrôlé.", muscles: ["Retour blessure - Genou"] },
  { name: "Step-up bas", description: "Monter sur une marche basse (10-15cm), contrôle complet.", muscles: ["Retour blessure - Genou"] },
  { name: "Leg press léger", description: "Machine leg press avec charge légère, amplitude réduite.", muscles: ["Retour blessure - Genou"] },
  { name: "Vélo stationnaire", description: "Pédalage doux, excellente rééducation genou sans impact.", muscles: ["Retour blessure - Genou"] },
  { name: "Clamshell rééducation", description: "Allongé sur le côté, ouvrir la jambe du dessus pour activer les fessiers.", muscles: ["Retour blessure - Genou"] },
  { name: "Abduction couché rééducation", description: "Lever la jambe tendue sur le côté depuis la position allongée.", muscles: ["Retour blessure - Genou"] },
  { name: "Wall squat isométrique", description: "Dos au mur, descendre à 90° et tenir la position statique.", muscles: ["Retour blessure - Genou"] },
  // RETOUR BLESSURE — DOS
  { name: "Cat-cow", description: "À 4 pattes, alterner dos rond (chat) et dos creux (vache) lentement.", muscles: ["Retour blessure - Dos"] },
  { name: "McGill curl-up", description: "Une jambe fléchie, lever légèrement la tête et les épaules, gainage bas du dos.", muscles: ["Retour blessure - Dos"] },
  { name: "McGill side plank", description: "Planche latérale modifiée, genoux au sol pour commencer.", muscles: ["Retour blessure - Dos"] },
  { name: "McGill bird dog", description: "À 4 pattes, tendre bras et jambe opposés lentement et avec contrôle.", muscles: ["Retour blessure - Dos"] },
  { name: "Cobra stretch", description: "Allongé, pousser le haut du corps avec les bras, étirement du bas du dos.", muscles: ["Retour blessure - Dos"] },
  { name: "Child's pose", description: "Genoux au sol, bras tendus devant, front sur le sol, détente lombaire.", muscles: ["Retour blessure - Dos"] },
  { name: "Pallof press", description: "Câble ou élastique de côté, pousser les mains en avant et ramener, anti-rotation.", muscles: ["Retour blessure - Dos"] },
  { name: "Glute bridge rééducation", description: "Glute bridge léger, activation des fessiers pour soulager le dos.", muscles: ["Retour blessure - Dos"] },
  { name: "Marche contrôlée", description: "Marche à rythme modéré, excellent point de départ pour le dos.", muscles: ["Retour blessure - Dos"] },
  { name: "Genou poitrine allongé", description: "Allongé, ramener un genou vers la poitrine, tenir 30s, alterner.", muscles: ["Retour blessure - Dos"] },
  // RETOUR BLESSURE — CHEVILLE
  { name: "Alphabet cheville", description: "Écrire l'alphabet avec le pied dans l'air pour la mobilité.", muscles: ["Retour blessure - Cheville"] },
  { name: "Relevé de pointe assis", description: "Assis, soulever les talons en restant sur les orteils.", muscles: ["Retour blessure - Cheville"] },
  { name: "Dorsiflexion élastique", description: "Élastique sur le pied, fléchir la cheville vers soi contre la résistance.", muscles: ["Retour blessure - Cheville"] },
  { name: "Éversion élastique", description: "Élastique, tourner le pied vers l'extérieur contre la résistance.", muscles: ["Retour blessure - Cheville"] },
  { name: "Inversion élastique", description: "Élastique, tourner le pied vers l'intérieur contre la résistance.", muscles: ["Retour blessure - Cheville"] },
  { name: "Équilibre unipodal", description: "Tenir l'équilibre sur une jambe, progresser vers surface instable.", muscles: ["Retour blessure - Cheville"] },
  { name: "Mollet excentrique rééducation", description: "Monter sur deux pieds, descendre lentement sur un seul talon.", muscles: ["Retour blessure - Cheville"] },
  { name: "Plateau instable proprioception", description: "Debout sur plateau instable, maintenir l'équilibre.", muscles: ["Retour blessure - Cheville"] },
  { name: "Step-up bas cheville", description: "Monter sur une marche basse en contrôlant la cheville à la descente.", muscles: ["Retour blessure - Cheville"] },
  { name: "Toe curl serviette", description: "Pied nu sur une serviette, enrouler les orteils pour agripper la serviette.", muscles: ["Retour blessure - Cheville"] },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let inserted = 0;
  let skipped = 0;

  for (const ex of EXERCISES) {
    const existing = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM exercise_library WHERE name = ${ex.name}
    `;
    if (Number(existing[0].count) > 0) {
      skipped++;
      continue;
    }
    await db.$executeRaw`
      INSERT INTO exercise_library (id, name, description, muscles, is_active, created_at)
      VALUES (gen_random_uuid(), ${ex.name}, ${ex.description}, ${ex.muscles}, true, now())
    `;
    inserted++;
  }

  return NextResponse.json({
    message: `Seed terminé`,
    inserted,
    skipped,
    total: EXERCISES.length,
  });
}
