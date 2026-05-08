"use server";

import { db } from "@/lib/db";
import { sendProgramCreatedEmail } from "@/lib/email";
import { redirect } from "next/navigation";

export async function createProgram(clientId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const weeksDuration = formData.get("weeksDuration") as string;
  const startDate = formData.get("startDate") as string;
  if (!name?.trim()) return;

  const [program, client] = await Promise.all([
    db.trainingProgram.create({
      data: {
        clientId,
        name: name.trim(),
        description: description?.trim() || null,
        weeksDuration: weeksDuration ? parseInt(weeksDuration) : null,
        startDate: startDate ? new Date(startDate) : null,
        isActive: true,
      },
    }),
    db.appClient.findUnique({
      where: { id: clientId },
      select: { firstName: true, email: true },
    }),
  ]);

  if (client) {
    sendProgramCreatedEmail({
      firstName: client.firstName,
      email: client.email,
      programName: name.trim(),
    }).catch((err) => console.error("[program-email]", err));
  }

  redirect(`/app-clients/${clientId}/programmes/${program.id}`);
}

export async function createSession(programId: string, clientId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const dayOfWeek = formData.get("dayOfWeek") as string;
  if (!name?.trim()) return;
  const count = await db.trainingSession.count({ where: { programId } });
  const session = await db.trainingSession.create({
    data: { programId, name: name.trim(), dayOfWeek: dayOfWeek !== "" ? parseInt(dayOfWeek) : null, orderIndex: count },
  });
  redirect(`/app-clients/${clientId}/programmes/${programId}/seances/${session.id}`);
}
