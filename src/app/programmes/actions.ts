"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTemplate(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const weeksDuration = formData.get("weeksDuration") as string;
  if (!name) return;

  const program = await db.trainingProgram.create({
    data: {
      clientId: null,
      isTemplate: true,
      name,
      description,
      weeksDuration: weeksDuration ? parseInt(weeksDuration) : null,
    },
  });

  // Auto-crée la première séance pour arriver directement dans le builder
  const session = await db.trainingSession.create({
    data: { programId: program.id, name: "Séance 1", orderIndex: 0 },
  });

  redirect(`/programmes/${program.id}/seances/${session.id}`);
}

export async function assignToClient(programId: string, formData: FormData) {
  const clientId = formData.get("clientId") as string;
  const startDate = formData.get("startDate") as string;
  if (!clientId) return;

  const template = await db.trainingProgram.findUnique({
    where: { id: programId },
    include: {
      sessions: {
        orderBy: { orderIndex: "asc" },
        include: { exercises: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });
  if (!template) return;

  const newProgram = await db.trainingProgram.create({
    data: {
      clientId,
      name: template.name,
      description: template.description,
      weeksDuration: template.weeksDuration,
      startDate: startDate ? new Date(startDate) : null,
      isActive: true,
      sessions: {
        create: template.sessions.map((session, si) => ({
          name: session.name,
          dayOfWeek: session.dayOfWeek,
          orderIndex: si,
          notes: session.notes,
          exercises: {
            create: session.exercises.map((ex, ei) => ({
              name: ex.name,
              libraryExerciseId: ex.libraryExerciseId,
              sets: ex.sets,
              reps: ex.reps,
              tempo: ex.tempo,
              restSeconds: ex.restSeconds,
              weight: ex.weight,
              vimeoVideoId: ex.vimeoVideoId,
              notes: ex.notes,
              orderIndex: ei,
            })),
          },
        })),
      },
    },
  });
  redirect(`/app-clients/${clientId}/programmes/${newProgram.id}`);
}

export async function deleteTemplate(programId: string) {
  await db.trainingProgram.delete({ where: { id: programId } });
  revalidatePath("/programmes");
}
