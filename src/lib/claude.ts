import Anthropic from "@anthropic-ai/sdk";
import { Prospect, ChallengeParticipant, ChallengeGroup } from "@prisma/client";
import { parseAvailableDays } from "./utils";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ProspectWithRelations = Prospect & {
  challengeParticipants?: (ChallengeParticipant & {
    group: ChallengeGroup;
  })[];
};

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
  const participation = prospect.challengeParticipants?.[0];
  const days = parseAvailableDays(prospect.availableDays);

  let challengeInfo = "N'a pas encore fait le challenge";
  if (participation) {
    const daysCompleted = [
      participation.day1Done,
      participation.day2Done,
      participation.day3Done,
      participation.day4Done,
      participation.day5Done,
      participation.day6Done,
      participation.day7Done,
    ].filter(Boolean).length;

    challengeInfo = `Challenge ${participation.group.name} — ${daysCompleted}/7 jours complétés | Score engagement : ${participation.engagementScore ?? "non noté"}/10 | Profil sérieux : ${participation.isSerious ? "OUI" : "Non"} | Notes : ${participation.coachNotes ?? "aucune"}`;
  }

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

export async function generateChallengeWeekSummary(
  group: ChallengeGroup & {
    participants: (ChallengeParticipant & { prospect: Prospect })[];
  }
): Promise<string> {
  const participantLines = group.participants
    .map((p) => {
      const daysCompleted = [
        p.day1Done,
        p.day2Done,
        p.day3Done,
        p.day4Done,
        p.day5Done,
        p.day6Done,
        p.day7Done,
      ].filter(Boolean).length;
      return `- ${p.prospect.name} : ${daysCompleted}/7 jours | Engagement : ${p.engagementScore ?? "?"}/10 | Sérieux : ${p.isSerious ? "✅" : "❌"} | Notes : ${p.coachNotes ?? "—"}`;
    })
    .join("\n");

  const prompt = `Tu es l'assistant de Daye Kaba, coach D5 Coaching.

Voici le bilan du groupe challenge Reboot 40+ de la semaine.

**Groupe :** ${group.name}
**Période :** du ${group.startDate.toLocaleDateString("fr-FR")} au ${group.endDate.toLocaleDateString("fr-FR")}
**Participants :**
${participantLines}

**Notes coach sur la semaine :** ${group.coachNotes ?? "aucune"}

Génère un rapport de semaine en 200 mots avec :
1. **Vue d'ensemble** (taux de complétion global, ambiance du groupe)
2. **Top performers** (nommer les 2-3 meilleurs profils avec raison)
3. **Profils à relancer** (qui contacter en DM et pourquoi)
4. **Profils pour appel de sélection** (recommandations directes)
5. **Insights** pour la prochaine session (ajustements à faire)

Sois direct et concis.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    system:
      "Tu es un assistant coach sportif expert. Tu génères des rapports de suivi hebdomadaires pour un coach physique.",
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  return content.type === "text" ? content.text : "";
}
