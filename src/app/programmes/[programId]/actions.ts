"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSession(programId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const dayOfWeek = formData.get("dayOfWeek") as string;
  if (!name?.trim()) return;
  const count = await db.trainingSession.count({ where: { programId } });
  const session = await db.trainingSession.create({
    data: {
      programId,
      name: name.trim(),
      dayOfWeek: dayOfWeek !== "" ? parseInt(dayOfWeek) : null,
      orderIndex: count,
    },
  });
  redirect(`/programmes/${programId}/seances/${session.id}`);
}

export async function duplicateSession(sessionId: string, programId: string) {
  const original = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });
  if (!original) return;
  const count = await db.trainingSession.count({ where: { programId } });
  await db.trainingSession.create({
    data: {
      programId,
      name: `${original.name} (copie)`,
      dayOfWeek: original.dayOfWeek,
      orderIndex: count,
      notes: original.notes,
      exercises: {
        create: original.exercises.map((ex, i) => ({
          name: ex.name,
          libraryExerciseId: ex.libraryExerciseId,
          sets: ex.sets,
          reps: ex.reps,
          tempo: ex.tempo,
          restSeconds: ex.restSeconds,
          weight: ex.weight,
          vimeoVideoId: ex.vimeoVideoId,
          notes: ex.notes,
          orderIndex: i,
        })),
      },
    },
  });
  revalidatePath(`/programmes/${programId}`);
}

export async function deleteSession(sessionId: string, programId: string) {
  await db.trainingSession.delete({ where: { id: sessionId } });
  revalidatePath(`/programmes/${programId}`);
}
