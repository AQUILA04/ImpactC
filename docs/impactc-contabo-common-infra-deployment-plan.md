# Plan de déploiement production ImpactC sur Contabo

**Statut :** plan d’intégration à valider avant toute modification de l’infrastructure ou de la production.  
**Cible :** VPS Contabo existant, avec `optimize-common-infra` et `shared-traefik` comme socles mutualisés.  
**Périmètre :** API NestJS, backoffice Next.js, base PostgreSQL métier, worker BullMQ, Redis partagé, MinIO partagé, routage HTTPS, observabilité et livraison continue. Le client Expo reste distribué comme application mobile : il ne constitue pas un service Contabo.

## 1. Conclusion de l’analyse

L’infrastructure commune est adaptée à ImpactC. Elle fournit déjà les deux réseaux Docker externes requis (`optimizesolux-common` pour les dépendances internes et `traefik-public` pour l’exposition HTTPS), ainsi que Redis, MinIO, Keycloak, Vault, Mailpit et l’observabilité. Les produits doivent conserver uniquement leurs artefacts applicatifs et leur base métier. [1] [2]

ImpactC est toutefois **prêt pour le développement, mais pas encore déployable en production sans un lot de durcissement**. Les manques identifiés sont les images Docker applicatives, un compose de production, un mécanisme de migration `prisma migrate deploy`, la configuration Redis protégée par mot de passe, l’instrumentation OpenTelemetry, les contrôles de santé, la restriction Socket.io/CORS et les procédures de sauvegarde/restauration. Son authentification JWT interne est fonctionnelle, mais son modèle doit être arbitré face à la convention Keycloak de l’infrastructure commune.

| Élément ImpactC        | État observé                                           | Cible Contabo commune                          | Action de planification                                              |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------- |
| API NestJS + Socket.io | Exécution Node locale, pas d’image de production       | `traefik-public` + `optimizesolux-common`      | Créer une image multi-stage et un service `impactc-api`.             |
| Backoffice Next.js     | Exécution locale, pas d’image de production            | `traefik-public`                               | Créer une image autonome `impactc-backoffice`.                       |
| Client Expo            | Client mobile externe                                  | API HTTPS publique                             | Publier une configuration de production pointant vers l’API ImpactC. |
| PostgreSQL métier      | Compose local uniquement                               | Conteneur produit `impactc-db`, réseau interne | Garder une base dédiée, sans port exposé sur l’hôte.                 |
| Redis / BullMQ         | Hôte et port seulement ; aucun mot de passe ni préfixe | Redis commun authentifié                       | Ajouter `REDIS_PASSWORD`, index/base et préfixe `impactc:`.          |
| MinIO                  | Intégration S3 déjà livrée                             | MinIO commun `minio:9000`                      | Créer le bucket et un compte applicatif à privilèges minimaux.       |
| Authentification       | JWT local, RBAC propre à ImpactC                       | Keycloak / realm produit disponible            | Trancher la stratégie d’identité avant production.                   |
| Monitoring             | Logs stdout seulement                                  | OTel, Prometheus, Loki, Grafana communs        | Ajouter OTLP au backend et un dashboard produit.                     |

## 2. Architecture cible

Le produit sera isolé dans son propre projet Docker Compose, par exemple `/opt/optimizesolux/impactc`, sans redis, MinIO, Keycloak, pgAdmin ni stack Prometheus/Grafana/Loki embarqués. C’est exactement la frontière attendue par le guide de consommation de l’infrastructure commune. [1]

```text
Internet
  └─ Cloudflare (proxy activé, SSL Full)
       └─ shared-traefik :443
            ├─ impactc.optimizesolux.com       → impactc-web
            ├─ impactc-admin.optimizesolux.com → impactc-backoffice
            └─ impactc-api.optimizesolux.com   → impactc-api (HTTP + Socket.io /chat)

impactc-api / impactc-worker ── optimizesolux-common ──► impactc-db:5432
                                                        ► redis:6379 (authentifié)
                                                        ► minio:9000 (bucket privé)
                                                        ► vault:8200
                                                        ► otel-collector:4318
                                                        ► keycloak:8080, si stratégie Keycloak validée

impactc-web / impactc-backoffice / impactc-api ── traefik-public
```

| Service produit      | Réseaux                                  | Exposition                        | Responsabilité                                                             |
| -------------------- | ---------------------------------------- | --------------------------------- | -------------------------------------------------------------------------- |
| `impactc-api`        | `optimizesolux-common`, `traefik-public` | `impactc-api.optimizesolux.com`   | REST, Socket.io, upload média, authentification, règles métier.            |
| `impactc-worker`     | `optimizesolux-common`                   | Aucune                            | Consomme BullMQ et exécute les échéances métier.                           |
| `impactc-db`         | `optimizesolux-common`                   | Aucune                            | Données PostgreSQL exclusives à ImpactC.                                   |
| `impactc-web`        | `traefik-public`                         | `impactc.optimizesolux.com`       | Site web public, s’il est maintenu comme client web distinct.              |
| `impactc-backoffice` | `traefik-public`                         | `impactc-admin.optimizesolux.com` | Supervision Responsable/Admin.                                             |
| `impactc-migrate`    | `optimizesolux-common`                   | Aucune, tâche ponctuelle          | Exécute les migrations Prisma contrôlées avant l’activation de la release. |

Le proxy commun découvre les services via `traefik-public` et gère le TLS avec Cloudflare DNS-01. Les conventions existantes suggèrent un sous-domaine application `{slug}.optimizesolux.com` et un sous-domaine API `{slug}-api.optimizesolux.com`. [3] Le sous-domaine backoffice proposé est une extension explicite à valider : `impactc-admin.optimizesolux.com`.

## 3. Décisions d’architecture à valider avant implementation

### 3.1 Identité et Keycloak — décision bloquante

Le guide consommateur prévoit un realm Keycloak par produit. [1] ImpactC, lui, utilise actuellement l’inscription, les mots de passe bcrypt et des JWT/refresh tokens internes. Il faut choisir l’une des voies suivantes avant la première mise en production.

| Option                                     | Description                                                                                                             | Avantage                                                                              | Coût / risque                                                             | Recommandation                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **A — Migration Keycloak complète**        | Realm `impactc`, clients mobile/web/backoffice, rôles `CELIBATAIRE`, `RESPONSABLE`, `ADMIN`; l’API valide les JWT OIDC. | Conformité maximale au socle, SSO, gestion centralisée des identités et MFA possible. | Refactor d’authentification, migration des comptes et des refresh tokens. | **Cible recommandée.**                                         |
| **B — JWT ImpactC en transition**          | L’API conserve son auth actuelle ; Keycloak n’est pas une dépendance fonctionnelle dans la première release.            | Mise en ligne plus rapide, pas de migration d’identité initiale.                      | Écart au standard commun, administration et MFA à maintenir dans ImpactC. | Acceptable uniquement avec une échéance formelle de migration. |
| **C — Keycloak pour backoffice seulement** | Les équipes internes utilisent Keycloak ; les membres restent sur JWT local.                                            | Réduit le risque sur l’onboarding des membres.                                        | Deux modèles d’identité à gérer temporairement.                           | Bon compromis si le backoffice est prioritaire.                |

Aucune donnée utilisateur ne sera migrée ou écrasée avant la validation d’une option et un plan de reprise des comptes.

### 3.2 Services externes et échelle

ImpactC utilise BullMQ/Redis pour les jalons de parcours et Socket.io pour le chat. Une seule réplique API est acceptable pour le lancement ; le worker doit être séparé avant le scale-out. Avec plusieurs répliques API, il faudra ajouter l’adaptateur Socket.io Redis et une stratégie de session WebSocket cohérente, afin que les messages d’un Journey atteignent les clients reliés à d’autres répliques.

Mailpit est un outil de capture SMTP de développement ; il ne doit pas être utilisé pour délivrer des messages aux membres en production. Tant qu’ImpactC ne délivre que des notifications en base, aucune dépendance SMTP publique n’est requise. Si les e-mails transactionnels sont activés, le plan doit ajouter un fournisseur SMTP réel et ses secrets.

## 4. Plan de réalisation proposé

### Phase 0 — Gouvernance, inventaire et fenêtre de changement

Valider les trois hôtes publics, le propriétaire de la zone Cloudflare, l’option d’identité, la politique de conservation des médias et la fenêtre de déploiement. Créer les environnements GitHub `test` et `prod`, avec approbation manuelle obligatoire pour `prod`. Définir des objectifs de restauration pour la base et les médias avant toute donnée réelle.

**Critère de sortie :** domaines, responsables, stratégie identité et stratégie de sauvegarde documentés et approuvés.

### Phase 1 — Préparer et valider les socles Contabo

Sur le VPS, vérifier que `shared-traefik` est actif et que les réseaux externes `traefik-public` et `optimizesolux-common` existent. Mettre à jour et démarrer le socle avec l’installateur idempotent documenté : profils `core`, `observability` et `mesh`. [4] Initialiser et unseal Vault si nécessaire, puis stocker de façon protégée les clés d’un compte de déploiement GitHub et les secrets de l’infrastructure. Vault utilise un stockage fichier et redémarre scellé : cette opération doit appartenir à un runbook d’astreinte. [5]

Créer les enregistrements DNS `impactc`, `impactc-api` et `impactc-admin` vers le VPS avec proxy Cloudflare activé et SSL mode `Full`. Le certificat est délivré par le proxy partagé, à condition que le token DNS Cloudflare soit disponible. [3]

**Critère de sortie :** HTTPS valide pour une application de test, réseaux Docker présents, services communs sains dans Grafana et Vault opérationnel.

### Phase 2 — Durcir ImpactC pour l’environnement production

Créer des Dockerfiles multi-stage reproductibles pour le backend NestJS et le backoffice Next.js ; construire le client Expo séparément avec sa variable API de production. Ajouter un endpoint `GET /health/live` sans dépendance et un endpoint `GET /health/ready` vérifiant PostgreSQL, Redis et MinIO. Ne pas employer la page Swagger comme sonde de disponibilité.

Modifier le backend afin de lire et valider au démarrage les variables de production. Les changements minimaux sont : prise en charge de `REDIS_PASSWORD`, configuration d’un préfixe BullMQ `impactc:`, usage d’un index Redis réservé, restriction de l’origine Socket.io par `FRONTEND_ORIGINS`, et réglages CORS limités aux hôtes HTTPS ImpactC. Les secrets JWT doivent être longs, aléatoires, différents entre access/refresh et jamais inclus dans les images.

Adapter le service média à MinIO commun : `S3_ENDPOINT=http://minio:9000`, bucket privé `impactc-media`, identifiant MinIO applicatif dédié, région `us-east-1`. Le bucket et sa politique doivent être provisionnés par un job d’infrastructure avant le démarrage applicatif. L’API ne doit pas utiliser le compte root MinIO et le compte ImpactC ne doit avoir accès qu’à son bucket et aux opérations objet nécessaires.

Séparer le worker du serveur API. Le scheduler BullMQ actuel est idempotent grâce à `upsertJobScheduler`, mais héberger processeur et API dans chaque réplique compliquerait l’exploitation. Le conteneur `impactc-worker` prendra le processeur des échéances ; l’API n’exécutera que l’interface HTTP/WebSocket.

Enfin, intégrer l’OpenTelemetry Node SDK au backend avec `OTEL_SERVICE_NAME=impactc-api`, `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318`, le protocole HTTP/protobuf et les attributs de service communs. L’infrastructure fournit déjà CPU/RAM et logs de conteneurs ; les métriques métier, erreurs et traces applicatives doivent être explicitement émises par ImpactC. [6]

**Critère de sortie :** images prod locales construites, migrations non destructives testées sur une copie, smoke tests conteneurisés réussis et aucune dépendance locale restée dans le compose produit.

### Phase 3 — Créer le projet Compose ImpactC sur Contabo

Créer un répertoire autonome `/opt/optimizesolux/impactc` contenant le compose de production, le fichier `.env` avec permissions `0600`, les scripts `deploy.sh`, `rollback.sh`, `backup.sh` et un fichier de release horodaté. Conserver seulement `impactc-api`, `impactc-worker`, `impactc-db`, `impactc-web`, `impactc-backoffice` et le job `impactc-migrate`.

La base PostgreSQL devra être attachée à `optimizesolux-common` sous l’alias `impactc-db`, sans publier le port 5432 sur l’hôte. Ce nom stable permet l’administration via pgAdmin commun sans élargir la surface réseau. [2] Les données PostgreSQL seront stockées dans un volume nominatif ImpactC, distinct des volumes du socle commun.

Ajouter les labels Traefik aux seuls services publics. L’API sera routée sur son sous-domaine complet et supportera aussi l’upgrade WebSocket Socket.io. Le frontend et le backoffice n’accèdent pas à `optimizesolux-common` s’ils n’utilisent aucune dépendance interne ; l’API et le worker y sont raccordés.

**Critère de sortie :** `docker compose config` valide, aucun port produit exposé directement sur le VPS, et les services sont visibles uniquement par les réseaux nécessaires.

### Phase 4 — Provisionner les données et secrets

Créer la base, l’utilisateur PostgreSQL dédié et les secrets ImpactC. Le schéma Vault recommandé étend la convention existante :

```text
secret/data/optimizesolux/impactc/db
secret/data/optimizesolux/impactc/auth
secret/data/optimizesolux/impactc/redis
secret/data/optimizesolux/impactc/s3
secret/data/optimizesolux/impactc/oidc     # si Keycloak est retenu
secret/data/optimizesolux/impactc/smtp     # si e-mail transactionnel activé
```

Créer un rôle AppRole ImpactC à lecture minimale, puis fournir `role_id` et `secret_id` uniquement au processus de déploiement ou à un Vault Agent. [5] Pour la première version, les secrets peuvent être matérialisés dans le `.env` produit avec permissions strictes, mais la cible doit être une injection via Vault Agent afin de ne pas dupliquer durablement les secrets entre CI et serveur.

Exécuter `prisma migrate deploy`, jamais `prisma migrate dev`, avant l’activation de la nouvelle image. Ne lancer le seed de comptes privilégiés qu’avec une procédure explicite et idempotente, sans réinitialiser les données réelles.

**Critère de sortie :** migration appliquée, accès MinIO testé avec l’identité dédiée, Redis authentifié, secrets non présents dans Git ni dans les logs CI.

### Phase 5 — Mettre en place la livraison continue et le rollback

Étendre l’actuel workflow `quality.yml` par un pipeline de livraison. Après les builds et les régressions P0–P2, GitHub Actions construira les images du backend et du backoffice, les publiera dans GHCR avec un tag SHA immuable, puis déclenchera un déploiement SSH protégé par l’environnement `prod`. Cette approche est cohérente avec les conventions du socle : image immuable, release horodatée et rollback vers la précédente image connue. [7]

Les secrets GitHub minimum déjà attendus sont une clé SSH de déploiement, l’hôte/compte Contabo et les identifiants GHCR. [8] Ajouter les secrets propres à ImpactC dans l’environnement `prod`, pas au niveau global du dépôt, et éviter toute valeur de production dans les variables de workflow en clair.

Le déploiement procédera dans l’ordre suivant : téléchargement des images, sauvegarde pré-déploiement, migration Prisma, démarrage du worker, remplacement contrôlé de l’API puis des frontends, smoke tests HTTPS/API/WebSocket, création du manifeste de release. En cas d’échec de smoke test, le script revient aux tags précédents ; une migration irréversible impose une procédure de restauration testée avant l’exécution.

**Critère de sortie :** déploiement test reproductible depuis un SHA, rollback démontré, approbation manuelle de production active.

### Phase 6 — Validation préproduction puis bascule production

Créer d’abord une stack de préproduction avec des hôtes distincts, des secrets différents et des données anonymisées. Tester : inscription, modération, découverte, upload original/miniature via MinIO commun, création Journey, réception Socket.io, worker d’échéance, contrôle RBAC, CORS depuis les deux frontends, redémarrage de conteneur, restore PostgreSQL et accès Grafana/Loki.

Après acceptation, répéter exactement la même release en production. Les contrôles de sortie sont le healthcheck API, le test d’un login autorisé, le test upload/lecture de miniature, les métriques OTel visibles, l’absence d’erreurs dans Loki et la présence d’une sauvegarde exploitable.

## 5. Sauvegarde, sécurité et exploitation

| Domaine            | Exigence de production                                             | Mise en œuvre à planifier                                                                                                           |
| ------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL ImpactC | Restauration documentée et testée, pas seulement un volume Docker. | Dump chiffré quotidien + conservation définie + copie hors VPS ; test de restauration mensuel.                                      |
| Médias MinIO       | Les photos sont des données personnelles.                          | Bucket privé, compte dédié, sauvegarde/versioning ou réplication hors VPS, politique de suppression alignée aux demandes RGPD.      |
| Secrets            | Pas de secret Git, image ou log.                                   | Vault/AppRole, GitHub environments, `.env` serveur en `0600` seulement si transition.                                               |
| Réseau             | Réduire les ports de l’hôte.                                       | Seuls 80/443 publics ; PostgreSQL, Redis, MinIO et Vault accessibles via réseaux Docker selon besoin.                               |
| Identité           | Réduction du risque de prise de compte.                            | Choisir Keycloak ou documenter l’exception ; rotation des JWT secrets, politique de mot de passe/MFA pour le backoffice.            |
| Journaux           | Ne pas exposer de données sensibles.                               | Logs structurés stdout, redaction de jetons/médias/coordonnées ; rétention Loki définie.                                            |
| Disponibilité      | Éviter les faux déploiements sains.                                | Healthchecks readiness, restart `unless-stopped`, alertes à définir car Alertmanager n’est pas encore inclus dans common-infra. [6] |

## 6. Séquence recommandée

| Priorité | Lot                                                                 | Dépendance                                  | Résultat mesurable                                                   |
| -------: | ------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
|       P0 | Décision Keycloak/JWT, domaines, sauvegardes                        | Parties prenantes produit et infrastructure | Décisions signées, aucun choix ambigu bloquant.                      |
|       P1 | Dockerfiles, compose ImpactC, configuration Redis/MinIO/CORS/health | P0                                          | Produit conteneurisé et exécutable hors environnement local.         |
|       P2 | Base, bucket MinIO, secrets Vault, migration `deploy`               | P1 + socle Contabo                          | Services internes fonctionnels sans secrets root.                    |
|       P3 | CI GHCR, CD SSH, rollback et sauvegardes                            | P1–P2                                       | Déploiement préprod par SHA et restauration testée.                  |
|       P4 | OTel, dashboard ImpactC, scénarios E2E préprod                      | P3                                          | Observabilité et parcours métier validés sur la topologie cible.     |
|       P5 | Bascule production contrôlée                                        | P4                                          | Release active, smoke tests, monitoring et plan de rollback validés. |

## 7. Informations à confirmer

Les réponses suivantes permettent de transformer ce plan en backlog d’implémentation puis en runbook exécutable :

1. Quel domaine public doit porter ImpactC : `impactc.optimizesolux.com` ou un domaine propre ?
2. Quel choix d’identité est retenu parmi les options Keycloak/JWT, et existe-t-il déjà des comptes à migrer ?
3. Le VPS Contabo est-il déjà équipé de `shared-traefik`, `optimize-common-infra`, Vault initialisé et unseal, ainsi que des réseaux externes ?
4. Quelle politique de sauvegarde hors serveur et de conservation est requise pour PostgreSQL et les photos de profil ?
5. Faut-il déployer un site web membre, le seul backoffice, ou uniquement l’API pour le client Expo dans la première release ?
6. Quelle solution d’e-mail transactionnel est approuvée lorsque les notifications par e-mail seront activées ?
7. Une préproduction dédiée est-elle disponible ou faut-il la créer sur le même VPS avec des sous-domaines séparés ?

## 8. Distribution des APK Android

Le client Expo ImpactC est construit dans GitHub Actions après la qualité, puis signé et publié dans le bucket MinIO privé `impactc-mobile-releases`. Le même MinIO commun sert ainsi aux médias de profil côté serveur et aux artefacts APK, mais avec des identités et politiques d’accès distinctes. Le pipeline distribue les canaux `test` et `prod` sous des préfixes séparés, publie un manifeste JSON contenant la version, le SHA-256 et la clé de l’APK, et conserve parallèlement l’artefact GitHub pendant 90 jours.

La publication d’un APK `prod` nécessite le keystore de release fourni exclusivement par les secrets protégés de l’environnement GitHub `prod`. Les secrets MinIO doivent appartenir à une identité d’automatisation limitée au bucket de releases ImpactC, jamais au compte root. La procédure complète, les noms de secrets et le mécanisme de vérification sont documentés dans [`docs/mobile-apk-distribution.md`](./mobile-apk-distribution.md). Le pipeline reprend le modèle versionné dans ELYKIA tout en remplaçant le build Ionic/Capacitor par un prébuild Expo suivi de `:app:assembleRelease`. [9] [10] [11]

## Références

[1]: https://github.com/AQUILA04/optimize-common-infra/blob/main/docs/CONSUMER-GUIDE.md "Optimize Common Infra — Consumer Guide"
[2]: https://github.com/AQUILA04/optimize-common-infra/blob/main/docs/NETWORKING.md "Optimize Common Infra — Networking"
[3]: https://github.com/AQUILA04/shared-traefik/blob/main/README.md "Shared Traefik — README"
[4]: https://github.com/AQUILA04/optimize-common-infra/blob/main/install.sh "Optimize Common Infra — install.sh"
[5]: https://github.com/AQUILA04/optimize-common-infra/blob/main/docs/VAULT.md "Optimize Common Infra — Vault"
[6]: https://github.com/AQUILA04/optimize-common-infra/blob/main/docs/OBSERVABILITY.md "Optimize Common Infra — Observability"
[7]: https://github.com/AQUILA04/optimize-common-infra/blob/main/docs/MIGRATION-FROM-PRODUCTS.md "Optimize Common Infra — Product migration checklist"
[8]: https://github.com/AQUILA04/optimize-common-infra/blob/main/docs/GITHUB-SECRETS.md "Optimize Common Infra — GitHub Secrets"
[9]: https://github.com/AQUILA04/ELYKIA/blob/main/.github/actions/build-mobile-apk/action.yml "ELYKIA — APK build action"
[10]: https://github.com/AQUILA04/ELYKIA/blob/main/.github/scripts/publish-mobile-apk.sh "ELYKIA — MinIO APK publication"
[11]: https://docs.expo.dev/guides/local-app-production/ "Expo — Create a release build locally"
