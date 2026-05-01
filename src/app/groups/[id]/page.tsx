import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, challengeProgress } from "@/lib/utils";
import Link from "next/link";
import GroupActions from "@/components/groups/GroupActions";
import ParticipantChecklist from "@/components/groups/ParticipantChecklist";
import GenerateGroupSummaryButton from "@/components/groups/GenerateGroupSummaryButton";

async function getGroup(id: string) {
  return db.challengeGroup.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          prospect: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

async function getAvailableProspects(groupId: string) {
  return db.prospect.findMany({
    where: {
      status: { in: ["LEAD", "ONBOARDING", "CHALLENGE"] },
      challengeParticipants: { none: { groupId } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
  });
}

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: "À venir",
  ACTIVE: "En cours",
  COMPLETED: "Terminé",
};

export default async function GroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [group, available] = await Promise.all([
    getGroup(params.id),
    getAvailableProspects(params.id),
  ]);

  if (!group) notFound();

  const totalDays = group.participants.reduce(
    (acc, p) => acc + challengeProgress(p),
    0
  );
  const maxDays = group.participants.length * 7;
  const pct = maxDays > 0 ? Math.round((totalDays / maxDays) * 100) : 0;
  const seriousParticipants = group.participants.filter((p) => p.isSerious);

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/groups" className="hover:text-gray-300">
          Groupes
        </Link>
        <span>/</span>
        <span className="text-gray-200">{group.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{group.name}</h1>
            <span
              className={`text-xs px-2 py-1 rounded-full border ${
                group.status === "ACTIVE"
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : group.status === "UPCOMING"
                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/20"
              }`}
            >
              {STATUS_LABEL[group.status]}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {formatDate(group.startDate)} → {formatDate(group.endDate)} ·{" "}
            {group.participants.length}/{group.maxSize} participants
          </p>
        </div>
        <GroupActions group={group} available={available} />
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MiniStat label="Participants" value={`${group.participants.length}/${group.maxSize}`} />
        <MiniStat label="Complétion" value={`${pct}%`} accent />
        <MiniStat
          label="Sérieux"
          value={seriousParticipants.length}
          note="→ appel"
        />
        <MiniStat
          label="Avg engagement"
          value={
            group.participants.filter((p) => p.engagementScore != null).length > 0
              ? `${(
                  group.participants
                    .filter((p) => p.engagementScore != null)
                    .reduce((a, p) => a + (p.engagementScore ?? 0), 0) /
                  group.participants.filter((p) => p.engagementScore != null).length
                ).toFixed(1)}/10`
              : "—"
          }
        />
      </div>

      {/* Barre de progression */}
      {group.participants.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="font-medium text-white">Progression du groupe</span>
            <span className="text-gray-400">{totalDays} / {maxDays} séances complétées</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-brand-600 to-brand-400 rounded-full h-3 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Profils sérieux en avant */}
      {seriousParticipants.length > 0 && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-green-400 mb-3">
            🎯 Profils à contacter pour un appel de sélection
          </h3>
          <div className="flex flex-wrap gap-2">
            {seriousParticipants.map((p) => (
              <Link
                key={p.id}
                href={`/prospects/${p.prospectId}`}
                className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg px-3 py-2 transition-colors"
              >
                <span className="text-sm font-medium text-white">
                  {p.prospect.name}
                </span>
                <span className="text-xs text-green-400">
                  {challengeProgress(p)}/7j
                  {p.engagementScore ? ` · ${p.engagementScore}/10` : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Checklist participants */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Checklist participants</h3>
          <span className="text-sm text-gray-400">
            Jours J1 → J7
          </span>
        </div>

        {group.participants.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>Aucun participant dans ce groupe</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {group.participants.map((p) => (
              <ParticipantChecklist key={p.id} participant={p} />
            ))}
          </div>
        )}
      </div>

      {/* Rapport IA semaine */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">✦ Rapport IA de la semaine</h3>
          <GenerateGroupSummaryButton groupId={group.id} />
        </div>
        {group.coachNotes ? (
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {group.coachNotes}
          </p>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Génère un rapport pour identifier les profils sérieux et planifier les DM
          </p>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string | number;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-brand-400" : "text-white"}`}>
        {value}
      </p>
      {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
    </div>
  );
}
