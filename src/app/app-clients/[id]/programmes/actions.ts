"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createProgram(clientId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const weeksDuration = formData.get("weeksDuration") as string;
  const startDate = formData.get("startDate") as string;

  if (!name?.trim()) return;

  const program = await db.trainingProgram.create({
    data: {
      clientId,
      name: name.trim(),
      description: description?.trim() || null,
      weeksDuration: weeksDuration ? parseInt(weeksDuration) : null,
      startDate: startDate ? new Date(startDate) : null,
      isActive: true,
    },
  });

  redirect(`/app-clients/${clientId}/programmes/${program.id}`);
}

export async function createSession(
  programId: string,
  clientId: string,
  formData: FormData
) {
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

  redirect(
    `/app-clients/${clientId}/programmes/${programId}/seances/${session.id}`
  );
}

export async function renameSession(
  sessionId: string,
  clientId: string,
  programId: string,
  formData: FormData
) {
  const name = formData.get("name") as string;
  if (!name?.trim()) return;

  await db.trainingSession.update({
    where: { id: sessionId },
    data: { name: name.trim() },
  });

  revalidatePath(`/app-clients/${clientId}/programmes/${programId}`);
}
