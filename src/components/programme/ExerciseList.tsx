"use client";

import { useRef, useState, useTransition, useEffect } from "react";

type ExerciseWithActions = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  notes: string | null;
  vimeoVideoId?: string | null;
  updateAction: (formData: FormData) => Promise<void>;
  removeAction: () => Promise<void>;
};

function parseRepsField(reps: string | null): { mode: "reps" | "time"; repsText: string; mins: number; secs: number } {
  if (reps && /^\d+s$/.test(reps)) {
    const total = parseInt(reps);
    return { mode: "time", repsText: "", mins: Math.floor(total / 60), secs: total % 60 };
  }
  return { mode: "reps", repsText: reps ?? "", mins: 0, secs: 0 };
}

function VimeoThumb({ videoId }: { videoId: string }) {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    fetch(`https://vimeo.com/api/v2/video/${videoId}.json`)
      .then((r) => r.json())
      .then((data) => setThumb(data[0]?.thumbnail_small ?? null))
      .catch(() => null);
  }, [videoId]);

  return (
    <div className="relative w-14 h-10 rounded overflow-hidden shrink-0 bg-blue-500/10 flex items-center justify-center">
      {thumb && <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        <svg className="w-3 h-3 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

function ExerciseItem({
  exercise,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  exercise: ExerciseWithActions;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragging: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [vimeoValue, setVimeoValue] = useState(exercise.vimeoVideoId ?? "");

  const initial = parseRepsField(exercise.reps);
  const [mode, setMode] = useState<"reps" | "time">(initial.mode);
  const [repsText, setRepsText] = useState(initial.repsText);
  const [mins, setMins] = useState(initial.mins);
  const [secs, setSecs] = useState(initial.secs);

  const repsFormValue = mode === "reps" ? repsText : `${mins * 60 + secs}s`;

  function autoSave() { formRef.current?.requestSubmit(); }

  function handleRemove() {
    if (!confirm(`Retirer « ${exercise.name} » ?`)) return;
    startTransition(() => exercise.removeAction());
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20 transition-all ${
        isDragging ? "opacity-40 bg-gray-700/20" : ""
      } ${isPending ? "opacity-50" : ""}`}
    >
      {/* Ligne 1 : drag + thumbnail + nom + supprimer */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className="shrink-0 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {vimeoValue ? (
          <VimeoThumb videoId={vimeoValue} />
        ) : (
          <div className="w-14 h-10 rounded bg-gray-800 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm truncate" title={exercise.name}>{exercise.name}</p>
          {exercise.notes && <p className="text-xs text-gray-500 truncate">{exercise.notes}</p>}
        </div>

        <button type="button" onClick={handleRemove} disabled={isPending}
          className="shrink-0 p-2 text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors rounded" title="Retirer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Ligne 2 : champs éditables (scroll horizontal sur mobile) */}
      <form ref={formRef} action={exercise.updateAction}
        className="flex items-end gap-3 px-4 pb-3 pl-[72px] overflow-x-auto scrollbar-none">
        <input type="hidden" name="vimeoVideoId" value={vimeoValue} />
        <input type="hidden" name="reps" value={repsFormValue} />

        {/* Séries */}
        <div className="flex flex-col items-center shrink-0">
          <span className="text-gray-500 text-[10px] mb-1">Sér.</span>
          <input type="number" name="sets" defaultValue={exercise.sets ?? ""} min={1} max={99} placeholder="—" onBlur={autoSave}
            className="w-12 h-9 bg-gray-800 border border-gray-700 rounded px-1 text-sm text-white text-center focus:outline-none focus:border-brand-500" />
        </div>

        {/* Reps / Temps */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="flex rounded overflow-hidden border border-gray-700 text-[10px]">
            <button type="button" onClick={() => setMode("reps")}
              className={`px-2 py-0.5 transition-colors ${mode === "reps" ? "bg-gray-600 text-white" : "text-gray-600 hover:text-gray-400"}`}>
              Rép.
            </button>
            <button type="button" onClick={() => setMode("time")}
              className={`px-2 py-0.5 border-l border-gray-700 transition-colors ${mode === "time" ? "bg-brand-600 text-white" : "text-gray-600 hover:text-gray-400"}`}>
              ⏱
            </button>
          </div>
          {mode === "reps" ? (
            <input type="text" value={repsText} onChange={(e) => setRepsText(e.target.value)}
              placeholder="10" onBlur={autoSave}
              className="w-16 h-9 bg-gray-800 border border-gray-700 rounded px-1 text-sm text-white text-center focus:outline-none focus:border-brand-500" />
          ) : (
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <span className="text-gray-500 text-[9px] mb-0.5">min</span>
                <input type="number" value={mins} onChange={(e) => setMins(Math.max(0, Number(e.target.value)))}
                  min={0} max={99} onBlur={autoSave}
                  className="w-12 h-9 bg-gray-800 border border-gray-700 rounded px-1 text-sm text-white text-center focus:outline-none focus:border-brand-500" />
              </div>
              <span className="text-gray-500 text-sm">:</span>
              <div className="flex flex-col items-center">
                <span className="text-gray-500 text-[9px] mb-0.5">sec</span>
                <input type="number" value={secs} onChange={(e) => setSecs(Math.min(59, Math.max(0, Number(e.target.value))))}
                  min={0} max={59} onBlur={autoSave}
                  className="w-12 h-9 bg-gray-800 border border-gray-700 rounded px-1 text-sm text-white text-center focus:outline-none focus:border-brand-500" />
              </div>
            </div>
          )}
        </div>

        {/* Repos */}
        <div className="flex flex-col items-center shrink-0">
          <span className="text-gray-500 text-[10px] mb-1">Repos (s)</span>
          <input type="number" name="restSeconds" defaultValue={exercise.restSeconds ?? ""} min={0} placeholder="—" onBlur={autoSave}
            className="w-16 h-9 bg-gray-800 border border-gray-700 rounded px-1 text-sm text-white text-center focus:outline-none focus:border-brand-500" />
        </div>

        {/* Vimeo ID */}
        <div className="flex flex-col items-center shrink-0">
          <span className="text-gray-500 text-[10px] mb-1">Vimeo ID</span>
          <input type="text" value={vimeoValue} onChange={(e) => setVimeoValue(e.target.value)} placeholder="—" onBlur={autoSave}
            className="w-24 h-9 bg-gray-800 border border-blue-800/40 rounded px-1 text-sm text-blue-300 text-center focus:outline-none focus:border-blue-500" />
        </div>
      </form>
    </div>
  );
}

export function ExerciseList({
  initialExercises,
  reorderAction,
}: {
  initialExercises: ExerciseWithActions[];
  reorderAction: (ids: string[]) => Promise<void>;
}) {
  const [exercises, setExercises] = useState(initialExercises);
  const [isPending, startTransition] = useTransition();
  const dragIndexRef = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (!draggingId) {
      setExercises(initialExercises);
    }
  }, [initialExercises]);

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
          onDragStart={() => handleDragStart(i, ex.id)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={handleDrop}
          isDragging={draggingId === ex.id}
        />
      ))}
    </div>
  );
}
