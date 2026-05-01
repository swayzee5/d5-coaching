import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import {
  formatDate,
  statusLabel,
  statusColor,
  parseAvailableDays,
  challengeProgress,
} from "@/lib/utils";
import Link from "next/link";
import ProspectActions from "@/components/prospects/ProspectActions";
import GenerateSummaryButton from "@/components/prospects/GenerateSummaryButton";

async function getProspect(id: string) {
  return db.prospect.findUnique({
    where: { id },
    include: {
      summaries: { orderBy: { createdAt: "desc" } },
      challengeParticipants: {
        include: { group: true },
        orderBy: { createdAt: "desc" },
      },
      coachingClient: true,
    },
  });
}

export default async function ProspectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const prospect = await getProspect(params.id);
  if (!prospect) notFound();

  const days = parseAvailableDays(prospect.availableDays);
  const bmi =
    prospect.weight && prospect.height
      ? (prospect.weight / Math.pow(prospect.height / 100, 2)).toFixed(1)
      : null;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/prospects" className="hover:text-gray-300">
          Prospects
        </Link>
        <span>/</span>
        <span className="text-gray-200">{prospect.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-300">
              {prospect.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{prospect.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span
                className={`text-xs px-3 py-1 rounded-full border ${statusColor(prospect.status)}`}
              >
                {statusLabel(prospect.status)}
              </span>
              <span className="text-sm text-gray-500">
                Arrivé le {formatDate(prospect.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <ProspectActions prospect={prospect} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche */}
        <div className="lg:col-span-2 space-y-5">
          {/* Infos de base */}
          <Section title="Informations">
            <InfoGrid
              items={[
                { label: "Téléphone", value: prospect.phone },
                { label: "Email", value: prospect.email },
                { label: "Âge", value: prospect.age ? `${prospect.age} ans` : null },
                {
                  label: "Poids / Taille",
                  value:
                    prospect.weight && prospect.height
                      ? `${prospect.weight}kg / ${prospect.height}cm${bmi ? ` — IMC ${bmi}` : ""}`
                      : null,
                },
                {
                  label: "Jours disponibles",
                  value: days.length > 0 ? days.join(", ") : null,
                },
                {
                  label: "Habitudes alimentaires",
                  value: prospect.nutritionInfo,
                },
                {
                  label: "Photos reçues",
                  value: prospect.photosReceived ? "✅ Oui" : "❌ Non",
                },
                {
                  label: "ManyChat ID",
                  value: prospect.manychatId,
                },
              ]}
            />
          </Section>

          {/* Qualification Facebook */}
          <Section title="Formulaire de qualification">
            <InfoGrid
              items={[
                { label: "Objectif", value: prospect.qualifObjectif },
                { label: "Délai souhaité", value: prospect.qualifDelai },
                { label: "Frein principal", value: prospect.qualifFrein },
                { label: "Expérience sportive", value: prospect.qualifExperience },
                { label: "Disponibilité", value: prospect.qualifDisponible },
                { label: "Santé / blessures", value: prospect.qualifSante },
                { label: "Motivation /10", value: prospect.qualifMotivation },
                { label: "Budget santé", value: prospect.qualifBudget },
              ]}
            />
          </Section>

          {/* Challenges */}
          {prospect.challengeParticipants.length > 0 && (
            <Section title="Participations au challenge">
              <div className="space-y-3">
                {prospect.challengeParticipants.map((part) => {
                  const done = challengeProgress(part);
                  return (
                    <div
                      key={part.id}
                      className="bg-gray-800 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/groups/${part.groupId}`}
                          className="font-medium text-white hover:text-brand-400"
                        >
                          {part.group.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          {part.isSerious && (
                            <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                              Profil sérieux
                            </span>
                          )}
                          <span className="text-sm text-gray-400">
                            {done}/7 jours
                          </span>
                        </div>
                      </div>
                      {/* Checklist jours */}
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                          const key = `day${d}Done` as keyof typeof part;
                          const completed = part[key] as boolean;
                          return (
                            <div
                              key={d}
                              className={`flex-1 h-2 rounded-full ${completed ? "bg-brand-500" : "bg-gray-700"}`}
                              title={`Jour ${d}`}
                            />
                          );
                        })}
                      </div>
                      {part.engagementScore != null && (
                        <p className="text-sm text-gray-400">
                          Engagement :{" "}
                          <span className="text-white font-medium">
                            {part.engagementScore}/10
                          </span>
                        </p>
                      )}
                      {part.coachNotes && (
                        <p className="text-sm text-gray-400">
                          Notes :{" "}
                          <span className="text-gray-200">{part.coachNotes}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Client actif */}
          {prospect.coachingClient && (
            <Section title="Accompagnement individuel">
              <InfoGrid
                items={[
                  {
                    label: "Début",
                    value: formatDate(prospect.coachingClient.contractStart),
                  },
                  {
                    label: "Fin",
                    value: formatDate(prospect.coachingClient.contractEnd),
                  },
                  {
                    label: "Tarif",
                    value: `${prospect.coachingClient.priceEur.toLocaleString("fr-FR")} €`,
                  },
                  {
                    label: "Objectifs",
                    value: prospect.coachingClient.objectives,
                  },
                  {
                    label: "Notes progression",
                    value: prospect.coachingClient.progressNotes,
                  },
                ]}
              />
            </Section>
          )}

          {/* Notes coach */}
          {prospect.notes && (
            <Section title="Notes coach">
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {prospect.notes}
              </p>
            </Section>
          )}
        </div>

        {/* Colonne droite : résumés IA */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">
                ✦ Résumés IA
              </h3>
              <GenerateSummaryButton prospectId={prospect.id} />
            </div>
            {prospect.summaries.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">
                Aucun résumé généré
              </p>
            ) : (
              <div className="space-y-3">
                {prospect.summaries.map((s) => (
                  <div
                    key={s.id}
                    className="bg-gray-800 rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-brand-400">
                        {s.type === "ONBOARDING"
                          ? "Onboarding"
                          : s.type === "PRE_CALL"
                          ? "Pré-appel"
                          : "Bilan semaine"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(s.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {s.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoGrid({
  items,
}: {
  items: { label: string; value: string | number | null | undefined }[];
}) {
  const filled = items.filter((i) => i.value != null && i.value !== "");
  if (filled.length === 0)
    return <p className="text-sm text-gray-500">Aucune information renseignée</p>;

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {filled.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-gray-500 mb-0.5">{item.label}</dt>
          <dd className="text-sm text-gray-200">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
