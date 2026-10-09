import { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { db } from "@/lib/db";

/**
 * Sert la photo d'un repas au coach.
 *
 * Les photos sont déposées en accès privé par l'app cliente : elles n'ont pas
 * d'adresse publique, et il faut le jeton du stockage pour les lire. Le CRM a
 * ce jeton, et il est lui-même derrière l'authentification du coach — c'est
 * elle qui protège cette route.
 *
 * `private, no-store` : une photo de ce genre n'a rien à faire dans le cache
 * d'un intermédiaire, et le gain d'un cache sur une image regardée une fois
 * est nul.
 */

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const repas = await db.mealLog
    .findUnique({ where: { id: params.id }, select: { photoPath: true } })
    .catch(() => null);
  if (!repas) return new Response("Introuvable", { status: 404 });

  try {
    const fichier = await get(repas.photoPath, { access: "private" });
    if (!fichier?.stream) return new Response("Introuvable", { status: 404 });
    return new Response(fichier.stream, {
      headers: {
        "Content-Type": fichier.blob.contentType ?? "image/jpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[crm/repas/photo]", err);
    return new Response("Lecture impossible", { status: 500 });
  }
}
