"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function assignVimeoToExercise(formData: FormData) {
  const exerciseId = formData.get("exerciseId") as string;
  const vimeoId = (formData.get("vimeoId") as string)?.trim();

  if (!exerciseId || !vimeoId) return;

  await db.exerciseLibrary.update({
    where: { id: exerciseId },
    data: { vimeoVideoId: vimeoId },
  });

  revalidatePath("/exercices/import-vimeo");
  revalidatePath("/exercices");
}
