# Photos de profil contrôlées avec MinIO

## Objectif et contrat applicatif

ImpactC conserve les portraits dans **MinIO**, via l’API S3-compatible, plutôt que dans le système de fichiers du backend. Chaque téléversement autorisé produit deux objets WebP privés : une variante légère pour les listes et une variante détaillée, chargée uniquement lorsqu’un membre ou un Responsable ouvre explicitement le portrait. MinIO en mode autonome convient au développement et à l’évaluation ; une installation de production doit utiliser un volume durable ou une topologie distribuée adaptée à la disponibilité attendue. [1]

| Variante | Clé objet MinIO | Dimensions | Usage client | Cache privé |
|---|---|---:|---|---|
| Miniature | `profiles/<uuid>/thumbnail.webp` | 160 × 200 px | Cartes de découverte, aperçu d’onboarding et table de modération | 24 h |
| Original | `profiles/<uuid>/original.webp` | 800 × 1000 px | Modal plein écran après un clic explicite | 5 min |

Le backend génère les deux variantes à partir d’un unique fichier source. L’opération est compensable : si l’écriture de l’une des deux variantes échoue, le service supprime les objets déjà écrits avant de remonter l’erreur. Les références en base ne révèlent ni le bucket ni un chemin de système de fichiers.

| Valeur persistée | Sens |
|---|---|
| `profilePhotoUrl = media://profile/<uuid>` | Référence interne de l’original. |
| `profilePhotoThumbUrl = media://profile/<uuid>/thumbnail` | Référence interne de la miniature, pour les nouveaux portraits MinIO. |
| URL HTTPS externe autorisée | Compatibilité avec les anciens profils ; aucune miniature interne n’est alors créée. |

## Flux d’upload et de lecture

Un membre choisit une image depuis le client mobile, accepte l’autorisation système, la recadre au ratio **4:5**, puis transmet le fichier sous le champ multipart `file` à `POST /api/media/profile-photo`. Le backend contrôle l’identité, les caractéristiques du fichier, normalise l’orientation EXIF et réalise le recadrage `cover` avant l’écriture S3.

| Contrôle | Règle appliquée |
|---|---|
| Authentification | L’upload et les deux lectures nécessitent un JWT valide. |
| Types acceptés | JPEG, PNG ou WebP uniquement. |
| Taille d’entrée | 5 Mo maximum. |
| Dimensions d’entrée | Au minimum 320 × 320 px, avec une limite anti-bombe-image de 24 MP. |
| Référence générée | UUID serveur : le client ne fournit jamais une clé de stockage. |
| Original | `GET /api/media/profile/:id` retourne le flux WebP 800 × 1000. |
| Miniature | `GET /api/media/profile/:id/thumbnail` retourne le flux WebP 160 × 200. |

Les endpoints restent des proxys authentifiés : le bucket n’est pas public et le client ne reçoit pas de secret S3. Les clients mobiles envoient le jeton JWT dans l’en-tête de l’image. Le backoffice transforme la réponse binaire authentifiée en URL `blob:` temporaire, puis la libère lorsque l’écran est démonté.

> La découverte et la grille de modération demandent **seulement la miniature**. L’original n’est demandé qu’après l’action explicite « Voir la photo complète », ce qui évite de télécharger les grands portraits lors du défilement.

## Configuration

Les variables suivantes doivent être définies pour le backend. Les exemples ci-dessous correspondent à la composition de développement versionnée et ne doivent pas être utilisés tels quels en production.

| Variable | Exemple local | Rôle |
|---|---|---|
| `S3_ENDPOINT` | `http://127.0.0.1:9000` | Endpoint MinIO ou S3 compatible. |
| `S3_REGION` | `us-east-1` | Région requise par le client S3. |
| `S3_BUCKET` | `impactc-media` | Bucket privé contenant les portraits. |
| `S3_ACCESS_KEY` | `impactc_minio` | Identifiant d’accès du backend. |
| `S3_SECRET_KEY` | `impactc_minio_change_me` | Secret d’accès du backend. |

Le backend vérifie l’existence du bucket au démarrage et le crée si nécessaire. Un échec de connexion au stockage doit interrompre le démarrage afin d’éviter un service qui accepterait des profils sans pouvoir honorer leurs médias.

## Démarrage local et intégration continue

La composition racine définit un service `minio`, le volume persistant `minio_data`, le port API `9000` et la console `9001`. Démarrez-le avec `docker compose up -d minio` lorsque Docker est disponible. Le guide officiel MinIO utilise la commande `minio server /data` avec un volume monté pour conserver les objets entre redémarrages. [1]

Dans un environnement sans Docker, le setup Playwright cherche d’abord MinIO à l’endpoint configuré. S’il est absent, il démarre le binaire local `~/.local/bin/minio` et utilise le répertoire `.minio-e2e-data/`, qui est ignoré par Git. Le workflow GitHub Actions démarre quant à lui un service MinIO éphémère avec une commande explicite `minio server /data`; les services de job Linux sont accessibles depuis le runner via les ports publiés. [2]

## Validation E2E

La spécification Playwright `@p2 @profile @upload` couvre l’ensemble du contrat : elle téléverse un PNG authentifié, vérifie la référence UUID, vérifie les deux dimensions annoncées, télécharge séparément les deux flux WebP, confirme que la miniature est plus légère que l’original, puis vérifie la persistance de `profilePhotoThumbUrl` sur le profil. La régression P0–P2 complète est exécutée avec PostgreSQL, Redis et MinIO.

## Production

En production, remplacez les valeurs d’exemple par des identifiants injectés depuis un gestionnaire de secrets et un endpoint TLS. Restreignez l’utilisateur S3 du backend au bucket ImpactC et aux opérations nécessaires (`GetObject`, `PutObject`, `DeleteObject`, ainsi que les opérations de bucket nécessaires au provisionnement). Pour une plateforme à plusieurs réplicas, utilisez un stockage objet durable partagé, tel qu’un déploiement MinIO approprié ou un fournisseur S3 ; ne remplacez pas MinIO par un volume local propre à chaque instance.

## Références

[1]: https://github.com/minio/minio/blob/master/docs/docker/README.md "MinIO Docker Quickstart Guide"
[2]: https://docs.github.com/actions/tutorials/communicating-with-docker-service-containers "GitHub Actions — Communicating with Docker service containers"
