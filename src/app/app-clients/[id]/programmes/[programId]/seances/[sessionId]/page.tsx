export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExercisePicker } from "@/components/programme/ExercisePicker";
import { ExerciseRow } from "@/components/programme/ExerciseRow";
import { addExercise, removeExercise, updateExercise } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Séance — D5 CRM" };

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default async function SessionBuilderPage({
  params,
}: {
  params: { id: string; programId: string; sessionId: string };
}) {
  const { id: clientId, programId, sessionId } = params;

  const [session, library] = await Promise.all([
    db.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        exercises: { orderBy: { orderIndex: "asc" } },
        program: { select: { id: true, name: true, clientId: true } },
      },
    }),
    db.exerciseLibrary.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, muscles: true, description: true },
    }),
  ]);

  if (!session || session.program.clientId !== clientId) notFound();

  const addAction = addExercise.bind(null, sessionId, clientId, programId);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href={`/app-clients/${clientId}/programmes/${programId}`}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← {session.program.name}
        </Link>
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-xl font-bold text-white">{session.name}</h1>
            {session.dayOfWeek !== null && (
              <p className="text-gray-400 text-sm mt-0.5">{DAY_NAMES[session.dayOfWeek]}</p>
            )}
          </div>
          <ExercisePicker library={library} addAction={addAction} />
        </div>
      </div>

      {/* Exercises table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {session.exercises.length === 0 ? (
          <div className="py-16 text-center space-y-1">
            <p className="text-gray-500 text-sm">Aucun exercice dans cette séance</p>
            <p className="text-gray-600 text-xs">Utilisez le bouton &quot;Ajouter un exercice&quot; ci-dessus</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-800">
              <div className="col-span-5 text-xs text-gray-500 uppercase tracking-wider">Exercice</div>
              <div className="col-span-2 text-xs text-gray-500 uppercase tracking-wider text-center">Séries</div>
              <div className="col-span-2 text-xs text-gray-500 uppercase tracking-wider text-center">Reps</div>
              <div className="col-span-2 text-xs text-gray-500 uppercase tracking-wider text-center">Repos (s)</div>
              <div className="col-span-1"></div>
            </div>
            <div className="divide-y divide-gray-800/50">
              {session.exercises.map((ex) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={{
                    id: ex.id,
                    name: ex.name,
                    sets: ex.sets,
                    reps: ex.reps,
                    restSeconds: ex.restSeconds,
                    notes: ex.notes,
                  }}
                  updateAction={updateExercise.bind(null, ex.id, clientId, programId, sessionId)}
                  removeAction={removeExercise.bind(null, ex.id, clientId, programId, sessionId)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add custom exercise */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Exercice personnalisé</h3>
        <form action={addAction} className="flex gap-3">
          <input
            name="name"
            placeholder="Nom de l'exercice..."
            required
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <input type="hidden" name="libraryExerciseId" value="" />
          <input type="hidden" name="sets" value="3" />
          <input type="hidden" name="reps" value="10" />
          <input type="hidden" name="restSeconds" value="60" />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Ajouter
          </button>
        </form>
      </div>
    </div>
  );
}
