"use client";

import { useRef, useState, useTransition } from "react";

type Exercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  notes: string | null;
  vimeoVideoId?: string | null;
};

export function ExerciseRow({
  exercise,
  updateAction,
  removeAction,
  moveUpAction,
  moveDownAction,
}: {
  exercise: Exercise;
  updateAction: (formData: FormData) => Promise<void>;
  removeAction: () => Promise<void>;
  moveUpAction?: () => Promise<void>;
  moveDownAction?: () => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [vimeoValue, setVimeoValue] = useState(exercise.vimeoVideoId ?? "");

  function autoSave() {
    formRef.current?.requestSubmit();
  }

  function handleRemove() {
    if (!confirm(`Retirer « ${exercise.name} » de cette séance ?`)) return;
    startTransition(() => removeAction());
  }

  return (
    <div className={`grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-gray-800/20 transition-colors ${isPending ? "opacity-50" : ""}`}>
      <div className="col-span-5 flex items-center gap-2">
        <div
          title={vimeoValue ? `Vidéo : ${vimeoValue}` : "Aucune vidéo"}
          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
            vimeoValue ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-600"
          }`}
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-white text-sm truncate">{exercise.name}</p>
          {exercise.notes && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{exercise.notes}</p>
          )}
        </div>
      </div>

      <form ref={formRef} action={updateAction} className="contents">
        <input type="hidden" name="vimeoVideoId" value={vimeoValue} />
        <div className="col-span-2">
          <input
            type="number"
            name="sets"
            defaultValue={exercise.sets ?? ""}
            min={1}
            max={99}
            placeholder="—"
            onBlur={autoSave}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <div className="col-span-2">
          <input
            type="text"
            name="reps"
            defaultValue={exercise.reps ?? ""}
            placeholder="—"
            onBlur={autoSave}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <div className="col-span-2">
          <input
            type="number"
            name="restSeconds"
            defaultValue={exercise.restSeconds ?? ""}
            min={0}
            placeholder="—"
            onBlur={autoSave}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </form>

      <div className="col-span-1 flex flex-col gap-0.5 items-center">
        <button
          type="button"
          onClick={() => moveUpAction && startTransition(() => moveUpAction())}
          disabled={!moveUpAction || isPending}
          className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors"
          title="Monter"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => moveDownAction && startTransition(() => moveDownAction())}
          disabled={!moveDownAction || isPending}
          className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors"
          title="Descendre"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="col-span-1 flex justify-center">
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors p-1 rounded"
          title="Retirer l'exercice"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
