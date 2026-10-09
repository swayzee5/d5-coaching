"use client";

import { useState, useTransition } from "react";
import {
  addExercise,
  chercherExercices,
  deleteExercise,
  moveExercise,
  updateExercise,
  updateSession,
  toggleSessionActive,
  type ResultatRecherche,
} from "@/app/reboot-sessions/[id]/actions";

/**
 * Éditeur d'une séance Reboot.
 *
 * Conçu pour la seule tâche qui revient : corriger une séance qu'on vient de
 * voir dans l'app. D'où une ligne par exercice, modifiable sur place, sans
 * page intermédiaire ni fenêtre de confirmation à chaque champ.
 *
 * L'ajout passe par la recherche dans la bibliothèque, jamais par un nom tapé
 * à la main. C'est ce qui a produit les séances pleines d'exercices
 * introuvables : un nom approchant ne vaut rien, seul l'identifiant relie à la
 * vidéo et à la description.
 */

export type ExerciceEditable = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  notes: string | null;
  vimeoVideoId: string | null;
};

export function EditeurSeance({
  sessionId,
  nom,
  description,
  dureeMinutes,
  active,
  modifiee,
  exercices,
}: {
  sessionId: string;
  nom: string;
  description: string | null;
  dureeMinutes: number | null;
  active: boolean;
  modifiee: boolean;
  exercices: ExerciceEditable[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {!modifiee && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          Cette séance vient du catalogue de l&apos;app. Dès ta première
          modification, elle ne sera plus reconstruite automatiquement.
        </p>
      )}

      <EnTeteSeance
        sessionId={sessionId}
        nom={nom}
        description={description}
        dureeMinutes={dureeMinutes}
        active={active}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Exercices ({exercices.length})</h2>
          {exercices.length < 4 && (
            <span className="text-xs text-orange-400">
              En dessous de 4, la séance est masquée dans l&apos;app
            </span>
          )}
        </div>

        {exercices.length === 0 && (
          <p className="text-sm text-gray-500">Aucun exercice pour le moment.</p>
        )}

        {exercices.map((ex, i) => (
          <LigneExercice
            key={ex.id}
            exercice={ex}
            sessionId={sessionId}
            position={i}
            dernier={i === exercices.length - 1}
            desactive={isPending}
            onDeplacer={(sens) =>
              startTransition(async () => {
                await moveExercise(ex.id, sessionId, sens);
              })
            }
            onSupprimer={() =>
              startTransition(async () => {
                await deleteExercise(ex.id, sessionId);
              })
            }
          />
        ))}
      </div>

      <AjoutExercice sessionId={sessionId} />
    </div>
  );
}

function EnTeteSeance({
  sessionId,
  nom,
  description,
  dureeMinutes,
  active,
}: {
  sessionId: string;
  nom: string;
  description: string | null;
  dureeMinutes: number | null;
  active: boolean;
}) {
  const [valeurs, setValeurs] = useState({
    name: nom,
    description: description ?? "",
    durationMinutes: dureeMinutes ? String(dureeMinutes) : "",
  });
  const [enregistre, setEnregistre] = useState(false);
  const [isPending, startTransition] = useTransition();

  const change =
    valeurs.name !== nom ||
    valeurs.description !== (description ?? "") ||
    valeurs.durationMinutes !== (dureeMinutes ? String(dureeMinutes) : "");

  return (
    <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
      <input
        value={valeurs.name}
        onChange={(e) => { setValeurs({ ...valeurs, name: e.target.value }); setEnregistre(false); }}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-lg font-bold text-white focus:border-brand-500 focus:outline-none"
      />
      <input
        value={valeurs.description}
        onChange={(e) => { setValeurs({ ...valeurs, description: e.target.value }); setEnregistre(false); }}
        placeholder="Description affichée sous le titre"
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500">Durée annoncée</label>
        <input
          value={valeurs.durationMinutes}
          onChange={(e) => { setValeurs({ ...valeurs, durationMinutes: e.target.value.replace(/\D/g, "") }); setEnregistre(false); }}
          inputMode="numeric"
          className="w-16 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-brand-500 focus:outline-none"
        />
        <span className="text-xs text-gray-500">min</span>

        <button
          onClick={() =>
            startTransition(async () => {
              await updateSession(sessionId, valeurs);
              setEnregistre(true);
            })
          }
          disabled={!change || isPending}
          className="ml-auto rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {isPending ? "…" : enregistre && !change ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-gray-800 pt-3">
        <span className="text-xs text-gray-500">
          {active ? "Visible dans l'app" : "Masquée dans l'app"}
        </span>
        <button
          onClick={() => startTransition(async () => { await toggleSessionActive(sessionId, !active); })}
          disabled={isPending}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            active ? "bg-gray-700 text-gray-200" : "bg-green-700 text-white"
          }`}
        >
          {active ? "Masquer" : "Afficher"}
        </button>
      </div>
    </div>
  );
}

function LigneExercice({
  exercice,
  sessionId,
  position,
  dernier,
  desactive,
  onDeplacer,
  onSupprimer,
}: {
  exercice: ExerciceEditable;
  sessionId: string;
  position: number;
  dernier: boolean;
  desactive: boolean;
  onDeplacer: (sens: "haut" | "bas") => void;
  onSupprimer: () => void;
}) {
  const [valeurs, setValeurs] = useState({
    sets: exercice.sets ? String(exercice.sets) : "",
    reps: exercice.reps ?? "",
    restSeconds: exercice.restSeconds ? String(exercice.restSeconds) : "",
    notes: exercice.notes ?? "",
  });
  const [enregistre, setEnregistre] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [isPending, startTransition] = useTransition();

  const change =
    valeurs.sets !== (exercice.sets ? String(exercice.sets) : "") ||
    valeurs.reps !== (exercice.reps ?? "") ||
    valeurs.restSeconds !== (exercice.restSeconds ? String(exercice.restSeconds) : "") ||
    valeurs.notes !== (exercice.notes ?? "");

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="w-5 shrink-0 text-xs text-gray-600">{position + 1}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {exercice.name}
        </span>
        {!exercice.vimeoVideoId && (
          <span className="shrink-0 text-xs text-orange-400">sans vidéo</span>
        )}
        <button onClick={() => onDeplacer("haut")} disabled={position === 0 || desactive}
          className="px-1 text-gray-500 hover:text-white disabled:opacity-20" title="Monter">↑</button>
        <button onClick={() => onDeplacer("bas")} disabled={dernier || desactive}
          className="px-1 text-gray-500 hover:text-white disabled:opacity-20" title="Descendre">↓</button>
        {/* Confirmation en deux temps plutôt qu'une fenêtre : la suppression
            est irréversible, et un bouton isolé se touche par accident sur un
            écran dense. */}
        <button
          onClick={() => (confirme ? onSupprimer() : setConfirme(true))}
          onBlur={() => setConfirme(false)}
          disabled={desactive}
          className={`rounded px-2 py-0.5 text-xs ${
            confirme ? "bg-red-600 text-white" : "text-gray-600 hover:text-red-400"
          }`}
        >
          {confirme ? "Confirmer" : "Retirer"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Champ label="Séries" value={valeurs.sets} numerique
          onChange={(v) => { setValeurs({ ...valeurs, sets: v }); setEnregistre(false); }} largeur="w-14" />
        <Champ label="Reps" value={valeurs.reps}
          onChange={(v) => { setValeurs({ ...valeurs, reps: v }); setEnregistre(false); }} largeur="w-28" />
        <Champ label="Repos (s)" value={valeurs.restSeconds} numerique
          onChange={(v) => { setValeurs({ ...valeurs, restSeconds: v }); setEnregistre(false); }} largeur="w-16" />
      </div>

      <input
        value={valeurs.notes}
        onChange={(e) => { setValeurs({ ...valeurs, notes: e.target.value }); setEnregistre(false); }}
        placeholder="Consigne affichée sous l'exercice (sinon, la description de la bibliothèque)"
        className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
      />

      {(change || enregistre) && (
        <button
          onClick={() =>
            startTransition(async () => {
              await updateExercise(exercice.id, sessionId, valeurs);
              setEnregistre(true);
            })
          }
          disabled={!change || isPending}
          className="mt-2 rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
        >
          {isPending ? "…" : enregistre && !change ? "Enregistré ✓" : "Enregistrer"}
        </button>
      )}
    </div>
  );
}

function Champ({
  label,
  value,
  onChange,
  largeur,
  numerique,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  largeur: string;
  numerique?: boolean;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        value={value}
        inputMode={numerique ? "numeric" : undefined}
        onChange={(e) => onChange(numerique ? e.target.value.replace(/\D/g, "") : e.target.value)}
        className={`${largeur} rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:border-brand-500 focus:outline-none`}
      />
    </label>
  );
}

function AjoutExercice({ sessionId }: { sessionId: string }) {
  const [terme, setTerme] = useState("");
  const [resultats, setResultats] = useState<ResultatRecherche[]>([]);
  const [isPending, startTransition] = useTransition();

  function chercher(q: string) {
    setTerme(q);
    if (q.trim().length < 2) {
      setResultats([]);
      return;
    }
    startTransition(async () => setResultats(await chercherExercices(q)));
  }

  function ajouter(ex: ResultatRecherche) {
    const data = new FormData();
    data.set("name", ex.name);
    data.set("library_exercise_id", ex.id);
    if (ex.vimeoVideoId) data.set("vimeo_video_id", ex.vimeoVideoId);
    // Valeurs de départ raisonnables, à ajuster ensuite sur la ligne.
    data.set("sets", "3");
    data.set("reps", "12");
    data.set("rest_seconds", "60");

    startTransition(async () => {
      await addExercise(sessionId, data);
      setTerme("");
      setResultats([]);
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-sm font-semibold text-white">Ajouter un exercice</p>
      <input
        value={terme}
        onChange={(e) => chercher(e.target.value)}
        placeholder="Chercher dans la bibliothèque : tirage, pompes, squat…"
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
      />

      {terme.trim().length >= 2 && resultats.length === 0 && !isPending && (
        <p className="text-xs text-gray-500">Aucun exercice à ce nom dans la bibliothèque.</p>
      )}

      <div className="space-y-1">
        {resultats.map((ex) => (
          <button
            key={ex.id}
            onClick={() => ajouter(ex)}
            disabled={isPending}
            className="flex w-full items-center gap-2 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-left hover:border-brand-500/40"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-white">{ex.name}</span>
            {ex.vimeoVideoId ? (
              <span className="shrink-0 text-xs text-green-400">vidéo</span>
            ) : (
              <span className="shrink-0 text-xs text-orange-400">sans vidéo</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
