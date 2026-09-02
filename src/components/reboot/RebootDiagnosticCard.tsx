/**
 * Diagnostic de départ Reboot 40, vu côté coach.
 *
 * Conçu pour une seule tâche : préparer le message vocal personnel. D'où
 * l'ordre — le score en premier pour situer la personne d'un coup d'œil, puis
 * ses propres mots, qui sont la matière du message.
 *
 * Les libellés sont recopiés depuis lib/reboot-diagnostic.ts de l'app client :
 * les deux applications sont dans des dépôts séparés et ne partagent pas de
 * code. Toute modification du questionnaire là-bas doit être répercutée ici,
 * sinon les réponses s'afficheront sous d'anciennes questions.
 */

import { ResetDiagnosticButton } from "./ResetDiagnosticButton";

export type RebootDiagnostic = {
  answers: {
    bascule?: string;
    batterie?: number;
    strategie_15h?: string;
    tentatives?: string;
    place_de_soi?: string;
    entourage?: { value?: string; detail?: string };
    reussite?: string;
  };
  score_global: number;
  score_sommeil: number;
  score_energie: number;
  score_recuperation: number;
  score_stress: number;
  score_motivation: number;
  score_confiance: number;
  submitted_at: Date;
};

const AXES = [
  { key: "score_sommeil", label: "Sommeil", emoji: "🌙" },
  { key: "score_energie", label: "Énergie", emoji: "⚡" },
  { key: "score_recuperation", label: "Récupération", emoji: "🔋" },
  { key: "score_stress", label: "Gestion du stress", emoji: "🧠" },
  { key: "score_motivation", label: "Motivation", emoji: "🔥" },
  { key: "score_confiance", label: "Confiance corps", emoji: "🪞" },
] as const;

const CHOICES: Record<string, Record<string, string>> = {
  strategie_15h: {
    cafe_sucre: "Café, sucre, ou les deux",
    force_mentale: "Serrer les dents, à la force mentale",
    ca_va: "Rien de particulier, tout va bien",
  },
  place_de_soi: {
    identite: "Fait partie de son identité",
    plus_tard: "Toujours remis à plus tard",
    entre_deux: "Entre les deux, par périodes",
  },
};


/** Coupe un texte long : dans 30 secondes, on ne cite qu'une phrase. */
function excerpt(value: string | undefined, max = 140): string | null {
  const flat = value?.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

function scoreColor(value: number): string {
  if (value <= 30) return "text-red-400";
  if (value <= 50) return "text-orange-400";
  if (value <= 70) return "text-yellow-400";
  return "text-emerald-400";
}

function FreeText({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{value.trim()}</p>
    </div>
  );
}

export function RebootDiagnosticCard({
  diagnostic,
  clientId,
}: {
  diagnostic: RebootDiagnostic;
  clientId: string;
}) {
  const { answers } = diagnostic;
  const weakest = AXES.reduce((low, axis) =>
    diagnostic[axis.key] < diagnostic[low.key] ? axis : low
  );

  return (
    <div className="border border-gray-800 rounded-lg p-4 space-y-4 bg-gray-950/40">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          Diagnostic de départ
        </p>
        <p className="text-xs text-gray-600">
          {new Date(diagnostic.submitted_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center shrink-0">
          <p className={`text-3xl font-bold ${scoreColor(diagnostic.score_global)}`}>
            {diagnostic.score_global}
          </p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Reboot Score</p>
        </div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-2 flex-1">
          {AXES.map((axis) => (
            <div key={axis.key}>
              <p className="text-[11px] text-gray-500 truncate">
                {axis.emoji} {axis.label}
              </p>
              <p className={`text-sm font-semibold ${scoreColor(diagnostic[axis.key])}`}>
                {diagnostic[axis.key] / 10}/10
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Point le plus bas : <span className="text-white">{weakest.label.toLowerCase()}</span>
        {typeof answers.batterie === "number" && (
          <> · Énergie au réveil : <span className="text-white">{answers.batterie}%</span></>
        )}
      </p>

      <div className="border-t border-gray-800 pt-4 space-y-4">
        <FreeText
          label="Quand le corps a cessé de répondre"
          value={answers.bascule}
        />
        <FreeText
          label="Tentatives passées et ce qui a bloqué"
          value={answers.tentatives}
        />
        <FreeText
          label="Ce qui ferait de cette semaine une réussite"
          value={answers.reussite}
        />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">Stratégie de 15h</p>
            <p className="text-gray-200">
              {CHOICES.strategie_15h[answers.strategie_15h ?? ""] ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Prendre soin de soi</p>
            <p className="text-gray-200">
              {CHOICES.place_de_soi[answers.place_de_soi ?? ""] ?? "—"}
            </p>
          </div>
        </div>

        {answers.entourage?.value && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Quelqu&apos;un le remarquerait ?</p>
            <p className="text-sm text-gray-200">
              {answers.entourage.value === "oui" ? "Oui" : "Non"}
              {answers.entourage.detail?.trim() ? ` — ${answers.entourage.detail.trim()}` : ""}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 pt-4 space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          Pour le vocal — 30 secondes
        </p>
        <ol className="space-y-1.5 text-sm text-gray-300 list-decimal list-inside marker:text-gray-600">
          {excerpt(answers.tentatives, 110) && (
            <li>
              <span className="text-gray-500">Nommer son vécu :</span>{" "}
              {excerpt(answers.tentatives, 110)}
            </li>
          )}
          <li>
            <span className="text-gray-500">Annoncer la priorité :</span>{" "}
            {weakest.label.toLowerCase()} ({diagnostic[weakest.key] / 10}/10) — c&apos;est par
            là qu&apos;on commence
          </li>
          {excerpt(answers.reussite, 110) && (
            <li>
              <span className="text-gray-500">Reprendre ses mots :</span>{" "}
              {excerpt(answers.reussite, 110)}
            </li>
          )}
        </ol>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          Trois points, une phrase chacun. Le reste du diagnostic est au-dessus si besoin,
          mais tout dire allongerait le vocal sans le rendre plus personnel.
        </p>
      </div>

      <div className="border-t border-gray-800 pt-3">
        <ResetDiagnosticButton clientId={clientId} />
      </div>
    </div>
  );
}
