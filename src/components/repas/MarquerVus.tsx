"use client";

import { useEffect, useRef } from "react";
import { marquerVus } from "@/app/repas/actions";

/**
 * Marque comme vus les repas affichés, à l'ouverture de la file.
 *
 * Ne rend rien. Le geste est automatique parce qu'il doit l'être : demander
 * au coach de cliquer sur chaque photo pour la marquer lue aboutirait à ce
 * qu'il ne le fasse plus, et le client verrait « envoyé » indéfiniment alors
 * que ses repas sont regardés tous les jours.
 *
 * `envoye` garde le composant d'agir deux fois quand React remonte l'effet,
 * ce qu'il fait systématiquement en développement.
 */
export function MarquerVus({ ids }: { ids: string[] }) {
  const envoye = useRef(false);

  useEffect(() => {
    if (envoye.current || ids.length === 0) return;
    envoye.current = true;
    // Sans rafraîchir : la page vient de se rendre avec les bonnes données,
    // et un rechargement immédiat ferait sauter l'affichage sous les yeux du
    // coach pour un changement qui ne le concerne pas.
    void marquerVus(ids);
  }, [ids]);

  return null;
}
