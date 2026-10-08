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
