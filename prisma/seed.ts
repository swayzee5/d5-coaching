import { PrismaClient, ProspectStatus } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding D5 Coaching database...");

  // Prospects de démo
  const prospects = [
    {
      name: "Marc Lefebvre",
      phone: "+33612345001",
      email: "marc.lefebvre@example.com",
      age: 47,
      weight: 94,
      height: 178,
      availableDays: JSON.stringify(["Lundi", "Mercredi", "Vendredi"]),
      nutritionInfo: "Mange souvent au restaurant midi pour le boulot, dîner maison équilibré, manque de régularité le week-end",
      photosReceived: true,
      onboardingDone: true,
      status: "CHALLENGE" as ProspectStatus,
      qualifObjectif: "Perdre 12kg et retrouver de l'énergie pour mes enfants",
      qualifDelai: "6 mois",
      qualifFrein: "Manque de temps entre le travail et la famille",
      qualifExperience: "Salle de sport il y a 5 ans, arrêté après une blessure dos",
      qualifDisponible: "3x par semaine le soir, parfois samedi matin",
      qualifSante: "Légère lombalgie chronique, tension artérielle surveillée",
      qualifMotivation: "8",
      qualifBudget: "Prêt à investir sérieusement si résultats clairs",
      manychatId: "mc_001",
    },
    {
      name: "Thomas Bernard",
      phone: "+33612345002",
      email: "thomas.bernard@example.com",
      age: 52,
      weight: 102,
      height: 181,
      availableDays: JSON.stringify(["Mardi", "Jeudi", "Samedi"]),
      nutritionInfo: "Mange beaucoup en déplacement, alcool les week-ends, petit-déjeuner souvent sauté",
      photosReceived: true,
      onboardingDone: true,
      status: "CALL_SCHEDULED" as ProspectStatus,
      qualifObjectif: "Regagner confiance, perdre du ventre",
      qualifDelai: "4 mois avant vacances d'été",
      qualifFrein: "Voyages pro fréquents",
      qualifExperience: "Running occasionnel, jamais de musculation",
      qualifDisponible: "3 matins par semaine, 5h30-6h30",
      qualifSante: "Aucun problème particulier, bilan médical OK",
      qualifMotivation: "9",
      qualifBudget: "Budget non bloquant si l'accompagnement est solide",
      manychatId: "mc_002",
    },
    {
      name: "Stéphane Moreau",
      phone: "+33612345003",
      age: 44,
      weight: 88,
      height: 176,
      availableDays: JSON.stringify(["Lundi", "Jeudi"]),
      nutritionInfo: "Cuisine maison, plutôt sain mais portions trop grandes",
      photosReceived: false,
      onboardingDone: true,
      status: "CHALLENGE" as ProspectStatus,
      qualifObjectif: "Prise de masse musculaire, reprendre la forme après burn-out",
      qualifDelai: "Pas de délai précis, dans la durée",
      qualifFrein: "Fatigue mentale, manque de motivation seul",
      qualifExperience: "Ancien sportif, 15 ans sans activité",
      qualifDisponible: "2x semaine + 1 séance week-end",
      qualifSante: "Burn-out il y a 18 mois, suivi psy en cours",
      qualifMotivation: "7",
      qualifBudget: "Budget serré, besoin de comprendre la valeur",
      manychatId: "mc_003",
    },
    {
      name: "Pierre Vidal",
      phone: "+33612345004",
      age: 49,
      weight: 79,
      height: 172,
      status: "ONBOARDING" as ProspectStatus,
      onboardingDone: false,
      photosReceived: false,
      qualifObjectif: "Tonifier, garder la forme après 45 ans",
      qualifMotivation: "7",
      qualifBudget: "Possible si convaincu",
      manychatId: "mc_004",
    },
    {
      name: "Karim Mansouri",
      phone: "+33612345005",
      age: 43,
      status: "LEAD" as ProspectStatus,
      onboardingDone: false,
      photosReceived: false,
    },
    {
      name: "Olivier Petit",
      phone: "+33612345006",
      age: 55,
      weight: 98,
      height: 174,
      availableDays: JSON.stringify(["Lundi", "Mardi", "Vendredi", "Samedi"]),
      nutritionInfo: "Régime méditerranéen, peu de sucres, discipline alimentaire déjà bonne",
      photosReceived: true,
      onboardingDone: true,
      status: "CLIENT" as ProspectStatus,
      qualifObjectif: "Maintenir niveau et travailler endurance cardio",
      qualifDelai: "Programme 6 mois renouvelable",
      qualifFrein: "Âge, récupération plus lente",
      qualifExperience: "Pratique régulière vélo et natation",
      qualifDisponible: "4 matins par semaine",
      qualifSante: "Genou opéré il y a 2 ans, bien rétabli",
      qualifMotivation: "9",
      qualifBudget: "Pas d'hésitation si coaching structuré",
      manychatId: "mc_006",
    },
  ];

  const created: Record<string, string> = {};

  for (const data of prospects) {
    const p = await db.prospect.upsert({
      where: { phone: data.phone },
      create: data,
      update: data,
    });
    created[data.name] = p.id;
    console.log(`  ✓ Prospect: ${data.name}`);
  }

  // Groupe actif
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Lundi cette semaine
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const group1 = await db.challengeGroup.upsert({
    where: { id: "seed-group-1" },
    create: {
      id: "seed-group-1",
      name: `Reboot 40+ — Semaine ${getWeekNumber(startDate)}`,
      startDate,
      endDate,
      status: "ACTIVE",
      maxSize: 10,
    },
    update: { status: "ACTIVE" },
  });
  console.log(`  ✓ Groupe: ${group1.name}`);

  // Participants
  const participantData = [
    {
      name: "Marc Lefebvre",
      day1Done: true, day2Done: true, day3Done: true,
      day4Done: false, day5Done: false, day6Done: false, day7Done: false,
      engagementScore: 8, isSerious: true,
      coachNotes: "Très régulier, pose de bonnes questions sur la nutrition",
    },
    {
      name: "Stéphane Moreau",
      day1Done: true, day2Done: true, day3Done: false,
      day4Done: false, day5Done: false, day6Done: false, day7Done: false,
      engagementScore: 6, isSerious: false,
      coachNotes: "Présent mais peu d'interactions dans le groupe",
    },
  ];

  for (const pd of participantData) {
    const prospectId = created[pd.name];
    if (!prospectId) continue;

    await db.challengeParticipant.upsert({
      where: { prospectId_groupId: { prospectId, groupId: group1.id } },
      create: {
        prospectId,
        groupId: group1.id,
        day1Done: pd.day1Done,
        day2Done: pd.day2Done,
        day3Done: pd.day3Done,
        day4Done: pd.day4Done,
        day5Done: pd.day5Done,
        day6Done: pd.day6Done,
        day7Done: pd.day7Done,
        engagementScore: pd.engagementScore,
        isSerious: pd.isSerious,
        coachNotes: pd.coachNotes,
      },
      update: {},
    });
    console.log(`  ✓ Participant: ${pd.name} → ${group1.name}`);
  }

  // Client actif
  if (created["Olivier Petit"]) {
    const contractStart = new Date();
    contractStart.setMonth(contractStart.getMonth() - 2);
    const contractEnd = new Date(contractStart);
    contractEnd.setMonth(contractStart.getMonth() + 6);

    await db.coachingClient.upsert({
      where: { prospectId: created["Olivier Petit"] },
      create: {
        prospectId: created["Olivier Petit"],
        contractStart,
        contractEnd,
        priceEur: 3000,
        objectives: "Améliorer cardio, renforcer les jambes, maintenir la masse musculaire",
        progressNotes: "Excellente progression en 2 mois. VO2max en hausse, douleur genou absente.",
        isActive: true,
      },
      update: {},
    });
    console.log(`  ✓ Client: Olivier Petit`);
  }

  console.log("\n✅ Seed terminé !");
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  return Math.ceil((diff / (7 * 24 * 60 * 60 * 1000)) + startOfYear.getDay() / 7);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
