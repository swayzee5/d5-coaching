export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";

type Checkin = {
  id: string;
  client_id: string;
  energy: number;
  sleep: number;
  stress: number;
  weight: number | null;
  note: string | null;
  submitted_at: Date;
};

/**
 * Le mini-point de mi-challenge.
 *
 * Posé au troisième jour, une seule fois, et il ne s'affichait nulle part :
 * le tableau de bord renvoyait vers cette page, qui ne montrait que les
 * check-ins hebdomadaires. C'est pourtant le seul moment où un participant
 * dit ce qui le bloque pendant qu'il est encore temps d'agir.
 */
type MiniPoint = {
  seance_faite: boolean | null;
  frein: string | null;
  besoin_aide: string | null;
  submitted_at: Date;
};

const ENERGY_EMOJIS = ["😴", "😪", "🙂", "😊", "💪"];
const SLEEP_EMOJIS = ["😴", "😪", "🙂", "😊", "⭐"];
const STRESS_EMOJIS = ["😰", "😟", "😐", "🙂", "😌"];

function ScoreDisplay({
  label,
  value,
  emojis,
}: {
  label: string;
  value: number;
  emojis: string[];
}) {
  const emoji = emojis[Math.min(value - 1, 4)];
  const colors = [
    "text-red-400",
    "text-orange-400",
    "text-yellow-400",
    "text-emerald-400",
    "text-green-400",
  ];
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl">{emoji}</p>
      <p className={`text-sm font-bold ${colors[value - 1]}`}>{value}/5</p>
    </div>
  );
}

export default async function ClientCheckinsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS weekly_checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT NOT NULL,
      energy INT NOT NULL,
      sleep INT NOT NULL,
      stress INT NOT NULL,
      weight DECIMAL(5,2),
      note TEXT,
      is_read BOOLEAN DEFAULT false,
      submitted_at TIMESTAMPTZ DEFAULT now()
    )
  `.catch(() => {});

  // La table est créée par l'application cliente avec un `client_id` en
  // UUID ; le CRM, lui, la déclare en TEXT, et c'est celle des deux qui
  // écrit en premier qui gagne. Comparer sans caster fait échouer la
  // requête : le marquage ne passait pas, et un check-in de septembre
  // apparaissait encore comme non lu deux mois plus tard.
  await db.$executeRaw`
    UPDATE weekly_checkins
    SET is_read = true
    WHERE client_id::text = ${id} AND is_read = false
  `.catch(() => {});

  const client = await db.appClient
    .findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true },
    })
    .catch(() => null);

  // Même raison, et même conséquence : la liste revenait vide, donc « aucun
  // check-in reçu » s'affichait sur un client qui en avait envoyé.
  let checkins: Checkin[] = [];
  let panne: string | null = null;
  try {
    checkins = await db.$queryRaw<Checkin[]>`
      SELECT id, client_id, energy, sleep, stress, weight, note, submitted_at
      FROM weekly_checkins
      WHERE client_id::text = ${id}
      ORDER BY submitted_at DESC
    `;
  } catch (err) {
    console.error("[checkins] lecture en échec", err);
    panne = String(err).slice(0, 200);
  }

  // `feeling` porte la réponse à « qu'est-ce qui te freine ? » : le nom de la
  // colonne vient d'une version antérieure du formulaire, et le renommer en
  // base demanderait de toucher à l'application cliente pour rien. On le
  // renomme ici, à l'affichage, là où ça compte.
  const miniPoints = await db.$queryRaw<MiniPoint[]>`
    SELECT seance_faite, feeling AS frein, besoin_aide, submitted_at
      FROM reboot_mid_checkins
     WHERE client_id::text = ${id}
     ORDER BY submitted_at DESC
  `.catch(() => [] as MiniPoint[]);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href={`/app-clients/${id}`}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← {client ? `${client.firstName} ${client.lastName}` : "Client"}
        </Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold text-white">Check-ins</h1>
      </div>

      {/* Le mini-point d'abord : il date du troisième jour du challenge et
          dit ce qui bloque, là où un check-in hebdomadaire raconte une
          semaine déjà passée. */}
      {miniPoints.map((p) => (
        <div
          key={String(p.submitted_at)}
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-amber-400">
              🏆 Mini-point de mi-challenge
            </p>
            <p className="text-xs text-gray-500">
              {new Date(p.submitted_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
              })}
            </p>
          </div>

          {p.seance_faite !== null && (
            <p className="text-sm text-gray-300">
              Première séance :{" "}
              <span className={p.seance_faite ? "text-green-400" : "text-orange-400"}>
                {p.seance_faite ? "faite" : "pas encore faite"}
              </span>
            </p>
          )}

          {p.frein && (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Qu&apos;est-ce qui te freine ?
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-200">{p.frein}</p>
            </div>
          )}

          {p.besoin_aide && (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Tu as besoin de quelque chose de ma part ?
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-200">{p.besoin_aide}</p>
            </div>
          )}

          {!p.frein && !p.besoin_aide && (
            <p className="text-sm text-gray-500">Aucun commentaire laissé.</p>
          )}
        </div>
      ))}

      {panne ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          Les check-ins n&apos;ont pas pu être lus : {panne}
        </div>
      ) : checkins.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-500">
            {miniPoints.length > 0
              ? "Aucun check-in hebdomadaire — seulement le mini-point ci-dessus."
              : "Aucun check-in reçu pour l'instant."}
          </p>
        </div>
      ) : (
        <>
        <p className="text-xs uppercase tracking-wider text-gray-500">
          Check-ins hebdomadaires
        </p>
        <div className="space-y-4">
          {checkins.map((c) => (
            <div
              key={c.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <p className="text-xs text-gray-500 mb-4">
                {new Date(c.submitted_at).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <ScoreDisplay label="Énergie" value={c.energy} emojis={ENERGY_EMOJIS} />
                <ScoreDisplay label="Sommeil" value={c.sleep} emojis={SLEEP_EMOJIS} />
                <ScoreDisplay label="Stress" value={c.stress} emojis={STRESS_EMOJIS} />
              </div>

              {c.weight != null && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-500 text-sm">Poids :</span>
                  <span className="text-white font-medium text-sm">{c.weight} kg</span>
                </div>
              )}

              {c.note && (
                <div className="bg-gray-800 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">Note du client</p>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{c.note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
