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

    // La provenance, pour pouvoir plus tard pousser les corrections du modèle
    // vers les copies déjà posées. Écrite en SQL direct : la colonne n'est pas
    // déclarée dans le schéma Prisma, et une colonne absente en base y ferait
    // échouer toutes les requêtes sur les séances.
    await marquerProvenance(seance.id, seanceTemplateId);

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

/* -------------------------------------------------------------------------
 * Création et composition
 * ---------------------------------------------------------------------- */

/**
 * Crée une séance type vierge.
 *
 * Il n'existait aucun moyen d'en créer une : il fallait enregistrer la séance
 * d'un client comme modèle, donc avoir déjà un client avec cette séance. Un
 * détour qui rendait la bibliothèque de séances inutilisable pour composer.
 */
export async function creerSeanceType(formData: FormData): Promise<void> {
  const nom = ((formData.get("nom") as string) ?? "").trim();
  const categorie = ((formData.get("categorie") as string) ?? "Général").trim();
  const duree = parseInt((formData.get("duree") as string) || "0", 10);

  if (!nom) return;

  const [cree] = await db.$queryRaw<{ id: string }[]>`
    INSERT INTO seance_templates (name, category, duration_minutes)
    VALUES (${nom}, ${categorie}, ${duree > 0 ? duree : null})
    RETURNING id::text
  `;

  revalidatePath("/templates");
  // On ouvre directement la séance : elle est vide, et la seule chose à y
  // faire est d'y mettre des exercices.
  redirect(`/templates/seances/${cree.id}`);
}

/** Crée un programme type vierge, à composer ensuite. */
export async function creerProgrammeType(formData: FormData): Promise<void> {
  const nom = ((formData.get("nom") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const semaines = parseInt((formData.get("semaines") as string) || "6", 10);

  if (!nom) return;

  const [cree] = await db.$queryRaw<{ id: string }[]>`
    INSERT INTO program_templates (name, description, category, weeks_duration)
    VALUES (${nom}, ${description || null}, 'Coaching', ${semaines > 0 ? semaines : 6})
    RETURNING id::text
  `;

  revalidatePath("/templates");
  redirect(`/templates/${cree.id}`);
}

/**
 * Ajoute une séance type à un programme type.
 *
 * La séance est copiée, pas référencée. Deux raisons : un programme doit
 * pouvoir ajuster une séance sans modifier le modèle d'origine ni les autres
 * programmes qui l'utilisent ; et supprimer une séance type ne doit pas vider
 * les programmes qui la contenaient.
 */
export async function ajouterSeanceAuProgramme(
  programmeId: string,
  seanceTemplateId: string
): Promise<{ ok: boolean; erreur?: string }> {
  try {
    const [tpl] = await db.$queryRaw<{ name: string; duration_minutes: number | null; notes: string | null }[]>`
      SELECT name, duration_minutes, notes FROM seance_templates WHERE id = ${seanceTemplateId}::uuid
    `;
    if (!tpl) return { ok: false, erreur: "Séance type introuvable." };

    const [{ rang }] = await db.$queryRaw<{ rang: number }[]>`
      SELECT COALESCE(MAX(order_index) + 1, 0)::int AS rang
        FROM session_templates WHERE program_template_id = ${programmeId}::uuid
    `;

    const [seance] = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO session_templates
        (program_template_id, name, order_index, duration_minutes, notes)
      VALUES (${programmeId}::uuid, ${tpl.name}, ${rang}, ${tpl.duration_minutes}, ${tpl.notes})
      RETURNING id::text
    `;

    const exercices = await db.$queryRaw<ExerciseTpl[]>`
      SELECT exercise_name, sets, reps, rest_seconds, order_index, notes
        FROM seance_template_exercises
       WHERE seance_template_id = ${seanceTemplateId}::uuid
       ORDER BY order_index
    `;

    for (const ex of exercices) {
      await db.$executeRaw`
        INSERT INTO exercise_templates
          (session_template_id, exercise_name, sets, reps, rest_seconds, order_index, notes)
        VALUES (${seance.id}::uuid, ${ex.exercise_name}, ${ex.sets}, ${ex.reps},
                ${ex.rest_seconds}, ${ex.order_index}, ${ex.notes})
      `;
    }

    revalidatePath(`/templates/${programmeId}`);
    revalidatePath("/templates");
    return { ok: true };
  } catch (err) {
    console.error("[ajouterSeanceAuProgramme]", err);
    return { ok: false, erreur: "Ajout impossible." };
  }
}

/** Retire une séance d'un programme type. Ses exercices suivent. */
export async function retirerSeanceDuProgramme(
  sessionTemplateId: string,
  programmeId: string
): Promise<{ ok: boolean }> {
  try {
    await db.$executeRaw`DELETE FROM exercise_templates WHERE session_template_id = ${sessionTemplateId}::uuid`;
    await db.$executeRaw`DELETE FROM session_templates WHERE id = ${sessionTemplateId}::uuid`;
    revalidatePath(`/templates/${programmeId}`);
    revalidatePath("/templates");
    return { ok: true };
  } catch (err) {
    console.error("[retirerSeanceDuProgramme]", err);
    return { ok: false };
  }
}

/**
 * Déplace une séance d'un cran dans un programme.
 *
 * Les rangs sont renumérotés avant l'échange : les programmes composés avant
 * cette fonction peuvent porter des rangs égaux ou troués, et un échange sur
 * des rangs incohérents ne déplace rien visiblement.
 */
export async function deplacerSeanceDuProgramme(
  sessionTemplateId: string,
  programmeId: string,
  sens: "haut" | "bas"
): Promise<{ ok: boolean }> {
  try {
    await db.$executeRaw`
      WITH ranges AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY order_index, id) - 1 AS rang
          FROM session_templates WHERE program_template_id = ${programmeId}::uuid
      )
      UPDATE session_templates s SET order_index = r.rang
        FROM ranges r WHERE s.id = r.id AND s.order_index IS DISTINCT FROM r.rang
    `;

    const lignes = await db.$queryRaw<{ id: string; order_index: number }[]>`
      SELECT id::text, order_index FROM session_templates
       WHERE program_template_id = ${programmeId}::uuid ORDER BY order_index
    `;
    const position = lignes.findIndex((l) => l.id === sessionTemplateId);
    if (position === -1) return { ok: false };

    const cible = sens === "haut" ? position - 1 : position + 1;
    if (cible < 0 || cible >= lignes.length) return { ok: true };

    const a = lignes[position];
    const b = lignes[cible];
    await db.$transaction([
      db.$executeRaw`UPDATE session_templates SET order_index = ${b.order_index} WHERE id = ${a.id}::uuid`,
      db.$executeRaw`UPDATE session_templates SET order_index = ${a.order_index} WHERE id = ${b.id}::uuid`,
    ]);

    revalidatePath(`/templates/${programmeId}`);
    return { ok: true };
  } catch (err) {
    console.error("[deplacerSeanceDuProgramme]", err);
    return { ok: false };
  }
}

/** Les séances types proposées à l'ajout dans un programme. */
export async function seancesTypesDisponibles(): Promise<
  { id: string; nom: string; categorie: string; exercices: number }[]
> {
  const rows = await db.$queryRaw<{ id: string; nom: string; categorie: string; exercices: bigint }[]>`
    SELECT s.id::text, s.name AS nom, s.category AS categorie, COUNT(e.id) AS exercices
      FROM seance_templates s
      LEFT JOIN seance_template_exercises e ON e.seance_template_id = s.id
     GROUP BY s.id ORDER BY s.category, s.name
  `.catch(() => []);
  return rows.map((r) => ({ ...r, exercices: Number(r.exercices) }));
}

/* ------------------------------------------------------------------ */
/*  Pousser les corrections d'un modèle vers les séances attribuées    */
/* ------------------------------------------------------------------ */

/**
 * L'attribution copie, elle ne référence pas.
 *
 * C'est ce qui permet d'ajuster la séance d'un client sans toucher à celle
 * des autres — et c'est indispensable : une charge, un exercice retiré pour
 * une épaule douloureuse ne regardent que lui.
 *
 * Mais il manquait le geste inverse. Corriger le modèle ne changeait rien
 * chez ceux qui l'avaient déjà reçu, et la seule façon de leur transmettre
 * une correction était de supprimer la séance et de la réattribuer — en
 * perdant sa place dans le programme, et sans savoir qui était concerné.
 *
 * La resynchronisation remplace le contenu d'une copie par celui du modèle.
 * Elle est explicite, séance par séance : pousser silencieusement écraserait
 * les ajustements faits pour un client, et personne ne saurait pourquoi.
 */

let colonneProvenancePrete = false;

async function ensureColonneProvenance(): Promise<void> {
  if (colonneProvenancePrete) return;
  await db
    .$executeRawUnsafe(
      `ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS seance_template_id UUID`
    )
    .catch(() => {});
  colonneProvenancePrete = true;
}

async function marquerProvenance(sessionId: string, templateId: string): Promise<void> {
  await ensureColonneProvenance();
  await db
    .$executeRaw`UPDATE training_sessions SET seance_template_id = ${templateId}::uuid WHERE id = ${sessionId}::uuid`
    .catch(() => {});
}

export type SeanceAttribuee = {
  id: string;
  client: string;
  programme: string;
  exercices: number;
  parLeNom: boolean;
};

/**
 * Les séances de clients issues de ce modèle.
 *
 * Celles attribuées avant l'existence de la colonne de provenance n'ont aucun
 * lien : elles sont retrouvées par leur nom, et signalées comme telles. Un
 * rapprochement par le nom peut se tromper — deux séances différentes peuvent
 * porter le même —, donc il est montré, jamais présumé.
 */
export async function seancesAttribuees(templateId: string): Promise<SeanceAttribuee[]> {
  await ensureColonneProvenance();
  try {
    const rows = await db.$queryRaw<
      { id: string; client: string; programme: string; exercices: bigint; par_le_nom: boolean }[]
    >`
      SELECT ts.id::text,
             COALESCE(c.first_name || ' ' || c.last_name, '—') AS client,
             tp.name AS programme,
             COUNT(e.id) AS exercices,
             (ts.seance_template_id IS NULL) AS par_le_nom
        FROM training_sessions ts
        JOIN training_programs tp ON tp.id = ts.program_id
        LEFT JOIN clients c ON c.id = tp.client_id
        LEFT JOIN exercises e ON e.session_id = ts.id
       WHERE ts.seance_template_id = ${templateId}::uuid
          OR (ts.seance_template_id IS NULL
              AND LOWER(BTRIM(ts.name)) = (
                SELECT LOWER(BTRIM(name)) FROM seance_templates WHERE id = ${templateId}::uuid
              ))
       GROUP BY ts.id, c.first_name, c.last_name, tp.name, ts.seance_template_id
       ORDER BY client
    `;
    return rows.map((r) => ({
      id: r.id,
      client: r.client,
      programme: r.programme,
      exercices: Number(r.exercices),
      parLeNom: r.par_le_nom,
    }));
  } catch (err) {
    console.error("[seancesAttribuees]", err);
    return [];
  }
}

/**
 * Remplace le contenu des séances choisies par celui du modèle.
 *
 * Les exercices sont supprimés puis réinsérés. L'historique des charges n'est
 * pas perdu pour autant : il est rattaché à l'exercice de bibliothèque, pas à
 * la ligne de séance, précisément pour survivre à ce genre de remplacement.
 *
 * Ce qui est perdu, en revanche, ce sont les ajustements faits pour ce client
 * sur cette séance. C'est dit avant, et c'est pour ça que rien n'est poussé
 * sans un choix explicite.
 */
export async function resynchroniserSeances(
  templateId: string,
  sessionIds: string[]
): Promise<{ ok: boolean; erreur?: string; faites?: number }> {
  if (sessionIds.length === 0) return { ok: false, erreur: "Aucune séance choisie." };
  await ensureColonneProvenance();

  try {
    const tpl = await db.$queryRaw<{ name: string; duration_minutes: number | null }[]>`
      SELECT name, duration_minutes FROM seance_templates WHERE id = ${templateId}::uuid
    `;
    if (!tpl[0]) return { ok: false, erreur: "Séance type introuvable." };

    const exercices = await db.$queryRaw<ExerciseTpl[]>`
      SELECT exercise_name, sets, reps, rest_seconds, order_index, notes
        FROM seance_template_exercises
       WHERE seance_template_id = ${templateId}::uuid
       ORDER BY order_index ASC
    `;

    // Le rattachement à la bibliothèque est résolu une fois pour toutes, et
    // non par séance : c'est la même réponse pour chacune, et une requête par
    // exercice et par client finirait par se voir.
    const liens = new Map<string, string | null>();
    for (const ex of exercices) {
      if (liens.has(ex.exercise_name)) continue;
      const lib = await db.$queryRaw<{ id: string }[]>`
        SELECT id::text FROM exercise_library
         WHERE LOWER(BTRIM(name)) = LOWER(BTRIM(${ex.exercise_name})) AND is_active = true
         ORDER BY (vimeo_video_id IS NOT NULL) DESC
         LIMIT 1
      `.catch(() => [] as { id: string }[]);
      liens.set(ex.exercise_name, lib[0]?.id ?? null);
    }

    let faites = 0;
    for (const sessionId of sessionIds) {
      await db.$executeRaw`DELETE FROM exercises WHERE session_id = ${sessionId}::uuid`;

      for (const ex of exercices) {
        await db.sessionExercise.create({
          data: {
            sessionId,
            libraryExerciseId: liens.get(ex.exercise_name) ?? null,
            name: ex.exercise_name,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.rest_seconds,
            orderIndex: ex.order_index,
            notes: ex.notes,
          },
        });
      }

      // Le nom et la durée suivent aussi : renommer le modèle sans que la
      // copie bouge laisserait deux noms pour une même séance.
      await db.$executeRaw`
        UPDATE training_sessions
           SET name = ${tpl[0].name},
               duration_minutes = ${tpl[0].duration_minutes},
               seance_template_id = ${templateId}::uuid
         WHERE id = ${sessionId}::uuid
      `;
      faites++;
    }

    revalidatePath("/app-clients");
    revalidatePath(`/templates/seances/${templateId}`);
    return { ok: true, faites };
  } catch (err) {
    console.error("[resynchroniserSeances]", err);
    return { ok: false, erreur: "Mise à jour impossible." };
  }
}
