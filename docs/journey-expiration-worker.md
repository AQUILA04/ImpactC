# Worker d’échéances Journey

## Objet

Le worker BullMQ `journey-expiration` surveille les Journeys actifs et crée une notification de revue au Responsable affecté. Le job est planifié quotidiennement à 06:00 par défaut et son calendrier est configurable.

| Étape Journey | Jalon contrôlé | Effet |
|---|---|---|
| Step 2 — Étude 1 mois | J30, à l’expiration | Une notification `JOURNEY_EXPIRING` avec le jalon `STEP_2_DAY_30` est créée. |
| Step 3 — Étude 3 mois | J85, cinq jours avant l’expiration | Une notification `JOURNEY_EXPIRING` avec le jalon `STEP_3_DAY_85` est créée. |
| Step 3 — Étude 3 mois | J90, à l’expiration | Une notification `JOURNEY_EXPIRING` avec le jalon `STEP_3_DAY_90` est créée. |

Chaque jalon est **idempotent** : une seconde exécution ne crée pas de doublon pour un même Journey et un même jalon.

## Configuration

| Variable | Exemple | Rôle |
|---|---|---|
| `REDIS_HOST` | `redis` | Hôte Redis partagé par l’API et le worker. |
| `REDIS_PORT` | `6379` | Port Redis. |
| `JOURNEY_EXPIRATION_CRON` | `0 6 * * *` | Horaire quotidien du scan, au format cron. |
| `DATABASE_URL` | `postgresql://…` | Base PostgreSQL contenant les Journeys et notifications. |

L’API NestJS instancie le scheduler et le processor BullMQ. En production, l’application doit rester démarrée avec un accès stable à PostgreSQL et Redis. Pour augmenter la résilience, exécuter au moins deux instances applicatives est possible : le planificateur BullMQ porte le même identifiant et évite la création de jobs planifiés concurrents.

## Vérification opérationnelle

Le scan manuel est disponible à l’endpoint protégé `POST /api/internal/journeys/check-expirations`. Il est réservé aux Administrateurs et doit être utilisé pour un diagnostic exceptionnel ; les exécutions normales proviennent de la file BullMQ.

En développement, les commandes suivantes valident le parcours :

```bash
cd backoffice-web
npm run test:e2e -- --grep '@p1 @journey @expiration'
```

La suite Playwright utilise la base isolée `impactc_e2e`, applique les migrations, crée les comptes de test et démontre l’alerte J30 ainsi que son idempotence.
