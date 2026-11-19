"use client";

import { useEffect, useState } from "react";

/**
 * Une section du tableau de bord qu'on peut replier.
 *
 * Le tableau de bord empile sept blocs dépliés en permanence. Sur un
 * téléphone, aller du haut au bas demande une dizaine de gestes, et il faut
 * refaire le chemin en sens inverse pour revenir au premier. En pratique,
 * seules les deux premières sections sont lues.
 *
 * Replier ne cache rien : le titre porte le compte, donc une section fermée
 * dit encore combien elle contient. C'est la différence entre ranger et
 * dissimuler.
 *
 * Le choix est retenu d'une visite à l'autre, par section. Un tableau de bord
 * qui se rouvre tout déplié à chaque fois annule le rangement qu'on vient de
 * faire — et au bout de trois fois, on ne le range plus.
 */

const PREFIXE = "d5.dashboard.section.";

export function SectionDepliante({
  cle,
  titre,
  compte,
  couleur = "gris",
  urgent = false,
  defautOuvert = true,
  action,
  children,
}: {
  /** Identifiant stable, pour retenir l'état de cette section-là. */
  cle: string;
  titre: string;
  /** Affiché à côté du titre, et visible même repliée. */
  compte?: number;
  couleur?: "bleu" | "violet" | "ambre" | "jaune" | "gris";
  /** Pastille clignotante : réservée à ce qui demande une action aujourd'hui. */
  urgent?: boolean;
  defautOuvert?: boolean;
  /** Lien « Voir tout », à droite du titre. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(defautOuvert);
  // Le premier rendu doit être celui du serveur, sinon React signale une
  // différence ; la préférence est lue après coup.
  const [monte, setMonte] = useState(false);

  useEffect(() => {
    setMonte(true);
    try {
      const garde = window.localStorage.getItem(PREFIXE + cle);
      if (garde !== null) setOuvert(garde === "1");
    } catch {
      // Stockage refusé (navigation privée) : on garde le défaut, sans
      // empêcher la section de fonctionner.
    }
  }, [cle]);

  function basculer() {
    const suivant = !ouvert;
    setOuvert(suivant);
    try {
      window.localStorage.setItem(PREFIXE + cle, suivant ? "1" : "0");
    } catch {
      // Sans mémoire, la section se replie quand même pour cette visite.
    }
  }

  const couleurs = {
    bleu: { texte: "text-blue-400", bord: "border-blue-500/30", point: "bg-blue-500", halo: "bg-blue-400" },
    violet: { texte: "text-purple-400", bord: "border-purple-500/30", point: "bg-purple-500", halo: "bg-purple-400" },
    ambre: { texte: "text-amber-400", bord: "border-amber-500/30", point: "bg-amber-500", halo: "bg-amber-400" },
    jaune: { texte: "text-yellow-400", bord: "border-yellow-500/30", point: "bg-yellow-400", halo: "bg-yellow-400" },
    gris: { texte: "text-gray-300", bord: "border-gray-800", point: "bg-gray-600", halo: "bg-gray-600" },
  }[couleur];

  return (
    <div className={`rounded-xl border bg-gray-900 ${couleurs.bord}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={basculer}
          aria-expanded={ouvert}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {urgent ? (
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${couleurs.halo}`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${couleurs.point}`} />
            </span>
          ) : (
            <span className={`h-2 w-2 shrink-0 rounded-full ${couleurs.point}`} />
          )}

          <h2 className={`truncate text-sm font-semibold uppercase tracking-wide ${couleurs.texte}`}>
            {titre}
            {typeof compte === "number" && ` (${compte})`}
          </h2>

          <svg
            className={`ml-1 h-4 w-4 shrink-0 text-gray-500 transition-transform ${ouvert ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* `monte` évite d'afficher brièvement l'état par défaut avant la
          préférence enregistrée. */}
      {(!monte || ouvert) && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
