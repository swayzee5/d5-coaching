"use server";

import { db } from "@/lib/db";
import { sendProgramCreatedEmail } from "@/lib/email";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
  const weekNumber = formData.get("weekNumber") as string;
  if (!name?.trim()) return;
  const count = await db.trainingSession.count({ where: { programId } });
  const session = await db.trainingSession.create({
    data: {
      programId,
      name: name.trim(),
      dayOfWeek: dayOfWeek !== "" ? parseInt(dayOfWeek) : null,
      weekNumber: weekNumber ? parseInt(weekNumber) : null,
      orderIndex: count,
    },
  });
  redirect(`/app-clients/${clientId}/programmes/${programId}/seances/${session.id}`);
}

export async function renameSession(sessionId: string, clientId: string, programId: string, formData: FormData) {
  const name = formData.get("name") as string;
  if (!name?.trim()) return;
  await db.trainingSession.update({
    where: { id: sessionId },
    data: { name: name.trim() },
  });
  revalidatePath(`/app-clients/${clientId}/programmes/${programId}`);
}

export async function duplicateSession(sessionId: string, programId: string, clientId: string) {
  const original = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });
  if (!original) return;
  const count = await db.trainingSession.count({ where: { programId } });
  await db.trainingSession.create({
    data: {
      programId,
      name: `${original.name} (copie)`,
      dayOfWeek: original.dayOfWeek,
      weekNumber: (original as any).weekNumber ?? null,
      orderIndex: count,
      notes: original.notes,
      exercises: {
        create: original.exercises.map((ex, i) => ({
          name: ex.name,
          libraryExerciseId: ex.libraryExerciseId,
          sets: ex.sets,
          reps: ex.reps,
          tempo: ex.tempo,
          restSeconds: ex.restSeconds,
          weight: ex.weight,
          vimeoVideoId: ex.vimeoVideoId,
          notes: ex.notes,
          rpe: (ex as any).rpe ?? null,
          isWarmup: (ex as any).isWarmup ?? false,
          weekFrom: (ex as any).weekFrom ?? null,
          weekTo: (ex as any).weekTo ?? null,
          orderIndex: i,
        })),
      },
    },
  });
  revalidatePath(`/app-clients/${clientId}/programmes/${programId}`);
}

export async function duplicateWeek(programId: string, clientId: string, formData: FormData) {
  const weekNumberRaw = formData.get("weekNumber") as string;
  const weekNumber = parseInt(weekNumberRaw);
  if (isNaN(weekNumber)) return;

  const sessions = await db.trainingSession.findMany({
    where: { programId, weekNumber } as any,
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
    orderBy: { orderIndex: "asc" },
  });
  if (sessions.length === 0) return;

  const allSessions = await db.trainingSession.findMany({
    where: { programId, weekNumber: { not: null } } as any,
    select: { weekNumber: true } as any,
  });
  const maxWeek = Math.max(
    ...allSessions.map((s: any) => s.weekNumber ?? 0),
    weekNumber
  );
  const newWeekNumber = maxWeek + 1;

  const count = await db.trainingSession.count({ where: { programId } });

  for (let i = 0; i < sessions.length; i++) {
    const original = sessions[i];
    await db.trainingSession.create({
      data: {
        programId,
        name: original.name,
        dayOfWeek: original.dayOfWeek,
        weekNumber: newWeekNumber,
        orderIndex: count + i,
        notes: original.notes,
        exercises: {
          create: original.exercises.map((ex, j) => ({
            name: ex.name,
            libraryExerciseId: ex.libraryExerciseId,
            sets: ex.sets,
            reps: ex.reps,
            tempo: ex.tempo,
            restSeconds: ex.restSeconds,
            weight: ex.weight,
            vimeoVideoId: ex.vimeoVideoId,
            notes: ex.notes,
            rpe: (ex as any).rpe ?? null,
            isWarmup: (ex as any).isWarmup ?? false,
            weekFrom: (ex as any).weekFrom ?? null,
            weekTo: (ex as any).weekTo ?? null,
            orderIndex: j,
          })),
        },
      } as any,
    });
  }

  revalidatePath(`/app-clients/${clientId}/programmes/${programId}`);
}

export async function deleteSession(sessionId: string, clientId: string, programId: string) {
  await db.trainingSession.delete({ where: { id: sessionId } });
  revalidatePath(`/app-clients/${clientId}/programmes/${programId}`);
}
