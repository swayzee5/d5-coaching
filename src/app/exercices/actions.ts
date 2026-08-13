"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createExercise(formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const vimeoVideoId = (formData.get("vimeoVideoId") as string) || null;
  const muscles = formData.getAll("muscles") as string[];

  if (!name?.trim()) return;

  await db.exerciseLibrary.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      vimeoVideoId: vimeoVideoId?.trim() || null,
      muscles,
    },
  });

  revalidatePath("/exercices");
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
