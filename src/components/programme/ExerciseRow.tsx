"use client";

import { useRef, useTransition } from "react";

type Exercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
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

  function autoSave() {
    formRef.current?.requestSubmit();
  }

  function handleRemove() {
    if (!confirm(`Retirer « ${exercise.name} » de cette séance ?`)) return;
    startTransition(() => removeAction());
  }

  return (
    <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-gray-800/20 transition-colors">
      <div className="col-span-5">
        <p className="font-medium text-white text-sm">{exercise.name}</p>
        {exercise.notes && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{exercise.notes}</p>
        )}
      </div>

      <form ref={formRef} action={updateAction} className="contents">
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
