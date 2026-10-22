"use client";

import { estDuree, formatDuree, secondesDe } from "@/lib/duree-exercice";

/**
 * Le champ qui dit ce qu'on demande : des répétitions, ou du temps.
 *
 * Gainage, planche, chaise, gainage latéral : « 3 × 12 » n'y veut rien dire.
 * La valeur se tapait en texte libre, donc chacun écrivait « 45s », « 45
 * sec », « 45 secondes » — trois écritures pour la même chose, et le client
 * doit deviner à chaque fois.
 *
 * Le bascule ne change rien en base : la durée est écrite dans la même
 * colonne que les répétitions, au format « 45 s » / « 1 min 30 ». C'est ce
 * qui permet de l'ajouter sans migration, et ce qui fait que le client la lit
 * telle quelle.
 */
export function ChampRepsOuTemps({
  valeur,
  onChange,
}: {
  valeur: string;
  onChange: (v: string) => void;
}) {
  const temps = estDuree(valeur);
  const secondes = secondesDe(valeur);

  function basculer(versTemps: boolean) {
    if (versTemps === temps) return;
    // Une bascule ne doit pas effacer ce qui est tapé : 12 répétitions
    // deviennent 12 secondes, et inversement. Le nombre reste, c'est l'unité
    // qui change — et c'est corrigeable d'un chiffre.
    if (versTemps) {
      const n = parseInt(valeur, 10);
      onChange(formatDuree(Number.isFinite(n) && n > 0 ? n : 45));
    } else {
      onChange(secondes ? String(secondes) : "12");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border border-gray-700">
        {([
          { cle: false, texte: "Reps" },
          { cle: true, texte: "Temps" },
        ] as const).map((o) => (
          <button
            key={o.texte}
            type="button"
            onClick={() => basculer(o.cle)}
            className={`px-2.5 py-1.5 text-xs transition-colors ${
              temps === o.cle
                ? "bg-brand-500 font-semibold text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {o.texte}
          </button>
        ))}
      </div>

      {temps ? (
        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          Durée
          <input
            value={secondes ?? ""}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              onChange(Number.isFinite(n) ? formatDuree(n) : "");
            }}
            inputMode="numeric"
            aria-label="Durée en secondes"
            className="w-16 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm text-white focus:border-brand-500 focus:outline-none"
          />
          {/* La saisie est en secondes, l'affichage bascule en minutes au-delà
              d'une minute : « 90 s » se compte mal en appui sur les coudes. */}
          <span className="text-gray-500">s → {valeur || "—"}</span>
        </label>
      ) : (
        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          Reps
          <input
            value={valeur}
            onChange={(e) => onChange(e.target.value)}
            placeholder="12"
            className="w-24 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
          />
        </label>
      )}
    </div>
  );
}
