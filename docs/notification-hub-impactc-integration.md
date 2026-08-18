# Intégration notification-hub — Notifications métier ImpactC

## Périmètre

ImpactC conserve la table `notifications` pour les alertes internes mobile/backoffice. Le service **notification-hub** complète ce mécanisme avec des communications transactionnelles asynchrones, traçables et multi-canaux. Il n’est pas utilisé par Keycloak : les e-mails d’identité de Keycloak — vérification d’e-mail, mot de passe oublié, mot de passe temporaire, MFA/TOTP et gestion de compte — restent configurés dans le realm Keycloak `impactc`.

L’API ImpactC appelle `POST /v1/notifications` de notification-hub avec un service account OAuth2 dédié, un jeton Client Credentials, le claim `tenant_id=impactc`, l’en-tête `X-App-Id: impactc` et une clé d’idempotence déterministe. En production, une erreur de notification ne doit jamais annuler une décision métier déjà validée ; l’outbox BullMQ reprend l’envoi avec délai exponentiel.

## Événements externalisés

| Événement ImpactC            | Destinataire                 | Canal et priorité | Contenu autorisé                                                                     | Clé d’idempotence                                  |
| ---------------------------- | ---------------------------- | ----------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Profil approuvé              | Membre concerné              | E-mail, `NORMAL`  | Prénom, confirmation d’activation ; aucune donnée d’un tiers.                        | `impactc:profile-approved:<profileId>`             |
| Profil renvoyé en révision   | Membre concerné              | E-mail, `NORMAL`  | Prénom et motif saisi par le Responsable.                                            | `impactc:profile-rejected:<profileId>:<updatedAt>` |
| Premier rendez-vous planifié | Les deux membres du parcours | E-mail, `HIGH`    | Horaire, lieu neutre et consignes de parcours ; aucune coordonnée de l’autre membre. | `impactc:appointment-scheduled:<journeyId>`        |
| Jalon J30/J85/J90 atteint    | Responsable assigné          | E-mail, `HIGH`    | Identifiant de parcours et jalon de revue ; aucune donnée intime des membres.        | `impactc:journey-review:<journeyId>:<milestone>`   |

Les intérêts non réciproques ne génèrent aucune communication externe. Un match réciproque reste d’abord une alerte interne du backoffice ; il ne faut pas envoyer les identités des deux membres par e-mail avant la coordination supervisée. Les conversations, messages chiffrés, informations de contact bloquées, données de santé ou éléments confidentiels ne sont jamais mis dans `subject`, `body`, `metadata` ou `templateData`.

## Contrat d’exploitation

| Paramètre               | Valeur attendue                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base URL                | `NOTIFICATION_HUB_BASE_URL`, par exemple `https://notification-api.optimizesolux.com`                                                                       |
| Tenant                  | `NOTIFICATION_HUB_TENANT_ID=impactc` ; la valeur production vient du JWT du service account.                                                                |
| Identifiant applicatif  | `NOTIFICATION_HUB_APP_ID=impactc`                                                                                                                           |
| Émetteur e-mail         | `NOTIFICATION_HUB_FROM=notifications@optimizesolux.com` ou une adresse ImpactC validée.                                                                     |
| OAuth2                  | `NOTIFICATION_HUB_OAUTH_TOKEN_URL`, `NOTIFICATION_HUB_OAUTH_CLIENT_ID`, `NOTIFICATION_HUB_OAUTH_CLIENT_SECRET` depuis Vault.                                |
| Délai                   | Connexion 3 secondes, réponse 10 secondes, délai de rafraîchissement de jeton 60 secondes.                                                                  |
| Désactivation contrôlée | `NOTIFICATION_HUB_ENABLED=false` pour les tests et le développement local ; l’outbox marque alors l’événement comme ignoré sans appeler de service externe. |

Le client confidential `impactc-notification-sender` appartient au realm partagé `notification-hub`, porte uniquement le rôle `notification-sender`, une audience `notification-hub-api` et un mapper `tenant_id=impactc`. Il n’est ni un client du realm Keycloak `impactc`, ni une identité de connexion utilisateur.

## Gabarits de message

La première livraison utilise des sujets et corps générés côté ImpactC afin de ne pas dépendre de la prépublication manuelle de gabarits. Une itération ultérieure pourra déplacer les textes vers les templates Pebble de notification-hub ; elle devra alors versionner et publier les gabarits avant de basculer les événements vers `templateName`.
