import { db } from "@/lib/db";

/**
 * Les photos de progression d'un client, vues par le coach.
 *
 * Présentées par angle, la première et la dernière côte à côte. C'est la seule
 * disposition qui montre quelque chose : entre deux clichés consécutifs pris à
 * un mois d'intervalle, on ne voit rien ; entre le premier et le dernier, on
 * voit tout.
 *
 * Rien n'est affiché tant qu'il n'y a pas de photo — un bloc vide sur une
 * fiche client n'apprend rien et occupe de la place sur un écran déjà dense.
 */

type Ligne = { id: string; photo_type: string; jour: string };

const LABELS: Record<string, string> = {
  front: "De face",
  side: "De profil",
  back: "De dos",
};

const ORDRE = ["front", "side", "back"];

export async function PhotosProgressionClient({ clientId }: { clientId: string }) {
  const lignes = await db
    .$queryRaw<Ligne[]>`
      SELECT pp.id::text AS id, pp.photo_type,
             to_char(pe.entry_date, 'YYYY-MM-DD') AS jour
        FROM progress_photos pp
        JOIN progress_entries pe ON pe.id = pp.progress_entry_id
       WHERE pe.client_id = ${clientId}::uuid AND pp.photo_path IS NOT NULL
       ORDER BY pe.entry_date ASC
    `
    .catch(() => [] as Ligne[]);

  if (lignes.length === 0) return null;

  const parAngle = ORDRE.map((angle) => {
    const duType = lignes.filter((l) => l.photo_type === angle);
    if (duType.length === 0) return null;
    return {
      angle,
      label: LABELS[angle] ?? angle,
      premiere: duType[0],
      derniere: duType.length > 1 ? duType[duType.length - 1] : null,
    };
  }).filter(Boolean) as {
    angle: string;
    label: string;
    premiere: Ligne;
    derniere: Ligne | null;
  }[];

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
          📸 Photos de progression
        </h2>
        <span className="text-xs text-gray-600">{lignes.length} au total</span>
      </div>

      <div className="space-y-4">
        {parAngle.map((a) => (
          <div key={a.angle} className="space-y-2">
            <p className="text-xs font-medium text-gray-400">{a.label}</p>
            <div className="grid grid-cols-2 gap-2">
              <Cliche ligne={a.premiere} legende="Au départ" />
              {a.derniere ? (
                <Cliche ligne={a.derniere} legende="Dernière" />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-gray-800 text-center text-xs text-gray-600">
                  Pas encore de seconde photo
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        Privées. Aucune utilisation publique sans l&apos;accord explicite du client, demandé
        au moment de la publication.
      </p>
    </div>
  );
}

function Cliche({ ligne, legende }: { ligne: Ligne; legende: string }) {
  return (
    <figure className="space-y-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/progression/photo/${ligne.id}`}
        alt={legende}
        loading="lazy"
        className="aspect-[3/4] w-full rounded-lg bg-black object-contain"
      />
      <figcaption className="text-center text-[11px] text-gray-500">
        {legende} · {new Date(ligne.jour).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" })}
      </figcaption>
    </figure>
  );
}
