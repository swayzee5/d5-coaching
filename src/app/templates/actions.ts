"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendProgramAssignedEmail } from "@/lib/email";

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

  const tplRows = await db.$queryRaw<{ weeks_duration: number }[]>`
    SELECT weeks_duration FROM program_templates WHERE id = ${templateId}::uuid
  `;
  const weeksDuration = tplRows[0]?.weeks_duration ?? 8;

  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + weeksDuration * 7);

  const program = await db.trainingProgram.create({
    data: { clientId, name: programName, startDate: start, endDate: end, weeksDuration, isActive: true },
  });

  const sessions = await db.$queryRaw<SessionTpl[]>`
    SELECT id::text, name, day_of_week, order_index, duration_minutes, notes
    FROM session_templates WHERE program_template_id = ${templateId}::uuid
    ORDER BY order_index ASC
  `;

  for (const sess of sessions) {
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

    const exercises = await db.$queryRaw<ExerciseTpl[]>`
      SELECT exercise_name, sets, reps, rest_seconds, order_index, notes
      FROM exercise_templates
      WHERE session_template_id = ${sess.id}::uuid
      ORDER BY order_index ASC
    `;

    for (const ex of exercises) {
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

  // Notify client by email
  const client = await db.appClient.findUnique({
    where: { id: clientId },
    select: { email: true, firstName: true },
  }).catch(() => null);

  if (client) {
    sendProgramAssignedEmail({
      firstName: client.firstName,
      email: client.email,
      programName,
      startDate: startDate || null,
      sessionCount: sessions.length,
      weeksDuration,
    }).catch((err) => console.error("[program-email]", err));
  }

  redirect(`/app-clients/${clientId}/programmes/${program.id}`);
}

/* -------------------------------------------------------------------------
 * Attribution directe
 * ---------------------------------------------------------------------- */

/**
 * Attribue une séance type à un client.
 *
 * Les séances types étaient une bibliothèque morte : on pouvait les composer,
 * pas les donner à quelqu'un. Le coach devait recomposer à la main, exercice
 * par exercice, ce qu'il avait déjà écrit une fois.
 *
 * La séance rejoint le programme actif du client. S'il n'en a pas, un
 * programme est créé pour l'accueillir — demander au coach d'en créer un
 * d'abord ferait deux écrans pour une seule intention.
 *
 * Le rattachement à la bibliothèque d'exercices est posé au passage : sans
 * lui, la vidéo et la description ne suivraient pas, et le client verrait un
 * nom sans démonstration.
 */
export async function attribuerSeanceAClient(
  seanceTemplateId: string,
  clientId: string
): Promise<{ ok: boolean; erreur?: string; programmeId?: string }> {
  try {
    const tpl = await db.$queryRaw<{ name: string; duration_minutes: number | null }[]>`
      SELECT name, duration_minutes FROM seance_templates WHERE id = ${seanceTemplateId}::uuid
    `;
    if (!tpl[0]) return { ok: false, erreur: "Séance type introuvable." };

    const actifs = await db.trainingProgram.findMany({
      where: { clientId, isActive: true },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { id: true },
    });

    let programId = actifs[0]?.id;
    if (!programId) {
      const cree = await db.trainingProgram.create({
        data: {
          clientId,
          name: "Programme",
          // Six semaines : c'est la durée d'un bloc chez ce coach, et la
          // laisser vide ferait un programme sans fin ni échéance.
          weeksDuration: 6,
          startDate: new Date(),
          isActive: true,
        },
        select: { id: true },
      });
      programId = cree.id;
    }

    const rang = await db.trainingSession.count({ where: { programId } });
    const seance = await db.trainingSession.create({
      data: {
        programId,
        name: tpl[0].name,
        orderIndex: rang,
        durationMinutes: tpl[0].duration_minutes,
      },
      select: { id: true },
    });

    const exercices = await db.$queryRaw<ExerciseTpl[]>`
      SELECT exercise_name, sets, reps, rest_seconds, order_index, notes
        FROM seance_template_exercises
       WHERE seance_template_id = ${seanceTemplateId}::uuid
       ORDER BY order_index ASC
    `;

    for (const ex of exercices) {
      const lib = await db.$queryRaw<{ id: string }[]>`
        SELECT id::text FROM exercise_library
         WHERE LOWER(BTRIM(name)) = LOWER(BTRIM(${ex.exercise_name})) AND is_active = true
         LIMIT 1
      `.catch(() => [] as { id: string }[]);

      await db.sessionExercise.create({
        data: {
          sessionId: seance.id,
          libraryExerciseId: lib[0]?.id ?? null,
          name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.rest_seconds,
          orderIndex: ex.order_index,
          notes: ex.notes,
        },
      });
    }

    revalidatePath(`/app-clients/${clientId}`);
    return { ok: true, programmeId: programId };
  } catch (err) {
    console.error("[attribuerSeanceAClient]", err);
    return { ok: false, erreur: "Attribution impossible." };
  }
}

/** Les clients à qui proposer une attribution. Actifs, hors participants Reboot. */
export async function clientsAttribuables(): Promise<
  { id: string; nom: string; aUnProgramme: boolean }[]
> {
  const rows = await db.appClient.findMany({
    where: { isActive: true, isBlocked: false, isRebootOnly: false },
    orderBy: { firstName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      trainingPrograms: { where: { isActive: true }, select: { id: true }, take: 1 },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    nom: `${c.firstName} ${c.lastName}`.trim(),
    aUnProgramme: c.trainingPrograms.length > 0,
  }));
}

/**
 * Attribue un programme type à un client, sans passer par l'écran d'application.
 *
 * Même logique que `applyTemplate`, mais appelable depuis la fiche du client
 * et sans redirection : le coach reste où il est. Le nom et la date de départ
 * sont déduits — lui demander de les saisir pour une attribution de routine
 * ajouterait deux champs à remplir à chaque fois.
 */
export async function attribuerProgrammeAClient(
  templateId: string,
  clientId: string
): Promise<{ ok: boolean; erreur?: string }> {
  try {
    const tpl = await db.$queryRaw<{ name: string; description: string | null; weeks_duration: number }[]>`
      SELECT name, description, weeks_duration FROM program_templates WHERE id = ${templateId}::uuid
    `;
    if (!tpl[0]) return { ok: false, erreur: "Modèle introuvable." };

    const semaines = tpl[0].weeks_duration ?? 6;
    const debut = new Date();
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + semaines * 7);

    const programme = await db.trainingProgram.create({
      data: {
        clientId,
        name: tpl[0].name,
        description: tpl[0].description,
        startDate: debut,
        endDate: fin,
        weeksDuration: semaines,
        isActive: true,
      },
    });

    const seances = await db.$queryRaw<SessionTpl[]>`
      SELECT id::text, name, day_of_week, order_index, duration_minutes, notes
        FROM session_templates WHERE program_template_id = ${templateId}::uuid
       ORDER BY order_index ASC
    `;

    for (const s of seances) {
      const seance = await db.trainingSession.create({
        data: {
          programId: programme.id,
          name: s.name,
          dayOfWeek: s.day_of_week,
          orderIndex: s.order_index,
          durationMinutes: s.duration_minutes,
          notes: s.notes,
        },
        select: { id: true },
      });

      const exercices = await db.$queryRaw<ExerciseTpl[]>`
        SELECT exercise_name, sets, reps, rest_seconds, order_index, notes
          FROM exercise_templates WHERE session_template_id = ${s.id}::uuid
         ORDER BY order_index ASC
      `.catch(() => [] as ExerciseTpl[]);

      for (const ex of exercices) {
        const lib = await db.$queryRaw<{ id: string }[]>`
          SELECT id::text FROM exercise_library
           WHERE LOWER(BTRIM(name)) = LOWER(BTRIM(${ex.exercise_name})) AND is_active = true
           LIMIT 1
        `.catch(() => [] as { id: string }[]);

        await db.sessionExercise.create({
          data: {
            sessionId: seance.id,
            libraryExerciseId: lib[0]?.id ?? null,
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

    revalidatePath(`/app-clients/${clientId}`);
    return { ok: true };
  } catch (err) {
    console.error("[attribuerProgrammeAClient]", err);
    return { ok: false, erreur: "Attribution impossible." };
  }
}

/** Les modèles proposés sur la fiche d'un client. */
export async function modelesDisponibles(): Promise<{
  programmes: { id: string; nom: string; semaines: number; seances: number }[];
  seances: { id: string; nom: string; categorie: string; exercices: number }[];
}> {
  const [programmes, seances] = await Promise.all([
    db.$queryRaw<{ id: string; nom: string; semaines: number; seances: bigint }[]>`
      SELECT pt.id::text, pt.name AS nom, pt.weeks_duration AS semaines,
             COUNT(st.id) AS seances
        FROM program_templates pt
        LEFT JOIN session_templates st ON st.program_template_id = pt.id
       GROUP BY pt.id ORDER BY pt.name
    `.catch(() => []),
    db.$queryRaw<{ id: string; nom: string; categorie: string; exercices: bigint }[]>`
      SELECT s.id::text, s.name AS nom, s.category AS categorie,
             COUNT(e.id) AS exercices
        FROM seance_templates s
        LEFT JOIN seance_template_exercises e ON e.seance_template_id = s.id
       GROUP BY s.id ORDER BY s.category, s.name
    `.catch(() => []),
  ]);

  return {
    programmes: programmes.map((p) => ({ ...p, seances: Number(p.seances) })),
    seances: seances.map((s) => ({ ...s, exercices: Number(s.exercices) })),
  };
}
