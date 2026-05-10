export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function VoirPage({
  params,
}: {
  params: { id: string; programId: string; sessionId: string };
}) {
  const { id: clientId, programId, sessionId } = params;

  const session = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      exercises: { orderBy: { orderIndex: "asc" } },
      program: { select: { id: true, name: true, clientId: true } },
    },
  });

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
        <div className="flex items-start justify-between mt-4">
          <div>
            <h1 className="text-xl font-bold text-white">{session.name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {session.exercises.length} exercice{session.exercises.length !== 1 ? "s" : ""}
              {session.durationMinutes ? ` · ~${session.durationMinutes} min` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/app-clients/${clientId}/programmes/${programId}/seances/${sessionId}`}
              className="px-3 py-1.5 text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              ✏️ Modifier
            </Link>
            <Link
              href={`/app-clients/${clientId}/programmes/${programId}/seances/${sessionId}/commencer`}
              className="px-3 py-1.5 text-xs text-white bg-brand-500 hover:bg-brand-400 rounded-lg font-medium transition-colors"
            >
              ▶ Commencer
            </Link>
          </div>
        </div>
      </div>

      {session.exercises.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Aucun exercice dans cette séance</p>
          <Link
            href={`/app-clients/${clientId}/programmes/${programId}/seances/${sessionId}`}
            className="mt-3 inline-block text-brand-400 text-sm hover:text-brand-300"
          >
            Ajouter des exercices →
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-800">
            <div className="col-span-5 text-xs text-gray-500 uppercase tracking-wider">Exercice</div>
            <div className="col-span-2 text-xs text-gray-500 uppercase tracking-wider text-center">Séries</div>
            <div className="col-span-2 text-xs text-gray-500 uppercase tracking-wider text-center">Reps</div>
            <div className="col-span-3 text-xs text-gray-500 uppercase tracking-wider text-center">Repos</div>
          </div>
          <div className="divide-y divide-gray-800/50">
            {session.exercises.map((ex) => (
              <div key={ex.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center">
                <div className="col-span-5">
                  <p className="text-sm text-white font-medium">{ex.name}</p>
                  {ex.notes && <p className="text-xs text-gray-500 mt-0.5">{ex.notes}</p>}
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-sm text-gray-300">{ex.sets ?? "–"}</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-sm text-gray-300">{ex.reps ?? "–"}</span>
                </div>
                <div className="col-span-3 text-center">
                  <span className="text-sm text-gray-300">
                    {ex.restSeconds ? `${ex.restSeconds}s` : "–"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
