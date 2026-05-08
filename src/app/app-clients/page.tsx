export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

async function getAppClients() {
  return db.appClient.findMany({
    include: {
      progressEntries: {
        orderBy: { entryDate: "desc" },
        take: 1,
      },
      nutritionFiles: {
        where: { isActive: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function AppClientsPage() {
  let clients;
  let errorMsg = "";

  try {
    clients = await getAppClients();
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : String(err);
    clients = [];
  }

  if (errorMsg) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-400 mb-4">Erreur DB</h1>
        <pre className="bg-gray-900 border border-red-700 rounded-xl p-4 text-red-300 text-xs whitespace-pre-wrap break-all">{errorMsg}</pre>
      </div>
    );
  }

  const active = clients.filter((c) => c.isActive);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">App D5 — Clients</h1>
          <p className="text-gray-400 text-sm mt-1">
            {active.length} compte{active.length > 1 ? "s" : ""} actif{active.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/app-clients/nouveau"
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          + Nouveau client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">📱</p>
          <p className="font-medium text-gray-400 text-lg">Aucun compte créé</p>
          <p className="text-sm mt-2 text-gray-600">
            Crée le premier compte pour qu'un client accède à l'app D5.
          </p>
          <Link
            href="/app-clients/nouveau"
            className="inline-block mt-5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Créer un compte
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const latest = client.progressEntries[0] ?? null;
            const hasNutrition = client.nutritionFiles.length > 0;
            return (
              <Link
                key={client.id}
                href={`/app-clients/${client.id}`}
                className="flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-brand-400">
                      {client.firstName[0]}{client.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {client.firstName} {client.lastName}
                    </p>
                    <p className="text-sm text-gray-400">{client.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    {latest?.weightKg ? (
                      <>
                        <p className="text-sm font-bold text-white">
                          {Number(latest.weightKg).toFixed(1)} kg
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDate(latest.entryDate)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-600">Aucune mesure</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        hasNutrition
                          ? "bg-green-500/10 text-green-400"
                          : "bg-gray-800 text-gray-500"
                      }`}
                    >
                      {hasNutrition ? "Nutrition ✓" : "Sans nutrition"}
                    </span>
                    {client.isRebootOnly && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-400">
                        Reboot only
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
