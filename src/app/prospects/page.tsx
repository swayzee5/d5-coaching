import { db } from "@/lib/db";
import { formatDate, statusLabel, statusColor, ProspectStatus } from "@/lib/utils";
import Link from "next/link";

const ALL_STATUSES: ProspectStatus[] = [
  "LEAD",
  "ONBOARDING",
  "CHALLENGE",
  "CALL_SCHEDULED",
  "CLIENT",
  "DECLINED",
  "GHOST",
];

async function getProspects(status?: ProspectStatus) {
  return db.prospect.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      summaries: { orderBy: { createdAt: "desc" }, take: 1 },
      challengeParticipants: { include: { group: true } },
    },
  });
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const statusFilter = ALL_STATUSES.includes(
    searchParams.status as ProspectStatus
  )
    ? (searchParams.status as ProspectStatus)
    : undefined;

  const prospects = await getProspects(statusFilter);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Prospects</h1>
          <p className="text-gray-400 text-sm mt-1">
            {prospects.length} prospect{prospects.length > 1 ? "s" : ""}
            {statusFilter ? ` · ${statusLabel(statusFilter)}` : ""}
          </p>
        </div>
        <Link
          href="/prospects/new"
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nouveau prospect
        </Link>
      </div>

      {/* Filtres par statut */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/prospects"
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            !statusFilter
              ? "bg-white/10 text-white border-white/20"
              : "text-gray-400 border-gray-700 hover:border-gray-500"
          }`}
        >
          Tous
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/prospects?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s
                ? statusColor(s)
                : "text-gray-400 border-gray-700 hover:border-gray-500"
            }`}
          >
            {statusLabel(s)}
          </Link>
        ))}
      </div>

      {/* Liste */}
      {prospects.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">👤</p>
          <p>Aucun prospect dans cette catégorie</p>
          <Link
            href="/prospects/new"
            className="mt-4 inline-block text-brand-400 hover:text-brand-300 text-sm"
          >
            Ajouter le premier →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {prospects.map((p) => (
            <Link
              key={p.id}
              href={`/prospects/${p.id}`}
              className="block bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-gray-300">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{p.name}</p>
                      {p.age && (
                        <span className="text-xs text-gray-500">{p.age} ans</span>
                      )}
                      {p.summaries.length > 0 && (
                        <span className="text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-1.5 py-0.5 rounded">
                          ✦ IA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-sm text-gray-500">{p.phone}</p>
                      {p.challengeParticipants.length > 0 && (
                        <p className="text-xs text-purple-400">
                          ⚡ {p.challengeParticipants[0].group.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <p className="text-xs text-gray-500 hidden sm:block">
                    {formatDate(p.createdAt)}
                  </p>
                  <span
                    className={`text-xs px-3 py-1 rounded-full border ${statusColor(p.status)}`}
                  >
                    {statusLabel(p.status)}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
