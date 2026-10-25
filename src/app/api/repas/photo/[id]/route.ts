import { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { db } from "@/lib/db";
import { optionsPrivees, priveUtilisable } from "@/lib/blob-token";

/**
 * Sert la photo d'un repas au coach.
 *
 * Les photos sont déposées en accès privé par l'app cliente, dans un store
 * dédié : elles n'ont pas d'adresse publique, et il faut les identifiants de
 * CE store pour les lire. Être connecté au store public ne suffit pas, et
 * c'est ce qui faisait afficher une image cassée côté coach alors que la
 * photo existait bel et bien.
 *
 * Deux chemins, dans cet ordre. Si le CRM est relié au store privé, il lit
 * directement. Sinon il demande la photo à l'app cliente, qui y est reliée,
 * avec le secret partagé des appels entre les deux applications. Ce second
 * chemin existe parce que le premier dépend d'une manipulation dans la
 * console Vercel qui s'est révélée introuvable : une photo que le coach ne
 * voit pas est une photo que le client a envoyée pour rien, et ça ne doit pas
 * tenir à un bouton qu'on ne trouve plus.
 *
 * La route est protégée par l'authentification du coach, qui couvre tout le
 * CRM.
 *
 * `private, no-store` : une photo de ce genre n'a rien à faire dans le cache
 * d'un intermédiaire, et le gain d'un cache sur une image regardée une fois
 * est nul.
 */

export const dynamic = "force-dynamic";

const URL_APP_CLIENTE =
  process.env.APP_CLIENTE_URL ?? "https://app.d5coaching-distance.com";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const repas = await db.mealLog
    .findUnique({ where: { id: params.id }, select: { photoPath: true } })
    .catch(() => null);
  if (!repas) return new Response("Introuvable", { status: 404 });

  if (priveUtilisable()) {
    try {
      const fichier = await get(repas.photoPath, { access: "private", ...optionsPrivees() });
      if (fichier?.stream) {
        return new Response(fichier.stream, {
          headers: {
            "Content-Type": fichier.blob.contentType ?? "image/jpeg",
            "Cache-Control": "private, no-store",
          },
        });
      }
      console.error("[crm/repas/photo] store privé joignable, mais fichier vide");
    } catch (err) {
      // On n'abandonne pas ici : les identifiants peuvent être ceux du mauvais
      // store. Le relais, lui, lit toujours le bon.
      console.error("[crm/repas/photo] lecture directe impossible", err);
    }
  }

  return relais(params.id);
}

/**
 * Demande la photo à l'app cliente.
 *
 * Le secret voyage dans l'en-tête, jamais dans l'URL. Le flux est renvoyé tel
 * quel : rien n'est chargé en mémoire au passage.
 */
async function relais(repasId: string): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[crm/repas/photo] ni store privé ni secret partagé");
    return new Response("Stockage privé non configuré", { status: 503 });
  }

  try {
    const res = await fetch(`${URL_APP_CLIENTE}/api/repas/photo/${repasId}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok || !res.body) {
      console.error("[crm/repas/photo] relais refusé", res.status);
      return new Response("Lecture impossible", { status: res.status === 404 ? 404 : 502 });
    }
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[crm/repas/photo] relais injoignable", err);
    return new Response("Lecture impossible", { status: 502 });
  }
}
