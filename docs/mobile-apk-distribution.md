# Distribution des APK ImpactC via MinIO

## Objectif

Le pipeline mobile ImpactC produit un APK Android installable, signé pour la production, l’archive dans GitHub Actions pendant 90 jours et publie une copie versionnée dans un bucket MinIO **privé**. Son fonctionnement reprend le modèle ELYKIA, tout en l’adaptant au client Expo/React Native d’ImpactC.

> L’APK n’est construit qu’après la réussite du contrôle qualité. Une release de production exige impérativement le keystore Android ; le pipeline échoue volontairement s’il est absent.

| Canal  | Déclencheur normal                                                        | URL API injectée              | Emplacement MinIO                                            |
| ------ | ------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `test` | Réussite de `Quality Gate` sur `main`                                     | Secret `TEST_IMPACTC_API_URL` | `test/releases/<version>/impactc-mobile-test-v<version>.apk` |
| `prod` | Réussite de `Quality Gate` sur `prod/**` ou déclenchement manuel approuvé | Secret `PROD_IMPACTC_API_URL` | `prod/releases/<version>/impactc-mobile-prod-v<version>.apk` |

La configuration Expo dynamique définit l’identité Android `com.optimizesolux.impactc`, le schéma `impactc` et un `versionCode` dérivé de la version sémantique. Par exemple, `1.2.3` devient `10203`. L’URL API est injectée au moment du bundle via `EXPO_PUBLIC_API_BASE`; elle n’est donc pas codée en dur dans l’APK.

## Artefacts MinIO

Le script `.github/scripts/publish-impactc-apk.sh` publie l’APK puis le manifeste de canal. Le manifeste est la source de vérité du dernier APK disponible pour un canal.

```text
impactc-mobile-releases/
├── test/
│   ├── manifest.json
│   └── releases/<version>/impactc-mobile-test-v<version>.apk
└── prod/
    ├── manifest.json
    └── releases/<version>/impactc-mobile-prod-v<version>.apk
```

```json
{
  "version": "1.0.0",
  "versionCode": 10000,
  "minSupportedVersionCode": 10000,
  "mandatory": false,
  "releaseNotes": "Release 1.0.0 (prod)",
  "apkObjectKey": "prod/releases/1.0.0/impactc-mobile-prod-v1.0.0.apk",
  "sha256": "…",
  "sizeBytes": 0,
  "publishedAt": "2026-08-18T00:00:00Z"
}
```

L’empreinte SHA-256 et la taille permettent de vérifier l’intégrité de l’artefact téléchargé. Le bucket doit rester privé : les opérateurs ou un futur mécanisme de mise à jour applicative obtiennent un lien signé à durée courte, plutôt qu’une URL publique stable.

## Secrets GitHub requis

Créer les environnements GitHub Actions **`test`** et **`prod`**. L’environnement `prod` doit exiger une approbation avant l’utilisation de ses secrets.

| Secret                                 | Environnement  | Rôle                                                                         |
| -------------------------------------- | -------------- | ---------------------------------------------------------------------------- |
| `TEST_IMPACTC_API_URL`                 | `test`         | URL HTTPS de l’API de test, avec le préfixe `/api`.                          |
| `PROD_IMPACTC_API_URL`                 | `prod`         | URL HTTPS de l’API de production, avec le préfixe `/api`.                    |
| `ANDROID_KEYSTORE_BASE64`              | `test`, `prod` | Keystore Android de release encodé en Base64.                                |
| `ANDROID_KEYSTORE_PASSWORD`            | `test`, `prod` | Mot de passe du magasin de clés.                                             |
| `ANDROID_KEY_ALIAS`                    | `test`, `prod` | Alias de la clé de signature.                                                |
| `ANDROID_KEY_PASSWORD`                 | `test`, `prod` | Mot de passe de la clé de signature.                                         |
| `TEST_MINIO_ENDPOINT`                  | `test`         | Endpoint S3 MinIO du canal de test.                                          |
| `PROD_MINIO_ENDPOINT`                  | `prod`         | Endpoint S3 MinIO de production, typiquement `https://s3.optimizesolux.com`. |
| `TEST_MINIO_RELEASES_ACCESS_KEY`       | `test`         | Identifiant MinIO limité au bucket et préfixe de test ImpactC.               |
| `TEST_MINIO_RELEASES_SECRET_KEY`       | `test`         | Secret MinIO associé.                                                        |
| `PROD_MINIO_RELEASES_ACCESS_KEY`       | `prod`         | Identifiant MinIO limité au bucket et préfixe de production ImpactC.         |
| `PROD_MINIO_RELEASES_SECRET_KEY`       | `prod`         | Secret MinIO associé.                                                        |
| `MINIO_IMPACTC_MOBILE_RELEASES_BUCKET` | `test`, `prod` | Nom du bucket, par défaut `impactc-mobile-releases`.                         |

Les identifiants MinIO ne doivent pas être les identifiants root du socle commun. Créer une identité d’automatisation dédiée, capable de créer le bucket si absent et d’écrire uniquement sous les clés ImpactC de son canal. La politique de lecture doit rester réservée aux opérateurs, au backend ImpactC ou à un service de délivrance de liens signés.

## Cycle de publication

1. La qualité mobile est validée, puis le workflow `ImpactC Mobile APK Build` sélectionne un canal et un commit précis.
2. Le workflow installe Node, Java et le SDK Android, puis exécute `npx expo prebuild --platform android --clean`.
3. Le keystore est injecté éphémèrement dans le runner, la configuration Gradle de signature est appliquée, puis Gradle lance `:app:assembleRelease`.
4. L’APK est renommé selon le canal et la version, puis archivé dans GitHub Actions.
5. Le script MinIO charge l’APK versionné, calcule son SHA-256 et remplace atomiquement le manifeste du canal après le chargement du binaire.

Une release Android locale nécessite un répertoire Android généré, une clé de signature et un build Gradle release. Expo documente ce chemin de production pour les projets utilisant la génération native continue. [1]

## Procédure de création initiale du keystore

Le keystore de production est une clé de continuité : sa perte empêcherait de publier des mises à jour signées avec la même identité Android. Il doit être créé une seule fois dans un poste contrôlé, conservé dans un coffre sécurisé hors Git et exporté en Base64 vers les secrets GitHub.

```bash
keytool -genkey -v \
  -keystore impactc-release.jks \
  -alias impactc-release \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w 0 impactc-release.jks > impactc-release.jks.base64
```

Ne committer ni le fichier `.jks`, ni son contenu Base64, ni les mots de passe. La documentation Expo recommande également de préserver la clé de signature hors du contrôle de version. [1]

## Vérification opérationnelle d’une release

Avant diffusion, l’opérateur vérifie le manifeste, le checksum et l’installation sur un appareil Android physique. Pour un téléchargement contrôlé, il crée une URL présignée vers l’objet `apkObjectKey`, la transmet via un canal authentifié et vérifie que l’APK affiche la bonne version et contacte l’API du canal attendu.

La distribution par APK est destinée à l’installation interne ou hors Play Store. Si ImpactC est publié sur Google Play, le pipeline doit aussi produire un AAB signé avec `:app:bundleRelease`, format requis pour la soumission Play Console. [1]

## Références

[1]: https://docs.expo.dev/guides/local-app-production/ "Expo — Create a release build locally"
[2]: https://docs.expo.dev/build-reference/apk/ "Expo — Build APKs for Android Emulators and devices"
[3]: https://github.com/AQUILA04/ELYKIA/blob/main/.github/actions/build-mobile-apk/action.yml "ELYKIA — build mobile APK composite action"
[4]: https://github.com/AQUILA04/ELYKIA/blob/main/.github/scripts/publish-mobile-apk.sh "ELYKIA — MinIO APK publication script"
