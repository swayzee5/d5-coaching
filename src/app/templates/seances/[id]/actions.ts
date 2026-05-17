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
