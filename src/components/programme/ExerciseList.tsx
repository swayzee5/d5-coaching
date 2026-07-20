"use client";

import { useRef, useState, useTransition, useEffect } from "react";

type Exercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  notes: string | null;
  vimeoVideoId?: string | null;
};

function VimeoThumb({ videoId }: { videoId: string }) {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    fetch(`https://vimeo.com/api/v2/video/${videoId}.json`)
      .then((r) => r.json())
      .then((data) => setThumb(data[0]?.thumbnail_small ?? null))
      .catch(() => null);
  }, [videoId]);

  if (!thumb) {
    return (
      <div className="w-14 h-10 rounded bg-blue-500/20 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative w-14 h-10 rounded overflow-hidden shrink-0">
      <img src={thumb} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

function ExerciseItem({
  exercise,
  updateAction,
  removeAction,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  exercise: Exercise;
  updateAction: (formData: FormData) => Promise<void>;
  removeAction: () => Promise<void>;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragging: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [vimeoValue, setVimeoValue] = useState(exercise.vimeoVideoId ?? "");

  function autoSave() { formRef.current?.requestSubmit(); }

  function handleRemove() {
    if (!confirm(`Retirer « ${exercise.name} » ?`)) return;
    startTransition(() => removeAction());
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20 transition-all ${
        isDragging ? "opacity-40 bg-gray-700/20" : ""
      } ${isPending ? "opacity-50" : ""}`}
    >
      {/* Drag handle */}
      <div className="shrink-0 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 touch-none">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Miniature vidéo ou placeholder */}
      {vimeoValue ? (
        <VimeoThumb videoId={vimeoValue} />
      ) : (
        <div className="w-14 h-10 rounded bg-gray-800 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Nom */}
      <div className="w-36 shrink-0 min-w-0">
        <p className="font-medium text-white text-sm truncate" title={exercise.name}>{exercise.name}</p>
        {exercise.notes && <p className="text-xs text-gray-500 truncate">{exercise.notes}</p>}
      </div>

      {/* Champs */}
      <form ref={formRef} action={updateAction} className="flex items-center gap-2 flex-1">
        <input type="hidden" name="vimeoVideoId" value={vimeoValue} />
        <div className="flex flex-col items-center">
          <span className="text-gray-600 text-[10px] mb-0.5">Sér.</span>
          <input type="number" name="sets" defaultValue={exercise.sets ?? ""} min={1} max={99} placeholder="—" onBlur={autoSave}
            className="w-10 bg-gray-800 border border-gray-700 rounded px-1 py-1.5 text-xs text-white text-center focus:outline-none focus:border-brand-500" />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-600 text-[10px] mb-0.5">Rep.</span>
          <input type="text" name="reps" defaultValue={exercise.reps ?? ""} placeholder="—" onBlur={autoSave}
            className="w-12 bg-gray-800 border border-gray-700 rounded px-1 py-1.5 text-xs text-white text-center focus:outline-none focus:border-brand-500" />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-600 text-[10px] mb-0.5">Repos</span>
          <input type="number" name="restSeconds" defaultValue={exercise.restSeconds ?? ""} min={0} placeholder="—" onBlur={autoSave}
            className="w-12 bg-gray-800 border border-gray-700 rounded px-1 py-1.5 text-xs text-white text-center focus:outline-none focus:border-brand-500" />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-600 text-[10px] mb-0.5">Vimeo ID</span>
          <input type="text" value={vimeoValue} onChange={(e) => setVimeoValue(e.target.value)} placeholder="—" onBlur={autoSave}
            className="w-20 bg-gray-800 border border-blue-800/40 rounded px-1 py-1.5 text-xs text-blue-300 text-center focus:outline-none focus:border-blue-500" />
        </div>
      </form>

      {/* Supprimer */}
      <button type="button" onClick={handleRemove} disabled={isPending}
        className="shrink-0 p-1.5 text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors rounded"
        title="Retirer">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ExerciseList({
  initialExercises,
  reorderAction,
  updateAction,
  removeAction,
}: {
  initialExercises: Exercise[];
  reorderAction: (ids: string[]) => Promise<void>;
  updateAction: (id: string) => (formData: FormData) => Promise<void>;
  removeAction: (id: string) => () => Promise<void>;
}) {
  const [exercises, setExercises] = useState(initialExercises);
  const [isPending, startTransition] = useTransition();
  const dragIndexRef = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDragStart(index: number, id: string) {
    dragIndexRef.current = index;
    setDraggingId(id);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    const next = [...exercises];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    dragIndexRef.current = index;
    setExercises(next);
  }

  function handleDrop() {
    setDraggingId(null);
    dragIndexRef.current = null;
    startTransition(() => reorderAction(exercises.map((e) => e.id)));
  }

  return (
    <div className={isPending ? "opacity-70 pointer-events-none" : ""}>
      {exercises.map((ex, i) => (
        <ExerciseItem
          key={ex.id}
          exercise={ex}
          updateAction={updateAction(ex.id)}
          removeAction={removeAction(ex.id)}
          onDragStart={() => handleDragStart(i, ex.id)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={handleDrop}
          isDragging={draggingId === ex.id}
        />
      ))}
    </div>
  );
}
