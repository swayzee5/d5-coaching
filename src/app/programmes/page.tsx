export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Programmes — D5 CRM" };

export default async function ProgrammesPage() {
  const templates = await db.trainingProgram.findMany({
    where: { isTemplate: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sessions: true } } },
  });

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Bibliothèque de programmes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Créez des templates réutilisables et assignez-les à vos clients en un clic.
          </p>
        </div>
        <Link
          href="/programmes/new"
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Nouveau template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl py-20 text-center space-y-3">
          <p className="text-gray-500 text-sm">Aucun template pour l&apos;instant</p>
          <Link
            href="/programmes/new"
            className="inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
          >
            Créer mon premier template
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((prog) => (
            <div
              key={prog.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{prog.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {prog._count.sessions} séance{prog._count.sessions !== 1 ? "s" : ""}
                  {prog.weeksDuration ? ` · ${prog.weeksDuration} semaines` : ""}
                  {prog.description ? ` · ${prog.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/programmes/${prog.id}`}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Éditer
                </Link>
                <Link
                  href={`/programmes/${prog.id}/attribuer`}
                  className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg text-xs font-medium transition-colors border border-brand-500/20"
                >
                  Attribuer →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
