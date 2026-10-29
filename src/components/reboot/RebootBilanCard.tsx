/**
 * Le bilan de fin de challenge, vu côté coach.
 *
 * Conçu pour une seule chose : savoir si ce participant est devenu une preuve.
 * D'où l'ordre — l'écart de score d'abord, parce que c'est lui qui se cite,
 * puis la phrase du participant, puis l'autorisation de la publier.
 *
 * Un témoignage sans autorisation est affiché quand même, mais signalé comme
 * inutilisable publiquement. Le cacher reviendrait à perdre une information
 * utile au suivi ; l'afficher sans avertir ferait publier une phrase que
 * personne n'a autorisée.
 *
 * Les libellés d'axes sont recopiés depuis l'app cliente, comme ailleurs : les
 * deux dépôts ne partagent pas de code.
 */

const AXES = [
  { depart: "score_sommeil", fin: "sommeil", label: "Sommeil" },
  { depart: "score_energie", fin: "energie", label: "Énergie" },
  { depart: "score_recuperation", fin: "recuperation", label: "Récupération" },
  { depart: "score_stress", fin: "stress", label: "Gestion du stress" },
  { depart: "score_motivation", fin: "motivation", label: "Motivation" },
  { depart: "score_confiance", fin: "confiance", label: "Confiance corps" },
] as const;

export type BilanRow = {
  score_global: number;
  score_sommeil: number;
  score_energie: number;
  score_recuperation: number;
  score_stress: number;
  score_motivation: number;
  score_confiance: number;
  satisfaction: number | null;
  temoignage: string | null;
  temoignage_publiable: boolean;
  submitted_at: Date;
  /** Réponse à « souhaites-tu être accompagné ? », posée après la vidéo. */
  intention: string | null;
  intention_texte: string | null;
};

/**
 * Les trois réponses possibles, et ce qu'elles valent pour le coach.
 *
 * « J'hésite » est volontairement traité comme une intention positive : c'est
 * la réponse de la majorité, elle mène au même rendez-vous, et la ranger
 * visuellement du côté des refus ferait passer à côté de la plupart des
 * appels à passer.
 */
const INTENTIONS: Record<string, { texte: string; classe: string; question: string }> = {
  oui: {
    texte: "Veut être accompagné",
    classe: "border-green-500/30 bg-green-500/10 text-green-400",
    question: "Ce qu'il veut changer en priorité",
  },
  hesite: {
    texte: "Hésite — veut en discuter",
    classe: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    question: "Ce qu'il veut changer en priorité",
  },
  non: {
    texte: "Pas pour le moment",
    classe: "border-gray-700 bg-gray-800 text-gray-400",
    question: "Ce qui le freine",
  },
};

export function RebootBilanCard({
  depart,
  bilan,
}: {
  depart: Record<string, number> | null;
  bilan: BilanRow;
}) {
  const departGlobal = depart?.score_global ?? null;
  const ecart = departGlobal === null ? null : bilan.score_global - departGlobal;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Bilan de fin</p>
        <span className="text-xs text-gray-600">
          {new Date(bilan.submitted_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {departGlobal !== null && (
          <>
            <span className="text-2xl font-bold text-gray-500">{departGlobal}</span>
            <span className="text-gray-600">→</span>
          </>
        )}
        <span className="text-3xl font-black text-yellow-400">{bilan.score_global}</span>
        {ecart !== null && (
          <span
            className={`text-sm font-bold ${
              ecart > 0 ? "text-green-400" : ecart < 0 ? "text-orange-400" : "text-gray-500"
            }`}
          >
            {ecart > 0 ? `+${ecart} points` : ecart === 0 ? "stable" : `${ecart} points`}
          </span>
        )}
      </div>

      {depart && (
        <div className="space-y-1.5">
          {AXES.map((axe) => {
            const d = Math.round((depart[axe.depart] ?? 0) / 10);
            const a = Math.round((bilan[`score_${axe.fin}` as keyof BilanRow] as number) / 10);
            const diff = a - d;
            return (
              <div key={axe.label} className="flex items-center gap-2 text-xs">
                <span className="flex-1 text-gray-400">{axe.label}</span>
                <span className="text-gray-500">
                  {d} → {a}
                </span>
                <span
                  className={`w-8 text-right font-semibold ${
                    diff > 0 ? "text-green-400" : diff < 0 ? "text-orange-400" : "text-gray-600"
                  }`}
                >
                  {diff > 0 ? `+${diff}` : diff}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {bilan.satisfaction !== null && (
        <p className="text-xs text-gray-400">
          Recommanderait le challenge : <span className="font-semibold text-white">{bilan.satisfaction}/5</span>
        </p>
      )}

      {/* Ce qu'il a répondu après la vidéo : c'est ce qui décide de l'appel,
          donc ça se lit avant de décrocher, pas après. */}
      {bilan.intention && INTENTIONS[bilan.intention] && (
        <div className="space-y-2">
          <span
            className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${
              INTENTIONS[bilan.intention].classe
            }`}
          >
            {INTENTIONS[bilan.intention].texte}
          </span>
          {bilan.intention_texte && (
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                {INTENTIONS[bilan.intention].question}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-300">
                {bilan.intention_texte}
              </p>
            </div>
          )}
        </div>
      )}

      {bilan.temoignage && (
        <div className="space-y-1.5 rounded-lg border border-gray-800 bg-gray-900 p-3">
          <p className="text-sm italic leading-relaxed text-gray-300">« {bilan.temoignage} »</p>
          {bilan.temoignage_publiable ? (
            <p className="text-xs font-semibold text-green-400">
              ✓ Publication autorisée, avec le prénom
            </p>
          ) : (
            <p className="text-xs text-orange-400">
              Publication non autorisée — à ne pas utiliser publiquement
            </p>
          )}
        </div>
      )}
    </div>
  );
}
