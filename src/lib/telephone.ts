/**
 * Les numéros de téléphone, sous une seule forme.
 *
 * Un numéro sert à deux choses incompatibles avec l'à-peu-près : reconnaître
 * que deux fiches désignent la même personne, et envoyer un message qui
 * arrive. « 06 12 34 56 78 », « +33 6 12 34 56 78 » et « 0033612345678 » sont
 * le même homme, et aucun des trois n'est comparable aux autres tel quel.
 *
 * On range donc tout en E.164 — un plus, l'indicatif, le numéro, rien
 * d'autre. C'est la forme qu'attendent WhatsApp, les passerelles SMS et
 * wa.me, et c'est la seule sur laquelle une comparaison a du sens.
 *
 * Le pays est demandé plutôt que deviné. Un numéro qui commence par 0 est
 * français ou suisse selon la personne, pas selon le code : deviner mettrait
 * un jour un message dans la boîte d'un inconnu.
 */

export const PAYS = {
  FR: { indicatif: "33", nom: "France", exemple: "06 12 34 56 78" },
  CH: { indicatif: "41", nom: "Suisse", exemple: "078 123 45 67" },
  BE: { indicatif: "32", nom: "Belgique", exemple: "0470 12 34 56" },
} as const;

export type CodePays = keyof typeof PAYS;

export type ResultatTelephone =
  | { ok: true; e164: string; affichage: string }
  | { ok: false; erreur: string };

/**
 * Met un numéro saisi à la main en E.164.
 *
 * Trois écritures acceptées, parce que ce sont les trois qu'on tape :
 * international avec `+`, international avec `00`, ou national avec un `0`
 * initial qu'il faut remplacer par l'indicatif.
 */
export function normaliserTelephone(saisie: string, pays: CodePays): ResultatTelephone {
  const brut = (saisie ?? "").trim();
  if (!brut) return { ok: false, erreur: "Numéro manquant." };

  // Les séparateurs sont du confort de lecture : espaces, points, tirets,
  // parenthèses. Le `+` est gardé, il porte du sens.
  const nettoye = brut.replace(/[^\d+]/g, "");

  let chiffres: string;
  if (nettoye.startsWith("+")) {
    chiffres = nettoye.slice(1);
  } else if (nettoye.startsWith("00")) {
    chiffres = nettoye.slice(2);
  } else if (nettoye.startsWith("0")) {
    chiffres = PAYS[pays].indicatif + nettoye.slice(1);
  } else {
    // Ni `+`, ni `00`, ni `0` : soit l'indicatif est déjà là, soit il manque.
    // On ne tranche que si le début correspond à un indicatif connu.
    const connu = Object.values(PAYS).some((p) => nettoye.startsWith(p.indicatif));
    chiffres = connu ? nettoye : PAYS[pays].indicatif + nettoye;
  }

  if (!/^\d+$/.test(chiffres)) {
    return { ok: false, erreur: "Ce numéro contient des caractères inattendus." };
  }
  // Bornes de la norme E.164, assez larges pour ne jamais refuser un numéro
  // valide, assez serrées pour attraper les fautes de frappe courantes.
  if (chiffres.length < 8 || chiffres.length > 15) {
    return { ok: false, erreur: "Ce numéro n'a pas le bon nombre de chiffres." };
  }

  return { ok: true, e164: `+${chiffres}`, affichage: formater(chiffres) };
}

/** Pour l'affichage seulement : jamais stocké, jamais comparé. */
function formater(chiffres: string): string {
  const indicatif = Object.values(PAYS).find((p) => chiffres.startsWith(p.indicatif));
  if (!indicatif) return `+${chiffres}`;
  const reste = chiffres.slice(indicatif.indicatif.length);
  const groupes = reste.replace(/(\d{2})(?=\d)/g, "$1 ");
  return `+${indicatif.indicatif} ${groupes}`.trim();
}

/** La forme attendue par wa.me : les chiffres seuls, sans le plus. */
export function pourWhatsapp(e164: string): string {
  return e164.replace(/\D/g, "");
}
