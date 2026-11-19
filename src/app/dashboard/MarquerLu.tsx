"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { marquerCheckinLu } from "./actions";

/**
 * « Lu » — le geste qui manquait.
 *
 * Le succès ne s'annonce pas : la ligne disparaît de la liste, et un geste
 * visible vaut mieux qu'un message. L'échec, lui, se dit, sans quoi on
 * recommence trois fois en pensant que l'écran n'a pas compris.
 */
export function MarquerLu({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const r = await marquerCheckinLu(id);
          if (!r.ok) {
            window.alert("Impossible de marquer comme lu.");
            return;
          }
          router.refresh();
        })
      }
      className="text-xs text-gray-500 transition-colors hover:text-gray-300 disabled:opacity-50"
    >
      {isPending ? "…" : "Marquer lu"}
    </button>
  );
}
