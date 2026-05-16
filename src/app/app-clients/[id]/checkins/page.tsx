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

  await db.$executeRaw`
    UPDATE weekly_checkins
    SET is_read = true
    WHERE client_id = ${id} AND is_read = false
  `.catch(() => {});

  const client = await db.appClient
    .findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true },
    })
    .catch(() => null);

  const checkins = await db.$queryRaw<Checkin[]>`
    SELECT id, client_id, energy, sleep, stress, weight, note, submitted_at
    FROM weekly_checkins
    WHERE client_id = ${id}
    ORDER BY submitted_at DESC
  `.catch(() => [] as Checkin[]);

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
        <h1 className="text-xl font-bold text-white">Check-ins hebdomadaires</h1>
      </div>

      {checkins.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500">Aucun check-in reçu pour l&apos;instant.</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
