export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ResultatsPage({
  params,
}: {
  params: { id: string; programId: string; sessionId: string };
}) {
  const { id: clientId, programId, sessionId } = params;

  const [session, completions] = await Promise.all([
    db.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        program: { select: { id: true, name: true, clientId: true } },
      },
    }),
    db.sessionCompletion.findMany({
      where: { sessionId },
      orderBy: { completedAt: "desc" },
      include: {
        setResults: {
          include: { exercise: true },
          orderBy: { setNumber: "asc" },
        },
      },
    }),
  ]);

  if (!session || session.program.clientId !== clientId) notFound();

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <Link
          href={`/app-clients/${clientId}/programmes/${programId}`}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← {session.program.name}
        </Link>
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-xl font-bold text-white">{session.name} — Résultats</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {completions.length} séance{completions.length !== 1 ? "s" : ""} réalisée{completions.length !== 1 ? "s" : ""}
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

      {completions.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Aucune séance réalisée pour l’instant</p>
        </div>
      ) : (
        <div className="space-y-4">
          {completions.map((completion) => {
            const byExercise = new Map<string, { name: string; sets: typeof completion.setResults }>();
            for (const sr of completion.setResults) {
              if (!byExercise.has(sr.exerciseId)) {
                byExercise.set(sr.exerciseId, { name: sr.exercise.name, sets: [] });
              }
              byExercise.get(sr.exerciseId)!.sets.push(sr);
            }

            const completedSets = completion.setResults.filter((s) => s.completed).length;

            return (
              <div key={completion.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {new Intl.DateTimeFormat("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }).format(new Date(completion.completedAt))}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      Par {completion.initiatedBy === "coach" ? "le coach" : "le client"}
                      {completion.durationMinutes ? ` · ${completion.durationMinutes} min` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {completedSets} / {completion.setResults.length} séries
                  </p>
                </div>
                <div className="divide-y divide-gray-800/50">
                  {Array.from(byExercise.values()).map((group) => (
                    <div key={group.name} className="px-5 py-3">
                      <p className="text-xs font-semibold text-gray-400 mb-2">{group.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.sets.map((sr) => (
                          <div
                            key={sr.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                              sr.completed
                                ? "bg-green-500/10 text-green-400"
                                : "bg-gray-800 text-gray-500 line-through"
                            }`}
                          >
                            <span className="text-gray-500">S{sr.setNumber}</span>
                            {sr.weightActual && <span>{sr.weightActual}kg</span>}
                            {sr.repsActual && <span>× {sr.repsActual}</span>}
                            {!sr.weightActual && !sr.repsActual && <span>–</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
