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

export async function deleteExercise(id: string) {
  await db.exerciseLibrary.delete({ where: { id } });
  revalidatePath("/exercices");
}
