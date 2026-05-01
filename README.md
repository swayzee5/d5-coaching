# D5 Coaching — CRM & Système d'Acquisition

Système de gestion centralisé pour le funnel d'acquisition et le suivi des groupes Reboot 40+.

## Architecture

```
Facebook Ads → Formulaire FB (8 questions)
    ↓
Page confirmation WordPress → WhatsApp Sheed (ManyChat)
    ↓
Onboarding automatique (poids, taille, dispo, nutrition, photos)
    ↓
Webhook → /api/webhooks/manychat → Création automatique dossier + Résumé IA
    ↓
Dashboard CRM (cette app) → Groupe Reboot 40+ → Appel sélection → Client 3000€
```

## Stack

- **Next.js 14** (App Router) — Interface web + API
- **Prisma + SQLite** — Base de données locale (migrer vers PostgreSQL en Phase 2)
- **Tailwind CSS** — UI
- **Claude claude-sonnet-4-6** — Résumés IA automatiques
- **ManyChat webhook** — Sync onboarding

## Installation

```bash
# 1. Cloner et installer
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Remplir DATABASE_URL et ANTHROPIC_API_KEY dans .env

# 3. Créer la base de données
npm run db:push

# 4. Charger les données de démo
npm run db:seed

# 5. Lancer
npm run dev
```

Ouvrir http://localhost:3000

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/dashboard` | Vue d'ensemble pipeline + groupes actifs |
| Prospects | `/prospects` | Liste filtrée par statut |
| Détail prospect | `/prospects/[id]` | Dossier complet + résumés IA |
| Nouveau prospect | `/prospects/new` | Saisie manuelle |
| Groupes | `/groups` | Tous les groupes Reboot 40+ |
| Détail groupe | `/groups/[id]` | Checklist 7 jours + rapport IA |
| Nouveau groupe | `/groups/new` | Créer une session |
| Clients actifs | `/clients` | Accompagnements 3000€ en cours |

## Pipeline prospect

```
LEAD → ONBOARDING → CHALLENGE → CALL_SCHEDULED → CLIENT
                                              ↘ DECLINED / GHOST
```

## API

### Webhook ManyChat

**POST** `/api/webhooks/manychat`

Configure dans ManyChat → Automation → External Request :

```json
{
  "secret": "votre_secret_ici",
  "manychat_id": "{{user_id}}",
  "name": "{{full name}}",
  "phone": "{{phone}}",
  "age": "{{custom_age}}",
  "weight": "{{custom_weight}}",
  "height": "{{custom_height}}",
  "available_days": ["{{custom_day1}}", "{{custom_day2}}"],
  "nutrition_info": "{{custom_nutrition}}",
  "photos_received": true,
  "qualif_objectif": "{{custom_q1}}",
  "qualif_delai": "{{custom_q2}}",
  "qualif_frein": "{{custom_q3}}",
  "qualif_experience": "{{custom_q4}}",
  "qualif_disponible": "{{custom_q5}}",
  "qualif_sante": "{{custom_q6}}",
  "qualif_motivation": "{{custom_q7}}",
  "qualif_budget": "{{custom_q8}}"
}
```

Le webhook :
1. Crée ou met à jour le prospect
2. Génère automatiquement un résumé IA via Claude

### Résumés IA

**POST** `/api/summaries`
```json
{ "prospectId": "...", "type": "ONBOARDING" | "PRE_CALL" }
```

**POST** `/api/summaries/group`
```json
{ "groupId": "..." }
```

### CRUD Prospects

- `GET /api/prospects` — Liste (filtre ?status=LEAD)
- `POST /api/prospects` — Créer
- `GET /api/prospects/[id]` — Détail
- `PATCH /api/prospects/[id]` — Modifier / changer statut
- `DELETE /api/prospects/[id]` — Supprimer

### CRUD Groupes

- `GET /api/groups` — Liste
- `POST /api/groups` — Créer
- `PATCH /api/groups/[id]` — Modifier statut
- `POST /api/groups/[id]/participants` — Ajouter un participant
- `PATCH /api/participants/[id]` — Mettre à jour checklist / score

## Roadmap

### Phase 1 (maintenant) ✅
- CRM centralisé
- Webhook ManyChat automatique
- Résumés IA à la demande
- Checklist 7 jours par groupe

### Phase 2 (3-4 groupes simultanés)
- Migrer SQLite → PostgreSQL (Neon ou Supabase)
- Déployer sur Vercel
- Authentification (NextAuth) pour déléguer accès à des assistants
- Export Google Sheets hebdomadaire

### Phase 3 (agents Claude)
- Agent de relance automatique (détecte les ghosts après 48h)
- Rapport hebdo automatique envoyé par email
- Suggestions de DM générées par IA pour les profils sérieux
- Intégration Calendly API pour suivre les appels

## Déploiement (Phase 2)

```bash
# Vercel + Neon PostgreSQL
vercel
# Définir les variables d'environnement dans Vercel Dashboard
# Migrer DATABASE_URL vers postgresql://...
```
