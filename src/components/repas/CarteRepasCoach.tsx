"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { repondre } from "@/app/repas/actions";

/**
 * Un repas dans la file du coach.
 *
 * L'objectif de cet écran est qu'un repas se traite en une dizaine de
 * secondes. Un coach qui met une minute par photo cessera de le faire au
 * quinzième client — et comme le client voit « Vu », l'abandon serait visible.
 *
 * D'où les réponses rapides : elles ne s'envoient pas d'un clic, elles
 * remplissent le champ. Le coach relit, ajuste, envoie. Une réponse partie
 * sans relecture finirait par ne plus correspondre à l'assiette, et le client
 * s'en apercevrait avant lui.
 */

export type RepasCoach = {
  id: string;
  clientId: string;
  clientNom: string;
  photoUrl: string;
  noteClient: string | null;
  analyse: Analyse | null;
  analyseErreur: string | null;
  coachReply: string | null;
  createdAt: string;
  heures: number;
};

type Analyse = {
  aliments: string[];
  proteine: boolean;
  legumes: boolean;
  feculent: boolean;
  portion: string;
  preparation: string;
  observation: string;
  incertitude: string | null;
};

/**
 * Les réponses rapides sont dérivées de l'analyse : proposer « il manque une
 * protéine » devant une assiette qui en contient ferait perdre plus de temps
 * qu'une liste vide.
 */
function suggestions(a: Analyse | null): string[] {
  if (!a) return ["Bien reçu, continue comme ça.", "Peux-tu me renvoyer une photo plus nette ?"];
  const s: string[] = [];
  if (!a.proteine) s.push("Il manque une source de protéine sur ce repas. Ajoute des œufs, du poulet ou du poisson.");
  if (!a.legumes) s.push("Ajoute des légumes à ce repas, même simples : c'est ce qui te cale sans te charger.");
  if (a.proteine && a.legumes) s.push("Bonne assiette, c'est exactement ce qu'on cherche. Continue.");
  if (a.portion === "copieuse") s.push("La portion est copieuse. Même composition, un tiers en moins, et tu verras la différence sur l'après-midi.");
  if (a.preparation === "industriel") s.push("C'est dépannage, et ça arrive. Essaie d'en garder un sur trois maximum.");
  return s.slice(0, 3);
}

export function CarteRepasCoach({ repas }: { repas: RepasCoach }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [texte, setTexte] = useState(repas.coachReply ?? "");
  const [erreur, setErreur] = useState<string | null>(null);

  const retard = repas.heures >= 24;
  const a = repas.analyse;

  function envoyer() {
    setErreur(null);
    startTransition(async () => {
      const r = await repondre(repas.id, texte);
      if (!r.ok) {
        setErreur(r.erreur ?? "Erreur");
        return;
      }
      router.refresh();
    });
  }

  return (
    <article
      className={`rounded-xl border bg-gray-900 p-4 ${
        retard ? "border-red-500/40" : "border-gray-800"
      }`}
    >
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={repas.photoUrl}
          alt="Repas"
          loading="lazy"
          className="h-32 w-32 shrink-0 rounded-lg bg-gray-800 object-cover"
        />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={`/app-clients/${repas.clientId}`}
              className="font-semibold text-white hover:text-yellow-400"
            >
              {repas.clientNom}
            </Link>
            <span className={`text-xs ${retard ? "font-semibold text-red-400" : "text-gray-500"}`}>
              {depuis(repas.heures)}
              {retard && " — en retard"}
            </span>
          </div>

          {a ? (
            <>
              <p className="text-sm text-gray-300">
                {a.aliments.length > 0 ? a.aliments.join(", ") : "Assiette non identifiée"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Pastille ok={a.proteine} libelle="protéine" />
                <Pastille ok={a.legumes} libelle="légumes" />
                <Pastille ok={a.feculent} libelle="féculent" />
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[11px] text-gray-400">
                  portion {a.portion}
                </span>
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[11px] text-gray-400">
                  {a.preparation}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-gray-500">{a.observation}</p>
              {a.incertitude && (
                <p className="text-xs leading-relaxed text-orange-400/80">⚠️ {a.incertitude}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500">
              Pas de lecture automatique{repas.analyseErreur ? ` (${repas.analyseErreur})` : ""}.
            </p>
          )}

          {repas.noteClient && (
            <p className="border-l-2 border-gray-700 pl-3 text-sm italic text-gray-400">
              « {repas.noteClient} »
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {suggestions(a).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions(a).map((s) => (
              <button
                key={s}
                onClick={() => setTexte(s)}
                className="rounded-full border border-gray-700 px-3 py-1 text-[11px] text-gray-300 transition-colors hover:border-yellow-500/50 hover:text-white"
              >
                {s.length > 48 ? `${s.slice(0, 45)}…` : s}
              </button>
            ))}
          </div>
        )}

        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={2}
          placeholder="Ta réponse au client…"
          className="w-full resize-none rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
        />

        {erreur && <p className="text-sm text-red-400">{erreur}</p>}

        <div className="flex items-center gap-3">
          <button
            onClick={envoyer}
            disabled={isPending || !texte.trim()}
            className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-yellow-400 disabled:opacity-40"
          >
            {isPending ? "Envoi…" : repas.coachReply ? "Modifier ma réponse" : "Répondre"}
          </button>
          {repas.coachReply && !isPending && (
            <span className="text-xs text-green-400">Déjà répondu</span>
          )}
        </div>
      </div>
    </article>
  );
}

function Pastille({ ok, libelle }: { ok: boolean; libelle: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] ${
        ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
      }`}
    >
      {ok ? "✓" : "✗"} {libelle}
    </span>
  );
}

function depuis(heures: number): string {
  if (heures < 1) return "à l'instant";
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours} jour${jours > 1 ? "s" : ""}`;
}
