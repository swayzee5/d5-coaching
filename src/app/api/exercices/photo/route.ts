import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { jsonUtf8 } from "@/lib/json-utf8";

/**
 * La photo d'illustration d'un exercice.
 *
 * Tous les exercices n'ont pas besoin d'une vidéo. Une marche sur tapis se
 * comprend d'un coup d'œil, et filmer trois minutes de marche inclinée pour
 * montrer qu'on marche incliné serait du temps perdu. La tuile de
 * l'application affiche déjà `thumbnail_url` et désactive le bouton de
 * lecture quand il n'y a pas de vidéo : il manquait seulement le moyen de
 * poser l'image.
 *
 * Store public, et c'est obligatoire : l'application charge cette adresse
 * directement dans une balise image, sans session. Ce n'est pas une donnée de
 * client — c'est une illustration de catalogue, au même titre qu'une vignette
 * Vimeo.
 *
 * L'image arrive déjà redimensionnée par le navigateur. Une photo de
 * téléphone pèse plusieurs mégaoctets, au-delà de ce qu'une fonction serveur
 * accepte, et une vignette de tuile n'a aucun besoin de cette définition. La
 * limite ici est une sécurité, pas le mécanisme.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TAILLE_MAX = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  // Le middleware NextAuth couvre déjà cette route : seule la session du
  // coach arrive jusqu'ici.
  try {
    const form = await req.formData();
    const id = String(form.get("id") ?? "").trim();
    const fichier = form.get("photo");

    if (!id) return jsonUtf8({ erreur: "Exercice manquant." }, { status: 400 });
    if (!(fichier instanceof File)) {
      return jsonUtf8({ erreur: "Aucune image reçue." }, { status: 400 });
    }

    const extension = TYPES[fichier.type];
    if (!extension) {
      return jsonUtf8(
        { erreur: "Format non accepté. Utilise une photo JPEG, PNG ou WebP." },
        { status: 400 }
      );
    }
    if (fichier.size > TAILLE_MAX) {
      return jsonUtf8(
        { erreur: "Image trop lourde après redimensionnement. Réessaie." },
        { status: 400 }
      );
    }

    const exercice = await db.exerciseLibrary.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!exercice) return jsonUtf8({ erreur: "Exercice introuvable." }, { status: 404 });

    const depot = await put(
      `exercices/${id}-${Date.now()}.${extension}`,
      fichier,
      { access: "public", contentType: fichier.type, addRandomSuffix: false }
    );

    // `thumbnail_video_id` est remis à zéro : il enregistre la vidéo dont la
    // vignette provient, et cette image ne vient d'aucune vidéo. Le laisser
    // ferait croire à une vignette Vimeo périmée, qu'un nettoyage effacerait.
    await db.$executeRaw`
      UPDATE exercise_library
         SET thumbnail_url = ${depot.url}, thumbnail_video_id = NULL
       WHERE id = ${id}::uuid
    `;

    return jsonUtf8({ ok: true, url: depot.url, exercice: exercice.name });
  } catch (err) {
    console.error("[exercices/photo]", err);
    return jsonUtf8({ erreur: String(err).slice(0, 200) }, { status: 500 });
  }
}
