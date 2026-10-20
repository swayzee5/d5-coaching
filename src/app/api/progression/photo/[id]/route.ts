import { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { db } from "@/lib/db";

/**
 * Sert une photo de progression au coach.
 *
 * Les photos sont déposées en accès privé par l'app cliente : elles n'ont pas
 * d'adresse publique, et il faut le jeton du stockage pour les lire. Le CRM
 * l'a, et il est lui-même derrière l'authentification du coach — c'est elle
 * qui protège cette route.
 *
 * Ce sont les images les plus sensibles de tout le dispositif. `private,
 * no-store` : elles n'ont rien à faire dans le cache d'un intermédiaire, et le
 * gain d'un cache sur une photo regardée une fois est nul.
 */

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const rows = await db
    .$queryRaw<{ photo_path: string | null }[]>`
      SELECT photo_path FROM progress_photos WHERE id = ${params.id}::uuid
    `
    .catch(() => [] as { photo_path: string | null }[]);

  const chemin = rows[0]?.photo_path;
  if (!chemin) return new Response("Introuvable", { status: 404 });

  try {
    const fichier = await get(chemin, { access: "private" });
    if (!fichier?.stream) return new Response("Introuvable", { status: 404 });
    return new Response(fichier.stream, {
      headers: {
        "Content-Type": fichier.blob.contentType ?? "image/jpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[crm/progression/photo]", err);
    return new Response("Lecture impossible", { status: 500 });
  }
}
