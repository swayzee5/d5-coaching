"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Ajoute un exercice à la bibliothèque.
 *
 * Renvoie un résultat au lieu de ne rien dire. L'ajout fonctionnait, mais
 * aucune confirmation n'apparaissait : la liste compte plus de deux cents
 * entrées et le nouvel exercice atterrissait quelque part hors de l'écran,
 * si bien qu'on ne savait pas si le clic avait été pris en compte — et qu'on
 * ajoutait deux fois.
 *
 * Le doublon de nom est refusé plutôt que créé. Les séances qui ne portent
 * pas d'identifiant de bibliothèque sont rapprochées par le nom : deux
 * entrées identiques rendent ce rapprochement arbitraire.
 */
export async function createExercise(
  formData: FormData
): Promise<{ ok: true; nom: string } | { ok: false; erreur: string }> {
  const name = ((formData.get("name") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const vimeoVideoId = ((formData.get("vimeoVideoId") as string) ?? "").trim();
  const muscles = formData.getAll("muscles") as string[];

  if (!name) return { ok: false, erreur: "Le nom est obligatoire." };

  try {
    const existant = await db.exerciseLibrary.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { name: true },
    });
    if (existant) {
      return { ok: false, erreur: `« ${existant.name} » existe déjà dans la bibliothèque.` };
    }

    await db.exerciseLibrary.create({
      data: {
        name,
        description: description || null,
        vimeoVideoId: vimeoVideoId || null,
        muscles,
      },
    });
  } catch (err) {
    console.error("[createExercise] échec", err);
    return { ok: false, erreur: "Enregistrement impossible. Réessaie dans un instant." };
  }

  revalidatePath("/exercices");
  return { ok: true, nom: name };
}

// Renommer est le seul moyen de lever une ambiguïté quand deux exercices
// différents portent le même nom dans la bibliothèque : les séances joignent
// par nom quand exercises.library_exercise_id n'est pas renseigné.
export async function updateExercise(formData: FormData): Promise<{ error?: string }> {
  const id = formData.get("id") as string;
  const name = ((formData.get("name") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const muscles = formData.getAll("muscles") as string[];

  if (!id) return { error: "Exercice introuvable" };
  if (!name) return { error: "Le nom est obligatoire" };

  try {
    await db.exerciseLibrary.update({
      where: { id },
      data: { name, description: description || null, muscles },
    });
  } catch (err) {
    console.error("[updateExercise] échec", err);
    return { error: "Enregistrement impossible" };
  }

  revalidatePath("/exercices");
  revalidatePath("/programmes");
  return {};
}

export async function deleteExercise(id: string) {
  await db.exerciseLibrary.delete({ where: { id } });
  revalidatePath("/exercices");
}

export async function updateExerciseVimeo(id: string, vimeoVideoId: string | null) {
  await db.exerciseLibrary.update({
    where: { id },
    data: { vimeoVideoId: vimeoVideoId?.trim() || null },
  });
  revalidatePath("/exercices");
}
