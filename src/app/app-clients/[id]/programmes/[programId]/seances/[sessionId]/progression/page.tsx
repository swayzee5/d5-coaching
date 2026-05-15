export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Progression — D5 CRM" };

type WorkoutRow = {
  id: string;
  completed_at: Date;
  started_at: Date;
  duration_seconds: number | null;
  rpe: number | null;
};

type NoteRow = {
  workout_session_id: string;
  content: string;
};

type SetRow = {
  workout_session_id: string;
  exercise_id: string;
  exercise_name: string;
  set_index: number;
  reps_done: number | null;
  weight_used: string | null;
};

function formatDuration(s: number | null): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

async function getProgressionData(sessionId: string, clientId: string) {
  let workouts: WorkoutRow[] = [];
  let notes: NoteRow[] = [];
  let sets: SetRow[] = [];

  try {
    workouts = (await db.$queryRaw`
      SELECT ws.id, ws.completed_at, ws.started_at, ws.duration_seconds, ws.rpe
      FROM workout_sessions ws
      WHERE ws.training_session_id = ${sessionId}::uuid
        AND ws.client_id = ${clientId}::uuid
        AND ws.status = 'completed'
      ORDER BY ws.completed_at DESC
      LIMIT 20
    `) as WorkoutRow[];
  } catch { /* tables not yet created */ }

  if (workouts.length === 0) return { workouts: [], notes: [], sets: [] };

  const ids = workouts.map((w) => w.id);

  try {
    notes = (await db.$queryRaw`
      SELECT sn.workout_session_id, sn.content
      FROM session_notes sn
      WHERE sn.workout_session_id = ANY(${ids}::uuid[])
    `) as NoteRow[];
  } catch { /* */ }

  try {
    sets = (await db.$queryRaw`
      SELECT sp.workout_session_id, sp.exercise_id, e.name AS exercise_name,
             sp.set_index, sp.reps_done, sp.weight_used
      FROM set_performances sp
      JOIN exercises e ON e.id = sp.exercise_id
      WHERE sp.workout_session_id = ANY(${ids}::uuid[])
      ORDER BY sp.exercise_id, sp.set_index ASC
    `) as SetRow[];
  } catch { /* */ }

  return { workouts, notes, sets };
}

export default async function ProgressionPage({
  params,
}: {
  params: { id: string; programId: string; sessionId: string };
}) {
  const { id: clientId, programId, sessionId } = params;

  const session = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: { program: { select: { name: true, clientId: true } } },
  });
  if (!session || session.program.clientId !== clientId) notFound();

  const { workouts, notes, sets } = await getProgressionData(sessionId, clientId);

  const notesByWorkout = notes.reduce<Record<string, string>>((acc, n) => {
    acc[n.workout_session_id] = n.content;
    return acc;
  }, {});

  const setsByWorkout = sets.reduce<Record<string, Record<string, SetRow[]>>>((acc, s) => {
    if (!acc[s.workout_session_id]) acc[s.workout_session_id] = {};
    if (!acc[s.workout_session_id][s.exercise_id]) acc[s.workout_session_id][s.exercise_id] = [];
    acc[s.workout_session_id][s.exercise_id].push(s);
    return acc;
  }, {});

  const avgRpe =
    workouts.filter((w) => w.rpe !== null).length > 0
      ? (
          workouts.reduce((s, w) => s + (w.rpe ?? 0), 0) /
          workouts.filter((w) => w.rpe !== null).length
        ).toFixed(1)
      : null;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/app-clients/${clientId}/programmes/${programId}/seances/${sessionId}`}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← {session.name}
        </Link>
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-xl font-bold text-white">Progression</h1>
            <p className="text-gray-400 text-sm mt-0.5">{session.name}</p>
          </div>
          {workouts.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-brand-400">{workouts.length}</p>
              <p className="text-xs text-gray-500">séance{workouts.length > 1 ? "s" : ""} enregistrée{workouts.length > 1 ? "s" : ""}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {workouts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Séances</p>
            <p className="text-2xl font-bold text-white">{workouts.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">RPE moyen</p>
            <p className="text-2xl font-bold text-orange-400">{avgRpe ?? "—"}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Dernière</p>
            <p className="text-sm font-bold text-white">
              {new Date(workouts[0].completed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </p>
          </div>
        </div>
      )}

      {/* No data */}
      {workouts.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Aucune séance enregistrée pour l’instant</p>
          <p className="text-gray-600 text-xs mt-1">Les données apparaissent dès que le client complète une séance</p>
        </div>
      )}

      {/* Workout history */}
      <div className="space-y-4">
        {workouts.map((w, idx) => {
          const note = notesByWorkout[w.id];
          const exerciseSets = setsByWorkout[w.id] ?? {};
          const exerciseNames = Array.from(
            new Set(sets.filter((s) => s.workout_session_id === w.id).map((s) => s.exercise_name))
          );
          const hasSetData = Object.keys(exerciseSets).length > 0;

          return (
            <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                <div>
                  <div className="flex items-center gap-2">
                    {idx === 0 && (
                      <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-medium rounded-full">
                        Dernière
                      </span>
                    )}
                    <p className="text-white font-semibold text-sm">
                      {formatDate(w.completed_at)}
                    </p>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{formatTime(w.completed_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {w.duration_seconds && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Durée</p>
                      <p className="text-white font-semibold text-sm">{formatDuration(w.duration_seconds)}</p>
                    </div>
                  )}
                  {w.rpe !== null && (
                    <div className="text-center">
                      <p className="text-xs text-gray-500">RPE</p>
                      <p className={`text-lg font-bold ${
                        w.rpe >= 8 ? "text-red-400" : w.rpe >= 6 ? "text-orange-400" : "text-green-400"
                      }`}>{w.rpe}<span className="text-xs text-gray-500">/10</span></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Note client */}
              {note && (
                <div className="px-5 py-3 bg-orange-500/5 border-b border-orange-500/10">
                  <p className="text-xs text-orange-400 font-medium mb-1">Note du client</p>
                  <p className="text-sm text-gray-300 italic">&ldquo;{note}&rdquo;</p>
                </div>
              )}

              {/* Set performances (guided mode) */}
              {hasSetData ? (
                <div className="divide-y divide-gray-800">
                  {exerciseNames.map((exName) => {
                    const exId = Object.keys(exerciseSets).find(
                      (k) => exerciseSets[k][0]?.exercise_name === exName
                    );
                    const exSets = exId ? exerciseSets[exId] : [];
                    return (
                      <div key={exName} className="px-5 py-3">
                        <p className="text-sm font-medium text-white mb-2">{exName}</p>
                        <div className="space-y-1">
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 pb-1">
                            <span>Série</span>
                            <span className="text-center">Reps</span>
                            <span className="text-right">Charge</span>
                          </div>
                          {exSets.map((s) => (
                            <div key={s.set_index} className="grid grid-cols-3 gap-2 text-sm">
                              <span className="text-brand-400 font-bold">{s.set_index + 1}</span>
                              <span className="text-center text-white">{s.reps_done ?? "—"}</span>
                              <span className="text-right text-gray-300">{s.weight_used ?? "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-3">
                  <p className="text-xs text-gray-600 italic">Séance validée sans détail des séries</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
