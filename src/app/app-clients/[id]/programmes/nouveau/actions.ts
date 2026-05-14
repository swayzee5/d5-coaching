"use server";

import { db } from "@/lib/db";
import { sendProgramCreatedEmail } from "@/lib/email";

type SessionDraft = {
  name: string;
  weekNumber: number | null;
  dayOfWeek: number | null;
};

export type CreateProgramResult = { error: string } | { programId: string };

export async function createManualProgram(
  clientId: string,
  name: string,
  weeksDuration: number | null,
  startDate: string | null,
  sessions: SessionDraft[]
): Promise<CreateProgramResult> {
  if (!name?.trim()) return { error: "Le nom du programme est requis" };

  try {
    const program = await db.trainingProgram.create({
      data: {
        clientId,
        name: name.trim(),
        weeksDuration,
        startDate: startDate ? new Date(startDate) : null,
        isActive: true,
      },
    });

    if (sessions.length > 0) {
      await db.trainingSession.createMany({
        data: sessions.map((s, i) => ({
          programId: program.id,
          name: s.name,
          weekNumber: s.weekNumber,
          dayOfWeek: s.dayOfWeek,
          orderIndex: i,
        })),
      });
    }

    const client = await db.appClient.findUnique({
      where: { id: clientId },
      select: { firstName: true, email: true },
    });

    if (client) {
      sendProgramCreatedEmail({
        firstName: client.firstName,
        email: client.email,
        programName: name.trim(),
      }).catch((err) => console.error("[program-email]", err));
    }

    return { programId: program.id };
  } catch (err) {
    console.error("[create-manual-program]", err);
    return { error: "Erreur lors de la création du programme" };
  }
}
