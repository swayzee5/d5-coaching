export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";

const MUSCLE_LABELS: Record<string, string> = {
  pecs: "Pectoraux",
  dos: "Dos & Biceps",
  jambes: "Jambes & Fessiers",
};

type SessionWithCount = {
  id: string;
  name: string;
  muscleGroup: string;
  location: string;
  description: string | null;
  durationMinutes: number | null;
  _count: { exercises: number };
};

export default async function RebootSessionsPage() {
  let sessions: SessionWithCount[] = [];
  let error = "";

  try {
    sessions = await db.rebootSession.findMany({
      orderBy: { orderIndex: "asc" },
      include: { _count: { select: { exercises: true } } },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const groups: Record<string, SessionWithCount[]> = {};
  for (const s of sessions) {
    if (!groups[s.muscleGroup]) groups[s.muscleGroup] = [];
    groups[s.muscleGroup].push(s);
  }

  const muscleOrder = ["pecs", "dos", "jambes"];

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Séances Reboot 40</h1>
          <p className="text-gray-400 text-sm mt-1">
            6 séances template — Salle &amp; Maison par groupe musculaire
          </p>
        </div>
        <Link href="/reboot-sessions/sql" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
          Migration SQL →
        </Link>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-sm text-red-300">
          <strong>Erreur DB :</strong> {error}
          <br />
          <span className="text-red-400/70 text-xs mt-1 block">
            <Link href="/reboot-sessions/sql" className="text-amber-400 underline">Exécutez la migration SQL</Link>
          </span>
        </div>
      )}

      {muscleOrder.map((muscle) => {
        const list = groups[muscle];
        if (!list?.length) return null;
        return (
          <div key={muscle}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {MUSCLE_LABELS[muscle] ?? muscle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((session) => (
                <Link key={session.id} href={`/reboot-sessions/${session.id}`}
                  className="bg-gray-900 border border-gray-800 hover:border-brand-500/40 rounded-xl p-5 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                      session.location === "salle" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"
                    }`}>
                      {session.location}
                    </span>
                    <span className="text-xs text-gray-600 group-hover:text-gray-400">{session._count.exercises} ex.</span>
                  </div>
                  <p className="text-white font-semibold">{session.name}</p>
                  {session.description && <p className="text-gray-400 text-xs mt-1">{session.description}</p>}
                  {session.durationMinutes && <p className="text-gray-600 text-xs mt-2">⏱ {session.durationMinutes} min</p>}
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {!error && sessions.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🏋️</p>
          <p className="font-medium text-gray-400">Aucune séance trouvée</p>
          <p className="text-sm mt-1">Créez les tables via <Link href="/reboot-sessions/sql" className="text-amber-400 underline">Migration SQL</Link></p>
        </div>
      )}
    </div>
  );
}
