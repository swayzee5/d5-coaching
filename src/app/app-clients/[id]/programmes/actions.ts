"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendProgramAssignedEmail } from "@/lib/email";

export async function createProgram(formData: FormData) {
  const clientId = formData.get("clientId") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const weeksDuration = formData.get("weeksDuration") as string;
  const startDate = formData.get("startDate") as string;

  if (!name?.trim() || !clientId) return;

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

  const client = await db.appClient.findUnique({
    where: { id: clientId },
    select: { email: true, firstName: true },
  }).catch(() => null);

  if (client) {
    sendProgramAssignedEmail({
      firstName: client.firstName,
      email: client.email,
      programName: name.trim(),
      startDate: startDate || null,
      sessionCount: 0,
      weeksDuration: weeksDuration ? parseInt(weeksDuration) : null,
    }).catch((err) => console.error("[program-email]", err));
  }

  redirect(`/app-clients/${clientId}/programmes/${program.id}`);
}

export async function createSession(formData: FormData) {
  const programId = formData.get("programId") as string;
  const clientId = formData.get("clientId") as string;
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

  redirect(`/app-clients/${clientId}/programmes/${programId}/seances/${session.id}`);
}

export async function createSessionFromTemplate(formData: FormData) {
  const programId = formData.get("programId") as string;
  const clientId = formData.get("clientId") as string;
  const seanceTemplateId = formData.get("seanceTemplateId") as string;

  if (!programId || !clientId || !seanceTemplateId) return;

  const tplRows = await db.$queryRaw<{ name: string; duration_minutes: number | null; notes: string | null }[]>`
    SELECT name, duration_minutes, notes FROM seance_templates WHERE id = ${seanceTemplateId}::uuid
  `;
  if (!tplRows.length) return;
  const tpl = tplRows[0];

  const count = await db.trainingSession.count({ where: { programId } });

  const session = await db.trainingSession.create({
    data: {
      programId,
      name: tpl.name,
      orderIndex: count,
      durationMinutes: tpl.duration_minutes,
      notes: tpl.notes,
    },
  });

  const exercises = await db.$queryRaw<{
    exercise_name: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    order_index: number;
    notes: string | null;
  }[]>`
    SELECT exercise_name, sets, reps, rest_seconds, order_index, notes
    FROM seance_template_exercises
    WHERE seance_template_id = ${seanceTemplateId}::uuid
    ORDER BY order_index ASC
  `;

  for (const ex of exercises) {
    // Look up exercise in library to get id AND vimeoVideoId
    const libEx = await db.$queryRaw<{ id: string; vimeo_video_id: string | null }[]>`
      SELECT id::text, vimeo_video_id
      FROM exercise_library
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(${ex.exercise_name})) AND is_active = true
      LIMIT 1
    `.catch(() => [] as { id: string; vimeo_video_id: string | null }[]);

    await db.sessionExercise.create({
      data: {
        sessionId: session.id,
        libraryExerciseId: libEx[0]?.id ?? null,
        name: ex.exercise_name,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.rest_seconds,
        vimeoVideoId: libEx[0]?.vimeo_video_id ?? null,
        orderIndex: ex.order_index,
        notes: ex.notes,
      },
    });
  }

  redirect(`/app-clients/${clientId}/programmes/${programId}/seances/${session.id}`);
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
