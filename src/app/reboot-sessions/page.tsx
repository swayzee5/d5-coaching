export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Séances Reboot" };

const ONGLETS: { cle: string; titre: string }[] = [
  { cle: "salle", titre: "En salle" },
  { cle: "maison", titre: "À la maison" },
  { cle: "mobilite", titre: "Échauffements & étirements" },
  { cle: "hiit", titre: "HIIT" },
];

/**
 * Les séances du Reboot, groupées comme dans l'app.
 *
 * Même découpage que ce que voit le participant : sans ça, on corrige une
 * séance en croyant savoir où elle apparaît, et on se trompe d'onglet.
 */
export default async function RebootSessionsPage() {
  let sessions: {
    id: string;
    name: string;
    tab: string;
    isActive: boolean;
    manuallyEdited: boolean;
    durationMinutes: number | null;
    _count: { exercises: number };
  }[] = [];
  let erreur = "";

  try {
    sessions = await db.rebootSession.findMany({
      orderBy: { orderIndex: "asc" },
      include: { _count: { select: { exercises: true } } },
    });
  } catch (e) {
    erreur = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Séances Reboot 40</h1>
        <p className="mt-1 text-sm text-gray-400">
          Modifie les exercices, leur ordre et leurs séries. Une séance que tu
          touches n&apos;est plus reconstruite automatiquement.
        </p>
      </div>

      {erreur && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-400">
          {erreur}
        </p>
      )}

      {ONGLETS.map(({ cle, titre }) => {
        const duGroupe = sessions.filter((s) => (s.tab ?? "salle") === cle);
        if (duGroupe.length === 0) return null;
        return (
          <div key={cle} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {titre}
            </h2>
            {duGroupe.map((s) => (
              <Link
                key={s.id}
                href={`/reboot-sessions/${s.id}`}
                className={`flex items-center gap-3 rounded-xl border bg-gray-900 px-4 py-3 transition-colors hover:border-brand-500/40 ${
                  s.isActive ? "border-gray-800" : "border-gray-800 opacity-50"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{s.name}</span>
                  <span className="block text-xs text-gray-500">
                    {s._count.exercises} exercice{s._count.exercises > 1 ? "s" : ""}
                    {s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}
                    {!s.isActive ? " · masquée" : ""}
                  </span>
                </span>
                {s.manuallyEdited && (
                  <span className="shrink-0 text-xs text-brand-400">modifiée</span>
                )}
                {s._count.exercises < 4 && !s.isActive && (
                  <span className="shrink-0 text-xs text-orange-400">incomplète</span>
                )}
                <span className="shrink-0 text-gray-600">→</span>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
