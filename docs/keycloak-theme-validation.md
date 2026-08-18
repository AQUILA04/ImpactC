# Validation locale du thème Keycloak ImpactC

**Instance de validation :** Keycloak 26.2.5 lancé localement en mode développement, avec import du realm `impactc` et copie du thème `impactc-backoffice` depuis `optimize-common-infra`.

| Parcours            | Résultat observé                                                                                                                                                  | Preuve                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Découverte OIDC     | Réussie ; issuer, endpoints d’autorisation, token et JWKS exposés par le realm `impactc`.                                                                         | `http://127.0.0.1:8180/realms/impactc/.well-known/openid-configuration`        |
| Connexion française | Réussie ; le titre « Connexion sécurisée ImpactC », la marque IMPACTC, les libellés français, le focus visible et la feuille de style personnalisée sont chargés. | Page d’autorisation OIDC du client `impactc-backoffice` avec `ui_locales=fr`.  |
| Mot de passe oublié | Réussie ; formulaire accessible, libellé « Adresse e-mail », CTA « Envoyer le lien sécurisé » et retour à la connexion chargés depuis le thème ImpactC.           | Route Keycloak `login-actions/reset-credentials` liée au client de backoffice. |

La livraison de production doit configurer le SMTP réel du realm et les comptes de supervision, puis répéter les parcours de vérification e-mail, mot de passe temporaire, TOTP et e-mails transactionnels avec des données de préproduction.

| Flux OIDC complet Responsable | Réussi après connexion Authorization Code + PKCE : Keycloak émet un access token avec `sub`, audience `impactc-backoffice`, e-mail vérifié et rôle `RESPONSABLE`; le backoffice charge ensuite le tableau de bord API. | Backoffice local `127.0.0.1:3000`, Keycloak 26.2.5, API locale avec `KEYCLOAK_BACKOFFICE_ENABLED=true`. |

## Correctif de compatibilité Keycloak 26

Le client `impactc-backoffice` déclare désormais explicitement le mapper standard `oidc-sub-mapper` (`subject-impactc-backoffice`) et désactive les access tokens allégés. Cette combinaison garantit la présence de `sub` dans l’access token, nécessaire pour relier de façon immuable l’identité Keycloak au compte interne ImpactC et conserver les relations d’audit. Le client inclut aussi le scope `basic` et les origines locales `localhost`/`127.0.0.1` limitées au développement.

> Les actions obligatoires `VERIFY_EMAIL` et `CONFIGURE_TOTP` restent activées dans le realm versionné. Elles ont été désactivées uniquement dans l’instance temporaire de validation pour produire un jeton automatisé, puis ne doivent jamais être désactivées en préproduction ou production.
> | RBAC OIDC | Réussi : le compte Keycloak `RESPONSABLE` a chargé le tableau de bord, puis a reçu un refus `403 Forbidden` sur l’audit réservé au rôle `ADMIN`. | Parcours navigateur local, même access token OIDC. |
