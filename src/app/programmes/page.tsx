export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Programmes — D5 CRM" };

export default async function ProgrammesPage() {
  const programs = await db.trainingProgram.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { sessions: true } },
    },
  });

  const active = programs.filter((p) => p.isActive);
  const inactive = programs.filter((p) => !p.isActive);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Programmes</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {programs.length} programme{programs.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Link
          href="/app-clients"
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Nouveau programme
        </Link>
      </div>

      {programs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Aucun programme créé</p>
          <p className="text-gray-600 text-xs mt-1">Allez sur la fiche d’un client pour créer son programme</p>
          <Link
            href="/app-clients"
            className="mt-4 inline-block text-brand-400 hover:text-brand-300 text-sm"
          >
            Voir les clients →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Actifs ({active.length})</h2>
              {active.map((prog) => (
                <ProgramCard key={prog.id} prog={prog} />
              ))}
            </div>
          )}
          {inactive.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600">Inactifs ({inactive.length})</h2>
              {inactive.map((prog) => (
                <ProgramCard key={prog.id} prog={prog} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgramCard({
  prog,
}: {
  prog: {
    id: string;
    clientId: string;
    name: string;
    isActive: boolean;
    weeksDuration: number | null;
    _count: { sessions: number };
    client: { id: string; firstName: string; lastName: string };
  };
}) {
  return (
    <Link
      href={`/app-clients/${prog.clientId}/programmes/${prog.id}`}
      className="flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-4 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
          <span className="text-brand-400 font-bold text-sm">
            {prog.client.firstName[0]}{prog.client.lastName[0]}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-white">{prog.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {prog.client.firstName} {prog.client.lastName}
            {" · "}{prog._count.sessions} séance{prog._count.sessions !== 1 ? "s" : ""}
            {prog.weeksDuration ? ` · ${prog.weeksDuration} sem.` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-0.5 text-xs rounded-full ${
            prog.isActive
              ? "bg-green-500/10 text-green-400"
              : "bg-gray-700/50 text-gray-500"
          }`}
        >
          {prog.isActive ? "Actif" : "Inactif"}
        </span>
        <svg
          className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
