export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDateShort, challengeProgress } from "@/lib/utils";

type GroupStatus = "UPCOMING" | "ACTIVE" | "COMPLETED";
import Link from "next/link";

async function getGroups() {
  return db.challengeGroup.findMany({
    orderBy: { startDate: "desc" },
    include: {
      participants: {
        include: { prospect: { select: { name: true, status: true } } },
      },
    },
  });
}

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: "À venir",
  ACTIVE: "En cours",
  COMPLETED: "Terminé",
};

const STATUS_COLOR: Record<string, string> = {
  UPCOMING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  ACTIVE: "bg-green-500/10 text-green-400 border-green-500/20",
  COMPLETED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export default async function GroupsPage() {
  const groups = await getGroups();

  const active = groups.filter((g) => g.status === "ACTIVE");
  const upcoming = groups.filter((g) => g.status === "UPCOMING");
  const completed = groups.filter((g) => g.status === "COMPLETED");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Groupes Reboot 40+</h1>
          <p className="text-gray-400 text-sm mt-1">
            {active.length} en cours · {upcoming.length} à venir ·{" "}
            {completed.length} terminé{completed.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/groups/new"
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nouveau groupe
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">⚡</p>
          <p>Aucun groupe créé</p>
          <Link
            href="/groups/new"
            className="mt-4 inline-block text-brand-400 hover:text-brand-300 text-sm"
          >
            Créer le premier groupe →
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <GroupSection title="En cours" groups={active} />
          )}
          {upcoming.length > 0 && (
            <GroupSection title="À venir" groups={upcoming} />
          )}
          {completed.length > 0 && (
            <GroupSection title="Terminés" groups={completed} />
          )}
        </>
      )}
    </div>
  );
}

type GroupWithParticipants = Awaited<ReturnType<typeof getGroups>>[0];

function GroupSection({
  title,
  groups,
}: {
  title: string;
  groups: GroupWithParticipants[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => {
          const totalDays = group.participants.reduce(
            (acc, p) => acc + challengeProgress(p),
            0
          );
          const maxDays = group.participants.length * 7;
          const pct = maxDays > 0 ? Math.round((totalDays / maxDays) * 100) : 0;
          const seriousCount = group.participants.filter(
            (p) => p.isSerious
          ).length;

          return (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-white">{group.name}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ml-2 ${STATUS_COLOR[group.status]}`}
                >
                  {STATUS_LABEL[group.status]}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                <span>
                  📅 {formatDateShort(group.startDate)} →{" "}
                  {formatDateShort(group.endDate)}
                </span>
                <span>
                  👥 {group.participants.length}/{group.maxSize}
                </span>
                {seriousCount > 0 && (
                  <span className="text-green-400">🎯 {seriousCount} sérieux</span>
                )}
              </div>

              {group.participants.length > 0 && (
                <>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Complétion globale</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-brand-500 rounded-full h-1.5"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {group.participants.slice(0, 6).map((p) => (
                      <span
                        key={p.id}
                        className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full"
                      >
                        {p.prospect.name.split(" ")[0]}
                      </span>
                    ))}
                    {group.participants.length > 6 && (
                      <span className="text-xs text-gray-500">
                        +{group.participants.length - 6}
                      </span>
                    )}
                  </div>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
