# Photos de profil contrôlées

## Flux applicatif

Un membre sélectionne une image depuis le client mobile. Le client demande une autorisation système, propose un recadrage **4:5**, puis transmet le fichier au endpoint authentifié `POST /api/media/profile-photo` sous le champ multipart `file`.

| Contrôle            | Règle appliquée                                                              |
| ------------------- | ---------------------------------------------------------------------------- |
| Authentification    | L’upload et la lecture exigent une session JWT valide.                       |
| Type accepté        | JPEG, PNG ou WebP uniquement.                                                |
| Taille d’entrée     | 5 Mo maximum.                                                                |
| Dimensions d’entrée | Au minimum 320 × 320 px, avec limite anti-bombe-image de 24 MP.              |
| Sortie              | Image WebP de 800 × 1000 px, orientée selon EXIF et recadrée en `cover` 4:5. |
| Référence persistée | `media://profile/<uuid>.webp`, jamais un chemin fourni par le client.        |
| Lecture             | `GET /api/media/profile/:filename`, également protégée par JWT.              |

Les références internes sont acceptées par la validation de profil. Les anciennes URLs HTTPS restent admissibles uniquement lorsque leur domaine est dans `PROFILE_MEDIA_ALLOWED_HOSTS`.

## Configuration et persistance

Le stockage par défaut est `backend-service/uploads/profile-photos`. Il convient au développement et aux environnements où ce dossier est monté comme volume persistant. Configurez `PROFILE_MEDIA_DIR` avec un chemin durable et accessible à toutes les instances applicatives.

> Dans un déploiement avec plusieurs réplicas, un stockage objet compatible S3 ou Cloudinary doit remplacer ce volume partagé. Le contrat client peut être conservé : l’API retourne toujours une référence interne et masque le fournisseur de stockage.

## Validation

La spec Playwright `@p2 @profile @upload` téléverse une image PNG, vérifie la transformation WebP 800 × 1000, vérifie l’accès authentifié au flux, puis soumet le profil avec la référence générée.
