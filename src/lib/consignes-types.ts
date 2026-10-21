/**
 * Les consignes qui reviennent à chaque séance.
 *
 * Elles étaient retapées à la main, exercice par exercice. Un quart d'heure
 * par séance, et surtout trois formulations légèrement différentes pour la
 * même intention — le client, lui, ne sait plus si on lui demande autre chose.
 *
 * Elles sont proposées, jamais imposées : un clic remplit la case, et le texte
 * reste modifiable ensuite. C'est un point de départ, pas un gabarit.
 *
 * Pour en ajouter une : une ligne ici, et elle apparaît partout où une
 * consigne se saisit.
 */
export type ConsigneType = {
  /** Le libellé du bouton : court, pour tenir sur une ligne. */
  etiquette: string;
  /** Le texte réellement affiché au client. */
  texte: string;
};

export const CONSIGNES_TYPES: ConsigneType[] = [
  {
    etiquette: "Échec vers 10",
    texte:
      "La dernière répétition doit être très proche de l'échec. L'objectif est d'en faire 10, mais si tu échoues à la 8e, c'est encore mieux.",
  },
  {
    etiquette: "Échec vers 12",
    texte:
      "La dernière répétition doit être très proche de l'échec. L'objectif est d'en faire 12, mais si tu échoues à la 10e, c'est encore mieux.",
  },
  {
    etiquette: "Max de reps",
    texte: "Fais le maximum de répétitions possible, peu importe combien ça fait.",
  },
  {
    etiquette: "Tractions 6–10",
    texte:
      "Fais entre 6 et 10 tractions, n'hésite pas à utiliser un élastique si nécessaire.",
  },
];
