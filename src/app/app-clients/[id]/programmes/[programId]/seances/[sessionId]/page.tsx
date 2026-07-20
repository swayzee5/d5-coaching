export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExercisePicker } from "@/components/programme/ExercisePicker";
import { ExerciseList } from "@/components/programme/ExerciseList";
import { RenameSessionInput } from "@/components/programme/RenameSessionInput";
import { addExercise, removeExercise, updateExercise, renameSession, reorderExercises } from "./actions";
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
  const renameAction = renameSession.bind(null, sessionId, clientId, programId);
  const reorderAction = reorderExercises.bind(null, sessionId, clientId, programId);

  const exercises = session.exercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    restSeconds: ex.restSeconds,
    notes: ex.notes,
    vimeoVideoId: (ex as any).vimeoVideoId ?? null,
  }));

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <Link
          href={`/app-clients/${clientId}/programmes/${programId}`}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← {session.program.name}
        </Link>
        <div className="flex items-center justify-between mt-4">
          <div>
            <RenameSessionInput defaultValue={session.name} renameAction={renameAction} />
            {session.dayOfWeek !== null && (
              <p className="text-gray-400 text-sm mt-0.5">{DAY_NAMES[session.dayOfWeek]}</p>
            )}
          </div>
          <ExercisePicker library={library} addAction={addAction} />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {exercises.length === 0 ? (
          <div className="py-16 text-center space-y-1">
            <p className="text-gray-500 text-sm">Aucun exercice dans cette séance</p>
            <p className="text-gray-600 text-xs">Utilisez le bouton « Ajouter un exercice » ci-dessus</p>
          </div>
        ) : (
          <ExerciseList
            initialExercises={exercises}
            reorderAction={reorderAction}
            updateAction={(id) => updateExercise.bind(null, id, clientId, programId, sessionId)}
            removeAction={(id) => removeExercise.bind(null, id, clientId, programId, sessionId)}
          />
        )}
      </div>

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
          <button type="submit" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
            Ajouter
          </button>
        </form>
      </div>
    </div>
  );
}
