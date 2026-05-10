export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Activités — D5 CRM" };

export default async function ActivitesPage() {
  const completions = await db.sessionCompletion.findMany({
    orderBy: { completedAt: "desc" },
    take: 100,
    include: {
      session: {
        include: {
          program: {
            include: {
              client: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
      setResults: { select: { id: true, completed: true } },
    },
  });

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Activités</h1>
        <p className="text-gray-400 text-sm mt-0.5">Dernières séances réalisées par vos clients</p>
      </div>

      {completions.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Aucune activité pour l’instant</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completions.map((completion) => {
            const client = completion.session.program.client;
            const completedSets = completion.setResults.filter((s) => s.completed).length;
            const totalSets = completion.setResults.length;

            return (
              <Link
                key={completion.id}
                href={`/app-clients/${client.id}/programmes/${completion.session.program.id}/seances/${completion.session.id}/resultats`}
                className="flex items-center gap-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-4 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                  <span className="text-brand-400 font-bold text-sm">
                    {client.firstName[0]}{client.lastName[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">
                      {client.firstName} {client.lastName}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        completion.initiatedBy === "coach"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-green-500/10 text-green-400"
                      }`}
                    >
                      {completion.initiatedBy === "coach" ? "Coach" : "Client"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{completion.session.name}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{completion.session.program.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">
                    {totalSets > 0 ? `${completedSets}/${totalSets} séries` : "–"}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(completion.completedAt))}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
