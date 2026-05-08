"use client";

import { useState, useTransition, useMemo } from "react";

type LibraryExercise = {
  id: string;
  name: string;
  muscles: string[];
  equipment: string[];
  description: string | null;
  isFavorite: boolean;
};

type Tab = "tous" | "favoris" | "sans-equipement";

export function ExercisePicker({
  library,
  addAction,
  toggleFavoriteAction,
}: {
  library: LibraryExercise[];
  addAction: (formData: FormData) => Promise<void>;
  toggleFavoriteAction: (id: string, current: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("tous");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [localFavorites, setLocalFavorites] = useState<Record<string, boolean>>({});

  const getFav = (ex: LibraryExercise) =>
    localFavorites[ex.id] !== undefined ? localFavorites[ex.id] : ex.isFavorite;

  const allMuscles = useMemo(() => {
    const s = new Set<string>();
    library.forEach((ex) => ex.muscles.forEach((m) => s.add(m)));
    return Array.from(s).sort();
  }, [library]);

  const allEquipment = useMemo(() => {
    const s = new Set<string>();
    library.forEach((ex) => ex.equipment.forEach((e) => s.add(e)));
    return Array.from(s).sort();
  }, [library]);

  const filtered = library.filter((ex) => {
    if (tab === "favoris" && !getFav(ex)) return false;
    if (tab === "sans-equipement" && ex.equipment.length > 0) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (muscleFilter && !ex.muscles.includes(muscleFilter)) return false;
    if (equipmentFilter && !ex.equipment.includes(equipmentFilter)) return false;
    return true;
  });

  function handleAdd(ex: LibraryExercise) {
    const fd = new FormData();
    fd.set("libraryExerciseId", ex.id);
    fd.set("name", ex.name);
    fd.set("sets", "3");
    fd.set("reps", "10");
    fd.set("restSeconds", "60");
    setAddingId(ex.id);
    startTransition(async () => {
      await addAction(fd);
      setAddingId(null);
    });
  }

  function handleToggleFavorite(ex: LibraryExercise) {
    const current = getFav(ex);
    setLocalFavorites((prev) => ({ ...prev, [ex.id]: !current }));
    setTogglingId(ex.id);
    startTransition(async () => {
      await toggleFavoriteAction(ex.id, current);
      setTogglingId(null);
    });
  }

  function handleOpen() {
    setOpen(true);
    setSearch("");
    setTab("tous");
    setMuscleFilter(null);
    setEquipmentFilter(null);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "tous", label: "Tous" },
    { id: "favoris", label: "⭐ Favoris" },
    { id: "sans-equipement", label: "Sans équipement" },
  ];

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Ajouter un exercice
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl max-h-[90vh] flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
              <h3 className="font-semibold text-white">Bibliothèque d&apos;exercices</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 shrink-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    tab === t.id
                      ? "text-brand-400 border-b-2 border-brand-500"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-4 pt-3 shrink-0">
              <input
                type="search"
                placeholder="Recherche exacte ou par nom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                autoFocus
              />
            </div>

            {/* Muscle filter */}
            {allMuscles.length > 0 && (
              <div className="px-4 pt-2 shrink-0">
                <div className="flex flex-wrap gap-1.5 max-h-14 overflow-y-auto pb-1">
                  <button
                    onClick={() => setMuscleFilter(null)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                      !muscleFilter ? "bg-brand-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    Tous muscles
                  </button>
                  {allMuscles.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMuscleFilter(muscleFilter === m ? null : m)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                        muscleFilter === m ? "bg-brand-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment filter */}
            {allEquipment.length > 0 && tab !== "sans-equipement" && (
              <div className="px-4 pt-2 pb-3 shrink-0 border-b border-gray-800">
                <div className="flex flex-wrap gap-1.5 max-h-12 overflow-y-auto">
                  <button
                    onClick={() => setEquipmentFilter(null)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                      !equipmentFilter ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    Tout équipement
                  </button>
                  {allEquipment.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEquipmentFilter(equipmentFilter === e ? null : e)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                        equipmentFilter === e ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {library.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-600 text-sm">Bibliothèque vide</p>
                  <p className="text-gray-700 text-xs mt-1">Ajoutez des exercices dans la section Exercices</p>
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-gray-600 text-sm">Aucun résultat</p>
              ) : (
                <div className="divide-y divide-gray-800/50 px-4">
                  {filtered.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white text-sm truncate">{ex.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ex.muscles.map((m) => (
                            <span key={m} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{m}</span>
                          ))}
                          {ex.equipment.map((e) => (
                            <span key={e} className="px-1.5 py-0.5 bg-blue-500/10 rounded text-xs text-blue-400 border border-blue-500/20">{e}</span>
                          ))}
                          {ex.equipment.length === 0 && (
                            <span className="px-1.5 py-0.5 bg-green-500/10 rounded text-xs text-green-400">Sans équipement</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleFavorite(ex)}
                          disabled={togglingId === ex.id}
                          title={getFav(ex) ? "Retirer des favoris" : "Ajouter aux favoris"}
                          className="text-base transition-all disabled:opacity-40 hover:scale-110"
                        >
                          {getFav(ex) ? "⭐" : "☆"}
                        </button>
                        <button
                          disabled={isPending && addingId === ex.id}
                          onClick={() => handleAdd(ex)}
                          className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500 border border-brand-500/30 hover:border-brand-500 text-brand-400 hover:text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                        >
                          {isPending && addingId === ex.id ? "..." : "Ajouter"}
                        </button>
                      </div>
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
