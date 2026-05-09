"use client";

import { useState, useMemo, useTransition } from "react";
import { toggleFavorite, deleteExercise, updateExerciseVimeo, createExercise } from "./actions";
import { ConfirmButton } from "@/components/ConfirmButton";

type Exercise = {
  id: string;
  name: string;
  muscles: string[];
  equipment: string[];
  description: string | null;
  vimeoVideoId: string | null;
  isFavorite: boolean;
};

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

function VimeoEditRow({ ex }: { ex: Exercise }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const action = updateExerciseVimeo.bind(null, ex.id);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-xs px-2 py-0.5 rounded transition-colors ${
          ex.vimeoVideoId
            ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            : "bg-gray-800 text-gray-500 hover:text-gray-300"
        }`}
      >
        {ex.vimeoVideoId ? `▶ ${ex.vimeoVideoId}` : "+ Ajouter Vimeo"}
      </button>
      {open && (
        <form
          action={(fd) => startTransition(async () => { await action(fd); setOpen(false); })}
          className="flex items-center gap-2 mt-2"
        >
          <input
            name="vimeoVideoId"
            defaultValue={ex.vimeoVideoId ?? ""}
            placeholder="ID Vimeo (ex: 123456789)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs disabled:opacity-50"
          >
            {isPending ? "..." : "Sauver"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300 text-xs">
            Annuler
          </button>
        </form>
      )}
    </div>
  );
}

export function ExerciseLibraryClient({ exercises }: { exercises: Exercise[] }) {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localFavorites, setLocalFavorites] = useState<Record<string, boolean>>({});

  const getFav = (ex: Exercise) =>
    localFavorites[ex.id] !== undefined ? localFavorites[ex.id] : ex.isFavorite;

  function handleToggleFav(ex: Exercise) {
    const current = getFav(ex);
    setLocalFavorites((p) => ({ ...p, [ex.id]: !current }));
    startTransition(() => toggleFavorite(ex.id, current));
  }

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (muscleFilter && !ex.muscles.includes(muscleFilter)) return false;
      if (equipmentFilter === "__sans__" && ex.equipment.length > 0) return false;
      if (equipmentFilter && equipmentFilter !== "__sans__" && !ex.equipment.includes(equipmentFilter)) return false;
      return true;
    });
  }, [exercises, search, muscleFilter, equipmentFilter]);

  return (
    <div className="space-y-4">
      {/* Search & filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un exercice..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
          autoFocus
        />
        <div className="flex flex-wrap gap-3">
          <select
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
          >
            <option value="">Tous les muscles</option>
            {MUSCLE_GROUPS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
          >
            <option value="">Équipement</option>
            <option value="__sans__">Sans équipement</option>
            {EQUIPMENT_LIST.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <span className="text-gray-500 text-sm self-center">{filtered.length} exercice{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Exercise list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-10">Aucun exercice trouvé</p>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {filtered.map((ex) => (
              <div key={ex.id} className="px-5 py-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Favorite */}
                  <button
                    onClick={() => handleToggleFav(ex)}
                    disabled={isPending}
                    className="text-lg mt-0.5 shrink-0 hover:scale-110 transition-transform"
                  >
                    {getFav(ex) ? "⭐" : "☆"}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{ex.name}</p>
                    {ex.description && (
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{ex.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ex.muscles.map((m) => (
                        <span key={m} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">{m}</span>
                      ))}
                      {ex.equipment.length === 0 ? (
                        <span className="px-2 py-0.5 bg-green-500/10 rounded text-xs text-green-400">Sans équipement</span>
                      ) : ex.equipment.map((e) => (
                        <span key={e} className="px-2 py-0.5 bg-blue-500/10 rounded text-xs text-blue-400 border border-blue-500/20">{e}</span>
                      ))}
                    </div>
                    <div className="mt-2">
                      <VimeoEditRow ex={ex} />
                    </div>
                  </div>

                  {/* Delete */}
                  <ConfirmButton
                    action={deleteExercise.bind(null, ex.id)}
                    message={`Supprimer « ${ex.name} » ?`}
                    className="text-xs text-gray-600 hover:text-red-400 shrink-0 transition-colors"
                  >
                    Supprimer
                  </ConfirmButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add form - collapsible */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <span>+ Ajouter un exercice</span>
          <span className="text-gray-500">{showAdd ? "▲" : "▼"}</span>
        </button>
        {showAdd && (
          <div className="px-5 pb-5 border-t border-gray-800">
            <AddExerciseForm onDone={() => setShowAdd(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

function AddExerciseForm({ onDone }: { onDone: () => void }) {
  return (
    <form
      action={async (fd: FormData) => {
        await createExercise(fd);
        onDone();
      }}
      className="space-y-4 pt-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Nom *</label>
          <input name="name" required placeholder="ex: Développé couché"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">ID Vimeo (optionnel)</label>
          <input name="vimeoVideoId" placeholder="123456789"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Description</label>
        <textarea name="description" rows={2} placeholder="Instructions d'exécution..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-2">Muscles</label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {MUSCLE_GROUPS.map((m) => (
            <label key={m} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" name="muscles" value={m}
                className="rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0" />
              <span className="text-sm text-gray-300">{m}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-2">Équipement</label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {EQUIPMENT_LIST.map((e) => (
            <label key={e} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" name="equipment" value={e}
                className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0" />
              <span className="text-sm text-gray-300">{e}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onDone} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Annuler</button>
        <button type="submit" className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors">
          Ajouter
        </button>
      </div>
    </form>
  );
}
