export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

async function getClients() {
  return db.coachingClient.findMany({
    where: { isActive: true },
    include: { prospect: true },
    orderBy: { contractStart: "desc" },
  });
}

export default async function ClientsPage() {
  const clients = await getClients();
  const revenue = clients.length * 3000;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients actifs</h1>
          <p className="text-gray-400 text-sm mt-1">
            {clients.length} / 15 clients · {revenue.toLocaleString("fr-FR")} € CA
          </p>
        </div>
      </div>

      {/* Barre de capacité */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="font-medium text-white">Capacité</span>
          <span className="text-gray-400">
            {clients.length} / 15 places ({Math.round((clients.length / 15) * 100)}% plein)
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div
            className={`rounded-full h-3 transition-all ${
              clients.length >= 13
                ? "bg-red-500"
                : clients.length >= 10
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{ width: `${(clients.length / 15) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">0</span>
          <span className="text-xs text-gray-500">15 max</span>
        </div>
      </div>

      {/* Liste clients */}
      {clients.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">✅</p>
          <p>Aucun client en accompagnement</p>
          <p className="text-sm mt-2">
            Les prospects qualifiés lors des appels de sélection apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const totalDays =
              (client.contractEnd.getTime() - client.contractStart.getTime()) /
              (1000 * 60 * 60 * 24);
            const elapsed =
              (new Date().getTime() - client.contractStart.getTime()) /
              (1000 * 60 * 60 * 24);
            const progress = Math.min(
              100,
              Math.max(0, Math.round((elapsed / totalDays) * 100))
            );

            return (
              <Link
                key={client.id}
                href={`/prospects/${client.prospectId}`}
                className="block bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <span className="text-sm font-semibold text-green-400">
                        {client.prospect.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {client.prospect.name}
                      </p>
                      <p className="text-sm text-gray-400">
                        {formatDate(client.contractStart)} →{" "}
                        {formatDate(client.contractEnd)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400">
                      {client.priceEur.toLocaleString("fr-FR")} €
                    </p>
                    <p className="text-xs text-gray-500">6 mois</p>
                  </div>
                </div>

                {/* Barre progression contrat */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Progression contrat</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-green-500 rounded-full h-1.5"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {client.objectives && (
                  <p className="mt-3 text-sm text-gray-400">
                    <span className="text-gray-500">Objectifs :</span>{" "}
                    {client.objectives}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
