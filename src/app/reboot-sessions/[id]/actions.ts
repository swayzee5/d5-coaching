"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Édition des séances Reboot depuis le CRM.
 *
 * Toute modification marque la séance comme retouchée à la main. C'est ce qui
 * empêche le seed de l'app cliente de la reconstruire au prochain appel : sans
 * cette marque, le travail du coach serait effacé sans un mot, et il ne s'en
 * apercevrait qu'en ouvrant l'app, longtemps après.
 */
async function marquerModifiee(sessionId: string) {
  await db.rebootSession.update({
    where: { id: sessionId },
    data: { manuallyEdited: true },
  });
  revalidatePath(`/reboot-sessions/${sessionId}`);
  revalidatePath("/reboot-sessions");
}

/**
 * Ajoute un exercice choisi dans la bibliothèque.
 *
 * L'identifiant de bibliothèque est enregistré en même temps que le nom : la
 * vidéo et la description suivront l'entrée même si elle est renommée plus
 * tard. Saisir un nom à la main est resté possible, mais c'est ce qui a produit
 * des séances pleines d'exercices introuvables.
 */
export async function addExercise(sessionId: string, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const setsRaw = formData.get("sets") as string;
  const restRaw = formData.get("rest_seconds") as string;

  const agg = await db.rebootExercise.aggregate({
    _max: { orderIndex: true },
    where: { sessionId },
  });

  await db.rebootExercise.create({
    data: {
      sessionId,
      name,
      sets: setsRaw ? parseInt(setsRaw, 10) : null,
      reps: (formData.get("reps") as string)?.trim() || null,
      restSeconds: restRaw ? parseInt(restRaw, 10) : null,
      vimeoVideoId: (formData.get("vimeo_video_id") as string)?.trim() || null,
      libraryExerciseId: (formData.get("library_exercise_id") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
      orderIndex: (agg._max.orderIndex ?? -1) + 1,
    },
  });

  await marquerModifiee(sessionId);
}

/** Modifie la prescription d'un exercice déjà présent. */
export async function updateExercise(
  exerciseId: string,
  sessionId: string,
  valeurs: { sets: string; reps: string; restSeconds: string; notes: string }
) {
  await db.rebootExercise.update({
    where: { id: exerciseId },
    data: {
      sets: valeurs.sets ? parseInt(valeurs.sets, 10) : null,
      reps: valeurs.reps.trim() || null,
      restSeconds: valeurs.restSeconds ? parseInt(valeurs.restSeconds, 10) : null,
      notes: valeurs.notes.trim() || null,
    },
  });
  await marquerModifiee(sessionId);
}

/**
 * Pose, remplace ou retire la vidéo d'un exercice de la séance.
 *
 * Trois intentions, et il faut pouvoir les exprimer toutes les trois :
 *
 *   - « bibliotheque » : l'exercice suit la vidéo de la bibliothèque. C'est le
 *     cas par défaut, et celui qui se met à jour tout seul quand le coach
 *     refilme le mouvement.
 *   - un identifiant : une vidéo propre à cette séance, prioritaire sur la
 *     bibliothèque. Utile quand la même machine est filmée sous deux angles.
 *   - « aucune » : pas de démonstration, volontairement. Le drapeau empêche
 *     l'affichage de retrouver une vidéo par le nom et de la faire revenir.
 *
 * Toute pose lève ce drapeau. Il avait été mis par le seed sur les exercices
 * à qui la bibliothèque attribuait la vidéo d'un autre — les pompes diamant,
 * qui portaient celle des pompes classiques. Une fois la vraie vidéo tournée,
 * le drapeau survivait et masquait la nouvelle : poser une vidéo sans le lever
 * n'aurait rien changé à l'écran.
 */
export async function definirVideoExercice(
  exerciseId: string,
  sessionId: string,
  valeur: string
): Promise<{ ok: boolean; erreur?: string }> {
  const brut = valeur.trim();

  try {
    if (brut === "bibliotheque") {
      await db.rebootExercise.update({
        where: { id: exerciseId },
        data: { vimeoVideoId: null, videoSuppressed: false },
      });
    } else if (brut === "aucune") {
      await db.rebootExercise.update({
        where: { id: exerciseId },
        data: { vimeoVideoId: null, videoSuppressed: true },
      });
    } else {
      // Le coach colle en général l'adresse complète plutôt que l'identifiant.
      // Lui demander de savoir lequel des nombres d'une URL Vimeo est le bon
      // n'a pas de sens.
      const identifiant = brut.match(/(\d{6,})/)?.[1];
      if (!identifiant) {
        return { ok: false, erreur: "Aucun identifiant Vimeo dans ce qui a été saisi." };
      }
      await db.rebootExercise.update({
        where: { id: exerciseId },
        data: { vimeoVideoId: identifiant, videoSuppressed: false },
      });
    }
  } catch (err) {
    console.error("[definirVideoExercice]", err);
    return { ok: false, erreur: "Enregistrement impossible." };
  }

  await marquerModifiee(sessionId);
  return { ok: true };
}

export async function deleteExercise(exerciseId: string, sessionId: string) {
  await db.rebootExercise.delete({ where: { id: exerciseId } });
  await marquerModifiee(sessionId);
}

/**
 * Déplace un exercice d'un cran.
 *
 * Les deux rangs sont échangés dans une transaction : interrompue au milieu,
 * la séance se retrouverait avec deux exercices au même rang, et leur ordre
 * dépendrait alors du hasard de la requête.
 */
export async function moveExercise(
  exerciseId: string,
  sessionId: string,
  direction: "haut" | "bas"
) {
  const exercices = await db.rebootExercise.findMany({
    where: { sessionId },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true },
  });

  const position = exercices.findIndex((e) => e.id === exerciseId);
  const cible = direction === "haut" ? position - 1 : position + 1;
  if (position === -1 || cible < 0 || cible >= exercices.length) return;

  await db.$transaction([
    db.rebootExercise.update({
      where: { id: exercices[position].id },
      data: { orderIndex: exercices[cible].orderIndex },
    }),
    db.rebootExercise.update({
      where: { id: exercices[cible].id },
      data: { orderIndex: exercices[position].orderIndex },
    }),
  ]);

  await marquerModifiee(sessionId);
}

/** Renomme la séance, change sa description ou sa durée annoncée. */
export async function updateSession(
  sessionId: string,
  valeurs: { name: string; description: string; durationMinutes: string }
) {
  const nom = valeurs.name.trim();
  if (!nom) return { error: "Le nom ne peut pas être vide." };

  await db.rebootSession.update({
    where: { id: sessionId },
    data: {
      name: nom,
      description: valeurs.description.trim() || null,
      durationMinutes: valeurs.durationMinutes ? parseInt(valeurs.durationMinutes, 10) : null,
      manuallyEdited: true,
    },
  });
  revalidatePath(`/reboot-sessions/${sessionId}`);
  revalidatePath("/reboot-sessions");
  return { ok: true as const };
}

/**
 * Affiche ou masque une séance dans l'app.
 *
 * Préférable à la suppression : les validations des participants référencent
 * la séance, et l'effacer ferait disparaître des séances déjà faites de leur
 * historique.
 */
export async function toggleSessionActive(sessionId: string, actif: boolean) {
  await db.rebootSession.update({
    where: { id: sessionId },
    data: { isActive: actif, manuallyEdited: true },
  });
  revalidatePath(`/reboot-sessions/${sessionId}`);
  revalidatePath("/reboot-sessions");
}

export type ResultatRecherche = {
  id: string;
  name: string;
  vimeoVideoId: string | null;
  description: string | null;
};

/**
 * Cherche dans la bibliothèque pour l'ajout d'un exercice.
 *
 * Les exercices sans vidéo sont renvoyés aussi, mais signalés : le coach doit
 * pouvoir en ajouter un sciemment, pas par accident.
 */
export async function chercherExercices(q: string): Promise<ResultatRecherche[]> {
  const terme = q.trim();
  if (terme.length < 2) return [];

  const rows = await db.$queryRaw<ResultatRecherche[]>`
    SELECT id::text AS id, name, vimeo_video_id AS "vimeoVideoId", description
    FROM exercise_library
    WHERE is_active = true
      AND LOWER(name) LIKE '%' || LOWER(${terme}) || '%'
    ORDER BY (vimeo_video_id IS NOT NULL) DESC, name
    LIMIT 15
  `;
  return rows;
}
