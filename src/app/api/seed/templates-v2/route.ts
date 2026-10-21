import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEANCES_TYPES, PROGRAMMES_TYPES } from "@/lib/templates-catalogue";

/**
 * Reconstruit les séances et programmes types.
 *
 * Remplace entièrement l'ancien contenu : les programmes femmes, et les
 * séances composées par mots-clés qui produisaient des listes d'exercices
 * introuvables ou sans vidéo.
 *
 * Deux vérifications au passage, et elles ressortent dans le rapport plutôt
 * que d'échouer en silence :
 *
 *   1. Chaque nom doit exister dans la bibliothèque. Un nom introuvable est
 *      refusé et nommé — c'est presque toujours une variante d'orthographe,
 *      réparable en une minute.
 *   2. Chaque exercice doit avoir une vidéo. Une démonstration manquante,
 *      pour quelqu'un qui reprend après dix ans, c'est un exercice fait de
 *      travers ou pas fait du tout.
 *
 * Aucune vidéo n'est copiée : les séances ne portent qu'un nom, et le
 * rattachement à la bibliothèque est posé à l'attribution.
 */

export const maxDuration = 60;

type LibRow = { id: string; name: string; a_video: boolean };

/**
 * La clé de comparaison d'un nom d'exercice.
 *
 * Trois normalisations, et chacune a déjà fait disparaître un exercice en
 * silence :
 *
 *   - Unicode : un accent s'écrit sur un ou deux caractères selon qu'il a été
 *     tapé ou collé. « Élévations » et « Élévations » sont identiques à l'œil.
 *   - Apostrophes : la droite ' et les typographiques ’ ` ´ se ressemblent et
 *     ne se comparent pas. C'est ce qui a fait échouer « vers l'arrière ».
 *   - Espaces : une espace insécable ou doublée collée en fin de nom suffit.
 */
function cle(nom: string): string {
  return nom
    .normalize("NFC")
    .replace(/[\u2018\u2019\u02BC\u0060\u00B4]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const essai = req.nextUrl.searchParams.get("essai") === "1";
  // `vider=1` efface sans rien installer. Le coach compose ses propres
  // séances : lui imposer un contenu de départ dont il devrait ensuite
  // supprimer chaque ligne serait pire que de le laisser partir d'une page
  // blanche.
  const viderSeulement = req.nextUrl.searchParams.get("vider") === "1";

  try {
    if (viderSeulement) {
      await db.$executeRaw`DELETE FROM seance_template_exercises`;
      await db.$executeRaw`DELETE FROM seance_templates`;
      await db.$executeRaw`DELETE FROM exercise_templates`.catch(() => {});
      await db.$executeRaw`DELETE FROM session_templates`;
      await db.$executeRaw`DELETE FROM program_templates`;
      return NextResponse.json({
        ok: true,
        action: "templates vidés",
        suite: "Crée tes séances depuis la page Templates.",
      });
    }

    const lib = await db.$queryRaw<LibRow[]>`
      SELECT id::text, name, (vimeo_video_id IS NOT NULL) AS a_video
        FROM exercise_library WHERE is_active = true
    `;
    const index = new Map<string, LibRow>();
    for (const row of lib) {
      const k = cle(row.name);
      // À nom égal, celle qui a une vidéo l'emporte : la bibliothèque contient
      // des doublons, et en choisir un au hasard donnerait un exercice muet.
      const existant = index.get(k);
      if (!existant || (!existant.a_video && row.a_video)) index.set(k, row);
    }

    const problemes: string[] = [];
    const rapport: { seance: string; retenus: number; refuses: string[] }[] = [];

    // Résolution d'abord, écriture ensuite : un essai doit pouvoir montrer ce
    // qui casserait sans rien modifier.
    const resolues = SEANCES_TYPES.map((s) => {
      const retenus: { nom: string; series: number; reps: string; repos: number; note?: string }[] = [];
      const refuses: string[] = [];
      for (const ex of s.exercices) {
        const trouve = index.get(cle(ex.nom));
        if (!trouve) {
          refuses.push(`« ${ex.nom} » introuvable`);
          continue;
        }
        if (!trouve.a_video) {
          refuses.push(`« ${ex.nom} » sans vidéo`);
          continue;
        }
        // Le nom de la bibliothèque, pas celui du catalogue : si l'un porte
        // une coquille, c'est celui qui existe qui doit être enregistré.
        retenus.push({ ...ex, nom: trouve.name });
      }
      if (refuses.length) problemes.push(`${s.nom} — ${refuses.join(" ; ")}`);
      rapport.push({ seance: s.nom, retenus: retenus.length, refuses });
      return { ...s, exercices: retenus };
    });

    if (essai) {
      return NextResponse.json({
        essai: true,
        seances: SEANCES_TYPES.length,
        programmes: PROGRAMMES_TYPES.length,
        problèmes: problemes.length ? problemes : "aucun",
        détail: rapport,
      });
    }

    // Remise à zéro complète. Les programmes déjà attribués à des clients ne
    // sont pas touchés : l'attribution copie, elle ne référence pas.
    await db.$executeRaw`DELETE FROM seance_template_exercises`;
    await db.$executeRaw`DELETE FROM seance_templates`;
    await db.$executeRaw`DELETE FROM exercise_templates`.catch(() => {});
    await db.$executeRaw`DELETE FROM session_templates`;
    await db.$executeRaw`DELETE FROM program_templates`;

    const parNom = new Map<string, string>();

    for (const s of resolues) {
      const cree = await db.$queryRaw<{ id: string }[]>`
        INSERT INTO seance_templates (name, category, duration_minutes)
        VALUES (${s.nom}, ${s.categorie}, ${s.dureeMinutes})
        RETURNING id::text
      `;
      const id = cree[0].id;
      parNom.set(s.nom, id);

      for (let i = 0; i < s.exercices.length; i++) {
        const ex = s.exercices[i];
        await db.$executeRaw`
          INSERT INTO seance_template_exercises
            (seance_template_id, exercise_name, sets, reps, rest_seconds, order_index, notes)
          VALUES (${id}::uuid, ${ex.nom}, ${ex.series}, ${ex.reps}, ${ex.repos}, ${i}, ${ex.note ?? null})
        `;
      }
    }

    for (const p of PROGRAMMES_TYPES) {
      const cree = await db.$queryRaw<{ id: string }[]>`
        INSERT INTO program_templates (name, description, category, weeks_duration)
        VALUES (${p.nom}, ${p.description}, 'Coaching', ${p.semaines})
        RETURNING id::text
      `;
      const programmeId = cree[0].id;

      for (let i = 0; i < p.seances.length; i++) {
        const nomSeance = p.seances[i];
        const source = resolues.find((s) => s.nom === nomSeance);
        if (!source) {
          problemes.push(`Programme « ${p.nom} » : séance « ${nomSeance} » introuvable`);
          continue;
        }

        const seance = await db.$queryRaw<{ id: string }[]>`
          INSERT INTO session_templates
            (program_template_id, name, order_index, duration_minutes)
          VALUES (${programmeId}::uuid, ${source.nom}, ${i}, ${source.dureeMinutes})
          RETURNING id::text
        `;

        for (let j = 0; j < source.exercices.length; j++) {
          const ex = source.exercices[j];
          await db.$executeRaw`
            INSERT INTO exercise_templates
              (session_template_id, exercise_name, sets, reps, rest_seconds, order_index, notes)
            VALUES (${seance[0].id}::uuid, ${ex.nom}, ${ex.series}, ${ex.reps}, ${ex.repos}, ${j}, ${ex.note ?? null})
          `;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      séancesCréées: resolues.length,
      programmesCréés: PROGRAMMES_TYPES.length,
      exercicesRefusés: problemes.length ? problemes : "aucun",
      détail: rapport,
    });
  } catch (err) {
    console.error("[seed/templates-v2]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
