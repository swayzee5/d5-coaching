"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addExerciseToSeanceTemplate(formData: FormData) {
  const templateId = formData.get("templateId") as string;
  const exerciseName = formData.get("exerciseName") as string;
  const sets = parseInt((formData.get("sets") as string) || "3");
  const reps = (formData.get("reps") as string) || "12";
  const restSeconds = parseInt((formData.get("restSeconds") as string) || "90");
  const notes = (formData.get("notes") as string) || null;
  const orderIndex = parseInt((formData.get("orderIndex") as string) || "0");

  if (!exerciseName?.trim() || !templateId) return;

  await db.$executeRaw`
    INSERT INTO seance_template_exercises (seance_template_id, exercise_name, sets, reps, rest_seconds, order_index, notes)
    VALUES (${templateId}::uuid, ${exerciseName.trim()}, ${sets}, ${reps}, ${restSeconds}, ${orderIndex}, ${notes})
  `;

  revalidatePath(`/templates/seances/${templateId}`);
  revalidatePath("/templates");
}

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
