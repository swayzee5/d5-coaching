"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deplacerExerciceTemplate } from "@/app/templates/seances/[id]/actions";

/**
 * Les deux flèches qui déplacent un exercice dans une séance type.
 *
 * Un composant client plutôt que deux formulaires : il faut désactiver les
 * boutons pendant l'échange. Deux clics rapides sur la même flèche
 * déclencheraient deux permutations croisées, et l'exercice reviendrait à sa
 * place sans que rien ne l'explique.
 */
export function DeplacerExercice({
  exerciceId,
  templateId,
  premier,
  dernier,
}: {
  exerciceId: string;
  templateId: string;
  premier: boolean;
  dernier: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Le succès n'est pas annoncé : l'exercice change de place sous les yeux,
   * c'est la confirmation elle-même. L'échec, lui, était avalé — le résultat
   * n'était pas regardé, et un déplacement qui ne passait pas laissait croire
   * à un clic manqué.
   */
  function deplacer(sens: "haut" | "bas") {
    setErreur(null);
    startTransition(async () => {
      const r = await deplacerExerciceTemplate(exerciceId, templateId, sens);
      if (!r.ok) {
        setErreur(r.erreur ?? "Déplacement impossible.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {erreur && <span className="text-xs text-red-400">{erreur}</span>}
      <button
        onClick={() => deplacer("haut")}
        disabled={premier || isPending}
        title="Monter"
        className="px-1.5 py-1 text-gray-500 transition-colors hover:text-white disabled:opacity-20"
      >
        ↑
      </button>
      <button
        onClick={() => deplacer("bas")}
        disabled={dernier || isPending}
        title="Descendre"
        className="px-1.5 py-1 text-gray-500 transition-colors hover:text-white disabled:opacity-20"
      >
        ↓
      </button>
    </>
  );
}
