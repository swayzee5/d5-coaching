import { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { db } from "@/lib/db";
import { optionsPrivees, priveUtilisable } from "@/lib/blob-token";

/**
 * Sert la photo d'un repas au coach.
 *
 * Les photos sont déposées en accès privé par l'app cliente, dans un store
 * dédié : elles n'ont pas d'adresse publique, et il faut les identifiants de
 * CE store pour les lire. Le CRM doit donc y être connecté lui aussi — être
 * connecté au store public ne suffit pas, et c'est ce qui faisait afficher
 * une image cassée côté coach alors que la photo existait bel et bien.
 *
 * La route est protégée par l'authentification du coach, qui couvre tout le
 * CRM.
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

  if (!priveUtilisable()) {
    console.error("[crm/repas/photo] store privé non configuré");
    return new Response("Stockage privé non configuré", { status: 503 });
  }

  try {
    const fichier = await get(repas.photoPath, { access: "private", ...optionsPrivees() });
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
