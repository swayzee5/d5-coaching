"use client";

import { useState, useTransition } from "react";
import { apercuExercice, type ApercuExercice as Apercu } from "@/app/templates/seances/[id]/actions";

/**
 * Le dépliant d'un exercice de séance type : ce que le client verra, exactement.
 *
 * Une séance type ne stocke qu'un nom. La vidéo et la description sont lues
 * dans la bibliothèque au moment où le client ouvre sa séance — donc après
 * l'attribution, donc trop tard pour corriger. Un nom qui ne se rattache pas,
 * un exercice sans démonstration : jusqu'ici, ça se découvrait chez le client.
 *
 * Trois choses sont dites ici parce que chacune a déjà posé un problème réel :
 *
 *   - le nom introuvable dans la bibliothèque (accent décomposé, apostrophe
 *     typographique, coquille) — le client verrait un exercice muet ;
 *   - l'absence de vidéo — quelqu'un qui reprend après dix ans fait l'exercice
 *     de travers, ou ne le fait pas ;
 *   - l'homonyme — deux entrées du même nom, et c'est la bibliothèque qui
 *     tranche, pas le coach.
 *
 * L'aperçu est chargé au clic et non avec la page : une séance de dix
 * exercices ferait dix requêtes pour un dépliant qu'on n'ouvrira peut-être
 * jamais.
 */
export function ApercuExercice({
  nom,
  consigne,
}: {
  nom: string;
  consigne: string | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [isPending, startTransition] = useTransition();

  function basculer() {
    if (ouvert) {
      setOuvert(false);
      return;
    }
    setOuvert(true);
    // Rechargé à chaque ouverture : le coach vient peut-être d'ajouter la
    // vidéo manquante dans la bibliothèque, et un cache lui montrerait encore
    // l'ancien état.
    startTransition(async () => setApercu(await apercuExercice(nom, consigne)));
  }

  return (
    <>
      <button
        type="button"
        onClick={basculer}
        aria-expanded={ouvert}
        className="mt-1.5 inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-brand-400"
      >
        <span className={`transition-transform ${ouvert ? "rotate-90" : ""}`}>›</span>
        {ouvert ? "Masquer" : "Ce que voit le client"}
      </button>

      {ouvert && (
        <div className="mt-2 space-y-3 rounded-lg border border-gray-800 bg-gray-950/60 p-3">
          {isPending && !apercu && <p className="text-xs text-gray-600">Chargement…</p>}

          {apercu && !apercu.trouve && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-400">
                Introuvable dans la bibliothèque
              </p>
              <p className="text-xs text-gray-400">
                Le client verra « {nom} » sans vidéo ni description. Le nom
                enregistré ne correspond à aucun exercice actif — le plus souvent
                une coquille, un accent ou une apostrophe. Supprime la ligne et
                rajoute l&apos;exercice depuis la bibliothèque.
              </p>
            </div>
          )}

          {apercu?.trouve && (
            <>
              {/* Le nom de la bibliothèque n'est répété que s'il diffère : il
                  diffère exactement dans les cas qui causent les ennuis. */}
              {apercu.nomBibliotheque !== nom && (
                <p className="text-xs text-gray-500">
                  Rattaché à «&nbsp;<span className="text-gray-300">{apercu.nomBibliotheque}</span>&nbsp;»
                </p>
              )}

              {apercu.homonymes > 1 && (
                <p className="text-xs text-orange-400">
                  {apercu.homonymes} exercices portent ce nom dans la
                  bibliothèque. C&apos;est celui-ci qui sera affiché, mais le choix
                  n&apos;est pas le tien — mieux vaut renommer ou désactiver les
                  doublons.
                </p>
              )}

              {apercu.vimeoVideoId ? (
                <div className="overflow-hidden rounded-lg" style={{ maxWidth: 420 }}>
                  <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
                    <iframe
                      src={`https://player.vimeo.com/video/${apercu.vimeoVideoId}?badge=0&autopause=0`}
                      allow="autoplay; fullscreen; picture-in-picture"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                      }}
                      title={apercu.nomBibliotheque ?? nom}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-orange-400">
                  Aucune vidéo. Le client fera cet exercice sans démonstration.
                </p>
              )}

              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-600">
                  Consigne affichée
                </p>
                {apercu.consigneAffichee ? (
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                    {apercu.consigneAffichee}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-gray-600">
                    Rien. Ni consigne de séance, ni description en bibliothèque.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
