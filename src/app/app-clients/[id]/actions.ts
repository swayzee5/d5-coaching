"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function archiveClient(id: string) {
  await db.appClient.update({ where: { id }, data: { isActive: false } });
  revalidatePath(`/app-clients/${id}`);
  revalidatePath("/app-clients");
}

export async function unarchiveClient(id: string) {
  await db.appClient.update({ where: { id }, data: { isActive: true } });
  revalidatePath(`/app-clients/${id}`);
  revalidatePath("/app-clients");
}

export async function blockClient(id: string) {
  await db.appClient.update({ where: { id }, data: { isBlocked: true } });
  revalidatePath(`/app-clients/${id}`);
  revalidatePath("/app-clients");
}

export async function unblockClient(id: string) {
  await db.appClient.update({ where: { id }, data: { isBlocked: false } });
  revalidatePath(`/app-clients/${id}`);
  revalidatePath("/app-clients");
}

export async function toggleRebootOnly(id: string, current: boolean) {
  await db.appClient.update({ where: { id }, data: { isRebootOnly: !current } });
  revalidatePath(`/app-clients/${id}`);
  revalidatePath("/app-clients");
}

export async function deleteClient(id: string): Promise<{ error: string } | never> {
  // Delete in reverse dependency order to avoid FK constraint violations.
  // Raw SQL is used because these tables may have been created without CASCADE
  // constraints (bypassing Prisma migrations).

  const uid = id; // UUID string

  // 1. Raw SQL tables — no FK relation to clients
  await db.$executeRaw`DELETE FROM reboot_completions   WHERE client_id = ${uid}::uuid`.catch(() => {});
  await db.$executeRaw`DELETE FROM reboot_mid_checkins  WHERE client_id = ${uid}`.catch(() => {});
  await db.$executeRaw`DELETE FROM weekly_checkins       WHERE client_id = ${uid}`.catch(() => {});
  await db.$executeRaw`DELETE FROM messages              WHERE client_id = ${uid}`.catch(() => {});

  // 2. exercise_set_results (leaf — depends on session_completions + exercises)
  await db.$executeRaw`
    DELETE FROM exercise_set_results
    WHERE completion_id IN (
      SELECT sc.id FROM session_completions sc
      JOIN training_sessions ts ON sc.session_id = ts.id
      JOIN training_programs  tp ON ts.program_id  = tp.id
      WHERE tp.client_id = ${uid}::uuid
    )
    OR exercise_id IN (
      SELECT e.id FROM exercises e
      JOIN training_sessions ts ON e.session_id  = ts.id
      JOIN training_programs  tp ON ts.program_id = tp.id
      WHERE tp.client_id = ${uid}::uuid
    )
  `.catch(() => {});

  // 3. session_completions
  await db.$executeRaw`
    DELETE FROM session_completions
    WHERE session_id IN (
      SELECT ts.id FROM training_sessions ts
      JOIN training_programs tp ON ts.program_id = tp.id
      WHERE tp.client_id = ${uid}::uuid
    )
  `.catch(() => {});

  // 4. exercises (mapped table name)
  await db.$executeRaw`
    DELETE FROM exercises
    WHERE session_id IN (
      SELECT ts.id FROM training_sessions ts
      JOIN training_programs tp ON ts.program_id = tp.id
      WHERE tp.client_id = ${uid}::uuid
    )
  `.catch(() => {});

  // 5. training_sessions
  await db.$executeRaw`
    DELETE FROM training_sessions
    WHERE program_id IN (SELECT id FROM training_programs WHERE client_id = ${uid}::uuid)
  `.catch(() => {});

  // 6. training_programs, progress_entries, nutrition_files
  await db.$executeRaw`DELETE FROM training_programs WHERE client_id = ${uid}::uuid`.catch(() => {});
  await db.$executeRaw`DELETE FROM progress_entries  WHERE client_id = ${uid}::uuid`.catch(() => {});
  await db.$executeRaw`DELETE FROM nutrition_files   WHERE client_id = ${uid}::uuid`.catch(() => {});

  // 7. Delete the client row itself
  try {
    await db.appClient.delete({ where: { id } });
  } catch (err) {
    console.error("[deleteClient] final delete failed", err);
    return { error: "Suppression impossible. Vérifiez que toutes les données liées ont été supprimées." };
  }

  redirect("/app-clients");
}
