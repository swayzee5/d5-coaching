"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function markAllNotesRead(): Promise<void> {
  try {
    await db.$executeRaw`UPDATE session_notes SET is_read = true WHERE is_read = false`;
    revalidatePath("/dashboard");
  } catch {
    // table may not exist yet
  }
}
