export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { UpdateVimeoForm } from "./UpdateVimeoForm";
import { addExercise, deleteExercise } from "./actions";

const MUSCLE_LABELS: Record<string, string> = {
  pecs: "Pectoraux",
  dos: "Dos & Biceps",
  jambes: "Jambes & Fessiers",
};

export default async function RebootSessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let session: Awaited<ReturnType<typeof db.rebootSession.findUnique>> & {
    exercises: Awaited<ReturnType<typeof db.rebootExercise.findMany>>;
  } | null = null;

  try {
    session = await db.rebootSession.findUnique({
      where: { id: params.id },
      include: { exercises: { orderBy: { orderIndex: "asc" } } },
    }) as typeof session;
  } catch {
    return notFound();
  }

  if (!session) return notFound();

  const addExerciseWithId = addExercise.bind(null, params.id);

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <Link
        href="/reboot-sessions"
        className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
      >
        ← Toutes les séances
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
              session.location === "salle"
                ? "bg-blue-500/10 text-blue-400"
                : "bg-green-500/10 text-green-400"
            }`}
          >
            {session.location}
          </span>
          <span className="text-gray-500 text-xs">
            {MUSCLE_LABELS[session.muscleGroup] ?? session.muscleGroup}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white">{session.name}</h1>
        {session.description && (
          <p className="text-gray-400 text-sm mt-1">{session.description}</p>
        )}
        {session.durationMinutes && (
          <p className="text-gray-500 text-xs mt-1">⏱ {session.durationMinutes} min</p>
        )}
      </div>

      {/* Exercises list */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold">
          Exercices ({session.exercises.length})
        </h2>
        {session.exercises.length === 0 && (
          <p className="text-gray-500 text-sm">Aucun exercice. Ajoutez-en ci-dessous.</p>
        )}
        {session.exercises.map((ex, i) => {
          const deleteAction = deleteExercise.bind(null, ex.id, session!.id);
          return (
            <div
              key={ex.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-white font-medium">{ex.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                      {ex.sets && ex.reps && (
                        <span className="text-brand-400 font-semibold">
                          {ex.sets} × {ex.reps}
                        </span>
                      )}
                      {ex.restSeconds && (
                        <span className="text-gray-500">{ex.restSeconds}s repos</span>
                      )}
                      {ex.vimeoVideoId ? (
                        <span className="text-green-400">✓ Vimeo: {ex.vimeoVideoId}</span>
                      ) : (
                        <span className="text-amber-500/70">Pas de vidéo</span>
                      )}
                    </div>
                    {ex.notes && (
                      <p className="text-gray-500 text-xs mt-1 italic">{ex.notes}</p>
                    )}
                  </div>
                </div>
                <ConfirmButton
                  action={deleteAction}
                  message={`Supprimer « ${ex.name} » ?`}
                  className="text-xs text-red-400 hover:text-red-300 shrink-0 transition-colors"
                >
                  Supprimer
                </ConfirmButton>
              </div>
              <UpdateVimeoForm
                exerciseId={ex.id}
                sessionId={session!.id}
                currentVimeoId={ex.vimeoVideoId ?? ""}
              />
            </div>
          );
        })}
      </div>

      {/* Add exercise form */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold">Ajouter un exercice</h2>
        <form action={addExerciseWithId} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nom *</label>
              <input
                name="name"
                required
                placeholder="ex: Développé couché"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Séries</label>
                <input
                  name="sets"
                  type="number"
                  min="1"
                  placeholder="3"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Reps</label>
                <input
                  name="reps"
                  placeholder="12"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Repos (sec)</label>
              <input
                name="rest_seconds"
                type="number"
                placeholder="90"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">ID Vimeo</label>
              <input
                name="vimeo_video_id"
                placeholder="123456789"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes (optionnel)</label>
            <input
              name="notes"
              placeholder="ex: Descendre lentement en 3 secondes"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            + Ajouter
          </button>
        </form>
      </div>
    </div>
  );
}
