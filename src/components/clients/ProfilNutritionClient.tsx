import { db } from "@/lib/db";

/**
 * Le profil alimentaire d'un client et ses points de six semaines.
 *
 * Ce que le coach vient chercher ici, ce n'est pas la dernière réponse : c'est
 * l'écart entre deux. « Il tenait à son verre du week-end, et six semaines plus
 * tard c'est le déjeuner du midi qui coince » — voilà ce qui dit quoi changer.
 * L'historique est donc affiché, le plus récent en premier.
 *
 * Les libellés sont recopiés ici depuis le questionnaire de l'app cliente.
 * Les deux applications ne partagent pas de code, et un identifiant brut
 * (« intouchable », « moment_difficile ») ne se relie à aucune question une
 * fois sous les yeux du coach.
 */

type Ligne = { id: string; type: string; reponses: Record<string, unknown>; jour: string };

const LIBELLES: Record<string, string> = {
  rythme: "Rythme des repas",
  exterieur: "Repas à l'extérieur / semaine",
  cuisine: "Qui cuisine",
  exclusions: "Exclusions",
  sante: "Santé / traitements",
  intouchable: "Ne veut pas supprimer",
  moment_difficile: "Moment critique",
  alcool: "Alcool",
  tenu: "A tenu le plan (1-5)",
  obstacle: "Ce qui a bloqué",
  faim: "Faim",
  energie: "Énergie (1-5)",
  changement: "À changer",
};

const VALEURS: Record<string, string> = {
  trois_repas: "Trois repas à heures fixes",
  deux_repas: "Deux repas, saute le petit-déjeuner",
  grignote: "Mange par morceaux",
  irregulier: "Variable selon les jours",
  moi: "Lui, et il aime ça",
  moi_contraint: "Lui, mais sans le temps",
  autre: "Quelqu'un d'autre",
  personne: "Personne, achète tout prêt",
  apres_midi: "L'après-midi, vers 16h",
  soir: "Le soir après le repas",
  nuit: "La nuit, en rentrant tard",
  weekend: "Le week-end, en sortie",
  jamais: "Jamais ou presque",
  souvent: "Plusieurs fois par semaine",
  quotidien: "Tous les jours",
  jamais_faim: "N'a jamais faim",
  equilibre: "Mange à sa faim",
  souvent_faim: "Souvent faim entre les repas",
  affame: "Faim en permanence",
};

/** L'ordre d'affichage. Santé en tête : c'est ce qui dit quand s'arrêter. */
const ORDRE = [
  "sante",
  "exclusions",
  "intouchable",
  "rythme",
  "cuisine",
  "exterieur",
  "moment_difficile",
  "alcool",
  "tenu",
  "energie",
  "faim",
  "obstacle",
  "changement",
];

export async function ProfilNutritionClient({ clientId }: { clientId: string }) {
  const lignes = await db
    .$queryRaw<Ligne[]>`
      SELECT id::text AS id, type, reponses,
             to_char(submitted_at, 'YYYY-MM-DD') AS jour
        FROM nutrition_checkins
       WHERE client_id = ${clientId}::uuid
       ORDER BY submitted_at DESC
    `
    .catch(() => [] as Ligne[]);

  if (lignes.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
          🥗 Profil alimentaire
        </h2>
        <span className="text-xs text-gray-600">
          {lignes.length === 1 ? "questionnaire de départ" : `${lignes.length - 1} point(s) de suivi`}
        </span>
      </div>

      <div className="space-y-4">
        {lignes.map((l, i) => (
          <div key={l.id} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-300">
                {l.type === "depart" ? "Questionnaire de départ" : "Point de six semaines"}
              </p>
              <span className="text-xs text-gray-600">
                {new Date(l.jour).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {i === 0 && lignes.length > 1 && " · le plus récent"}
              </span>
            </div>
            <dl className="space-y-1.5">
              {ORDRE.filter((cle) => l.reponses[cle] !== undefined).map((cle) => {
                const brute = l.reponses[cle];
                const valeur =
                  typeof brute === "string" ? VALEURS[brute] ?? brute : String(brute);
                return (
                  <div key={cle} className="flex flex-wrap gap-x-2 text-sm">
                    <dt className="shrink-0 text-gray-500">{LIBELLES[cle] ?? cle} :</dt>
                    <dd
                      className={`min-w-0 flex-1 ${
                        cle === "sante" ? "font-medium text-orange-300" : "text-gray-200"
                      }`}
                    >
                      {valeur}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
