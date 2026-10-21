# D5 Coaching — CRM

## Toute sauvegarde se confirme

Règle posée par Daye, sans exception : **dès qu'une donnée est enregistrée,
l'écran doit le dire.**

Une sauvegarde silencieuse laisse une question sans réponse — est-ce passé ?
On re-clique, on recharge la page pour vérifier, et au bout de quelques fois on
cesse de faire confiance à l'écran.

Les outils sont dans `src/components/ui/Confirmation.tsx` :

| Cas | À utiliser |
| --- | --- |
| Composant client qui appelle une action et lit son résultat | `useConfirmation()` + `<Confirmation message={…} />` |
| `<form action={actionServeur}>` avec un bouton | `<BoutonSauvegarde confirmation="…">` |
| Formulaire qui s'enregistre seul (`onBlur`) ou bouton déjà écrit | `<EtatSauvegarde confirmation="…" />`, placé **dans** le `<form>` |

Trois points qui ont déjà été ratés :

- **La confirmation doit être visible après coup.** Un panneau qui se ferme en
  enregistrant doit afficher le message là où il se rouvre, pas à l'intérieur.
- **Un échec ne se confirme pas.** Si l'action renvoie `{ ok: false }`, c'est
  l'erreur qui s'affiche. Plusieurs composants avalaient le résultat sans le
  regarder.
- **Le geste visible suffit parfois** — un exercice qui change de place, un
  bouton qui passe de « Archiver » à « Réactiver ». Dans ces cas, c'est
  l'échec qu'il faut dire, pas le succès.

## Le reste du projet

- Les séances types ne stockent qu'un **nom** ; la vidéo et la description sont
  lues dans `exercise_library` quand le client ouvre sa séance. Un nom qui ne
  correspond à rien donne un exercice muet chez le client.
- La comparaison des noms passe toujours par la même normalisation : Unicode
  NFC, apostrophes typographiques ramenées à `'`, espaces réduits. Ces trois
  pièges ont chacun fait disparaître un exercice en silence.
- **Prisma sélectionne toutes les colonnes qu'il déclare** : une colonne
  absente en base fait échouer toute la requête et vide la page. Les colonnes
  ajoutées à la main se lisent en SQL direct, pas via le schéma.
- Les deux applications partagent une base Neon **sans outil de migration
  commun** : `db/migrations/*.sql` documente, mais n'exécute rien.
- Branche de développement : `claude/d5-coaching-app-ssQsr` (c'est elle qui est
  déployée).
