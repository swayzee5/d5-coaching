"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function markCommentAsRead(commentId: string) {
  await db.clientComment.update({
    where: { id: commentId },
    data: { isRead: true },
  });
  revalidatePath("/dashboard");
}
