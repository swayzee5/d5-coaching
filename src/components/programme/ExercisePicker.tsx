"use client";

import { useState, useTransition, useMemo } from "react";

type LibraryExercise = { id: string; name: string; muscles: string[]; description: string | null };

export function ExercisePicker({ library, addAction }: { library: LibraryExercise[]; addAction: (formData: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);

  const allMuscles = useMemo(() => { const s = new Set<string>(); library.forEach((ex) => ex.muscles.forEach((m) => s.add(m))); return Array.from(s).sort(); }, [library]);
  const filtered = library.filter((ex) => ex.name.toLowerCase().includes(search.toLowerCase()) && (!muscleFilter || ex.muscles.includes(muscleFilter)));

  function handleAdd(ex: LibraryExercise) {
    const fd = new FormData();
    fd.set("libraryExerciseId", ex.id); fd.set("name", ex.name); fd.set("sets", "3"); fd.set("reps", "10"); fd.set("restSeconds", "60");
    setAddingId(ex.id);
    startTransition(async () => { await addAction(fd); setAddingId(null); });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Ajouter un exercice
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
              <h3 className="font-semibold text-white">Bibliothèque d&apos;exercices</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-3 space-y-3 shrink-0 border-b border-gray-800">
              <input type="search" placeholder="Rechercher un exercice..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors" autoFocus />
              {allMuscles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setMuscleFilter(null)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!muscleFilter ? "bg-brand-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>Tous</button>
                  {allMuscles.map((m) => <button key={m} onClick={() => setMuscleFilter(muscleFilter === m ? null : m)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${muscleFilter === m ? "bg-brand-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{m}</button>)}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-5">
              {library.length === 0 ? (
                <div className="py-12 text-center"><p className="text-gray-600 text-sm">Bibliothèque vide</p><p className="text-gray-700 text-xs mt-1">Ajoutez des exercices dans la section Bibliothèque</p></div>
              ) : filtered.length === 0 ? <p className="py-10 text-center text-gray-600 text-sm">Aucun résultat</p> : (
                <div className="divide-y divide-gray-800/50">
                  {filtered.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">{ex.name}</p>
                        {ex.muscles.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{ex.muscles.map((m) => <span key={m} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{m}</span>)}</div>}
                      </div>
                      <button disabled={isPending && addingId === ex.id} onClick={() => handleAdd(ex)} className="shrink-0 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500 border border-brand-500/30 hover:border-brand-500 text-brand-400 hover:text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50">
                        {isPending && addingId === ex.id ? "..." : "Ajouter"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
