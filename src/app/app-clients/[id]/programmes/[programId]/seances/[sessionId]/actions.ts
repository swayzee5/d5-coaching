"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

function sessionPath(clientId: string, programId: string, sessionId: string) {
  return `/app-clients/${clientId}/programmes/${programId}/seances/${sessionId}`;
}

export async function addExercise(
  sessionId: string,
  clientId: string,
  programId: string,
  formData: FormData
) {
  const name = formData.get("name") as string;
  const libraryExerciseId = (formData.get("libraryExerciseId") as string) || null;
  const sets = formData.get("sets") as string;
  const reps = formData.get("reps") as string;
  const restSeconds = formData.get("restSeconds") as string;

  if (!name?.trim()) return;

  // Récupérer le vimeoVideoId depuis la bibliothèque
  let vimeoVideoId: string | null = null;
  if (libraryExerciseId) {
    const libEx = await db.exerciseLibrary.findUnique({
      where: { id: libraryExerciseId },
      select: { vimeoVideoId: true },
    }).catch(() => null);
    vimeoVideoId = (libEx as any)?.vimeoVideoId ?? null;
  }

  const count = await db.sessionExercise.count({ where: { sessionId } });

  await db.sessionExercise.create({
    data: {
      sessionId,
      libraryExerciseId: libraryExerciseId || null,
      name: name.trim(),
      sets: sets ? parseInt(sets) : null,
      reps: reps?.trim() || null,
      restSeconds: restSeconds ? parseInt(restSeconds) : null,
      orderIndex: count,
      vimeoVideoId,
    } as any,
  });

  revalidatePath(sessionPath(clientId, programId, sessionId));
}

export async function removeExercise(
  exerciseId: string,
  clientId: string,
  programId: string,
  sessionId: string
) {
  await db.sessionExercise.delete({ where: { id: exerciseId } });
  revalidatePath(sessionPath(clientId, programId, sessionId));
}

export async function updateExercise(
  exerciseId: string,
  clientId: string,
  programId: string,
  sessionId: string,
  formData: FormData
) {
  const sets = formData.get("sets") as string;
  const reps = formData.get("reps") as string;
  const restSeconds = formData.get("restSeconds") as string;
  const vimeoVideoId = (formData.get("vimeoVideoId") as string)?.trim() || null;

  await db.sessionExercise.update({
    where: { id: exerciseId },
    data: {
      sets: sets ? parseInt(sets) : null,
      reps: reps?.trim() || null,
      restSeconds: restSeconds ? parseInt(restSeconds) : null,
      vimeoVideoId,
    } as any,
  });

  revalidatePath(sessionPath(clientId, programId, sessionId));
}

export async function saveSessionAsTemplate(
  sessionId: string,
  name: string,
  category: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const session = await db.trainingSession.findUnique({
      where: { id: sessionId },
      include: { exercises: { orderBy: { orderIndex: "asc" } } },
    });
    if (!session) return { ok: false, message: "Séance introuvable" };

    const [template] = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO seance_templates (name, category, duration_minutes, notes)
      VALUES (${name}, ${category}, ${session.durationMinutes ?? null}, ${session.notes ?? null})
      RETURNING id::text
    `;

    for (const ex of session.exercises) {
      await db.$executeRaw`
        INSERT INTO seance_template_exercises
          (seance_template_id, exercise_name, sets, reps, rest_seconds, order_index, notes)
        VALUES (
          ${template.id}::uuid,
          ${ex.name},
          ${ex.sets ?? null},
          ${ex.reps ?? null},
          ${ex.restSeconds ?? null},
          ${ex.orderIndex},
          ${ex.notes ?? null}
        )
      `;
    }

    return { ok: true, message: `✅ Template « ${name} » sauvegardé (${session.exercises.length} exercices)` };
  } catch (e) {
    console.error("[saveSessionAsTemplate]", e);
    return { ok: false, message: "Erreur lors de la sauvegarde" };
  }
}

export async function reorderExercises(
  sessionId: string,
  clientId: string,
  programId: string,
  orderedIds: string[]
) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.sessionExercise.update({ where: { id }, data: { orderIndex: index } })
    )
  );
  revalidatePath(sessionPath(clientId, programId, sessionId));
}

export async function renameSession(
  sessionId: string,
  clientId: string,
  programId: string,
  formData: FormData
) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  await db.trainingSession.update({ where: { id: sessionId }, data: { name } });
  revalidatePath(sessionPath(clientId, programId, sessionId));
}

export async function moveExercise(
  exerciseId: string,
  clientId: string,
  programId: string,
  sessionId: string,
  direction: "up" | "down"
) {
  const exercises = await db.sessionExercise.findMany({
    where: { sessionId },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true },
  });
  const idx = exercises.findIndex((e) => e.id === exerciseId);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= exercises.length) return;

  const current = exercises[idx];
  const swap = exercises[swapIdx];
  await db.$transaction([
    db.sessionExercise.update({ where: { id: current.id }, data: { orderIndex: swap.orderIndex } }),
    db.sessionExercise.update({ where: { id: swap.id }, data: { orderIndex: current.orderIndex } }),
  ]);
  revalidatePath(sessionPath(clientId, programId, sessionId));
}
