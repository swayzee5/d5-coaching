"use client";

import { useState, useTransition } from "react";
import { resetRebootDiagnostic } from "@/app/app-clients/[id]/actions";

/**
 * Remet le diagnostic Reboot à zéro pour un client.
 *
 * Confirmation en deux temps plutôt qu'une boîte de dialogue : l'action efface
 * des réponses écrites à la main, souvent longues, et qui ne sont nulle part
 * ailleurs. Un clic malencontreux ne doit pas suffire.
 */
export function ResetDiagnosticButton({ clientId }: { clientId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        Réinitialiser le diagnostic
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400">
        Effacer ses réponses ? Il devra refaire le diagnostic.
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => resetRebootDiagnostic(clientId))}
        className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
      >
        {isPending ? "…" : "Confirmer"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        Annuler
      </button>
    </div>
  );
}
