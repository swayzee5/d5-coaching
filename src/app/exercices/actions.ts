"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createExercise(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string) || null;
  const vimeoVideoId = (formData.get("vimeoVideoId") as string) || null;
  const muscles = formData.getAll("muscles") as string[];
  const equipment = formData.getAll("equipment") as string[];
  if (!name) return;
  await db.exerciseLibrary.create({
    data: {
      name,
      description: description?.trim() || null,
      vimeoVideoId: vimeoVideoId?.trim() || null,
      muscles,
      equipment,
    },
  });
  revalidatePath("/exercices");
}

export async function deleteExercise(id: string) {
  await db.exerciseLibrary.delete({ where: { id } });
  revalidatePath("/exercices");
}

export async function toggleFavorite(id: string, current: boolean) {
  await db.exerciseLibrary.update({
    where: { id },
    data: { isFavorite: !current },
  });
  revalidatePath("/exercices");
}
