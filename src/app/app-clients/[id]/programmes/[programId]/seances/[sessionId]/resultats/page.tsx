export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

// Deux sources pour une même séance :
//   - le client la valide dans l'app -> workout_sessions + set_performances
//   - le coach la saisit ici         -> session_completions + exercise_set_results
// Cette page ne lisait que la seconde.
type SetLine = {
  id: string;
  index: number;
  weight: string | null;
  reps: string | null;
  done: boolean;
};

type Realisation = {
  id: string;
  by: "client" | "coach";
  completedAt: Date;
  durationSeconds: number | null;
  rpe: number | null;
  notes: string[];
  byExercise: { name: string; sets: SetLine[] }[];
  totalSets: number;
  doneSets: number;
};

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}

function group(
  rows: { id: string; exerciseId: string; exerciseName: string; line: SetLine }[]
): { name: string; sets: SetLine[] }[] {
  const map = new Map<string, { name: string; sets: SetLine[] }>();
  for (const r of rows) {
    if (!map.has(r.exerciseId)) map.set(r.exerciseId, { name: r.exerciseName, sets: [] });
    map.get(r.exerciseId)!.sets.push(r.line);
  }
  return Array.from(map.values());
}

export default async function ResultatsPage({
  params,
}: {
  params: { id: string; programId: string; sessionId: string };
}) {
  const { id: clientId, programId, sessionId } = params;

  const session = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: { program: { select: { id: true, name: true, clientId: true } } },
  });

  if (!session || session.program.clientId !== clientId) notFound();

  let realisations: Realisation[] = [];
  let loadError: string | null = null;

  try {
    const [clientRuns, coachRuns] = await Promise.all([
      db.workoutSession.findMany({
        where: { trainingSessionId: sessionId, status: "completed" },
        orderBy: { completedAt: "desc" },
        include: {
          setPerformances: {
            include: { exercise: { select: { id: true, name: true } } },
            orderBy: { setIndex: "asc" },
          },
          sessionNotes: { orderBy: { createdAt: "asc" } },
        },
      }),
      db.sessionCompletion.findMany({
        where: { sessionId },
        orderBy: { completedAt: "desc" },
        include: {
          setResults: {
            include: { exercise: { select: { id: true, name: true } } },
            orderBy: { setNumber: "asc" },
          },
        },
      }),
    ]);

    realisations = [
      ...clientRuns.map((ws): Realisation => {
        const rows = ws.setPerformances.map((sp) => ({
          id: sp.id,
          exerciseId: sp.exerciseId,
          exerciseName: sp.exercise.name,
          line: {
            id: sp.id,
            index: sp.setIndex,
            weight: sp.weightUsed,
            reps: sp.repsDone != null ? String(sp.repsDone) : null,
            // set_performances ne contient que des séries réellement faites.
            done: true,
          },
        }));
        return {
          id: `ws-${ws.id}`,
          by: "client",
          completedAt: ws.completedAt ?? ws.startedAt ?? new Date(0),
          durationSeconds: ws.durationSeconds,
          rpe: ws.rpe,
          notes: ws.sessionNotes.map((n) => n.content),
          byExercise: group(rows),
          totalSets: rows.length,
          doneSets: rows.length,
        };
      }),
      ...coachRuns.map((sc): Realisation => {
        const rows = sc.setResults.map((sr) => ({
          id: sr.id,
          exerciseId: sr.exerciseId,
          exerciseName: sr.exercise.name,
          line: {
            id: sr.id,
            index: sr.setNumber,
            weight: sr.weightActual,
            reps: sr.repsActual,
            done: sr.completed,
          },
        }));
        return {
          id: `sc-${sc.id}`,
          by: "coach",
          completedAt: sc.completedAt,
          durationSeconds: sc.durationMinutes ? sc.durationMinutes * 60 : null,
          rpe: null,
          notes: sc.notes ? [sc.notes] : [],
          byExercise: group(rows),
          totalSets: rows.length,
          doneSets: rows.filter((r) => r.line.done).length,
        };
      }),
    ].sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
  } catch (err) {
    console.error("[resultats] chargement en échec", err);
    loadError = err instanceof Error ? err.message : "Erreur inconnue";
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <Link
          href={`/app-clients/${clientId}/programmes/${programId}`}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← {session.program.name}
        </Link>
        <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white">{session.name} — Résultats</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {realisations.length} séance{realisations.length !== 1 ? "s" : ""} réalisée
              {realisations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href={`/app-clients/${clientId}/programmes/${programId}/seances/${sessionId}/commencer`}
            className="px-3 py-1.5 text-xs text-white bg-brand-500 hover:bg-brand-400 rounded-lg font-medium transition-colors"
          >
            ▶ Commencer
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-5 py-6">
          <p className="text-red-400 text-sm font-medium">Impossible de charger les résultats</p>
          <p className="text-gray-500 text-xs mt-2 font-mono break-words">{loadError}</p>
        </div>
      ) : realisations.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Aucune séance réalisée pour l&apos;instant</p>
        </div>
      ) : (
        <div className="space-y-4">
          {realisations.map((r) => {
            const duration = formatDuration(r.durationSeconds);
            return (
              <div
                key={r.id}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {r.completedAt.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.by === "coach" ? "Saisie par le coach" : "Validée par le client"}
                      {duration ? ` · ${duration}` : ""}
                      {r.rpe != null ? ` · RPE ${r.rpe}/10` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 shrink-0">
                    {r.by === "coach"
                      ? `${r.doneSets} / ${r.totalSets} séries`
                      : `${r.totalSets} série${r.totalSets !== 1 ? "s" : ""}`}
                  </p>
                </div>

                {r.notes.length > 0 && (
                  <div className="px-5 py-3 bg-gray-800/30 border-b border-gray-800/50 space-y-1">
                    {r.notes.map((n, i) => (
                      <p key={i} className="text-xs text-gray-300 italic">
                        &ldquo;{n}&rdquo;
                      </p>
                    ))}
                  </div>
                )}

                {r.byExercise.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-gray-600">
                    Séance validée sans détail de séries.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-800/50">
                    {r.byExercise.map((g) => (
                      <div key={g.name} className="px-5 py-3">
                        <p className="text-xs font-semibold text-gray-400 mb-2">{g.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {g.sets.map((s) => (
                            <div
                              key={s.id}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                                s.done
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-gray-800 text-gray-500 line-through"
                              }`}
                            >
                              <span className="text-gray-500">S{s.index}</span>
                              {s.weight && <span>{s.weight} kg</span>}
                              {s.reps && <span>× {s.reps}</span>}
                              {!s.weight && !s.reps && <span>–</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
