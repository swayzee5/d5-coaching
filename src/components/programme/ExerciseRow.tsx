"use client";

import { useRef, useState, useTransition } from "react";

type Exercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  tempo: string | null;
  restSeconds: number | null;
  weight: string | null;
  vimeoVideoId: string | null;
  notes: string | null;
};

export function ExerciseRow({
  exercise,
  updateAction,
  removeAction,
}: {
  exercise: Exercise;
  updateAction: (formData: FormData) => Promise<void>;
  removeAction: () => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [showNotes, setShowNotes] = useState(!!exercise.notes);
  const [notesValue, setNotesValue] = useState(exercise.notes ?? "");

  function autoSave() {
    formRef.current?.requestSubmit();
  }

  function handleRemove() {
    if (!confirm(`Retirer « ${exercise.name} » ?`)) return;
    startTransition(() => removeAction());
  }

  return (
    <div className={`border-b border-gray-800/50 last:border-0 transition-opacity ${isPending ? "opacity-50" : ""}`}>
      <form ref={formRef} action={updateAction}>
        <input type="hidden" name="notes" value={notesValue} />
        <div className="flex items-center gap-2 px-4 py-3 hover:bg-gray-800/20 transition-colors">
          <div className="w-44 shrink-0 min-w-0">
            <p className="font-medium text-white text-sm truncate" title={exercise.name}>{exercise.name}</p>
          </div>

          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
            <input
              type="number" name="sets" defaultValue={exercise.sets ?? ""}
              min={1} max={99} placeholder="—" onBlur={autoSave}
              className="w-10 shrink-0 bg-gray-800 border border-gray-700/60 rounded px-1 py-1.5 text-xs text-white text-center focus:outline-none focus:border-brand-500 placeholder-gray-600"
            />
            <input
              type="text" name="reps" defaultValue={exercise.reps ?? ""}
              placeholder="—" onBlur={autoSave}
              className="w-14 shrink-0 bg-gray-800 border border-gray-700/60 rounded px-1 py-1.5 text-xs text-white text-center focus:outline-none focus:border-brand-500 placeholder-gray-600"
            />
            <input
              type="text" name="tempo" defaultValue={exercise.tempo ?? ""}
              placeholder="—" onBlur={autoSave}
              className="w-16 shrink-0 bg-gray-800 border border-gray-700/60 rounded px-1 py-1.5 text-xs text-white text-center focus:outline-none focus:border-brand-500 placeholder-gray-600"
            />
            <input
              type="number" name="restSeconds" defaultValue={exercise.restSeconds ?? ""}
              min={0} placeholder="—" onBlur={autoSave}
              className="w-12 shrink-0 bg-gray-800 border border-gray-700/60 rounded px-1 py-1.5 text-xs text-white text-center focus:outline-none focus:border-brand-500 placeholder-gray-600"
            />
            <input
              type="text" name="weight" defaultValue={exercise.weight ?? ""}
              placeholder="—" onBlur={autoSave}
              className="w-16 shrink-0 bg-gray-800 border border-gray-700/60 rounded px-1 py-1.5 text-xs text-white text-center focus:outline-none focus:border-brand-500 placeholder-gray-600"
            />
            <input
              type="text" name="vimeoVideoId" defaultValue={exercise.vimeoVideoId ?? ""}
              placeholder="Vimeo" onBlur={autoSave}
              className="w-20 shrink-0 bg-gray-800 border border-blue-800/40 rounded px-1 py-1.5 text-xs text-blue-300 text-center focus:outline-none focus:border-blue-500 placeholder-gray-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className={`shrink-0 p-1.5 rounded transition-colors ${
              showNotes || notesValue ? "text-yellow-400 bg-yellow-400/10" : "text-gray-600 hover:text-gray-400"
            }`}
            title={showNotes ? "Masquer notes" : "Ajouter notes"}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="shrink-0 p-1.5 text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors rounded"
            title="Retirer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </form>

      {showNotes && (
        <div className="px-4 pb-3">
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={autoSave}
            placeholder="Instructions, conseils d'exécution, sensations…"
            rows={2}
            className="w-full bg-gray-800/50 border border-gray-700/60 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>
      )}
    </div>
  );
}
