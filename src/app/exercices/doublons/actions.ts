"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function mergeExercises(formData: FormData) {
  const keepId = formData.get("keepId") as string;
  const deleteId = formData.get("deleteId") as string;
  if (!keepId || !deleteId) return;

  // Fetch both to check Vimeo transfer
  type ExRow = { id: string; vimeo_video_id: string | null };
  const [kept, toDelete] = await Promise.all([
    db.$queryRaw<ExRow[]>`SELECT id::text, vimeo_video_id FROM exercise_library WHERE id = ${keepId}::uuid`.catch(() => [] as ExRow[]),
    db.$queryRaw<ExRow[]>`SELECT id::text, vimeo_video_id FROM exercise_library WHERE id = ${deleteId}::uuid`.catch(() => [] as ExRow[]),
  ]);

  const keptEx = kept[0];
  const deletedEx = toDelete[0];

  // Transfer Vimeo if kept has none but deleted has one
  if (keptEx && deletedEx && !keptEx.vimeo_video_id && deletedEx.vimeo_video_id) {
    await db.exerciseLibrary
      .update({ where: { id: keepId }, data: { vimeoVideoId: deletedEx.vimeo_video_id } })
      .catch(() => {});
  }

  // Delete the duplicate
  await db.exerciseLibrary.delete({ where: { id: deleteId } }).catch(() => {});

  revalidatePath("/exercices/doublons");
  revalidatePath("/exercices");
  redirect("/exercices/doublons?merged=1");
}
