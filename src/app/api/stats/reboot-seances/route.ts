import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Ce que chaque participant a réellement validé comme séance.
 *
 * La fiche client affiche « Séances — 3/3 » au-dessus de trois cases qui
 * peuvent rester vides, et le chiffre ne correspond pas toujours à ce que le
 * participant voit chez lui. Deux causes possibles, impossibles à départager
 * sans regarder les lignes : une séance bonus comptée ici et pas là-bas, ou
 * deux séances du même groupe musculaire — salle et maison — qui comptent
 * deux fois pour une seule case.
 *
 * La route liste donc chaque validation telle qu'elle est en base, avec son
 * groupe, son lieu et son caractère bonus. Elle ne corrige rien : elle dit ce
 * qui est là, pour qu'on sache quoi corriger.
 */

export const dynamic = "force-dynamic";

type Ligne = {
  prenom: string;
  nom: string;
  session_name: string;
  muscle_group: string;
  location: string | null;
  is_bonus: boolean | null;
  completed_at: Date;
};

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const lignes = await db.$queryRaw<Ligne[]>`
      SELECT c.first_name AS prenom, c.last_name AS nom,
             rs.name AS session_name, rs.muscle_group, rs.location,
             rs.is_bonus, rc.completed_at
        FROM reboot_completions rc
        JOIN reboot_sessions rs ON rs.id = rc.session_id
        JOIN clients c ON c.id = rc.client_id
       WHERE c.is_reboot_only = true AND c.is_active = true
       ORDER BY c.first_name, rc.completed_at
    `;

    // Regroupé par personne : c'est comme ça qu'on lit une fiche, et c'est la
    // comparaison entre les deux chiffres qui apprend quelque chose.
    const parPersonne = new Map<string, Ligne[]>();
    for (const l of lignes) {
      const cle = `${l.prenom} ${l.nom}`;
      parPersonne.set(cle, [...(parPersonne.get(cle) ?? []), l]);
    }

    const resultat = [...parPersonne.entries()].map(([nom, l]) => {
      const vraies = l.filter((x) => !x.is_bonus);
      const groupes = new Set(vraies.map((x) => x.muscle_group));
      return {
        participant: nom,
        compteCRM: l.length,
        compteApp: vraies.length,
        casesCochees: [...groupes].filter((g) => ["pecs", "dos", "jambes"].includes(g)).length,
        séances: l.map((x) => ({
          nom: x.session_name,
          groupe: x.muscle_group,
          lieu: x.location,
          bonus: Boolean(x.is_bonus),
          le: x.completed_at,
        })),
        diagnostic:
          l.length !== vraies.length
            ? "Des séances bonus sont comptées côté CRM mais pas côté app : les deux chiffres divergent."
            : groupes.size < vraies.length
            ? "Deux séances du même groupe musculaire : le compteur avance, la case ne se coche qu'une fois."
            : "Cohérent.",
      };
    });

    return NextResponse.json({ participants: resultat.length, détail: resultat });
  } catch (err) {
    return NextResponse.json({ error: String(err).slice(0, 300) }, { status: 500 });
  }
}
