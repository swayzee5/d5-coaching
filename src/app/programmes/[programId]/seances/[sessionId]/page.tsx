export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExercisePicker } from "@/components/programme/ExercisePicker";
import { ExerciseRow } from "@/components/programme/ExerciseRow";
import { addExercise, removeExercise, updateExercise } from "./actions";
import { toggleFavorite } from "@/app/exercices/actions";
import { createSession } from "../../actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Séance template — D5 CRM" };
const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default async function TemplateSessionPage({
  params,
}: {
  params: { programId: string; sessionId: string };
}) {
  const { programId, sessionId } = params;
  const [session, library] = await Promise.all([
    db.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        exercises: { orderBy: { orderIndex: "asc" } },
        program: {
          select: {
            id: true,
            name: true,
            isTemplate: true,
            sessions: {
              orderBy: { orderIndex: "asc" },
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    db.exerciseLibrary.findMany({
      orderBy: [{ isFavorite: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        muscles: true,
        equipment: true,
        description: true,
        isFavorite: true,
      },
    }),
  ]);
  if (!session || !session.program.isTemplate) notFound();

  const addAction = addExercise.bind(null, sessionId, programId);
  const createSessionAction = createSession.bind(null, programId);

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <Link
          href={`/programmes/${programId}`}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← {session.program.name}
        </Link>

        {session.program.sessions.length > 1 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {session.program.sessions.map((s, i) => (
              <Link
                key={s.id}
                href={`/programmes/${programId}/seances/${s.id}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  s.id === sessionId
                    ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {i + 1}. {s.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{session.name}</h1>
          {session.dayOfWeek !== null && (
            <p className="text-gray-400 text-sm mt-0.5">{DAY_NAMES[session.dayOfWeek]}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <form action={createSessionAction} className="flex items-center gap-2">
            <input
              name="name"
              required
              placeholder={`Séance ${session.program.sessions.length + 1}`}
              className="w-36 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors whitespace-nowrap"
            >
              + Séance
            </button>
          </form>
          <ExercisePicker
            library={library}
            addAction={addAction}
            toggleFavoriteAction={toggleFavorite}
          />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {session.exercises.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-gray-500 text-sm">Aucun exercice dans cette séance</p>
            <p className="text-gray-600 text-xs">
              Cliquez sur « Ajouter un exercice » pour sélectionner depuis la bibliothèque
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-950/40">
              <div className="w-44 shrink-0 text-xs text-gray-500 uppercase tracking-wider">Exercice</div>
              <div className="flex items-center gap-1.5 flex-1 text-xs text-gray-500 uppercase tracking-wider">
                <div className="w-10 shrink-0 text-center">Séries</div>
                <div className="w-14 shrink-0 text-center">Reps</div>
                <div className="w-16 shrink-0 text-center">Tempo</div>
                <div className="w-12 shrink-0 text-center">Repos (s)</div>
                <div className="w-16 shrink-0 text-center">Charges</div>
                <div className="w-20 shrink-0 text-center">Vidéo</div>
              </div>
              <div className="w-7 shrink-0" />
              <div className="w-7 shrink-0" />
            </div>
            <div>
              {session.exercises.map((ex) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={{
                    id: ex.id,
                    name: ex.name,
                    sets: ex.sets,
                    reps: ex.reps,
                    tempo: ex.tempo ?? null,
                    restSeconds: ex.restSeconds,
                    weight: ex.weight ?? null,
                    vimeoVideoId: ex.vimeoVideoId,
                    notes: ex.notes,
                  }}
                  updateAction={updateExercise.bind(null, ex.id, programId, sessionId)}
                  removeAction={removeExercise.bind(null, ex.id, programId, sessionId)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {session.exercises.length > 0 && (
        <p className="text-xs text-gray-600">
          {session.exercises.length} exercice{session.exercises.length !== 1 ? "s" : ""} ·{" "}
          {session.exercises.reduce((s, e) => s + (e.sets ?? 0), 0)} séries au total
        </p>
      )}
    </div>
  );
}
