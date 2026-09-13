/**
 * Où en est le diagnostic de départ, pour tous les participants Reboot.
 *
 * Pourquoi ce bloc existe : le diagnostic ne s'affichait que dans la fiche
 * d'un client. Avec treize participants, savoir qui a répondu demandait
 * d'ouvrir treize fiches, et rien ne signalait ceux qui n'avaient rien rempli
 * — c'est-à-dire précisément ceux à relancer.
 *
 * Le bloc sert à décider quoi faire maintenant, d'où l'ordre : ceux qui
 * attendent leur vocal d'abord, les silencieux ensuite. Un participant traité
 * n'a plus besoin d'attirer l'attention.
 *
 * Les libellés d'axes sont recopiés depuis lib/reboot-diagnostic.ts de l'app
 * client, comme dans RebootDiagnosticCard : les deux dépôts ne partagent pas
 * de code. Une modification du questionnaire doit être répercutée ici.
 */

import Link from "next/link";

export type RebootParticipant = {
  clientId: string;
  name: string;
  /** Null quand le participant n'a pas encore rempli le formulaire. */
  diagnostic: {
    scoreGlobal: number;
    axes: { label: string; value: number }[];
    submittedAt: Date;
  } | null;
};

/** 40 sur 100 et en dessous : l'axe mérite d'être nommé dans le vocal. */
const LOW_SCORE = 40;

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-green-400";
  if (score >= 45) return "text-yellow-400";
  return "text-orange-400";
}

export function RebootDiagnosticsOverview({ participants }: { participants: RebootParticipant[] }) {
  if (participants.length === 0) return null;

  const answered = participants.filter((p) => p.diagnostic !== null);
  const waiting = participants.filter((p) => p.diagnostic === null);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Diagnostics Reboot</h2>
        <span className="text-xs text-gray-500">
          {answered.length} sur {participants.length} reçus
        </span>
      </div>

      {answered.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun diagnostic pour le moment. Le formulaire s&apos;affiche à la première ouverture
          de l&apos;app par un participant.
        </p>
      ) : (
        <div className="space-y-2">
          {answered.map((p) => {
            const d = p.diagnostic!;
            // L'axe le plus bas : c'est l'angle d'attaque du message vocal.
            const weakest = d.axes.reduce((low, axis) => (axis.value < low.value ? axis : low), d.axes[0]);
            return (
              <Link
                key={p.clientId}
                href={`/app-clients/${p.clientId}`}
                className="flex items-center gap-3 rounded-lg bg-gray-950 border border-gray-800 px-3 py-2.5 hover:border-yellow-500/40 transition-colors"
              >
                <span className={`text-lg font-bold tabular-nums w-9 text-right ${scoreColor(d.scoreGlobal)}`}>
                  {d.scoreGlobal}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-white truncate">{p.name}</span>
                  <span className="block text-xs text-gray-500">
                    {weakest && weakest.value <= LOW_SCORE
                      ? `Point faible : ${weakest.label.toLowerCase()} (${Math.round(weakest.value / 10)}/10)`
                      : "Aucun axe vraiment bas"}
                  </span>
                </span>
                <span className="text-xs text-gray-600 shrink-0">{formatDate(d.submittedAt)}</span>
              </Link>
            );
          })}
        </div>
      )}

      {waiting.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">
            {waiting.length === 1
              ? "1 participant n'a pas encore rempli le formulaire"
              : `${waiting.length} participants n'ont pas encore rempli le formulaire`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {waiting.map((p) => (
              <Link
                key={p.clientId}
                href={`/app-clients/${p.clientId}`}
                className="text-xs px-2 py-1 rounded-md bg-gray-950 border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-colors"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
