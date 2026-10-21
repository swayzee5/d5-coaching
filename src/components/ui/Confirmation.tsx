"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * La confirmation de sauvegarde, partout pareille.
 *
 * Un enregistrement silencieux laisse une question sans réponse : est-ce
 * passé ? On re-clique, on recharge la page pour vérifier, et au bout de
 * quelques fois on cesse de faire confiance à l'écran. Toute sauvegarde dit
 * donc qu'elle a eu lieu, et le dit au même endroit, de la même façon.
 *
 * Elle s'efface seule au bout de quelques secondes : elle répond à une
 * question posée à l'instant, et une fois répondue elle ne doit plus occuper
 * la place de ce qui vient après.
 */

/** Durée d'affichage : le temps de la lire sans avoir à la chasser. */
const DUREE = 4000;

export function useConfirmation(duree = DUREE) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), duree);
    return () => clearTimeout(t);
  }, [message, duree]);

  // Le même message deux fois de suite ne relancerait pas le minuteur : on le
  // vide d'abord, sinon la deuxième sauvegarde n'afficherait rien.
  function confirmer(texte: string) {
    setMessage(null);
    requestAnimationFrame(() => setMessage(texte));
  }

  return { message, confirmer };
}

export function Confirmation({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    // aria-live : un lecteur d'écran l'annonce sans que le focus bouge.
    <p
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400"
    >
      <span aria-hidden>✓</span>
      {message}
    </p>
  );
}

/**
 * La confirmation d'un formulaire qui s'enregistre tout seul, sans bouton.
 *
 * Une saisie sauvegardée à la sortie du champ est le cas où le doute est le
 * plus fort : rien n'a été cliqué, rien n'a bougé. À placer dans le
 * formulaire — c'est l'état de son envoi qui est observé.
 */
export function EtatSauvegarde({
  confirmation = "Enregistré",
  className = "",
}: {
  confirmation?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const envoyait = useRef(false);
  const [fait, setFait] = useState(false);

  useEffect(() => {
    if (pending) {
      envoyait.current = true;
      setFait(false);
      return;
    }
    if (!envoyait.current) return;
    envoyait.current = false;
    setFait(true);
    const t = setTimeout(() => setFait(false), DUREE);
    return () => clearTimeout(t);
  }, [pending]);

  if (!pending && !fait) return null;

  return (
    <span role="status" aria-live="polite" className={`text-xs ${className}`}>
      {pending ? (
        <span className="text-gray-500">Enregistrement…</span>
      ) : (
        <span className="font-medium text-green-400">✓ {confirmation}</span>
      )}
    </span>
  );
}

/**
 * Le bouton d'un formulaire qui poste directement une action serveur.
 *
 * Ces formulaires-là n'ont pas de code client pour observer le résultat :
 * c'est la fin de l'envoi qui sert de signal. Si l'action échoue, Next remonte
 * l'erreur au lieu de rendre la main, donc le retour à l'état repos vaut
 * succès — la confirmation ne peut pas mentir sur une panne franche.
 */
export function BoutonSauvegarde({
  children = "Sauvegarder",
  confirmation = "Enregistré",
  className = "rounded-lg bg-gray-700 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-600 disabled:opacity-50",
}: {
  children?: React.ReactNode;
  confirmation?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const envoyait = useRef(false);
  const [fait, setFait] = useState(false);

  useEffect(() => {
    if (pending) {
      envoyait.current = true;
      setFait(false);
      return;
    }
    if (!envoyait.current) return;
    envoyait.current = false;
    setFait(true);
    const t = setTimeout(() => setFait(false), DUREE);
    return () => clearTimeout(t);
  }, [pending]);

  return (
    <div className="flex items-center gap-3">
      <button type="submit" disabled={pending} className={className}>
        {pending ? "Enregistrement…" : children}
      </button>
      <Confirmation message={fait ? confirmation : null} />
    </div>
  );
}
