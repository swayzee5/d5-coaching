"use client";

import { useState, useTransition } from "react";
import { saveCompletion, SetResultInput } from "./actions";

type Exercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  notes: string | null;
};

type Props = {
  sessionId: string;
  clientId: string;
  programId: string;
  exercises: Exercise[];
};

export default function SessionExecution({
  sessionId,
  clientId,
  programId,
  exercises,
}: Props) {
  const [results, setResults] = useState<Record<string, SetResultInput[]>>(() => {
    const init: Record<string, SetResultInput[]> = {};
    for (const ex of exercises) {
      init[ex.id] = Array.from({ length: ex.sets ?? 3 }, () => ({
        completed: false,
        weightActual: "",
        repsActual: ex.reps ?? "10",
      }));
    }
    return init;
  });

  const [isPending, startTransition] = useTransition();

  const allSets = Object.values(results).flat();
  const completedCount = allSets.filter((s) => s.completed).length;
  const progress = allSets.length > 0 ? Math.round((completedCount / allSets.length) * 100) : 0;

  const updateSet = (
    exerciseId: string,
    setIndex: number,
    field: keyof SetResultInput,
    value: string | boolean
  ) => {
    setResults((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i === setIndex ? { ...s, [field]: value } : s
      ),
    }));
  };

  const handleTerminer = () => {
    startTransition(async () => {
      await saveCompletion({
        sessionId,
        clientId,
        programId,
        results,
        initiatedBy: "coach",
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* Barre de progression */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Progression</span>
          <span className="text-sm font-semibold text-white">
            {completedCount} / {allSets.length} séries
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-brand-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">{progress}% complété</p>
      </div>

      {/* Exercices */}
      {exercises.map((ex) => {
        const sets = results[ex.id] ?? [];
        return (
          <div key={ex.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800">
              <p className="font-semibold text-white text-sm">{ex.name}</p>
              {ex.restSeconds && (
                <p className="text-xs text-gray-500 mt-0.5">Repos : {ex.restSeconds}s</p>
              )}
            </div>
            <div className="divide-y divide-gray-800/50">
              <div className="grid grid-cols-12 gap-2 px-4 py-2">
                <div className="col-span-1 text-xs text-gray-600 uppercase">#</div>
                <div className="col-span-4 text-xs text-gray-600 uppercase">Charge (kg)</div>
                <div className="col-span-4 text-xs text-gray-600 uppercase">Reps</div>
                <div className="col-span-3 text-xs text-gray-600 uppercase text-right">OK</div>
              </div>
              {sets.map((set, setIndex) => (
                <div
                  key={setIndex}
                  className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center transition-colors ${
                    set.completed ? "bg-green-500/5" : ""
                  }`}
                >
                  <div className="col-span-1">
                    <span className="text-xs text-gray-500 font-medium">{setIndex + 1}</span>
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      placeholder="–"
                      value={set.weightActual}
                      onChange={(e) => updateSet(ex.id, setIndex, "weightActual", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors text-center"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={set.repsActual}
                      onChange={(e) => updateSet(ex.id, setIndex, "repsActual", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors text-center"
                    />
                  </div>
                  <div className="col-span-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => updateSet(ex.id, setIndex, "completed", !set.completed)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors text-sm font-bold ${
                        set.completed
                          ? "bg-green-500 text-white"
                          : "bg-gray-700 text-gray-500 hover:bg-gray-600"
                      }`}
                    >
                      {set.completed ? "✓" : "○"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* TERMINER */}
      <button
        onClick={handleTerminer}
        disabled={isPending}
        className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-colors"
      >
        {isPending ? "Enregistrement..." : "TERMINER LA SÉANCE"}
      </button>
    </div>
  );
}
