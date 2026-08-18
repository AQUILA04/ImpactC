# Plan de déploiement production ImpactC sur Contabo

**Statut :** architecture cible validée pour les domaines et l’identité du backoffice ; les lots techniques restent à réaliser avant la mise en production.
**Cible :** VPS Contabo existant, avec `optimize-common-infra` et `shared-traefik` comme socles mutualisés.  
**Périmètre :** API NestJS, backoffice Next.js, base PostgreSQL métier, worker BullMQ, Redis partagé, MinIO partagé, notification-hub pour les communications métier transactionnelles, routage HTTPS, observabilité et livraison continue. Le client Expo reste distribué comme application mobile : il ne constitue pas un service Contabo.

## 1. Conclusion de l’analyse

L’infrastructure commune est adaptée à ImpactC. Elle fournit déjà les deux réseaux Docker externes requis (`optimizesolux-common` pour les dépendances internes et `traefik-public` pour l’exposition HTTPS), ainsi que Redis, MinIO, Keycloak, Vault, Mailpit et l’observabilité. Les produits doivent conserver uniquement leurs artefacts applicatifs et leur base métier. [1] [2]

ImpactC est toutefois **prêt pour le développement, mais pas encore déployable en production sans un lot de durcissement**. Les manques identifiés sont les images Docker applicatives, un compose de production, un mécanisme de migration `prisma migrate deploy`, la configuration Redis protégée par mot de passe, l’instrumentation OpenTelemetry, les contrôles de santé, la restriction Socket.io/CORS et les procédures de sauvegarde/restauration. L’authentification JWT interne reste la référence pour les membres ; Keycloak est retenu uniquement pour les comptes de supervision du backoffice.

| Élément ImpactC        | État observé                                           | Cible Contabo commune                          | Action de planification                                                 |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------- |
| API NestJS + Socket.io | Exécution Node locale, pas d’image de production       | `traefik-public` + `optimizesolux-common`      | Créer une image multi-stage et un service `impactc-api`.                |
| Backoffice Next.js     | Exécution locale, pas d’image de production            | `traefik-public`                               | Créer une image autonome `impactc-backoffice`.                          |
| Client Expo            | Client mobile externe                                  | API HTTPS publique                             | Publier une configuration de production pointant vers l’API ImpactC.    |
| PostgreSQL métier      | Compose local uniquement                               | Conteneur produit `impactc-db`, réseau interne | Garder une base dédiée, sans port exposé sur l’hôte.                    |
| Redis / BullMQ         | Hôte et port seulement ; aucun mot de passe ni préfixe | Redis commun authentifié                       | Ajouter `REDIS_PASSWORD`, index/base et préfixe `impactc:`.             |
| MinIO                  | Intégration S3 déjà livrée                             | MinIO commun `minio:9000`                      | Créer le bucket et un compte applicatif à privilèges minimaux.          |
| Authentification       | JWT local, RBAC propre à ImpactC                       | Realm Keycloak `impactc` pour le backoffice    | Conserver JWT pour les membres et fédérer Responsable/Admin au realm.   |
| Notifications métier   | Outbox BullMQ et client notification-hub livrés        | API notification-hub + realm de service dédié  | Fournir les secrets OAuth2, activer l’envoi et superviser les reprises. |
| Monitoring             | Logs stdout seulement                                  | OTel, Prometheus, Loki, Grafana communs        | Ajouter OTLP au backend et un dashboard produit.                        |

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
                                                        └─ HTTPS/OAuth2 ─► notification-hub API

Navigateur backoffice ── HTTPS ──► auth.optimizesolux.com/realms/impactc (OIDC, supervision uniquement)
impactc-api / impactc-worker ── OAuth2 Client Credentials ──► realm notification-hub (compte de service, pas de connexion utilisateur)
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

Le proxy commun découvre les services via `traefik-public` et gère le TLS avec Cloudflare DNS-01. Les hôtes retenus sont `impactc.optimizesolux.com` pour l’application membre, `impactc-api.optimizesolux.com` pour l’API et le chat Socket.io, et `impactc-admin.optimizesolux.com` pour le backoffice. [3]

## 3. Décisions d’architecture retenues

### 3.1 Identité et Keycloak — choix confirmé

Le guide consommateur prévoit un realm Keycloak par produit. [1] ImpactC utilise actuellement l’inscription, les mots de passe bcrypt et des JWT/refresh tokens internes. Le choix retenu est **Keycloak pour le backoffice uniquement** : les comptes `RESPONSABLE` et `ADMIN` passent par le realm `impactc`, tandis que les membres `CELIBATAIRE` conservent l’authentification JWT ImpactC.

| Option                                     | Description                                                                                                             | Avantage                                                                              | Coût / risque                                                             | Recommandation                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| **A — Migration Keycloak complète**        | Realm `impactc`, clients mobile/web/backoffice, rôles `CELIBATAIRE`, `RESPONSABLE`, `ADMIN`; l’API valide les JWT OIDC. | Conformité maximale au socle, SSO, gestion centralisée des identités et MFA possible. | Refactor d’authentification, migration des comptes et des refresh tokens. | Non retenue pour la première production. |
| **B — JWT ImpactC en transition**          | L’API conserve son auth actuelle ; Keycloak n’est pas une dépendance fonctionnelle dans la première release.            | Mise en ligne plus rapide, pas de migration d’identité initiale.                      | Écart au standard commun, administration et MFA à maintenir dans ImpactC. | Non retenue.                             |
| **C — Keycloak pour backoffice seulement** | Les équipes internes utilisent Keycloak ; les membres restent sur JWT local.                                            | Réduit le risque sur l’onboarding des membres.                                        | Deux modèles d’identité à gouverner explicitement.                        | **Retenue.**                             |

Aucun compte membre n’est migré vers Keycloak dans cette phase. Le lot backoffice doit définir le mapping des rôles Keycloak vers `RESPONSABLE` et `ADMIN`, le provisionnement des premiers superviseurs, le contrôle des JWT OIDC côté API et une procédure de révocation des accès internes.

### 3.2 Thème Keycloak backoffice — livrable requis

Le realm `impactc` utilisera le thème propriétaire **`impactc-backoffice`** pour les types `login`, `email` et `account`. Il étendra le thème Keycloak plutôt que de modifier les ressources embarquées, afin de limiter le coût des mises à jour. Le thème devra être livré comme archive JAR versionnée dans l’image Keycloak de `optimize-common-infra` ou comme montage en lecture seule administré par ce dépôt. [12]

| Parcours ou gabarit                                    | Exigence ImpactC                                                                                  | Règle de sécurité et d’expérience                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `login.ftl`                                            | Connexion Responsable/Admin, marque ImpactC, lien d’assistance et état de session expirée.        | Libellés français, labels visibles, navigation clavier, contraste minimal 4,5:1 et aucun identifiant prérempli.                    |
| `login-reset-password.ftl`                             | Demande « Mot de passe oublié ».                                                                  | Réponse générique, sans révéler si une adresse existe ; redirection HTTPS seulement.                                               |
| `login-update-password.ftl`                            | Premier accès, mot de passe temporaire et changement imposé.                                      | Confirmation de mot de passe, politique de robustesse affichée et message d’erreur au champ.                                       |
| `login-verify-email.ftl` et `login-config-totp.ftl`    | Vérification de l’e-mail et enrôlement MFA des superviseurs.                                      | `VERIFY_EMAIL` et `CONFIGURE_TOTP` requis avant l’accès au backoffice.                                                             |
| `info.ftl`, `error.ftl`, `login-otp.ftl`, `footer.ftl` | États de succès, erreur, code MFA et aide.                                                        | Messages non techniques, pas de détail sur les comptes, lien vers le support interne.                                              |
| `account`                                              | Consultation de session, changement de mot de passe et gestion MFA par le superviseur.            | Même charte, accès HTTPS et contrôle de session Keycloak.                                                                          |
| E-mails HTML et texte                                  | Réinitialisation de mot de passe, actions imposées, vérification d’e-mail et alertes de sécurité. | Domaine expéditeur validé, URLs absolues HTTPS, contenu français, expiration claire et absence de données personnelles superflues. |

Le design est **minimaliste, professionnel et accessible**, avec fond clair `#F8FAFC`, texte `#1E293B`, primaire `#2563EB`, accent `#F97316` limité aux appels à l’action, et typographie Inter. Les ressources doivent être locales, légères, sans script tiers ni pisteur. Les variantes sombre et mouvement réduit doivent respecter les préférences du navigateur. Le français est la locale par défaut et l’anglais est le repli.

Le realm activera `Forgot Password`, `Verify Email` et l’exécution des actions requises `UPDATE_PASSWORD` et `CONFIGURE_TOTP`. L’SMTP de production est donc un prérequis de première version : Mailpit reste limité aux tests locaux. Les tests doivent couvrir l’envoi de chaque e-mail, l’expiration du lien, la réutilisation d’un lien, l’échec MFA, la déconnexion et le blocage après échecs successifs.

### 3.3 Services externes et échelle

ImpactC utilise BullMQ/Redis pour les jalons de parcours et Socket.io pour le chat. Une seule réplique API est acceptable pour le lancement ; le worker doit être séparé avant le scale-out. Avec plusieurs répliques API, il faudra ajouter l’adaptateur Socket.io Redis et une stratégie de session WebSocket cohérente, afin que les messages d’un Journey atteignent les clients reliés à d’autres répliques.

Mailpit est un outil de capture SMTP de développement ; il ne doit pas être utilisé en production. Les notifications métier ImpactC — profil approuvé ou renvoyé en révision, premier rendez-vous et jalons de parcours — sont transmises exclusivement à **notification-hub** via l’outbox persistante et idempotente. L’échec temporaire de notification-hub ne doit jamais annuler la décision métier : BullMQ rejoue l’événement avec délai exponentiel. Les e-mails d’identité Keycloak — vérification d’e-mail, oubli de mot de passe, mot de passe temporaire, MFA/TOTP et gestion de compte — restent, eux, configurés avec le fournisseur SMTP de Keycloak. Les deux chaînes d’envoi utilisent des comptes, secrets et journaux séparés.

## 4. Plan de réalisation proposé

### Phase 0 — Gouvernance, inventaire et fenêtre de changement

Configurer les trois hôtes publics retenus, confirmer le propriétaire de la zone Cloudflare, la politique de conservation des médias et la fenêtre de déploiement. Créer les environnements GitHub `test` et `prod`, avec approbation manuelle obligatoire pour `prod`. Définir des objectifs de restauration pour la base et les médias avant toute donnée réelle.

**Critère de sortie :** domaines et stratégie d’identité configurés, responsables Cloudflare identifiés et stratégie de sauvegarde documentée.

### Phase 1 — Préparer et valider les socles Contabo

Sur le VPS, vérifier que `shared-traefik` est actif et que les réseaux externes `traefik-public` et `optimizesolux-common` existent. Mettre à jour et démarrer le socle avec l’installateur idempotent documenté : profils `core`, `observability` et `mesh`. [4] Initialiser et unseal Vault si nécessaire, puis stocker de façon protégée les clés d’un compte de déploiement GitHub et les secrets de l’infrastructure. Vault utilise un stockage fichier et redémarre scellé : cette opération doit appartenir à un runbook d’astreinte. [5]

Créer les enregistrements DNS `impactc`, `impactc-api` et `impactc-admin` vers le VPS avec proxy Cloudflare activé et SSL mode `Full`. Le certificat est délivré par le proxy partagé, à condition que le token DNS Cloudflare soit disponible. [3]

**Critère de sortie :** HTTPS valide pour une application de test, réseaux Docker présents, services communs sains dans Grafana et Vault opérationnel.

### Phase 2 — Durcir ImpactC pour l’environnement production

Créer des Dockerfiles multi-stage reproductibles pour le backend NestJS et le backoffice Next.js ; construire le client Expo séparément avec sa variable API de production. Ajouter un endpoint `GET /health/live` sans dépendance et un endpoint `GET /health/ready` vérifiant PostgreSQL, Redis et MinIO. Ne pas employer la page Swagger comme sonde de disponibilité.

Modifier le backend afin de lire et valider au démarrage les variables de production. Les changements minimaux sont : prise en charge de `REDIS_PASSWORD`, configuration d’un préfixe BullMQ `impactc:`, usage d’un index Redis réservé, restriction de l’origine Socket.io par `FRONTEND_ORIGINS`, et réglages CORS limités aux hôtes HTTPS ImpactC. Les secrets JWT membres doivent être longs, aléatoires, différents entre access/refresh et jamais inclus dans les images.

Intégrer Keycloak **uniquement au backoffice** : créer le realm `impactc` dans `optimize-common-infra`, le client OIDC `impactc-backoffice` avec redirections limitées à `https://impactc-admin.optimizesolux.com/*`, les rôles realm `RESPONSABLE` et `ADMIN`, ainsi que les premiers comptes de supervision. Le backoffice utilisera Authorization Code avec PKCE vers `https://auth.optimizesolux.com/realms/impactc`; l’API validera les access tokens OIDC uniquement sur les routes de supervision et mappera les rôles Keycloak vers son RBAC existant. Les routes membres et le client Expo restent sur les JWT ImpactC.

Construire et packager le thème `impactc-backoffice` avec ses types `login`, `email` et `account`, ses traductions `fr`/`en`, son favicon et ses gabarits de connexion, oubli/réinitialisation de mot de passe, mise à jour obligatoire, vérification e-mail, MFA, erreurs et e-mails transactionnels. Le realm sélectionnera ce thème pour Login, Account et Email, activera `Forgot Password` et rendra `VERIFY_EMAIL`, `UPDATE_PASSWORD` et `CONFIGURE_TOTP` obligatoires pour les rôles de supervision.

Adapter le service média à MinIO commun : `S3_ENDPOINT=http://minio:9000`, bucket privé `impactc-media`, identifiant MinIO applicatif dédié, région `us-east-1`. Le bucket et sa politique doivent être provisionnés par un job d’infrastructure avant le démarrage applicatif. L’API ne doit pas utiliser le compte root MinIO et le compte ImpactC ne doit avoir accès qu’à son bucket et aux opérations objet nécessaires.

Configurer notification-hub comme dépendance métier externe, sans SMTP direct dans ImpactC : `NOTIFICATION_HUB_ENABLED=true`, URL de l’API, tenant et application `impactc`, adresse émettrice validée, délai de requête et identifiants OAuth2 `impactc-notification-sender`. Le compte de service vit dans le realm `notification-hub`, porte l’audience `notification-hub-api`, le rôle minimal `notification-sender` et le claim `tenant_id=impactc`. Il est strictement distinct du realm `impactc` utilisé par Keycloak pour le backoffice. Vérifier les notifications de profil, rendez-vous et jalons, l’idempotence et la reprise après indisponibilité ; aucune donnée de conversation, coordonnée, donnée de santé ou identité d’un tiers ne doit quitter ImpactC.

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
secret/data/optimizesolux/impactc/oidc              # client OIDC backoffice Keycloak
secret/data/optimizesolux/impactc/notification-hub  # OAuth2 Client Credentials du service impactc-notification-sender
secret/data/optimizesolux/impactc/smtp              # SMTP Keycloak : réinitialisation, vérification et actions requises
```

Créer un rôle AppRole ImpactC à lecture minimale, puis fournir `role_id` et `secret_id` uniquement au processus de déploiement ou à un Vault Agent. [5] Pour la première version, les secrets peuvent être matérialisés dans le `.env` produit avec permissions strictes, mais la cible doit être une injection via Vault Agent afin de ne pas dupliquer durablement les secrets entre CI et serveur.

Exécuter `prisma migrate deploy`, jamais `prisma migrate dev`, avant l’activation de la nouvelle image. Ne lancer le seed de comptes privilégiés qu’avec une procédure explicite et idempotente, sans réinitialiser les données réelles.

**Critère de sortie :** migration appliquée, accès MinIO testé avec l’identité dédiée, Redis authentifié, test d’envoi notification-hub avec un compte de préproduction, secrets non présents dans Git ni dans les logs CI.

### Phase 5 — Mettre en place la livraison continue et le rollback

Étendre l’actuel workflow `quality.yml` par un pipeline de livraison. Après les builds et les régressions P0–P2, GitHub Actions construira les images du backend et du backoffice, les publiera dans GHCR avec un tag SHA immuable, puis déclenchera un déploiement SSH protégé par l’environnement `prod`. Cette approche est cohérente avec les conventions du socle : image immuable, release horodatée et rollback vers la précédente image connue. [7]

Les secrets GitHub minimum déjà attendus sont une clé SSH de déploiement, l’hôte/compte Contabo et les identifiants GHCR. [8] Ajouter les secrets propres à ImpactC dans l’environnement `prod`, pas au niveau global du dépôt, et éviter toute valeur de production dans les variables de workflow en clair.

Le déploiement procédera dans l’ordre suivant : téléchargement des images, sauvegarde pré-déploiement, migration Prisma, démarrage du worker, remplacement contrôlé de l’API puis des frontends, smoke tests HTTPS/API/WebSocket, création du manifeste de release. En cas d’échec de smoke test, le script revient aux tags précédents ; une migration irréversible impose une procédure de restauration testée avant l’exécution.

**Critère de sortie :** déploiement test reproductible depuis un SHA, rollback démontré, approbation manuelle de production active.

### Phase 6 — Validation préproduction puis bascule production

Créer d’abord une stack de préproduction avec des hôtes distincts, des secrets différents et des données anonymisées. Tester : inscription, modération, découverte, upload original/miniature via MinIO commun, création Journey, réception Socket.io, worker d’échéance, contrôle RBAC, CORS depuis les deux frontends, redémarrage de conteneur, restore PostgreSQL et accès Grafana/Loki. Valider notification-hub sur les quatre événements externalisés (profil approuvé, profil renvoyé en révision, premier rendez-vous et jalon de parcours), la déduplication par clé d’idempotence et la reprise après indisponibilité sans retour arrière métier. Pour Keycloak, tester les écrans de connexion, mot de passe oublié, e-mail de réinitialisation, lien expiré ou réutilisé, mot de passe imposé, vérification e-mail, configuration TOTP, erreur MFA, déconnexion, messages français et parcours clavier.

Après acceptation, répéter exactement la même release en production. Les contrôles de sortie sont le healthcheck API, le test d’un login OIDC `RESPONSABLE` puis `ADMIN` dans le backoffice, le refus d’un token membre sur les routes de supervision, le test upload/lecture de miniature, les métriques OTel visibles, l’absence d’erreurs dans Loki et la présence d’une sauvegarde exploitable.

## 5. Sauvegarde, sécurité et exploitation

| Domaine              | Exigence de production                                             | Mise en œuvre à planifier                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL ImpactC   | Restauration documentée et testée, pas seulement un volume Docker. | Dump chiffré quotidien + conservation définie + copie hors VPS ; test de restauration mensuel.                                                                                                                |
| Médias MinIO         | Les photos sont des données personnelles.                          | Bucket privé, compte dédié, sauvegarde/versioning ou réplication hors VPS, politique de suppression alignée aux demandes RGPD.                                                                                |
| Secrets              | Pas de secret Git, image ou log.                                   | Vault/AppRole, GitHub environments, `.env` serveur en `0600` seulement si transition.                                                                                                                         |
| Réseau               | Réduire les ports de l’hôte.                                       | Seuls 80/443 publics ; PostgreSQL, Redis, MinIO et Vault accessibles via réseaux Docker selon besoin.                                                                                                         |
| Identité             | Réduction du risque de prise de compte.                            | Realm Keycloak `impactc`, thème `impactc-backoffice` Login/Email/Account, Authorization Code + PKCE, MFA obligatoire, mapping RBAC vérifié, SMTP Keycloak transactionnel et rotation séparée des JWT membres. |
| Notifications métier | Livraison asynchrone sans bloquer une décision métier.             | notification-hub avec OAuth2 Client Credentials, tenant `impactc`, outbox persistante, clés d’idempotence, reprises BullMQ, alertes sur échecs définitifs et minimisation stricte des données.                |
| Journaux             | Ne pas exposer de données sensibles.                               | Logs structurés stdout, redaction de jetons/médias/coordonnées ; rétention Loki définie.                                                                                                                      |
| Disponibilité        | Éviter les faux déploiements sains.                                | Healthchecks readiness, restart `unless-stopped`, alertes à définir car Alertmanager n’est pas encore inclus dans common-infra. [6]                                                                           |

## 6. Séquence recommandée

| Priorité | Lot                                                                 | Dépendance                                  | Résultat mesurable                                                                 |
| -------: | ------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
|       P0 | Realm, thème Keycloak backoffice, domaines et sauvegardes           | Parties prenantes produit et infrastructure | Realm/client OIDC/thème/SMTP configurés, DNS déclaré, aucun choix ambigu bloquant. |
|       P1 | Dockerfiles, compose ImpactC, configuration Redis/MinIO/CORS/health | P0                                          | Produit conteneurisé et exécutable hors environnement local.                       |
|       P2 | Base, bucket MinIO, secrets Vault, migration `deploy`               | P1 + socle Contabo                          | Services internes fonctionnels sans secrets root.                                  |
|       P3 | CI GHCR, CD SSH, rollback et sauvegardes                            | P1–P2                                       | Déploiement préprod par SHA et restauration testée.                                |
|       P4 | OTel, dashboard ImpactC, scénarios E2E préprod                      | P3                                          | Observabilité et parcours métier validés sur la topologie cible.                   |
|       P5 | Bascule production contrôlée                                        | P4                                          | Release active, smoke tests, monitoring et plan de rollback validés.               |

## 7. Informations restant à confirmer

Les choix de domaine et d’identité sont arrêtés. Les réponses suivantes permettent de transformer le plan en backlog d’implémentation puis en runbook exécutable :

1. Le VPS Contabo est-il déjà équipé de `shared-traefik`, `optimize-common-infra`, Vault initialisé et unseal, ainsi que des réseaux externes ?
2. Quelle politique de sauvegarde hors serveur et de conservation est requise pour PostgreSQL et les photos de profil ?
3. Faut-il déployer un site web membre, le seul backoffice, ou uniquement l’API pour le client Expo dans la première release ?
4. L’API notification-hub, son realm `notification-hub`, le compte de service `impactc-notification-sender` et l’adresse expéditrice ImpactC sont-ils prêts en préproduction, tandis que le SMTP Keycloak reste configuré séparément pour les e-mails d’identité ?
5. Une préproduction dédiée est-elle disponible ou faut-il la créer sur le même VPS avec des sous-domaines séparés ?

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
[12]: https://www.keycloak.org/ui-customization/themes "Keycloak — Working with themes"
