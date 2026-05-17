"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";

type ExerciseTpl = {
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  order_index: number;
  notes: string | null;
};

type SessionTpl = {
  id: string;
  name: string;
  day_of_week: number | null;
  order_index: number;
  duration_minutes: number | null;
  notes: string | null;
};

export async function applyTemplate(formData: FormData) {
  const templateId = formData.get("templateId") as string;
  const clientId = formData.get("clientId") as string;
  const programName = formData.get("programName") as string;
  const startDate = formData.get("startDate") as string;

  if (!templateId || !clientId || !programName) return;

  // Fetch template info
  const tplRows = await db.$queryRaw<{ weeks_duration: number }[]>`
    SELECT weeks_duration FROM program_templates WHERE id = ${templateId}::uuid
  `;
  const weeksDuration = tplRows[0]?.weeks_duration ?? 8;

  // Calculate end date
  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + weeksDuration * 7);

  // Create program
  const program = await db.trainingProgram.create({
    data: {
      clientId,
      name: programName,
      startDate: start,
      endDate: end,
      weeksDuration,
      isActive: true,
    },
  });

  // Fetch sessions
  const sessions = await db.$queryRaw<SessionTpl[]>`
    SELECT id::text, name, day_of_week, order_index, duration_minutes, notes
    FROM session_templates WHERE program_template_id = ${templateId}::uuid
    ORDER BY order_index ASC
  `;

  for (const sess of sessions) {
    // Create training session
    const trainingSession = await db.trainingSession.create({
      data: {
        programId: program.id,
        name: sess.name,
        dayOfWeek: sess.day_of_week,
        orderIndex: sess.order_index,
        durationMinutes: sess.duration_minutes,
        notes: sess.notes,
      },
    });

    // Fetch exercises for this session
    const exercises = await db.$queryRaw<ExerciseTpl[]>`
      SELECT exercise_name, sets, reps, rest_seconds, order_index, notes
      FROM exercise_templates
      WHERE session_template_id = ${sess.id}::uuid
      ORDER BY order_index ASC
    `;

    for (const ex of exercises) {
      // Try to find library exercise by name
      const libEx = await db.$queryRaw<{ id: string }[]>`
        SELECT id::text FROM exercise_library WHERE name = ${ex.exercise_name} AND is_active = true LIMIT 1
      `.catch(() => [] as { id: string }[]);

      await db.sessionExercise.create({
        data: {
          sessionId: trainingSession.id,
          libraryExerciseId: libEx[0]?.id ?? null,
          name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.rest_seconds,
          orderIndex: ex.order_index,
          notes: ex.notes,
        },
      });
    }
  }

  redirect(`/app-clients/${clientId}/programmes/${program.id}`);
}
