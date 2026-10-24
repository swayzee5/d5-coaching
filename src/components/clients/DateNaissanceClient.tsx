"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Confirmation, useConfirmation } from "@/components/ui/Confirmation";
import { enregistrerNaissance } from "@/app/app-clients/[id]/actions";
import { ageDepuis } from "@/lib/age";

/**
 * L'âge d'un client, tenu par sa date de naissance.
 *
 * L'âge était saisi mesure par mesure : à retaper à chaque fois, et faux dès
 * l'anniversaire passé. Pour un public quarantenaire à qui l'entraînement
 * s'adapte selon l'âge, c'est une information qui doit être juste sans que
 * personne n'y pense.
 *
 * Saisissable par le coach comme par le client : celui qui l'a sous la main
 * la pose, et l'autre la voit.
 */
export function DateNaissanceClient({
  clientId,
  valeur,
}: {
  clientId: string;
  valeur: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState(valeur ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const { message, confirmer } = useConfirmation();

  function enregistrer() {
    setErreur(null);
    startTransition(async () => {
      const r = await enregistrerNaissance(clientId, date);
      if (!r.ok) {
        setErreur(r.erreur ?? "Erreur");
        return;
      }
      setOuvert(false);
      confirmer("Date enregistrée");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">Âge</p>

      {!ouvert ? (
        <>
          <p className="mt-1 text-2xl font-black text-white">
            {valeur ? `${ageDepuis(valeur)} ans` : "—"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {valeur && (
              <span className="text-xs text-gray-600">
                né le{" "}
                {new Date(valeur).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            )}
            <button
              type="button"
              onClick={() => setOuvert(true)}
              className="text-xs text-gray-500 transition-colors hover:text-brand-400"
            >
              {valeur ? "Modifier" : "Renseigner"}
            </button>
            <Confirmation message={message} />
          </div>
        </>
      ) : (
        <div className="mt-2 space-y-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-brand-500 focus:outline-none"
          />
          {erreur && <p className="text-xs text-red-400">{erreur}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={enregistrer}
              disabled={isPending || !date}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
            >
              {isPending ? "…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDate(valeur ?? "");
                setErreur(null);
                setOuvert(false);
              }}
              className="text-xs text-gray-500 hover:text-white"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
