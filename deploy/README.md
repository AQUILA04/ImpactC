# Exploitation Contabo — lot P1 ImpactC

Ce dossier prépare la topologie Docker Compose d’ImpactC pour le VPS Contabo et les réseaux mutualisés `optimizesolux-common` et `traefik-public`. Il ne contient aucun secret de production ni aucun bind mount de code applicatif. Les images sont consommées par tag SHA immuable ; leur construction et leur publication GHCR relèvent du lot P3.

> **Frontière de responsabilité.** ImpactC possède sa base PostgreSQL et ses processus applicatifs. Redis, MinIO, Keycloak, Vault, Traefik et l’observabilité restent des services du socle `optimize-common-infra` et ne doivent pas être recréés dans ce compose.

## Topologie livrée

| Service              | Image ou rôle                       | Réseaux                | Vérification         | Responsabilité                                                       |
| -------------------- | ----------------------------------- | ---------------------- | -------------------- | -------------------------------------------------------------------- |
| `impactc-db`         | PostgreSQL 16 dédié                 | `optimizesolux-common` | `pg_isready`         | Données métier ImpactC, sans port publié sur le VPS.                 |
| `impactc-migrate`    | Cible Docker `migrator`             | `optimizesolux-common` | Exécution ponctuelle | Applique `prisma migrate deploy` avant une release.                  |
| `impactc-api`        | Cible Docker runtime                | Commun + Traefik       | `GET /health/ready`  | REST, Socket.io, médias et règles métier.                            |
| `impactc-worker`     | Même image que l’API, rôle `worker` | Commun                 | Processus actif      | Échéances Journey et livraison/reprise de l’outbox notification-hub. |
| `impactc-backoffice` | Next.js standalone                  | Traefik                | Réponse HTTP locale  | Interface Responsable/Admin OIDC.                                    |

Les dépendances déclarées avec `condition: service_healthy` imposent l’état sain de PostgreSQL avant les services ImpactC concernés. Cette forme longue de `depends_on` est le mécanisme Compose prévu pour attendre une sonde de santé de dépendance. [1]

## Préparation du serveur

Sur le VPS, le socle commun et Traefik doivent déjà être démarrés. Créer le répertoire applicatif, récupérer les manifests de release puis matérialiser les secrets depuis Vault dans un fichier `.env` limité au compte de déploiement. Ne pas copier ce fichier dans le dépôt, une image ou un artefact CI.

```bash
sudo install --directory --owner="$USER" --group="$USER" --mode=0750 /opt/optimizesolux/impactc
cd /opt/optimizesolux/impactc
cp deploy/.env.example .env
chmod 0600 .env
```

Les valeurs réelles proviennent des chemins Vault `secret/data/optimizesolux/impactc/{db,auth,redis,s3,oidc,notification-hub}`. `POSTGRES_PASSWORD` et le mot de passe figurant dans `DATABASE_URL` doivent représenter la même identité, avec un mot de passe correctement encodé dans l’URL si nécessaire.

| Groupe de configuration | Règle de production                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Images                  | Renseigner `IMPACTC_API_IMAGE`, `IMPACTC_MIGRATOR_IMAGE` et `IMPACTC_BACKOFFICE_IMAGE` avec le **même SHA de release**.                                           |
| PostgreSQL              | Employer l’hôte interne `impactc-db`; ne jamais publier `5432` sur le VPS.                                                                                        |
| Redis                   | Utiliser le mot de passe du socle, l’index dédié `6` et le préfixe BullMQ `impactc`.                                                                              |
| MinIO                   | Employer une identité dédiée au bucket `impactc-media`; garder `S3_AUTO_CREATE_BUCKET=false`. Le bucket est provisionné hors de l’API.                            |
| Keycloak                | Conserver le realm `impactc` pour le seul backoffice. Les membres continuent à utiliser les JWT ImpactC.                                                          |
| Notification-hub        | Fournir un Client Credentials du realm **`notification-hub`**, distinct du realm Keycloak `impactc`. Les e-mails d’identité Keycloak conservent leur SMTP propre. |

## Déploiement d’une release

Le fichier Compose consomme des images déjà construites et n’exécute jamais un build sur Contabo. Cette séparation évite les sources et dépendances de développement sur le serveur de production, conformément aux recommandations Compose pour un déploiement dédié. [2]

Avant l’activation, vérifier la configuration rendue puis récupérer les images. Appliquer la migration dans le conteneur spécialisé avant de démarrer les processus persistants. `prisma migrate deploy` est la commande adaptée aux migrations en préproduction et production, où elle applique les migrations en attente sans utiliser `migrate dev`. [3]

```bash
cd /opt/optimizesolux/impactc

docker compose --env-file .env -f deploy/docker-compose.prod.yml config >/dev/null
docker compose --env-file .env -f deploy/docker-compose.prod.yml pull

docker compose --env-file .env -f deploy/docker-compose.prod.yml \
  --profile migrate run --rm impactc-migrate

docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d \
  impactc-db impactc-api impactc-worker impactc-backoffice
```

Après démarrage, vérifier l’état des services, puis contrôler les sondes externes au travers des sous-domaines HTTPS. L’API ne doit être considérée disponible que lorsque `/health/ready` renvoie `200` et les trois composants `postgresql`, `redis` et `minio` à `up`.

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
curl --fail --silent https://impactc-api.optimizesolux.com/health/live
curl --fail --silent https://impactc-api.optimizesolux.com/health/ready
curl --fail --silent https://impactc-admin.optimizesolux.com/
```

## Interprétation des sondes

| Endpoint            | Contrat                                                                                                 | Utilisation                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `GET /health/live`  | Retourne `200` dès que le processus HTTP est vivant, sans joindre une dépendance.                       | Détecte un processus bloqué ou arrêté.                                        |
| `GET /health/ready` | Retourne `200` seulement si PostgreSQL, Redis et le bucket MinIO sont joignables; retourne `503` sinon. | Bloque l’activation d’une release et alimente le healthcheck Docker de l’API. |

Le worker n’expose pas de port public. Il démarre `dist/src/worker` lorsque `IMPACTC_PROCESS_ROLE=worker`; l’API démarre `dist/src/main` avec `IMPACTC_PROCESS_ROLE=api`. Ainsi, les processeurs BullMQ ne tournent que dans `impactc-worker`, ce qui évite les doublons lorsque l’API est répliquée ultérieurement.

## Diagnostic et retour arrière

En cas d’échec de readiness, consulter d’abord les statuts puis les logs du service concerné. Les erreurs détaillées restent dans les journaux structurés et ne sont pas renvoyées par l’endpoint de santé.

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs --tail=200 impactc-api
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs --tail=200 impactc-worker
```

Une release applicative réversible consiste à remettre les trois tags d’images de la release précédente dans `.env`, puis à relancer les services applicatifs. Une migration destructive ne doit **jamais** être annulée par simple rollback d’image : restaurer d’abord une sauvegarde PostgreSQL validée selon le runbook de données. Le lot P3 ajoutera les scripts de release horodatée, rollback automatisé et le pipeline GHCR/SSH.

## Validation effectuée dans le lot P1

Les images API, migrator et backoffice ont été construites localement. La cible `migrator` a confirmé qu’aucune migration E2E n’était en attente; l’API non privilégiée a renvoyé une readiness saine; le rôle worker a démarré séparément. La suite Playwright comporte désormais le scénario P1 de santé et totalise dix parcours fonctionnels.

## Références

[1]: https://docs.docker.com/reference/compose-file/services/ "Docker — Compose services and depends_on"
[2]: https://docs.docker.com/compose/how-tos/production/ "Docker — Use Compose in production"
[3]: https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate "Prisma — Deploy database changes"
