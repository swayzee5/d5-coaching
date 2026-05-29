"use client";

import { useState, useTransition } from "react";
import { bulkDeleteExercises, updateVimeoId, deleteExercise, updateExercise } from "@/app/exercices/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import GenerateVideoButton from "./GenerateVideoButton";

const MUSCLE_GROUPS = [
  "Pectoraux", "Dos", "Épaules", "Biceps", "Triceps", "Abdominaux",
  "Quadriceps", "Ischio-jambiers", "Fessiers", "Mollets", "Cardio / Mobilité",
  "Retour blessure - Épaule", "Retour blessure - Genou",
  "Retour blessure - Dos", "Retour blessure - Cheville",
];

type Exercise = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  vimeo_video_id: string | null;
  generated_video_url: string | null;
};

function VimeoEditForm({ exerciseId, currentVimeoId }: { exerciseId: string; currentVimeoId: string | null }) {
  const [open, setOpen] = useState(false);
  if (!open) return (
    <button onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      className="text-xs px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded transition-colors">
      {currentVimeoId ? "✏ Vimeo" : "+ Vimeo"}
    </button>
  );
  return (
    <form action={async (fd) => { await updateVimeoId(fd); setOpen(false); }}
      className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input type="hidden" name="id" value={exerciseId} />
      <input name="vimeoVideoId" defaultValue={currentVimeoId ?? ""} placeholder="ID Vimeo" autoFocus
        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500" />
      <button type="submit" className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded">OK</button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs px-2 py-1 text-gray-500 hover:text-gray-300">✕</button>
    </form>
  );
}

function EditForm({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => { startTransition(async () => { await updateExercise(fd); onClose(); }); }}
      className="space-y-4 pt-2"
      onClick={(e) => e.stopPropagation()}
    >
      <input type="hidden" name="id" value={ex.id} />
      <div>
        <label className="block text-xs text-gray-400 mb-1">Nom</label>
        <input
          name="name"
          defaultValue={ex.name}
          required
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <textarea
          name="description"
          defaultValue={ex.description ?? ""}
          rows={3}
          placeholder="Instructions d’exécution..."
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-2">Groupes musculaires</label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {MUSCLE_GROUPS.map((m) => (
            <label key={m} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                name="muscles"
                value={m}
                defaultChecked={ex.muscles.includes(m)}
                className="rounded border-gray-600 bg-gray-700 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
              />
              <span className="text-xs text-gray-300">{m}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? "Enregistrement..." : "✓ Enregistrer"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function ExerciseRowInner({ ex, checked, onCheck }: { ex: Exercise; checked: boolean; onCheck: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  return (
    <>
      <tr className={`hover:bg-gray-800/40 transition-colors cursor-pointer select-none ${
        checked ? "bg-red-500/5" : ""
      }`} onClick={() => { setOpen((o) => !o); if (editing) setEditing(false); }}>
        <td className="pl-4 pr-2 py-4" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onCheck(ex.id)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500 focus:ring-offset-0 cursor-pointer"
          />
        </td>
        <td className="px-3 py-4">
          <div className="flex items-center gap-2">
            <span className={`text-gray-500 transition-transform text-xs ${open ? "rotate-90" : ""}`}>▶</span>
            <div>
              <p className="font-medium text-white">{ex.name}</p>
              {ex.description && !open && (
                <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{ex.description}</p>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-4">
          <div className="flex flex-wrap gap-1">
            {ex.muscles.length === 0 ? <span className="text-gray-600 text-xs">—</span> :
              ex.muscles.map((m) => <span key={m} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">{m}</span>)}
          </div>
        </td>
        <td className="px-3 py-4">
          {ex.vimeo_video_id ? <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">✓ Vimeo</span>
            : ex.generated_video_url ? <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">✓ IA</span>
            : <span className="text-gray-600 text-xs">—</span>}
        </td>
        <td className="px-3 py-4">
          <div className="flex items-center gap-2 justify-end flex-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(true); setEditing(true); }}
              className="text-xs px-2 py-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded transition-colors"
            >
              ✏ Modifier
            </button>
            <VimeoEditForm exerciseId={ex.id} currentVimeoId={ex.vimeo_video_id} />
            <GenerateVideoButton exerciseId={ex.id} exerciseName={ex.name} hasVideo={!!ex.generated_video_url} />
            <ConfirmButton action={deleteExercise.bind(null, ex.id)}
              message={`Supprimer « ${ex.name} » ?`}
              className="text-xs text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors">
              Supprimer
            </ConfirmButton>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-800/20">
          <td colSpan={5} className="px-8 pb-6 pt-3">
            {editing ? (
              <EditForm ex={ex} onClose={() => setEditing(false)} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div />
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                    className="text-xs px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-lg transition-colors"
                  >
                    ✏ Modifier les infos
                  </button>
                </div>
                {ex.description && <p className="text-sm text-gray-300 leading-relaxed">{ex.description}</p>}
                {ex.vimeo_video_id && (
                  <div className="rounded-xl overflow-hidden" style={{ maxWidth: 480 }}>
                    <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
                      <iframe
                        src={`https://player.vimeo.com/video/${ex.vimeo_video_id}?badge=0&autopause=0&player_id=0&app_id=58479`}
                        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                        title={ex.name}
                      />
                    </div>
                  </div>
                )}
                {ex.generated_video_url && (
                  <video src={ex.generated_video_url} controls className="rounded-xl w-full max-w-sm h-auto bg-black" />
                )}
                {!ex.description && !ex.vimeo_video_id && !ex.generated_video_url && (
                  <p className="text-gray-600 text-sm">Aucune description ni vidéo. Clique sur « Modifier les infos » pour en ajouter.</p>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function ExerciseTable({ exercises }: { exercises: Exercise[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === exercises.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(exercises.map((e) => e.id)));
    }
  }

  function handleBulkDelete() {
    if (!confirm(`Supprimer ${selected.size} exercice(s) ? Cette action est irréversible.`)) return;
    const fd = new FormData();
    selected.forEach((id) => fd.append("ids", id));
    startTransition(() => bulkDeleteExercises(fd));
    setSelected(new Set());
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-5 py-3 bg-red-500/10 border-b border-red-500/20">
          <p className="text-sm text-red-400 font-medium">{selected.size} exercice(s) sélectionné(s)</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-white transition-colors">
              Annuler
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isPending}
              className="px-4 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? "Suppression..." : `🗑 Supprimer ${selected.size} exercice(s)`}
            </button>
          </div>
        </div>
      )}

      {exercises.length === 0 ? (
        <div className="py-16 text-center text-gray-600 text-sm">Aucun exercice dans cette catégorie</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="pl-4 pr-2 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === exercises.length && exercises.length > 0}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500 focus:ring-offset-0 cursor-pointer"
                />
              </th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-3 py-3">Exercice</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-3 py-3">Muscles</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-3 py-3">Vidéo</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {exercises.map((ex) => (
              <ExerciseRowInner
                key={ex.id}
                ex={ex}
                checked={selected.has(ex.id)}
                onCheck={toggleOne}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
