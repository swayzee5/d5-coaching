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

const MUSCLE_GROUPS = [
  "Abdominaux", "Abdominaux obliques", "Abducteurs", "Adducteurs",
  "Avant-bras", "Biceps", "Dos", "Épaules", "Fessiers",
  "Ischio-jambiers", "Lombaire", "Mollets", "Pectoraux",
  "Quadriceps", "Trapèze", "Triceps",
];

const EQUIPMENT_LIST = [
  "Haltères", "Barre", "Machines", "Élastiques",
  "Sangles (TRX)", "Ballon suisse", "Roulette abdos", "Kettlebell", "Corde à sauter",
];

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
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [localFavorites, setLocalFavorites] = useState<Record<string, boolean>>({});
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const getFav = (ex: LibraryExercise) =>
    localFavorites[ex.id] !== undefined ? localFavorites[ex.id] : ex.isFavorite;

  const filtered = useMemo(() => library.filter((ex) => {
    if (tab === "favoris" && !getFav(ex)) return false;
    if (tab === "sans-equipement" && ex.equipment.length > 0) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (muscleFilter && !ex.muscles.includes(muscleFilter)) return false;
    if (equipmentFilter === "__sans__" && ex.equipment.length > 0) return false;
    if (equipmentFilter && equipmentFilter !== "__sans__" && !ex.equipment.includes(equipmentFilter)) return false;
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [library, search, tab, muscleFilter, equipmentFilter, localFavorites]);

  function handleAdd(ex: LibraryExercise) {
    if (addingId) return;
    const fd = new FormData();
    fd.set("libraryExerciseId", ex.id);
    fd.set("name", ex.name);
    fd.set("sets", "3");
    fd.set("reps", "10");
    fd.set("restSeconds", "60");
    setAddingId(ex.id);
    setJustAdded(null);
    startTransition(async () => {
      await addAction(fd);
      setAddingId(null);
      setJustAdded(ex.id);
      setTimeout(() => setJustAdded(null), 1500);
    });
  }

  function handleToggleFavorite(ex: LibraryExercise) {
    const current = getFav(ex);
    setLocalFavorites((prev) => ({ ...prev, [ex.id]: !current }));
    setTogglingId(ex.id);
    startTransition(async () => { await toggleFavoriteAction(ex.id, current); setTogglingId(null); });
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "tous", label: "Tous" },
    { id: "favoris", label: "⭐ Favoris" },
    { id: "sans-equipement", label: "Sans équipement" },
  ];

  return (
    <>
      <button
        onClick={() => { setOpen(true); setSearch(""); setTab("tous"); setMuscleFilter(""); setEquipmentFilter(""); }}
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
          <div className="relative bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl max-h-[92vh] flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
              <div>
                <h3 className="font-semibold text-white">Bibliothèque d&apos;exercices</h3>
                <p className="text-xs text-gray-500 mt-0.5">Cliquez sur un exercice pour l&apos;ajouter</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pt-4 shrink-0">
              <input
                type="search"
                placeholder="🔍 Trouver un exercice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-brand-500 transition-colors"
                autoFocus
              />
            </div>

            {/* Tabs */}
            <div className="flex px-4 pt-3 gap-2 shrink-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    tab === t.id ? "bg-brand-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            {tab !== "sans-equipement" && (
              <div className="flex gap-2 px-4 pt-2 pb-3 border-b border-gray-800 shrink-0">
                <select
                  value={muscleFilter}
                  onChange={(e) => setMuscleFilter(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">Tous les muscles</option>
                  {MUSCLE_GROUPS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={equipmentFilter}
                  onChange={(e) => setEquipmentFilter(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">Équipement</option>
                  <option value="__sans__">Sans équipement</option>
                  {EQUIPMENT_LIST.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            )}

            {/* Count */}
            <div className="px-4 py-1.5 shrink-0">
              <span className="text-xs text-gray-500">{filtered.length} exercice{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {library.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-500 text-sm">Bibliothèque vide</p>
                  <p className="text-gray-600 text-xs mt-1">Allez sur /exercices pour ajouter des exercices</p>
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-gray-600 text-sm">Aucun résultat</p>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {filtered.map((ex) => {
                    const isAdding = addingId === ex.id;
                    const wasAdded = justAdded === ex.id;
                    return (
                      <div
                        key={ex.id}
                        onClick={() => handleAdd(ex)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group ${
                          wasAdded
                            ? "bg-green-500/10"
                            : isAdding
                            ? "bg-brand-500/10"
                            : "hover:bg-gray-800/60"
                        }`}
                      >
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white text-sm truncate">{ex.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ex.muscles.slice(0, 3).map((m) => (
                              <span key={m} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{m}</span>
                            ))}
                            {ex.equipment.length === 0 && (
                              <span className="px-1.5 py-0.5 bg-green-500/10 rounded text-xs text-green-400">Sans équipement</span>
                            )}
                            {ex.equipment.slice(0, 2).map((e) => (
                              <span key={e} className="px-1.5 py-0.5 bg-blue-500/10 rounded text-xs text-blue-400 border border-blue-500/20">{e}</span>
                            ))}
                          </div>
                        </div>

                        {/* Actions (stop propagation to not trigger add) */}
                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleToggleFavorite(ex)}
                            disabled={togglingId === ex.id}
                            className="text-base hover:scale-110 transition-transform disabled:opacity-40"
                          >
                            {getFav(ex) ? "⭐" : "☆"}
                          </button>
                          <a
                            href="/exercices"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-600 hover:text-gray-400 transition-colors"
                            title="Modifier dans la bibliothèque"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </a>
                        </div>

                        {/* Arrow indicator */}
                        <div className="shrink-0 w-7 flex items-center justify-center">
                          {wasAdded ? (
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isAdding ? (
                            <svg className="w-4 h-4 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-600 group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
