import Anthropic from "@anthropic-ai/sdk";
import { Prospect } from "@prisma/client";
import { parseAvailableDays } from "./utils";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Le suivi de challenge se lisait ici dans les groupes du CRM, cochés jour
 * par jour à la main. Ces groupes n'existent plus : l'application cliente
 * mesure d'elle-même les séances, les messages et le bilan, et une saisie
 * manuelle à côté finissait par contredire ce qu'elle sait.
 *
 * La fiche de briefing se passe donc de cette ligne. Le jour où on la
 * rebranche, elle viendra des vraies données du participant.
 */
type ProspectWithRelations = Prospect;

export async function generateOnboardingSummary(
  prospect: ProspectWithRelations
): Promise<string> {
  const days = parseAvailableDays(prospect.availableDays);
  const bmi =
    prospect.weight && prospect.height
      ? (prospect.weight / Math.pow(prospect.height / 100, 2)).toFixed(1)
      : null;

  const prompt = `Tu es l'assistant de Daye Kaba, coach physique D5 Coaching spécialisé hommes 40+.

Voici le dossier complet d'un prospect. Génère un résumé concis et actionnable de 150-200 mots que Daye lira en 30 secondes avant d'intervenir.

**Données du prospect :**
- Nom : ${prospect.name}
- Âge : ${prospect.age ?? "non renseigné"} ans
- Téléphone : ${prospect.phone}
- Poids : ${prospect.weight ?? "?"}kg | Taille : ${prospect.height ?? "?"}cm${bmi ? ` | IMC : ${bmi}` : ""}
- Jours disponibles : ${days.length > 0 ? days.join(", ") : "non renseignés"}
- Habitudes alimentaires : ${prospect.nutritionInfo ?? "non renseignées"}
- Photos avant reçues : ${prospect.photosReceived ? "Oui" : "Non"}

**Réponses formulaire de qualification :**
- Objectif : ${prospect.qualifObjectif ?? "non renseigné"}
- Délai souhaité : ${prospect.qualifDelai ?? "non renseigné"}
- Principal frein : ${prospect.qualifFrein ?? "non renseigné"}
- Expérience sportive : ${prospect.qualifExperience ?? "non renseignée"}
- Disponibilité : ${prospect.qualifDisponible ?? "non renseignée"}
- Santé / blessures : ${prospect.qualifSante ?? "non renseignée"}
- Motivation (sur 10) : ${prospect.qualifMotivation ?? "non renseignée"}
- Budget santé : ${prospect.qualifBudget ?? "non renseigné"}

**Notes :** ${prospect.notes ?? "aucune"}

Structure ton résumé ainsi :
1. **Profil en 2 lignes** (qui est cet homme, contexte clé)
2. **Points forts** (pourquoi il est un bon candidat)
3. **Points d'attention** (freins, risques, questions à poser)
4. **Recommandation** (CHALLENGE directement / besoin d'un appel préalable / à recadrer)

Sois direct, concis, utile. Pas de fluff.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system:
      "Tu es un assistant coach sportif expert. Tu génères des résumés de dossiers prospects clairs et actionnables pour un coach physique.",
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  return content.type === "text" ? content.text : "";
}

export async function generatePreCallSummary(
  prospect: ProspectWithRelations
): Promise<string> {
  const days = parseAvailableDays(prospect.availableDays);
  const challengeInfo = "À lire sur la fiche du participant dans l'app.";

  const prompt = `Tu es l'assistant de Daye Kaba, coach physique D5 Coaching spécialisé hommes 40+.

Un prospect va avoir un appel de sélection pour l'accompagnement individuel à 3000€/6 mois. Prépare une fiche de briefing pour Daye.

**Prospect :** ${prospect.name}, ${prospect.age ?? "?"} ans
**Objectif déclaré :** ${prospect.qualifObjectif ?? "?"}
**Frein principal :** ${prospect.qualifFrein ?? "?"}
**Budget déclaré :** ${prospect.qualifBudget ?? "?"}
**Jours dispo :** ${days.join(", ") || "?"}
**Santé :** ${prospect.qualifSante ?? "?"}

**Résultats challenge :**
${challengeInfo}

**Notes coach :** ${prospect.notes ?? "aucune"}

Génère une fiche de 200 mots max avec :
1. **Rappel contexte** (2 lignes)
2. **Signaux positifs** pour la vente
3. **Objections potentielles** à préparer
4. **3 questions clés** à poser pendant l'appel
5. **Verdict** : Profil idéal / OK mais à qualifier / Déconseillé

Direct, actionnable, pas de jargon.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system:
      "Tu es un assistant coach sportif expert. Tu prépares des fiches de briefing avant des appels de vente pour un coach physique.",
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  return content.type === "text" ? content.text : "";
}

