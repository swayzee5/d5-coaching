export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NutritionUpload } from "@/components/app-clients/NutritionUpload";
import { createProgram } from "./programmes/actions";
import { archiveClient, unarchiveClient, blockClient, unblockClient } from "./actions";
import { DeleteClientButton } from "@/components/app-clients/DeleteClientButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fiche client — D5 CRM" };

function fmt(val: unknown, unit: string): string {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return "—";
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} ${unit}`;
}

function formatShort(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

async function getClient(id: string) {
  return db.appClient.findUnique({
    where: { id },
    include: {
      progressEntries: {
        orderBy: { entryDate: "desc" },
        take: 30,
      },
      nutritionFiles: {
        where: { isActive: true },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });
}

export default async function AppClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [client, programs] = await Promise.all([
    getClient(params.id),
    db.trainingProgram.findMany({
      where: { clientId: params.id },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { sessions: true } },
      },
    }),
  ]);

  if (!client) notFound();

  const latest = client.progressEntries[0] ?? null;
  const prevWeight = client.progressEntries.find(
    (e, i) => i > 0 && e.weightKg !== null
  );
  const weightDelta =
    latest?.weightKg && prevWeight?.weightKg
      ? Number(latest.weightKg) - Number(prevWeight.weightKg)
      : null;

  const serializedFiles = client.nutritionFiles.map((f) => ({
    id: f.id,
    name: f.name,
    fileUrl: f.fileUrl,
    fileName: f.fileName,
    fileSize: f.fileSize,
    uploadedAt: f.uploadedAt.toISOString(),
  }));

  const createProgramAction = createProgram.bind(null, client.id);
  const archiveAction = archiveClient.bind(null, client.id);
  const unarchiveAction = unarchiveClient.bind(null, client.id);
  const blockAction = blockClient.bind(null, client.id);
  const unblockAction = unblockClient.bind(null, client.id);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href="/app-clients"
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← App Clients
        </Link>
        <div className="flex items-start justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
              <span className="text-base font-black text-brand-400">
                {client.firstName[0]}{client.lastName[0]}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {client.firstName} {client.lastName}
              </h1>
              <p className="text-gray-400 text-sm">{client.email}</p>
              <div className="flex gap-2 mt-2">
                {client.isRebootOnly && (
                  <span className="px-3 py-1 bg-brand-500/10 text-brand-400 text-xs font-semibold rounded-full">
                    Reboot only
                  </span>
                )}
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    client.isActive
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {client.isActive ? "Actif" : "Inactif"}
                </span>
                {client.isBlocked && (
                  <span className="px-3 py-1 bg-orange-500/10 text-orange-400 text-xs font-semibold rounded-full">
                    Bloqué
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            <form action={client.isActive ? archiveAction : unarchiveAction}>
              <button
                type="submit"
                className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors ${
                  client.isActive
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-green-700 hover:bg-green-600"
                }`}
              >
                {client.isActive ? "Archiver" : "Réactiver"}
              </button>
            </form>
            <form action={client.isBlocked ? unblockAction : blockAction}>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors"
              >
                {client.isBlocked ? "Débloquer" : "Bloquer l'accès"}
              </button>
            </form>
            <DeleteClientButton
              clientId={client.id}
              clientName={`${client.firstName} ${client.lastName}`}
            />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Poids actuel</p>
          <p className="text-2xl font-black text-white mt-1">
            {fmt(latest?.weightKg, "kg")}
          </p>
          {weightDelta !== null && (
            <p
              className={`text-xs font-semibold mt-1 ${
                weightDelta < 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(1)} kg
            </p>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Tour de taille</p>
          <p className="text-2xl font-black text-white mt-1">
            {fmt(latest?.waistCm, "cm")}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Mesures</p>
          <p className="text-2xl font-black text-white mt-1">
            {client.progressEntries.length}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Dernière entrée</p>
          <p className="text-sm font-bold text-white mt-1">
            {latest ? formatShort(latest.entryDate) : "—"}
          </p>
        </div>
      </div>

      {/* Objectifs */}
      {client.objectives && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Objectifs</p>
          <p className="text-gray-300 text-sm">{client.objectives}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Historique mesures */}
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Historique des mesures</h2>
          {client.progressEntries.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">
              Aucune mesure enregistrée par le client
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {["Date", "Poids", "Taille", "Poitrine", "Hanches", "Bras"].map((h) => (
                      <th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {client.progressEntries.map((entry, i) => {
                    const prev = client.progressEntries[i + 1];
                    const delta =
                      entry.weightKg && prev?.weightKg
                        ? Number(entry.weightKg) - Number(prev.weightKg)
                        : null;
                    return (
                      <tr key={entry.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 pr-4 text-gray-300 whitespace-nowrap">
                          {formatShort(entry.entryDate)}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-white">
                          {fmt(entry.weightKg, "kg")}
                          {delta !== null && (
                            <span
                              className={`ml-1.5 text-xs ${
                                delta < 0 ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              ({delta > 0 ? "+" : ""}{delta.toFixed(1)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-gray-400">{fmt(entry.waistCm, "cm")}</td>
                        <td className="py-3 pr-4 text-gray-400">{fmt(entry.chestCm, "cm")}</td>
                        <td className="py-3 pr-4 text-gray-400">{fmt(entry.hipsCm, "cm")}</td>
                        <td className="py-3 text-gray-400">{fmt(entry.armsCm, "cm")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Nutrition */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Plans nutrition</h2>
          <NutritionUpload clientId={client.id} files={serializedFiles} />
        </div>
      </div>

      {/* Programmes d'entraînement */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">Programmes d&apos;entraînement</h2>

        {programs.length > 0 && (
          <div className="space-y-2 mb-5">
            {programs.map((prog) => (
              <Link
                key={prog.id}
                href={`/app-clients/${client.id}/programmes/${prog.id}`}
                className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-white">{prog.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {prog._count.sessions} séance{prog._count.sessions !== 1 ? "s" : ""}
                    {prog.weeksDuration ? ` · ${prog.weeksDuration} semaines` : ""}
                  </p>
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
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Créer un programme */}
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 border-dashed rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Créer un nouveau programme
            </div>
          </summary>
          <form action={createProgramAction} className="mt-3 space-y-3 p-4 bg-gray-800/30 rounded-lg border border-gray-800">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nom du programme *</label>
              <input
                name="name"
                required
                placeholder="ex: Programme Force — 8 semaines"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Durée (semaines)</label>
                <input
                  type="number"
                  name="weeksDuration"
                  min={1}
                  max={52}
                  placeholder="ex: 8"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Date de début</label>
                <input
                  type="date"
                  name="startDate"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Créer le programme
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
