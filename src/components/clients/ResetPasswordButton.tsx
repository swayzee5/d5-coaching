"use client";

import { useState, useTransition } from "react";
import { resetClientPassword } from "@/app/app-clients/[id]/actions";

/**
 * Donner un nouveau mot de passe à un client, depuis sa fiche.
 *
 * Le champ reste fermé tant qu'on ne l'ouvre pas, et le mot de passe est
 * affiché en clair pendant la saisie : il va être dicté ou recopié dans un
 * message, le masquer n'apporterait rien et ferait taper deux fois.
 *
 * Il reste visible après enregistrement, le temps de le transmettre, avec un
 * rappel que c'est au coach de le faire.
 */
export function ResetPasswordButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [resultat, setResultat] = useState<{ ok: true } | { error: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function enregistrer() {
    startTransition(async () => {
      const r = await resetClientPassword(clientId, motDePasse);
      setResultat("ok" in r ? { ok: true } : { error: r.error ?? "Erreur" });
    });
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        Réinitialiser le mot de passe
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-3 space-y-2">
      <p className="text-xs text-gray-400">
        Nouveau mot de passe pour {clientName}
      </p>
      <input
        type="text"
        autoComplete="off"
        value={motDePasse}
        onChange={(e) => { setMotDePasse(e.target.value); setResultat(null); }}
        placeholder="ex : Reboot2026"
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={enregistrer}
          disabled={isPending || motDePasse.length < 4}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          onClick={() => { setOuvert(false); setMotDePasse(""); setResultat(null); }}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Annuler
        </button>
      </div>
      {resultat && "ok" in resultat && (
        <p className="text-xs text-green-400">
          Enregistré. Transmets-lui « {motDePasse} », il n&apos;est envoyé à personne automatiquement.
        </p>
      )}
      {resultat && "error" in resultat && (
        <p className="text-xs text-red-400">{resultat.error}</p>
      )}
    </div>
  );
}
