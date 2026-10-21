"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deleteExerciseFromSeanceTemplate(exerciseId: string, templateId: string) {
  await db.$executeRaw`
    DELETE FROM seance_template_exercises WHERE id = ${exerciseId}::uuid
  `;

  revalidatePath(`/templates/seances/${templateId}`);
  revalidatePath("/templates");
}

export async function updateSeanceTemplateName(formData: FormData) {
  const templateId = formData.get("templateId") as string;
  const name = formData.get("name") as string;
  const durationMinutes = formData.get("durationMinutes") as string;

  if (!name?.trim() || !templateId) return;

  await db.$executeRaw`
    UPDATE seance_templates
    SET
      name = ${name.trim()},
      duration_minutes = ${durationMinutes ? parseInt(durationMinutes) : null}
    WHERE id = ${templateId}::uuid
  `;

  revalidatePath(`/templates/seances/${templateId}`);
  revalidatePath("/templates");
}

/**
 * Déplace un exercice d'un cran dans une séance type.
 *
 * L'ordre d'une séance n'est pas décoratif : il décide de ce qui est fait
 * frais et de ce qui est fait fatigué. Composer une séance sans pouvoir la
 * réordonner oblige à tout supprimer pour insérer un exercice au bon endroit.
 *
 * Les deux rangs sont échangés dans une transaction. Interrompue au milieu, la
 * séance se retrouverait avec deux exercices au même rang, et leur ordre
 * dépendrait alors du hasard de la requête suivante.
 *
 * Les rangs sont renumérotés avant l'échange : les séances créées avant cette
 * fonction peuvent porter des rangs égaux ou troués, et un échange sur des
 * rangs incohérents ne déplace rien visiblement.
 */
export async function deplacerExerciceTemplate(
  exerciseId: string,
  templateId: string,
  sens: "haut" | "bas"
): Promise<{ ok: boolean; erreur?: string }> {
  try {
    await db.$executeRaw`
      WITH ranges AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY order_index, id) - 1 AS rang
          FROM seance_template_exercises
         WHERE seance_template_id = ${templateId}::uuid
      )
      UPDATE seance_template_exercises e
         SET order_index = r.rang
        FROM ranges r
       WHERE e.id = r.id AND e.order_index IS DISTINCT FROM r.rang
    `;

    const lignes = await db.$queryRaw<{ id: string; order_index: number }[]>`
      SELECT id::text, order_index
        FROM seance_template_exercises
       WHERE seance_template_id = ${templateId}::uuid
       ORDER BY order_index
    `;

    const position = lignes.findIndex((l) => l.id === exerciseId);
    if (position === -1) return { ok: false, erreur: "Exercice introuvable." };

    const cible = sens === "haut" ? position - 1 : position + 1;
    // Aux extrémités il n'y a rien à faire, et ce n'est pas une erreur : le
    // bouton est désactivé, mais un double clic rapide peut passer.
    if (cible < 0 || cible >= lignes.length) return { ok: true };

    const a = lignes[position];
    const b = lignes[cible];

    await db.$transaction([
      db.$executeRaw`UPDATE seance_template_exercises SET order_index = ${b.order_index} WHERE id = ${a.id}::uuid`,
      db.$executeRaw`UPDATE seance_template_exercises SET order_index = ${a.order_index} WHERE id = ${b.id}::uuid`,
    ]);

    revalidatePath(`/templates/seances/${templateId}`);
    revalidatePath("/templates");
    return { ok: true };
  } catch (err) {
    console.error("[deplacerExerciceTemplate]", err);
    return { ok: false, erreur: "Déplacement impossible." };
  }
}

/**
 * Cherche un exercice dans la bibliothèque, pour composer une séance type.
 *
 * Le nom était saisi à la main. Une faute de frappe, un accent écrit
 * autrement, une apostrophe typographique — et le rattachement à la
 * bibliothèque échoue au moment de l'attribution : le client voit alors un
 * exercice sans vidéo ni description, et personne ne sait pourquoi. Ces trois
 * pièges nous ont déjà coûté plusieurs jours.
 *
 * Les exercices sans vidéo sont renvoyés mais signalés : le coach doit voir
 * qu'il en manque une plutôt que de découvrir le trou chez son client.
 */
export type ExerciceBibliotheque = {
  id: string;
  nom: string;
  aVideo: boolean;
  muscles: string[];
};

export async function chercherDansBibliotheque(q: string): Promise<ExerciceBibliotheque[]> {
  const terme = q.trim();
  if (terme.length < 2) return [];

  const rows = await db.$queryRaw<
    { id: string; nom: string; a_video: boolean; muscles: string[] | null }[]
  >`
    SELECT id::text, name AS nom, (vimeo_video_id IS NOT NULL) AS a_video, muscles
      FROM exercise_library
     WHERE is_active = true
       AND LOWER(name) LIKE '%' || LOWER(${terme}) || '%'
     ORDER BY (vimeo_video_id IS NOT NULL) DESC, name
     LIMIT 20
  `.catch(() => []);

  return rows.map((r) => ({
    id: r.id,
    nom: r.nom,
    aVideo: r.a_video,
    muscles: r.muscles ?? [],
  }));
}

/**
 * Ajoute un exercice choisi dans la bibliothèque à une séance type.
 *
 * Le nom enregistré est celui de la bibliothèque, jamais une saisie : c'est
 * lui qui garantit le rattachement, et donc la vidéo chez le client.
 */
export async function ajouterExerciceDepuisBibliotheque(
  templateId: string,
  nomBibliotheque: string,
  valeurs: { series: number; reps: string; repos: number; note?: string | null }
): Promise<{ ok: boolean; erreur?: string }> {
  if (!templateId || !nomBibliotheque.trim()) {
    return { ok: false, erreur: "Exercice manquant." };
  }
  try {
    const [{ rang }] = await db.$queryRaw<{ rang: number }[]>`
      SELECT COALESCE(MAX(order_index) + 1, 0)::int AS rang
        FROM seance_template_exercises WHERE seance_template_id = ${templateId}::uuid
    `;
    await db.$executeRaw`
      INSERT INTO seance_template_exercises
        (seance_template_id, exercise_name, sets, reps, rest_seconds, order_index, notes)
      VALUES (${templateId}::uuid, ${nomBibliotheque}, ${valeurs.series}, ${valeurs.reps},
              ${valeurs.repos}, ${rang}, ${valeurs.note?.trim() || null})
    `;
    revalidatePath(`/templates/seances/${templateId}`);
    revalidatePath("/templates");
    return { ok: true };
  } catch (err) {
    console.error("[ajouterExerciceDepuisBibliotheque]", err);
    return { ok: false, erreur: "Ajout impossible." };
  }
}
