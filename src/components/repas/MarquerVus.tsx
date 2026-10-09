"use client";

import { useEffect, useRef } from "react";
import { marquerVus } from "@/app/repas/actions";

/**
 * Marque comme vus les repas affichés, à l'ouverture de la file.
 *
 * Ne rend rien, et rien n'en transparaît côté client : la marque sert au tri
 * de la file, pas à informer qui que ce soit. Le geste est automatique parce
 * que demander au coach un clic par photo aboutirait à ce qu'il ne le fasse
 * plus, et la distinction entre « déjà regardé » et « nouveau » disparaîtrait.
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
