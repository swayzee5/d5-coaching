export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import SessionExecution from "./SessionExecution";

export default async function CommencerPage({
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
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <Link
          href={`/app-clients/${clientId}/programmes/${programId}`}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← {session.program.name}
        </Link>
        <div className="mt-4">
          <h1 className="text-xl font-bold text-white">{session.name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {session.exercises.length} exercice{session.exercises.length !== 1 ? "s" : ""}
            {session.durationMinutes ? ` · ~${session.durationMinutes} min` : ""}
          </p>
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
        <SessionExecution
          sessionId={sessionId}
          clientId={clientId}
          programId={programId}
          exercises={session.exercises.map((ex) => ({
            id: ex.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            notes: ex.notes,
          }))}
        />
      )}
    </div>
  );
}
