// @ts-nocheck
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NutritionUpload } from "@/components/app-clients/NutritionUpload";
import { createProgram } from "./programmes/actions";
import { archiveClient, unarchiveClient, blockClient, unblockClient, deleteClient } from "./actions";

function fmt(val, unit) {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return "—";
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} ${unit}`;
}

function formatShort(date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(date));
}

export default async function AppClientDetailPage({ params }) {
  let client = null;
  let programs = [];
  let errorMsg = "";

  try {
    client = await db.appClient.findUnique({
      where: { id: params.id },
      include: {
        progressEntries: { orderBy: { entryDate: "desc" }, take: 30 },
        nutritionFiles: { where: { isActive: true }, orderBy: { uploadedAt: "desc" } },
      },
    });
  } catch (err) {
    errorMsg = "CLIENT QUERY: " + (err?.message || String(err));
  }

  if (!errorMsg) {
    try {
      programs = await db.trainingProgram.findMany({
        where: { clientId: params.id },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        include: { _count: { select: { sessions: true } } },
      });
    } catch (err) {
      errorMsg = "PROGRAMS QUERY: " + (err?.message || String(err));
    }
  }

  if (errorMsg) {
    return (
      <div className="p-6">
        <Link href="/app-clients" className="text-gray-500 text-sm">← App Clients</Link>
        <h1 className="text-xl font-bold text-red-400 mt-4 mb-4">Erreur</h1>
        <pre className="bg-gray-900 border border-red-700 rounded-xl p-4 text-red-300 text-xs whitespace-pre-wrap break-all">{errorMsg}</pre>
      </div>
    );
  }

  if (!client) notFound();

  const latest = client.progressEntries[0] ?? null;
  const prevWeight = client.progressEntries.find((e, i) => i > 0 && e.weightKg !== null);
  const weightDelta = latest?.weightKg && prevWeight?.weightKg ? Number(latest.weightKg) - Number(prevWeight.weightKg) : null;
  const serializedFiles = client.nutritionFiles.map((f) => ({ id: f.id, name: f.name, fileUrl: f.fileUrl, fileName: f.fileName, fileSize: f.fileSize, uploadedAt: f.uploadedAt.toISOString() }));
  const createProgramAction = createProgram.bind(null, client.id);
  const archiveAction = client.isActive ? archiveClient.bind(null, client.id) : unarchiveClient.bind(null, client.id);
  const blockAction = client.isBlocked ? unblockClient.bind(null, client.id) : blockClient.bind(null, client.id);
  const deleteAction = deleteClient.bind(null, client.id);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <Link href="/app-clients" className="text-gray-500 hover:text-gray-300 text-sm">← App Clients</Link>
        <div className="flex items-start justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
              <span className="text-base font-black text-brand-400">{client.firstName[0]}{client.lastName[0]}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{client.firstName} {client.lastName}</h1>
              <p className="text-gray-400 text-sm">{client.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {client.isBlocked && <span className="px-2.5 py-1 bg-orange-500/10 text-orange-400 text-xs font-semibold rounded-full">Accès bloqué</span>}
            {!client.isActive && <span className="px-2.5 py-1 bg-gray-500/10 text-gray-400 text-xs font-semibold rounded-full">Archivé</span>}
            {client.isActive && !client.isBlocked && <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full">Actif</span>}
          </div>
        </div>
      </div>
      <div className="flex gap-3 flex-wrap p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <form action={archiveAction}>
          <button type="submit" className={`px-5 py-2.5 rounded-lg text-sm font-semibold ${client.isActive ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-green-600 hover:bg-green-500 text-white"}`}>
            {client.isActive ? "📂 Archiver" : "✅ Réactiver"}
          </button>
        </form>
        <form action={blockAction}>
          <button type="submit" className={`px-5 py-2.5 rounded-lg text-sm font-semibold ${client.isBlocked ? "bg-green-600 hover:bg-green-500 text-white" : "bg-orange-600 hover:bg-orange-500 text-white"}`}>
            {client.isBlocked ? "🔓 Débloquer" : "🔒 Bloquer l'accès"}
          </button>
        </form>
        <form action={deleteAction}>
          <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-700 hover:bg-red-600 text-white">
            🗑️ Supprimer
          </button>
        </form>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Poids actuel</p>
          <p className="text-2xl font-black text-white mt-1">{fmt(latest?.weightKg, "kg")}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Tour de taille</p>
          <p className="text-2xl font-black text-white mt-1">{fmt(latest?.waistCm, "cm")}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Mesures</p>
          <p className="text-2xl font-black text-white mt-1">{client.progressEntries.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Dernière entrée</p>
          <p className="text-sm font-bold text-white mt-1">{latest ? formatShort(latest.entryDate) : "—"}</p>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">Plans nutrition</h2>
        <NutritionUpload clientId={client.id} files={serializedFiles} />
      </div>
    </div>
  );
}
