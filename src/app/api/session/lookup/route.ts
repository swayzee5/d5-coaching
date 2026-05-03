import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/utils";

/**
 * GET /api/session/lookup?token=A3F9KZ
 * GET /api/session/lookup?phone=+33612345678
 *
 * Appelé par ManyChat en External Request au PREMIER message du prospect.
 * Retourne les données Facebook du prospect pour que Sheed les stocke
 * dans ses custom fields et les utilise dans la séquence de confirmation.
 *
 * --- Configuration ManyChat ---
 * Étape 1 du flow "D5-*" :
 *   Action → External Request (GET)
 *   URL    : https://ton-app.com/api/session/lookup?phone={{phone}}&token={{last_input_text}}
 *   Mapper les réponses :
 *     fb_name       → {{first_name}} (custom field)
 *     fb_objectif   → custom field "fb_objectif"
 *     fb_motivation → custom field "fb_motivation"
 *     fb_budget     → custom field "fb_budget"
 *     fb_situation  → custom field "fb_situation"
 *
 * Réponse :
 * {
 *   "found": true,
 *   "fb_name": "Mohamed",
 *   "fb_objectif": "Perdre du ventre",
 *   "fb_motivation": "Mariage dans 6 mois",
 *   "fb_budget": "300-500€/mois",
 *   "fb_situation": "Cadre supérieur"
 * }
 *
 * Si non trouvé : { "found": false } → Sheed part sans données pré-remplies.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rawToken = searchParams.get("token");
  const rawPhone = searchParams.get("phone");

  // Extrait le token si l'utilisateur a envoyé "D5-A3F9KZ" en entier
  const token = rawToken
    ? rawToken.replace(/^D5-/i, "").trim().toUpperCase()
    : null;
  const phone = rawPhone ? normalizePhone(rawPhone.trim()) : null;

  if (!token && !phone) {
    return NextResponse.json(
      { error: "token ou phone requis" },
      { status: 400 }
    );
  }

  const prospect = await db.prospect.findFirst({
    where: token
      ? { sessionToken: token }
      : { phone: phone! },
    select: {
      id: true,
      name: true,
      qualifObjectif: true,
      qualifMotivation: true,
      qualifBudget: true,
      notes: true,
    },
  });

  if (!prospect) {
    return NextResponse.json({ found: false });
  }

  // Extrait le prénom seul (premier mot du nom complet)
  const firstName = prospect.name.split(" ")[0];

  // Extrait la situation pro depuis les notes si présente
  const situationMatch = prospect.notes?.match(/Situation pro\s*:\s*(.+)/i);
  const fbSituation = situationMatch ? situationMatch[1].trim() : null;

  return NextResponse.json({
    found: true,
    fb_name: firstName,
    fb_objectif: prospect.qualifObjectif ?? "",
    fb_motivation: prospect.qualifMotivation ?? "",
    fb_budget: prospect.qualifBudget ?? "",
    fb_situation: fbSituation ?? "",
  });
}
