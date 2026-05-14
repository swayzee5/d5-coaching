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
  const name = (formData.get("name") as string)?.trim();
  let libraryExerciseId = (formData.get("libraryExerciseId") as string) || null;
  const sets = formData.get("sets") as string;
  const reps = (formData.get("reps") as string)?.trim() || null;
  const tempo = (formData.get("tempo") as string)?.trim() || null;
  const restSeconds = formData.get("restSeconds") as string;
  const weight = (formData.get("weight") as string)?.trim() || null;
  let vimeoVideoId = (formData.get("vimeoVideoId") as string)?.trim() || null;
  const rpe = formData.get("rpe") as string;
  const isWarmup = formData.get("isWarmup") === "true";
  const weekFrom = formData.get("weekFrom") as string;
  const weekTo = formData.get("weekTo") as string;
  const durationSeconds = formData.get("durationSeconds") as string;
  const distanceMeters = formData.get("distanceMeters") as string;
  const calories = formData.get("calories") as string;
  if (!name) return;

  if (!libraryExerciseId) {
    const existing = await db.exerciseLibrary.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      libraryExerciseId = existing.id;
      if (!vimeoVideoId && existing.vimeoVideoId) vimeoVideoId = existing.vimeoVideoId;
    } else {
      const created = await db.exerciseLibrary.create({ data: { name } });
      libraryExerciseId = created.id;
    }
  } else if (!vimeoVideoId) {
    const libEx = await db.exerciseLibrary.findUnique({
      where: { id: libraryExerciseId },
      select: { vimeoVideoId: true },
    });
    if (libEx?.vimeoVideoId) vimeoVideoId = libEx.vimeoVideoId;
  }

  const count = await db.sessionExercise.count({ where: { sessionId } });
  await db.sessionExercise.create({
    data: {
      sessionId,
      libraryExerciseId,
      name,
      sets: sets ? parseInt(sets) : null,
      reps,
      tempo,
      restSeconds: restSeconds ? parseInt(restSeconds) : null,
      weight,
      vimeoVideoId,
      rpe: rpe ? parseInt(rpe) : null,
      isWarmup,
      weekFrom: weekFrom ? parseInt(weekFrom) : null,
      weekTo: weekTo ? parseInt(weekTo) : null,
      durationSeconds: durationSeconds ? parseInt(durationSeconds) : null,
      distanceMeters: distanceMeters ? parseInt(distanceMeters) : null,
      calories: calories ? parseInt(calories) : null,
      orderIndex: count,
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
  const reps = (formData.get("reps") as string)?.trim() || null;
  const tempo = (formData.get("tempo") as string)?.trim() || null;
  const restSeconds = formData.get("restSeconds") as string;
  const weight = (formData.get("weight") as string)?.trim() || null;
  const vimeoVideoId = (formData.get("vimeoVideoId") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const rpe = formData.get("rpe") as string;
  const weekFrom = formData.get("weekFrom") as string;
  const weekTo = formData.get("weekTo") as string;
  await db.sessionExercise.update({
    where: { id: exerciseId },
    data: {
      sets: sets ? parseInt(sets) : null,
      reps,
      tempo,
      restSeconds: restSeconds ? parseInt(restSeconds) : null,
      weight,
      vimeoVideoId,
      notes,
      rpe: rpe ? parseInt(rpe) : null,
      weekFrom: weekFrom ? parseInt(weekFrom) : null,
      weekTo: weekTo ? parseInt(weekTo) : null,
    } as any,
  });
  revalidatePath(sessionPath(clientId, programId, sessionId));
}
