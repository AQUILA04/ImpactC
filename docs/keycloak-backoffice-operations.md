# Exploitation Keycloak — Backoffice ImpactC

Ce guide couvre l’identité **Responsable/Admin uniquement**. Les membres `CELIBATAIRE` conservent l’authentification JWT propre à l’API ImpactC et ne doivent pas être créés dans le realm Keycloak `impactc`.

## Artefacts livrés

Le dépôt `optimize-common-infra` contient le realm importable `images/keycloak/realms/impactc-realm.json` et le thème `images/keycloak/themes/impactc-backoffice`. L’image Keycloak commune copie les thèmes sous `/opt/keycloak/themes` et importe les realms au démarrage. Le thème étend Keycloak, sans modifier les ressources embarquées, ce qui réduit le risque lors des mises à jour.

| Élément            | Valeur de production                                   |
| ------------------ | ------------------------------------------------------ |
| Realm              | `impactc`                                              |
| Client public OIDC | `impactc-backoffice`                                   |
| Autorité OIDC      | `https://auth.optimizesolux.com/realms/impactc`        |
| Backoffice         | `https://impactc-admin.optimizesolux.com`              |
| API                | `https://impactc-api.optimizesolux.com/api`            |
| Rôles realm        | `RESPONSABLE`, `ADMIN`                                 |
| Flux               | Authorization Code avec PKCE S256 ; aucun Direct Grant |
| Thèmes             | Login, Account et Email : `impactc-backoffice`         |

## Variables de production

Les valeurs suivantes doivent être fournies au déploiement depuis Vault ou les secrets GitHub. Aucune ne doit être ajoutée à Git, à l’image ou à un journal.

```dotenv
# backend-service/.env
KEYCLOAK_BACKOFFICE_ENABLED=true
KEYCLOAK_ISSUER=https://auth.optimizesolux.com/realms/impactc
KEYCLOAK_BACKOFFICE_CLIENT_ID=impactc-backoffice

# backoffice-web/.env
NEXT_PUBLIC_KEYCLOAK_BACKOFFICE_ENABLED=true
NEXT_PUBLIC_KEYCLOAK_AUTHORITY=https://auth.optimizesolux.com/realms/impactc
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=impactc-backoffice
NEXT_PUBLIC_API_BASE=https://impactc-api.optimizesolux.com/api
```

Le realm doit également recevoir une configuration SMTP transactionnelle fonctionnelle depuis `secret/data/optimizesolux/impactc/smtp`. Elle est requise pour la vérification d’e-mail, le lien de mot de passe oublié et les actions administratives obligatoires.

## Provisionner un superviseur

Un superviseur requiert **deux comptes appariés** : un utilisateur interne ImpactC avec le rôle correspondant, afin de préserver les clés étrangères d’audit et d’attribution, puis un utilisateur Keycloak avec le même e-mail et le même rôle realm. Ne jamais donner le rôle `CELIBATAIRE` à un compte Keycloak.

| Étape | Action                                                                                                                     | Contrôle de sortie                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1     | Créer ou vérifier l’utilisateur interne avec l’e-mail professionnel, un rôle `RESPONSABLE` ou `ADMIN`, et `isActive=true`. | Aucun `keycloakSubject` n’est encore associé.                                      |
| 2     | Créer l’utilisateur dans le realm `impactc` avec le même e-mail, e-mail non éditable et mot de passe temporaire.           | Auto-inscription désactivée ; aucun secret de test.                                |
| 3     | Attribuer exactement le rôle Keycloak correspondant.                                                                       | Le compte `ADMIN` porte aussi le composite `RESPONSABLE`.                          |
| 4     | Envoyer les actions `VERIFY_EMAIL`, `UPDATE_PASSWORD` et `CONFIGURE_TOTP`.                                                 | L’utilisateur ne reçoit un access token exploitable qu’après les actions requises. |
| 5     | À la première requête de supervision réussie, l’API enregistre le `sub` Keycloak dans `users.keycloak_subject`.            | Toute tentative ultérieure avec le même e-mail mais un autre `sub` est refusée.    |

Le matching entre rôle Keycloak et rôle interne est volontairement strict. Une identité avec un e-mail connu mais un rôle différent, un e-mail non vérifié, une audience incorrecte ou un sujet Keycloak déjà lié est refusée avec `401`.

## Contrôles de sécurité avant production

Le client ne permet que les redirections et origines suivantes en production : `https://impactc-admin.optimizesolux.com/*` et `https://impactc-admin.optimizesolux.com`. Les URI `localhost` et `127.0.0.1` sont limitées au fichier d’import pour le développement et les tests ; elles doivent être retirées du client déployé si la politique de l’environnement l’exige.

Le client inclut un mapper explicite `oidc-sub-mapper` et désactive les access tokens allégés afin que la revendication `sub` soit présente dans le jeton d’accès. Cette revendication est indispensable à la liaison immuable de l’identité. L’API vérifie la signature via le JWKS de l’issuer, l’issuer exact, l’audience `impactc-backoffice`, l’e-mail vérifié, les rôles realm et la correspondance avec l’utilisateur interne.

Avant la bascule, exécuter et consigner les scénarios suivants : connexion responsable, connexion admin, refus d’un rôle absent, refus d’un responsable sur `/api/audit-logs`, refus d’un compte non apparié, oubli de mot de passe, lien expiré/réutilisé, changement de mot de passe, vérification e-mail, MFA TOTP, déconnexion et renouvellement silencieux de session.

## Retour arrière

Si `KEYCLOAK_BACKOFFICE_ENABLED=false`, les routes de supervision réutilisent le guard JWT uniquement pour le développement et les fixtures E2E. Le backoffice masque ce repli lorsque `NODE_ENV=production`; il ne doit donc jamais être considéré comme une stratégie de retour arrière en production. Le retour arrière production consiste à restaurer une release antérieure complète, y compris le backend, le backoffice et la configuration realm validée.
