"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addExercise(sessionId: string, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const setsRaw = formData.get("sets") as string;
  const sets = setsRaw ? parseInt(setsRaw, 10) : null;
  const reps = (formData.get("reps") as string) || null;
  const restRaw = formData.get("rest_seconds") as string;
  const restSeconds = restRaw ? parseInt(restRaw, 10) : null;
  const vimeoVideoId = (formData.get("vimeo_video_id") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  const agg = await db.rebootExercise.aggregate({
    _max: { orderIndex: true },
    where: { sessionId },
  });
  const orderIndex = (agg._max.orderIndex ?? -1) + 1;

  await db.rebootExercise.create({
    data: { sessionId, name, sets, reps, restSeconds, vimeoVideoId, orderIndex, notes },
  });

  revalidatePath(`/reboot-sessions/${sessionId}`);
}

export async function deleteExercise(exerciseId: string, sessionId: string) {
  await db.rebootExercise.delete({ where: { id: exerciseId } });
  revalidatePath(`/reboot-sessions/${sessionId}`);
}

export async function updateVimeoId(exerciseId: string, sessionId: string, vimeoVideoId: string) {
  await db.rebootExercise.update({
    where: { id: exerciseId },
    data: { vimeoVideoId: vimeoVideoId.trim() || null },
  });
  revalidatePath(`/reboot-sessions/${sessionId}`);
}
