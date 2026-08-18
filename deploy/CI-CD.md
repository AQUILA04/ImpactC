# Livraison continue ImpactC — P3

Le pipeline P3 publie trois images GHCR **étiquetées par le SHA complet du commit** après un Quality Gate réussi : `impactc-api`, `impactc-migrator` et `impactc-backoffice`. L’API et le worker consomment la même image API, mais démarrent avec des rôles de processus distincts. Une release de production n’utilise donc aucun tag mutable tel que `latest`.

> **Ordre de sécurité.** La migration Prisma est exécutée une fois, puis les healthchecks de l’API et du backoffice doivent devenir sains avant l’écriture du pointeur de release. Un rollback ne relance jamais une migration inverse : la compatibilité de schéma doit être évaluée séparément.

## Déclencheurs

| Déclencheur                       | Effet                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Quality Gate réussi sur `main`    | Construit et publie les images GHCR par SHA. Aucune mise en production automatique.                                        |
| Quality Gate réussi sur `prod/**` | Construit les images par SHA puis déploie dans l’environnement GitHub `production`, soumis à ses règles d’approbation.     |
| Exécution manuelle du workflow    | Vérifie qu’un SHA a réussi le Quality Gate ; peut limiter l’action à la publication ou demander un déploiement production. |

Le workflow mobile demeure indépendant : il ne publie un APK que pour un SHA dont le Quality Gate a réussi. Le build des images web/API ne remplace donc ni la signature Android ni la publication MinIO de l’APK.

## Secrets GitHub requis

Configurer ces secrets dans le dépôt ImpactC. Les secrets serveur ne sont pas stockés dans GitHub : ils sont récupérés par `setup-server.sh` au moyen de l’AppRole créé par le lot P2.

| Secret                    | Portée                     | Rôle                                                                                 |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| `CONTABO_SSH_HOST`        | Environnement `production` | Hôte SSH du VPS Contabo.                                                             |
| `CONTABO_SSH_USER`        | Environnement `production` | Compte de déploiement restreint.                                                     |
| `CONTABO_SSH_PRIVATE_KEY` | Environnement `production` | Clé privée dédiée au déploiement.                                                    |
| `CONTABO_SSH_KNOWN_HOSTS` | Environnement `production` | Empreinte SSH vérifiée du VPS ; le pipeline ne désactive pas la vérification d’hôte. |
| `GHCR_PULL_TOKEN`         | Environnement `production` | Jeton à lecture des packages GHCR et lecture du dépôt privé depuis le VPS.           |

Les jobs de build utilisent `GITHUB_TOKEN` avec la permission `packages: write`. Le package GHCR doit être accessible au jeton de lecture serveur ; ne jamais substituer un PAT d’administration global si un jeton finement limité suffit.

## Bootstrap Contabo

Avant la première release, le lot P2 doit avoir été exécuté avec succès dans `optimize-common-infra`. Il crée les buckets privés, les secrets `secret/data/optimizesolux/impactc/*` et le fichier AppRole local :

```text
/opt/optimizesolux/common-infra/private/impactc/approle.env
```

Le premier déploiement crée cette arborescence :

```text
/opt/optimizesolux/impactc/
├── .env              # 0600, généré à partir de Vault
├── deploy/            # scripts synchronisés atomiquement depuis le SHA de release
├── source/            # clone de travail du dépôt, sans secrets
└── releases/          # métadonnées et pointeur prod_current.txt
```

`setup-server.sh` échange l’AppRole contre un jeton Vault court, lit uniquement les chemins ImpactC puis génère `.env` avec le mode `0600`. Les valeurs comprennent le mot de passe PostgreSQL, l’index Redis `6`, le préfixe BullMQ `impactc`, l’identité MinIO média, les secrets JWT et la clé chat AES-256. Le bucket APK et son identité de publication restent séparés de l’API.

## Déploiement et contrôle

Le script `deploy.sh` accepte exclusivement les références suivantes :

```text
ghcr.io/aquila04/impactc-api:<sha-complet>
ghcr.io/aquila04/impactc-migrator:<sha-complet>
ghcr.io/aquila04/impactc-backoffice:<sha-complet>
```

Il matérialise les tags dans `.env`, tire les images, attend PostgreSQL, exécute `prisma migrate deploy`, démarre API, worker et backoffice, puis attend leurs healthchecks Docker. Les métadonnées de release ne sont enregistrées qu’après succès.

```bash
cd /opt/optimizesolux/impactc
./deploy/deploy.sh prod \
  ghcr.io/aquila04/impactc-api:<sha> \
  ghcr.io/aquila04/impactc-migrator:<sha> \
  ghcr.io/aquila04/impactc-backoffice:<sha>

curl --fail --silent https://impactc-api.optimizesolux.com/health/ready
curl --fail --silent https://impactc-admin.optimizesolux.com/
```

## Rollback contrôlé

Pour revenir à l’image précédente sans modifier la base PostgreSQL :

```bash
cd /opt/optimizesolux/impactc
./deploy/rollback.sh --last
```

Le rollback sélectionne la release chronologiquement antérieure, redémarre les services avec ses images et **omet volontairement** la migration. Avant un retour arrière après une migration non rétrocompatible, exécuter le plan de restauration PostgreSQL validé et vérifier les compatibilités de données.

## Limites et lot suivant

Ce lot livre la publication GHCR, la promotion contrôlée production, le bootstrap idempotent et la traçabilité des releases. Le lot suivant ajoutera l’instrumentation OpenTelemetry, le tableau de bord métier, les alertes de sauvegarde/restauration et la validation sur le VPS avec les secrets réels.
