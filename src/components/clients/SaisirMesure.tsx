"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Confirmation, useConfirmation } from "@/components/ui/Confirmation";
import { enregistrerMesure } from "@/app/app-clients/[id]/actions";

/**
 * Saisir une mesure à la place du client.
 *
 * Les mensurations ne pouvaient venir que de l'application du client. Or
 * elles se prennent en séance, mètre en main : c'est le coach qui les a, et
 * il n'avait aucun moyen de les porter. Les fiches restaient vides, et sans
 * point de départ il n'y a pas de progression à montrer — ce qui est pourtant
 * ce qui fait rester quelqu'un.
 *
 * Tout est facultatif sauf la date. Le poids seul est le cas courant, et
 * exiger les six mensurations ferait qu'on ne saisirait rien du tout.
 *
 * La date fait l'unicité : resaisir le même jour corrige au lieu d'ajouter
 * une ligne. Une faute de frappe se répare donc en resaisissant.
 */
export function SaisirMesure({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const { message, confirmer } = useConfirmation();
  const [erreur, setErreur] = useState<string | null>(null);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState({
    date: aujourdhui,
    poids: "",
    taille: "",
    tourTaille: "",
    poitrine: "",
    hanches: "",
    bras: "",
    cuisses: "",
    masseGrasse: "",
    notes: "",
  });

  function champ(cle: keyof typeof v, valeur: string) {
    setV((p) => ({ ...p, [cle]: valeur }));
  }

  function enregistrer() {
    setErreur(null);
    startTransition(async () => {
      const r = await enregistrerMesure(clientId, v);
      if (!r.ok) {
        setErreur(r.erreur ?? "Erreur");
        return;
      }
      setV({ ...v, poids: "", tourTaille: "", poitrine: "", hanches: "", bras: "", cuisses: "", masseGrasse: "", notes: "" });
      setOuvert(false);
      confirmer("Mesure enregistrée");
      router.refresh();
    });
  }

  const mesures: { cle: keyof typeof v; label: string; unite: string }[] = [
    { cle: "poids", label: "Poids", unite: "kg" },
    { cle: "tourTaille", label: "Tour de taille", unite: "cm" },
    { cle: "poitrine", label: "Poitrine", unite: "cm" },
    { cle: "hanches", label: "Hanches", unite: "cm" },
    { cle: "bras", label: "Bras", unite: "cm" },
    { cle: "cuisses", label: "Cuisses", unite: "cm" },
    { cle: "taille", label: "Taille", unite: "cm" },
    { cle: "masseGrasse", label: "Masse grasse", unite: "%" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
        >
          {ouvert ? "Fermer" : "+ Saisir une mesure"}
        </button>
        <Confirmation message={message} />
      </div>

      {ouvert && (
        <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-950 p-4">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            Date
            <input
              type="date"
              value={v.date}
              onChange={(e) => champ("date", e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-brand-500 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {mesures.map((m) => (
              <label key={m.cle} className="block">
                <span className="mb-1 block text-xs text-gray-500">
                  {m.label} <span className="text-gray-600">({m.unite})</span>
                </span>
                <input
                  value={v[m.cle]}
                  onChange={(e) => champ(m.cle, e.target.value)}
                  inputMode="decimal"
                  placeholder="—"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm text-white placeholder-gray-700 focus:border-brand-500 focus:outline-none"
                />
              </label>
            ))}
          </div>

          <input
            value={v.notes}
            onChange={(e) => champ("notes", e.target.value)}
            placeholder="Note (facultatif) — ex : mesuré à jeun, après séance…"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-500 focus:outline-none"
          />

          {/* Dit avant plutôt que découvert après : resaisir le même jour ne
              crée pas de doublon, et les champs laissés vides ne remplacent
              rien. */}
          <p className="text-xs text-gray-600">
            Tout est facultatif sauf la date. Une mesure déjà enregistrée ce
            jour-là sera complétée, pas dupliquée.
          </p>

          {erreur && <p className="text-sm text-red-400">{erreur}</p>}

          <button
            type="button"
            onClick={enregistrer}
            disabled={isPending}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
          >
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      )}
    </div>
  );
}
