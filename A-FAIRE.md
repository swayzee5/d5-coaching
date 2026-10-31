# À faire — D5 Coaching

Liste tenue à jour au fil des sessions. Ce qui est fait en sort.

Dernière mise à jour : 30 octobre 2026.

---

## Avant dimanche 1er novembre (fin du challenge REBOOT 40)

- [ ] **Vérifier la vignette de la vidéo de fin.** Si un dégradé doré s'affiche
      à la place de l'image, c'est le réglage de confidentialité Vimeo qui
      empêche de la récupérer.
- [ ] **Tester le parcours de fin de bout en bout** avec un compte test :
      dixième étape → bascule automatique → bilan → vidéo → les trois réponses
      → Calendly → certificat → invitation.
- [ ] **Finir de régler Calendly** : créneaux en soirée, rappels automatiques
      (la veille et une heure avant), les trois questions à la réservation.
- [ ] **Les passages entre crochets du script** : parcours personnel, deux
      témoignages, détail du Premium, nombre de places. À arbitrer selon ce
      qui a été filmé.
- [ ] **Supprimer les comptes de test** dans le CRM. Tant qu'ils existent, ils
      comptent comme participants actifs, reçoivent les relances, et
      apparaissent dans la liste des appels à passer.

---

## Petites réparations

- [ ] `…/api/stats/rattacher?secret=…&fix=1` pour le dernier
      « Pec fly inversé sur machine » resté au singulier.
- [ ] Renommer « Ab wheel rollout » et « Curl marteau » dans les séances de
      Jérôme (le script de rattachement ne peut pas deviner ces deux-là).
- [ ] Supprimer le fichier orphelin `image.jpg` à la racine du store
      `d5-photos`.

---

## Après le 2 novembre

### Mesure de la vidéo de fin
Aujourd'hui on sait seulement **qui l'a regardée en entier** : le lecteur ne
prévient qu'à la fin. Quelqu'un qui s'arrête à 80 % est donc indistinguable
de quelqu'un qui n'a jamais appuyé sur lecture — alors que ce sont deux
situations opposées.

À enregistrer par participant : le pourcentage le plus loin atteint, le temps
réellement regardé, la date de la dernière lecture. Affiché sur la page Fin de
parcours, et lu avant l'appel. Environ une heure de travail.

*Volontairement reporté : c'est l'écran que les treize participants atteignent
dimanche, et c'est le seul qu'il ne faut pas risquer d'abîmer cette semaine.*

### Version App Store
Le correctif de l'appareil photo n'existe que sur TestFlight. Les clients qui
ont l'application publiée voient encore l'app se fermer quand ils touchent
« Photographier un repas ». Il faut monter le numéro de version dans
`package.json` et passer la revue Apple.

### Écran de clôture comme accueil
Au jour 8, l'écran de fin devient la page d'accueil du participant ; les
séances passent derrière un lien discret. Le bilan reste atteignable quoi
qu'il arrive — la relance du jour 8 pointe dessus.

### Nettoyage des vidéos figées
Les séances déjà attribuées gardent une copie de `exercises.vimeo_video_id`.
Changer la vidéo d'un exercice dans la bibliothèque ne les met pas à jour.
À faire en simulation d'abord.

---

## Automatisation du challenge

Plan en sept étapes, audit du 30 octobre.

- [x] **Étape 0 — une personne, un numéro, un accord.** Lien prospect ↔
      participant, téléphone normalisé en E.164, consentements par canal en
      insertion seule. Livré côté CRM.
- [ ] **Étape 0 bis — la collecte côté application.** Case de consentement à
      l'inscription, écran de désinscription. C'est elle qui transformera
      « saisi par le coach » en vrai consentement.

      **Décision du 31 octobre : une seule ligne, obligatoire.**
      Les quatre canaux techniques disparaissent. Montrer l'offre dans
      l'application à quelqu'un qui s'y connecte ne demande aucun
      consentement — c'est son contenu, il est venu le chercher. Et le
      challenge est gratuit parce qu'il fait découvrir l'accompagnement :
      en faire une case séparée reviendrait à cacher le modèle économique
      que la vidéo annonce de toute façon.

      > J'accepte de recevoir les messages de Daye. Pendant le challenge :
      > rappels de séance, point à mi-parcours, bilan. Et à la fin, sa
      > proposition d'accompagnement. Les messages arrivent par WhatsApp et
      > par notification. Je peux dire stop à tout moment en répondant STOP.

      WhatsApp doit être nommé : leur politique l'exige, « être recontacté »
      ne suffit pas.

      Le STOP remplace la seconde case, et vaut mieux qu'elle : personne ne
      refuse à l'avance ce qu'il n'a pas encore reçu, alors que tout le monde
      sait dire stop quand ça l'agace. Il est automatique — une ligne en base,
      vérifiée avant chaque envoi. Aucune intervention humaine.

- [ ] **Enregistrer le consentement du formulaire publicitaire Meta** comme
      origine, avec sa date et son texte exact. *En attente : le texte de la
      case.* Vérifier au passage que WhatsApp y est nommé — « être
      recontacté » ne couvre pas un message WhatsApp automatisé.
- [ ] **Étape 1 — le moteur.** Événements, file d'attente, journal, mode
      simulation avec accélérateur de temps. À construire avant les agents :
      c'est ce qui les rend testables sans envoyer un seul message.
- [ ] **Étape 2 — agent Animation** (push seul, canal déjà en place).
- [ ] **Étape 3 — agent Suivi** + vocaux ElevenLabs.
- [ ] **Le STOP.** N'existe nulle part aujourd'hui : WhatsApp ne fait rien
      tout seul. Trois morceaux, à faire avec les étapes correspondantes.

      - *Dans l'application* (étape 0 bis) : un interrupteur dans Profil,
        « Recevoir les messages de Daye ». On ne répond pas à une
        notification, il faut donc un endroit où l'éteindre.
      - *Sur WhatsApp* (étape 4) : le webhook des messages entrants, la
        détection du mot, l'écriture en base. Une demi-journée.
      - *Dans le moteur* (étape 1) : la vérification avant chaque envoi, pas
        à l'entrée du parcours — quelqu'un peut se désinscrire entre-temps,
        et c'est précisément là qu'un envoi fait du dégât.

      Ce n'est pas une mesure de conformité, c'est ce qui protège le numéro :
      qui ne trouve pas comment arrêter ne s'arrête pas, il signale. Et Meta
      coupe sans prévenir ni discuter.

- [ ] **Étape 4 — WhatsApp Cloud API.** Validation Meta : 1 à 3 semaines, hors
      de notre contrôle. Demande un numéro dédié, perdu pour l'app WhatsApp
      classique.
- [ ] **Étape 5 — agent Qualification** + webhook Calendly, pour que
      « RDV confirmé » cesse d'être une case cochée à la main.
- [ ] **Étape 6 — agent Onboarding** complet.

**Décision prise :** le groupe WhatsApp reste animé à la main. L'API officielle
ne permet pas de poster dans un groupe, et un groupe d'hommes de 45 ans sent
très vite quand plus personne n'est derrière.

---

## Structurel, non résolu

- La branche `main` du CRM et `claude/d5-coaching-app-ssQsr` n'ont aucun
  ancêtre commun. Le travail de `main` n'a jamais été déployé.
- Les deux applications partagent une base Neon **sans outil de migration
  commun** : `db/migrations/*.sql` documente, mais n'exécute rien. Les tables
  et colonnes sont créées à la volée par le code.
