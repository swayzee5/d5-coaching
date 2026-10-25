/**
 * La date du jour telle qu'on la lit sur une horloge, en `AAAA-MM-JJ`.
 *
 * `toISOString().slice(0, 10)` donne la date en temps universel, et non celle
 * du lieu où l'on se trouve. Les deux ne diffèrent que quelques heures par
 * jour — mais ce sont les heures où le coach travaille. À 00h20 en Suisse,
 * l'universel est encore la veille : le départ d'une cohorte proposé un lundi
 * s'écrivait au dimanche, et une mensuration saisie après une séance tardive
 * se rangeait au jour précédent, là où la date fait l'unicité.
 *
 * Les composantes sont donc lues dans le fuseau local, puis recomposées à la
 * main. `fr-CA` donne déjà `AAAA-MM-JJ`, mais dépend d'une locale installée :
 * mieux vaut ne rien devoir à l'environnement pour une date qui commande un
 * calendrier de relances.
 */
export function jourLocal(d: Date = new Date()): string {
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}
