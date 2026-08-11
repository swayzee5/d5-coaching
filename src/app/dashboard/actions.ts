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

export async function markAllCheckinsRead(): Promise<void> {
  try {
    await db.$executeRaw`UPDATE weekly_checkins SET is_read = true WHERE is_read = false`;
    revalidatePath("/dashboard");
    revalidatePath("/checkins");
  } catch {
    // table may not exist yet
  }
}

export async function markCheckinRead(id: string): Promise<void> {
  try {
    await db.$executeRaw`UPDATE weekly_checkins SET is_read = true WHERE id = ${id}::uuid`;
    revalidatePath("/dashboard");
    revalidatePath("/checkins");
  } catch {
    // table may not exist yet
  }
}
