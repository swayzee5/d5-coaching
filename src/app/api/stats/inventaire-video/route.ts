import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Ce qui est déjà filmé, et ce qui ne l'est pas.
 *
 * Le plus coûteux dans une session de tournage n'est pas de filmer : c'est de
 * refilmer ce qui existait déjà, et de s'en apercevoir au montage. La
 * bibliothèque compte des centaines d'exercices ; personne ne les a en tête.
 *
 * Trois listes, et la troisième est celle qui sert : les exercices utilisés
 * dans des séances réelles et qui n'ont toujours pas de vidéo. Ce sont les
 * clients qui les ouvrent, et qui tombent sur un écran muet.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Ligne = {
  nom: string;
  categorie: string | null;
  vimeo_video_id: string | null;
  thumbnail_url: string | null;
  usages: bigint | number;
};

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    // Le nombre d'usages vient des séances types et des séances attribuées :
    // un exercice sans vidéo mais présent dans huit séances est un trou
    // beaucoup plus urgent qu'un exercice que personne n'utilise.
    const lignes = await db.$queryRaw<Ligne[]>`
      SELECT el.name AS nom,
             el.category AS categorie,
             el.vimeo_video_id,
             el.thumbnail_url,
             (SELECT COUNT(*) FROM session_exercises se
               WHERE lower(trim(se.name)) = lower(trim(el.name))) AS usages
        FROM exercise_library el
       ORDER BY el.name
    `;

    const aVideo = (l: Ligne) => Boolean(l.vimeo_video_id && String(l.vimeo_video_id).trim());
    const nombre = (v: bigint | number) => Number(v ?? 0);

    const filmes = lignes.filter(aVideo);
    const manquants = lignes.filter((l) => !aVideo(l));

    return NextResponse.json({
      resume: {
        total: lignes.length,
        filmes: filmes.length,
        sansVideo: manquants.length,
        sansVignette: filmes.filter((l) => !l.thumbnail_url).length,
      },
      // L'ordre compte : ce qui est le plus utilisé passe devant, c'est ce
      // qui doit être tourné en premier.
      aFilmerEnPriorite: manquants
        .filter((l) => nombre(l.usages) > 0)
        .sort((a, b) => nombre(b.usages) - nombre(a.usages))
        .map((l) => ({ nom: l.nom, categorie: l.categorie, utiliseDans: nombre(l.usages) })),
      aFilmerUnJour: manquants
        .filter((l) => nombre(l.usages) === 0)
        .map((l) => ({ nom: l.nom, categorie: l.categorie })),
      dejaFilmes: filmes.map((l) => ({
        nom: l.nom,
        categorie: l.categorie,
        vignette: Boolean(l.thumbnail_url),
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err).slice(0, 300) }, { status: 500 });
  }
}
