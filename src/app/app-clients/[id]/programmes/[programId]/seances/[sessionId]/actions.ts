"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

function sessionPath(clientId: string, programId: string, sessionId: string) {
  return `/app-clients/${clientId}/programmes/${programId}/seances/${sessionId}`;
}

export async function addExercise(sessionId: string, clientId: string, programId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const libraryExerciseId = (formData.get("libraryExerciseId") as string) || null;
  const sets = formData.get("sets") as string;
  const reps = formData.get("reps") as string;
  const restSeconds = formData.get("restSeconds") as string;
  if (!name?.trim()) return;
  const count = await db.sessionExercise.count({ where: { sessionId } });
  await db.sessionExercise.create({
    data: { sessionId, libraryExerciseId: libraryExerciseId || null, name: name.trim(), sets: sets ? parseInt(sets) : null, reps: reps?.trim() || null, restSeconds: restSeconds ? parseInt(restSeconds) : null, orderIndex: count },
  });
  revalidatePath(sessionPath(clientId, programId, sessionId));
}

export async function removeExercise(exerciseId: string, clientId: string, programId: string, sessionId: string) {
  await db.sessionExercise.delete({ where: { id: exerciseId } });
  revalidatePath(sessionPath(clientId, programId, sessionId));
}

export async function updateExercise(exerciseId: string, clientId: string, programId: string, sessionId: string, formData: FormData) {
  const sets = formData.get("sets") as string;
  const reps = formData.get("reps") as string;
  const restSeconds = formData.get("restSeconds") as string;
  await db.sessionExercise.update({
    where: { id: exerciseId },
    data: { sets: sets ? parseInt(sets) : null, reps: reps?.trim() || null, restSeconds: restSeconds ? parseInt(restSeconds) : null },
  });
  revalidatePath(sessionPath(clientId, programId, sessionId));
}
