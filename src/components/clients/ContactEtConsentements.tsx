"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Confirmation, useConfirmation } from "@/components/ui/Confirmation";
import { PAYS, type CodePays } from "@/lib/telephone";
import { CANAUX, type Canal, type EtatConsentement } from "@/lib/consentements";
import type { ProspectLie } from "@/lib/personnes";
import {
  enregistrerTelephone,
  basculerConsentement,
  chercherProspects,
  relierProspect,
  detacherProspect,
} from "@/app/app-clients/[id]/contact-actions";

/**
 * De quoi joindre une personne, et le droit de le faire.
 *
 * Les deux vont ensemble volontairement. Un numéro sans accord est inutile —
 * pire, c'est une tentation. Les afficher côte à côte fait qu'on ne remplit
 * jamais l'un en oubliant l'autre.
 *
 * Le bandeau du haut dit ce qui manque pour que l'automatisation puisse
 * parler à cette personne. C'est la seule information de ce bloc qui se lit
 * sans y penser, et c'est celle qui compte.
 */

export function ContactEtConsentements({
  clientId,
  telephone,
  etats,
  prospect,
}: {
  clientId: string;
  telephone: string | null;
  etats: EtatConsentement[];
  prospect: ProspectLie | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { message, confirmer } = useConfirmation();
  const [erreur, setErreur] = useState<string | null>(null);

  const [editTel, setEditTel] = useState(false);
  const [saisie, setSaisie] = useState(telephone ?? "");
  const [pays, setPays] = useState<CodePays>("FR");

  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<ProspectLie[]>([]);
  const [chercheEnCours, setChercheEnCours] = useState(false);

  const whatsappOk = etats.find((e) => e.canal === "whatsapp")?.accorde ?? false;
  const manques: string[] = [];
  if (!telephone) manques.push("le numéro");
  if (!whatsappOk) manques.push("l'accord WhatsApp");

  function sauverTelephone() {
    setErreur(null);
    startTransition(async () => {
      const r = await enregistrerTelephone(clientId, saisie, pays);
      if (!r.ok) {
        setErreur(r.erreur ?? "Erreur");
        return;
      }
      setEditTel(false);
      // Un doublon n'empêche pas l'enregistrement, mais il doit se voir.
      if (r.erreur) setErreur(r.erreur);
      confirmer(`Numéro enregistré : ${r.affichage}`);
      router.refresh();
    });
  }

  function basculer(canal: Canal, valeur: boolean) {
    setErreur(null);
    startTransition(async () => {
      const r = await basculerConsentement(clientId, canal, valeur);
      if (!r.ok) {
        setErreur(r.erreur ?? "Erreur");
        return;
      }
      confirmer(valeur ? `Accord enregistré — ${CANAUX[canal]}` : `Refus enregistré — ${CANAUX[canal]}`);
      router.refresh();
    });
  }

  function chercher(valeur: string) {
    setRecherche(valeur);
    if (valeur.trim().length < 2) {
      setResultats([]);
      return;
    }
    setChercheEnCours(true);
    startTransition(async () => {
      setResultats(await chercherProspects(valeur));
      setChercheEnCours(false);
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Contact &amp; consentements</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Ce qu&apos;il faut pour qu&apos;un message automatique puisse partir.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            manques.length === 0
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-orange-500/30 bg-orange-500/10 text-orange-400"
          }`}
        >
          {manques.length === 0 ? "Joignable" : `Manque ${manques.join(" et ")}`}
        </span>
      </div>

      {/* Téléphone */}
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">Téléphone</p>
        {!editTel ? (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="text-lg font-semibold text-white">{telephone ?? "—"}</span>
            <button
              type="button"
              onClick={() => setEditTel(true)}
              className="text-xs text-gray-500 transition-colors hover:text-brand-400"
            >
              {telephone ? "Modifier" : "Renseigner"}
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              {/* Le pays est demandé, pas deviné : un numéro commençant par 0
                  est français ou suisse selon la personne, et se tromper met
                  un jour un message chez un inconnu. */}
              <select
                value={pays}
                onChange={(e) => setPays(e.target.value as CodePays)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white"
              >
                {(Object.keys(PAYS) as CodePays[]).map((c) => (
                  <option key={c} value={c}>
                    {PAYS[c].nom} (+{PAYS[c].indicatif})
                  </option>
                ))}
              </select>
              <input
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                placeholder={PAYS[pays].exemple}
                inputMode="tel"
                className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={sauverTelephone}
                disabled={isPending || !saisie.trim()}
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
              >
                {isPending ? "…" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaisie(telephone ?? "");
                  setEditTel(false);
                  setErreur(null);
                }}
                className="text-xs text-gray-500 hover:text-white"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Consentements */}
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">Consentements</p>
        <div className="mt-2 space-y-1.5">
          {etats.map((e) => (
            <div
              key={e.canal}
              className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm text-white">{CANAUX[e.canal]}</p>
                <p className="text-xs text-gray-500">
                  {e.date
                    ? `${e.accorde ? "Accordé" : "Refusé"} le ${new Date(e.date).toLocaleDateString("fr-FR")}${
                        e.source ? ` — ${e.source.toLowerCase()}` : ""
                      }`
                    : "Jamais demandé"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => basculer(e.canal, !e.accorde)}
                disabled={isPending}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  e.accorde
                    ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
                    : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                }`}
              >
                {e.accorde ? "Accordé" : "Non"}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-600">
          Un accord consigné par toi vaut moins qu&apos;une case cochée par la personne.
          La collecte dans l&apos;application viendra après le challenge en cours.
        </p>
      </div>

      {/* Lien prospect */}
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">Fiche commerciale</p>
        {prospect ? (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Link
              href={`/prospects/${prospect.id}`}
              className="text-sm font-medium text-brand-400 hover:text-brand-300"
            >
              {prospect.name}
            </Link>
            <span className="text-xs text-gray-500">{prospect.phone}</span>
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  const r = await detacherProspect(clientId);
                  if (!r.ok) {
                    setErreur(r.erreur ?? "Erreur");
                    return;
                  }
                  confirmer("Lien retiré");
                  router.refresh();
                })
              }
              disabled={isPending}
              className="text-xs text-gray-600 hover:text-orange-400"
            >
              Retirer le lien
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <input
              value={recherche}
              onChange={(e) => chercher(e.target.value)}
              placeholder="Chercher un prospect par nom ou téléphone…"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-brand-500 focus:outline-none"
            />
            {chercheEnCours && <p className="text-xs text-gray-600">Recherche…</p>}
            {resultats.length > 0 && (
              <div className="space-y-1">
                {resultats.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        const r = await relierProspect(clientId, p.id);
                        if (!r.ok) {
                          setErreur(r.erreur ?? "Erreur");
                          return;
                        }
                        setRecherche("");
                        setResultats([]);
                        confirmer(`Relié à ${p.name}`);
                        router.refresh();
                      })
                    }
                    className="flex w-full items-center justify-between rounded-lg bg-gray-800 px-3 py-2 text-left transition-colors hover:bg-gray-750"
                  >
                    <span className="text-sm text-white">{p.name}</span>
                    <span className="text-xs text-gray-500">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {recherche.trim().length >= 2 && !chercheEnCours && resultats.length === 0 && (
              <p className="text-xs text-gray-600">
                Aucun prospect libre ne correspond. C&apos;est normal tant que ManyChat
                n&apos;est pas branché.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Le succès s'efface, l'erreur reste : il y a quelque chose à faire. */}
      <div className="space-y-1">
        <Confirmation message={message} />
        {erreur && <p className="text-xs font-medium text-orange-400">{erreur}</p>}
      </div>
    </div>
  );
}
