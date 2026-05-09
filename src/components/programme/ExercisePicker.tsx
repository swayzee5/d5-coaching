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
    const fd = new FormData();
    fd.set("libraryExerciseId", ex.id);
    fd.set("name", ex.name);
    fd.set("sets", "3");
    fd.set("reps", "10");
    fd.set("restSeconds", "60");
    setAddingId(ex.id);
    startTransition(async () => { await addAction(fd); setAddingId(null); });
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
              <h3 className="font-semibold text-white">Bibliothèque d&apos;exercices</h3>
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

            {/* Dropdown filters */}
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

            {/* Results count */}
            <div className="px-4 py-1.5 shrink-0">
              <span className="text-xs text-gray-500">{filtered.length} exercice{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {library.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-600 text-sm">Bibliothèque vide</p>
                  <p className="text-gray-700 text-xs mt-1">Visitez /exercices/seed pour initialiser</p>
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
                      <div className="flex items-center gap-2 shrink-0">
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
                          className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
                          title="Modifier dans la bibliothèque"
                        >
                          ✏️
                        </a>
                        <button
                          disabled={isPending && addingId === ex.id}
                          onClick={() => handleAdd(ex)}
                          className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500 border border-brand-500/30 hover:border-brand-500 text-brand-400 hover:text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                        >
                          {isPending && addingId === ex.id ? "..." : "+ Ajouter"}
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
