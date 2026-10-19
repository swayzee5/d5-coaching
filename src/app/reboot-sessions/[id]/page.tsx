export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { ensureSchemaReboot } from "@/lib/ensure-schema";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EditeurSeance } from "@/components/reboot/EditeurSeance";

/** La vidéo affichée et son origine, pour une ligne d'exercice. */
function videoDe(
  r: { propre: string | null; biblio: string | null; supprimee: boolean } | undefined,
  repli: string | null
): { vimeoVideoId: string | null; videoOrigine: "seance" | "bibliotheque" | null } {
  if (!r) return { vimeoVideoId: repli, videoOrigine: repli ? "seance" : null };
  if (r.supprimee) return { vimeoVideoId: null, videoOrigine: null };
  if (r.propre) return { vimeoVideoId: r.propre, videoOrigine: "seance" };
  if (r.biblio) return { vimeoVideoId: r.biblio, videoOrigine: "bibliotheque" };
  return { vimeoVideoId: null, videoOrigine: null };
}

const ONGLETS: Record<string, string> = {
  salle: "En salle",
  maison: "À la maison",
  mobilite: "Échauffements",
  hiit: "HIIT",
};

export default async function RebootSessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Le schéma d'abord : une colonne manquante ferait échouer toute la
  // requête Prisma, et la page n'afficherait plus rien.
  await ensureSchemaReboot().catch(() => {});
  const session = await db.rebootSession.findUnique({
    where: { id: params.id },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });

  if (!session) return notFound();

  // La vidéo réellement affichée au client, résolue comme l'app cliente le
  // fait : celle posée sur l'exercice si elle existe, sinon celle de la
  // bibliothèque, et rien si elle a été retirée volontairement.
  type Resolue = { id: string; propre: string | null; biblio: string | null; supprimee: boolean };
  const resolues = await db.$queryRaw<Resolue[]>`
    SELECT re.id::text AS id,
           re.vimeo_video_id AS propre,
           el.vimeo_video_id AS biblio,
           re.video_suppressed AS supprimee
      FROM reboot_exercises re
      LEFT JOIN LATERAL (
        SELECT el.vimeo_video_id
          FROM exercise_library el
         WHERE el.is_active = true
           AND ((re.library_exercise_id IS NOT NULL AND el.id = re.library_exercise_id)
             OR (re.library_exercise_id IS NULL
                 AND LOWER(TRIM(el.name)) = LOWER(TRIM(re.name))))
         ORDER BY (el.vimeo_video_id IS NOT NULL) DESC, el.created_at ASC
         LIMIT 1
      ) el ON TRUE
     WHERE re.session_id = ${params.id}::uuid
  `.catch(() => [] as Resolue[]);

  const parExercice = new Map(resolues.map((r) => [r.id, r]));

  return (
    <div className="max-w-3xl space-y-5 p-6">
      <Link
        href="/reboot-sessions"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
      >
        ← Toutes les séances
      </Link>

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-semibold uppercase text-brand-400">
          {ONGLETS[session.tab] ?? session.tab}
        </span>
        {session.isBonus && (
          <span className="text-xs text-gray-500">
            Hors des 3 séances du challenge
          </span>
        )}
      </div>

      <EditeurSeance
        sessionId={session.id}
        nom={session.name}
        description={session.description}
        dureeMinutes={session.durationMinutes}
        active={session.isActive}
        modifiee={session.manuallyEdited}
        exercices={session.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          restSeconds: e.restSeconds,
          notes: e.notes,
          ...videoDe(parExercice.get(e.id), e.vimeoVideoId),
        }))}
      />
    </div>
  );
}
