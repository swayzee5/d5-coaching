export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";
import { markAllCheckinsRead, markCheckinRead } from "../dashboard/actions";

export const metadata: Metadata = { title: "Check-ins — D5 CRM" };

type CheckinRow = {
  id: string;
  energy: number;
  sleep: number;
  stress: number;
  weight: string | number | null;
  note: string | null;
  is_read: boolean;
  submitted_at: Date;
  client_id: string;
  first_name: string;
  last_name: string;
};

// Un catch silencieux ferait passer une table manquante pour une absence de
// check-in. On distingue les deux.
type Result = { ok: true; rows: CheckinRow[] } | { ok: false; message: string };

async function getCheckins(): Promise<Result> {
  try {
    const rows = (await db.$queryRaw`
      SELECT
        wc.id, wc.energy, wc.sleep, wc.stress, wc.weight, wc.note,
        wc.is_read, wc.submitted_at,
        c.id AS client_id, c.first_name, c.last_name
      FROM weekly_checkins wc
      JOIN clients c ON c.id = wc.client_id
      ORDER BY wc.submitted_at DESC
      LIMIT 200
    `) as CheckinRow[];
    return { ok: true, rows };
  } catch (err) {
    console.error("[checkins] requête en échec", err);
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

// Énergie et sommeil : plus c'est haut, mieux c'est. Stress : l'inverse.
function Stat({
  label,
  value,
  higherIsBetter,
}: {
  label: string;
  value: number;
  higherIsBetter: boolean;
}) {
  const good = higherIsBetter ? value >= 4 : value <= 2;
  const bad = higherIsBetter ? value <= 2 : value >= 4;
  const tone = good
    ? "bg-green-500/10 text-green-400 border-green-500/20"
    : bad
    ? "bg-red-500/10 text-red-400 border-red-500/20"
    : "bg-gray-800 text-gray-300 border-gray-700";
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${tone}`}>
      {label} {value}/5
    </span>
  );
}

export default async function CheckinsPage() {
  const result = await getCheckins();
  const checkins = result.ok ? result.rows : [];
  const unread = checkins.filter((c) => !c.is_read).length;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Dashboard
        </Link>
        <div className="flex items-end justify-between gap-4 mt-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Check-ins clients</h1>
            <p className="text-gray-400 text-sm mt-1">
              {checkins.length} check-in{checkins.length !== 1 ? "s" : ""}
              {unread > 0 ? ` · ${unread} non lu${unread !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
          {unread > 0 && (
            <form action={markAllCheckinsRead}>
              <button
                type="submit"
                className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded-lg px-3 py-2 hover:bg-purple-500/10 transition-colors"
              >
                Tout marquer lu
              </button>
            </form>
          )}
        </div>
      </div>

      {!result.ok ? (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-5 py-6">
          <p className="text-red-400 text-sm font-medium">Impossible de charger les check-ins</p>
          <p className="text-gray-400 text-xs mt-1.5">
            Ce n&apos;est pas une absence de check-in : la requête a échoué. La table
            weekly_checkins est créée par l&apos;app client au premier envoi.
          </p>
          <p className="text-gray-500 text-xs mt-2 font-mono break-words">{result.message}</p>
        </div>
      ) : checkins.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Aucun check-in pour l&apos;instant</p>
          <p className="text-gray-600 text-xs mt-1">
            Vos clients les envoient depuis le bouton « Check-in semaine » de l&apos;app
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {checkins.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl px-5 py-4 border space-y-3 ${
                c.is_read
                  ? "bg-gray-900 border-gray-800"
                  : "bg-purple-500/5 border-purple-500/25"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                    <span className="text-brand-400 font-bold text-sm">
                      {c.first_name[0]}
                      {c.last_name[0]}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/app-clients/${c.client_id}`}
                      className="text-white font-semibold text-sm hover:text-brand-400 transition-colors"
                    >
                      {c.first_name} {c.last_name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {new Date(c.submitted_at).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                {!c.is_read && (
                  <form action={markCheckinRead.bind(null, c.id)}>
                    <button
                      type="submit"
                      className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded-lg px-2.5 py-1 hover:bg-purple-500/10 transition-colors"
                    >
                      Marquer lu
                    </button>
                  </form>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Stat label="Énergie" value={c.energy} higherIsBetter />
                <Stat label="Sommeil" value={c.sleep} higherIsBetter />
                <Stat label="Stress" value={c.stress} higherIsBetter={false} />
                {c.weight != null && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                    {Number(c.weight)} kg
                  </span>
                )}
              </div>

              {c.note && (
                <div className="bg-orange-500/5 border border-orange-500/15 rounded-lg px-3 py-2">
                  <p className="text-xs text-orange-400 font-medium mb-0.5">Note au coach</p>
                  <p className="text-sm text-gray-300 italic">&ldquo;{c.note}&rdquo;</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
