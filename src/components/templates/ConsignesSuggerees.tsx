"use client";

import { CONSIGNES_TYPES } from "@/lib/consignes-types";

/**
 * Les consignes toutes faites, à portée de clic sous la case de saisie.
 *
 * Deux gains, et le second compte plus que le premier : le temps de saisie,
 * et la constance. Retapée vingt fois, la même intention finit en trois
 * formulations différentes, et le client ne sait plus si on lui demande autre
 * chose.
 *
 * Le texte ajouté reste modifiable : c'est un point de départ, pas un
 * gabarit. Et s'il y a déjà quelque chose dans la case, la phrase s'ajoute à
 * la ligne suivante plutôt que d'écraser — c'est ce qui permet de coller une
 * consigne d'exécution sous une consigne d'intensité, et ça ne fait jamais
 * perdre ce qui était tapé.
 */
export function ConsignesSuggerees({
  valeur,
  onChoisir,
}: {
  valeur: string;
  onChoisir: (texte: string) => void;
}) {
  function ajouter(texte: string) {
    const actuel = valeur.trim();
    onChoisir(actuel ? `${actuel}\n${texte}` : texte);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide text-gray-600">
          Consignes fréquentes
        </span>
        {CONSIGNES_TYPES.map((c) => (
          <button
            key={c.etiquette}
            type="button"
            onClick={() => ajouter(c.texte)}
            // Le texte complet au survol : le libellé est court pour tenir sur
            // la ligne, mais c'est la phrase entière qui part chez le client.
            title={c.texte}
            className="rounded-full border border-gray-700 px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-brand-500/50 hover:text-white"
          >
            + {c.etiquette}
          </button>
        ))}
        {valeur.trim() && (
          <button
            type="button"
            onClick={() => onChoisir("")}
            className="text-xs text-gray-600 transition-colors hover:text-red-400"
          >
            Vider
          </button>
        )}
      </div>
    </div>
  );
}
