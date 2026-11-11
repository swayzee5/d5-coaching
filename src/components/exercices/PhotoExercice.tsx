"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Confirmation, useConfirmation } from "@/components/ui/Confirmation";

/**
 * Poser une photo sur un exercice qui n'a pas de vidéo.
 *
 * Certains exercices n'ont rien à démontrer. Une marche inclinée se comprend
 * d'un coup d'œil, et la filmer serait du temps de tournage perdu. L'appli
 * affiche déjà la photo et désactive le bouton de lecture toute seule.
 *
 * L'image est réduite dans le navigateur avant d'être envoyée. Une photo
 * d'iPhone pèse quatre mégaoctets, soit plus que ce qu'une fonction serveur
 * accepte — et une tuile de deux cents pixels de haut n'a aucun besoin de
 * cette définition. Réduire ici évite d'avoir à construire un téléversement
 * direct pour une image de catalogue.
 */

/** Côté le plus long, en pixels. Assez pour une tuile sur écran Retina. */
const COTE_MAX = 1280;

async function reduire(fichier: File): Promise<Blob> {
  const image = await createImageBitmap(fichier);
  const ratio = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
  const largeur = Math.round(image.width * ratio);
  const hauteur = Math.round(image.height * ratio);

  const toile = document.createElement("canvas");
  toile.width = largeur;
  toile.height = hauteur;
  const ctx = toile.getContext("2d");
  if (!ctx) throw new Error("Impossible de préparer l'image.");
  ctx.drawImage(image, 0, 0, largeur, hauteur);

  return new Promise<Blob>((resoudre, rejeter) => {
    toile.toBlob(
      (blob) => (blob ? resoudre(blob) : rejeter(new Error("Conversion impossible."))),
      "image/jpeg",
      0.82
    );
  });
}

export function PhotoExercice({
  id,
  nom,
  photoActuelle,
}: {
  id: string;
  nom: string;
  photoActuelle: string | null;
}) {
  const champ = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const { message, confirmer } = useConfirmation();

  async function envoyer(fichier: File) {
    setErreur(null);
    setEnCours(true);
    try {
      const reduit = await reduire(fichier);
      const corps = new FormData();
      corps.append("id", id);
      corps.append("photo", new File([reduit], "photo.jpg", { type: "image/jpeg" }));

      const res = await fetch("/api/exercices/photo", { method: "POST", body: corps });
      const data = (await res.json()) as { ok?: boolean; erreur?: string };
      if (!res.ok || !data.ok) {
        setErreur(data.erreur ?? "Envoi impossible.");
        return;
      }
      confirmer("Photo enregistrée");
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setEnCours(false);
      if (champ.current) champ.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {photoActuelle && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoActuelle}
            alt={`Illustration de ${nom}`}
            className="h-16 w-24 rounded-lg border border-gray-800 object-cover"
          />
        )}
        <button
          type="button"
          onClick={() => champ.current?.click()}
          disabled={enCours}
          className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-brand-500 hover:text-brand-400 disabled:opacity-50"
        >
          {enCours ? "Envoi…" : photoActuelle ? "Remplacer la photo" : "Ajouter une photo"}
        </button>
        <input
          ref={champ}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void envoyer(f);
          }}
        />
      </div>

      <p className="text-xs text-gray-600">
        Pour les exercices qui n&apos;ont pas besoin d&apos;une vidéo. La photo
        s&apos;affiche sur la tuile du client, et le bouton de lecture
        dispara&icirc;t tout seul.
      </p>

      <Confirmation message={message} />
      {erreur && <p className="text-xs font-medium text-red-400">{erreur}</p>}
    </div>
  );
}
