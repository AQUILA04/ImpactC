---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-08-18'
workflowType: 'testarch-test-design'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/prds/prd-ImpactC-2026-06-19/prd.md'
  - 'docs/Spécification Fonctionnelle.md'
  - 'docs/epic-delivery-plan.md'
---

# Architecture de test — ImpactC

**Objet :** Exigences d’architecture, testabilité et risques pour la plateforme matrimoniale supervisée.  
**Date :** 18 août 2026  
**Auteur :** Murat, Master Test Architect  
**Statut :** Revue d’architecture requise  
**Projet :** ImpactC

## Synthèse exécutive

ImpactC est une plateforme full-stack séparant un client mobile Expo, un backoffice Next.js et une API NestJS avec PostgreSQL, Redis, BullMQ et Socket.io. Le produit traite des données personnelles et un parcours relationnel supervisé ; ses risques prioritaires sont donc l’autorisation, la confidentialité, l’intégrité de la machine à états, le filtrage des coordonnées et le chiffrement des messages.

L’état du dépôt est un scaffolding : les applications existent, mais l’authentification, les modèles métier, les API, les interfaces fonctionnelles, les jobs et le framework navigateur ne sont pas encore implémentés. Six risques élevés requièrent une mitigation explicite avant une release. La stratégie de validation représente 17 scénarios E2E principaux, complétés par des tests unitaires et d’intégration de règles sensibles.

## Guide d’action

### Bloqueurs avant les tests d’intégration métier

| ID | Blocage | Exigence architecturale | Propriétaire | Échéance |
|---|---|---|---|---|
| B-01 | Données de test non contrôlables | Client Prisma injectable, base de test isolée, migrations répétables et factories déterministes | Backend | Itération 0 |
| B-02 | Identité et rôles inexistants | Authentification JWT/refresh et contexte de rôle unique pour REST et Socket.io | Backend | Itération 1 |
| B-03 | Temps et jobs non déterministes | Horloge injectable, processor d’expiration appelable, clé d’idempotence d’alerte | Backend | Itération 3 |
| B-04 | Aucun support E2E navigateur | Playwright, sélecteurs `data-testid`, scripts de démarrage et fixtures isolées | QA / Frontend | Itération 0 |

### Décisions à valider par l’équipe

| ID | Recommandation | Décision attendue |
|---|---|---|
| D-01 | Utiliser un adaptateur média local en développement et l’interface S3/Cloudinary en production | Valider les limites de type, taille, ratio et rétention des photos. |
| D-02 | Conserver les messages terminés chiffrés et accessibles seulement à l’administration autorisée | Fixer la durée de rétention légale et pastorale. |
| D-03 | Affecter manuellement le Responsable avant la planification d’un rendez-vous | Confirmer que l’absence de répartition automatique est acceptable au MVP. |
| D-04 | Exiger un consentement explicite d’inscription, et soutenir export/suppression authentifiés | Valider le texte de consentement et le circuit opérationnel de traitement. |

### Décisions déjà couvertes par la stratégie

Le système doit privilégier les tests unitaires pour la cryptographie, les transitions et les expressions de filtrage ; les tests API pour RBAC et transactions ; et les E2E Playwright pour les parcours entre clients. Les tests P0 sont bloquants, les P1 doivent réussir à au moins 95 %, et aucun risque élevé ne peut rester sans preuve avant une release.

## Registre de risques

| ID | Catégorie | Risque | P | I | Score | Mitigation | Responsable | Itération |
|---|---|---|---:|---:|---:|---|---|---|
| R-001 | SEC | Un rôle non autorisé accède au backoffice ou à un chat tiers. | 2 | 3 | 6 | Guards REST/Socket et contrôle de propriété ; cas négatifs E2E. | Backend | 0–1 |
| R-002 | DATA | Un intérêt unilatéral est révélé à la cible. | 2 | 3 | 6 | Réponses minimales, pas de notification cible, test à deux comptes. | Backend / QA | 2 |
| R-003 | BUS | Une personne entre dans deux Journeys actifs ou franchit une transition invalide. | 2 | 3 | 6 | Contraintes base, transaction et machine à états unique. | Backend | 3 |
| R-004 | SEC | Le filtre anti-contact peut être contourné ou s’exécute après l’émission. | 3 | 3 | 9 | Normalisation, détection serveur avant persistance, corpus de formats. | Backend / QA | 4 |
| R-005 | SEC | Un message est persisté en clair ou lu après terminaison. | 2 | 3 | 6 | AES-256-GCM, clé requise, garde d’accès et inspection ciphertext. | Backend | 4 |
| R-006 | OPS | Les jobs d’expiration créent des alertes dupliquées ou n’avertissent pas. | 2 | 3 | 6 | Horloge injectée, traitement idempotent et logs de jalon. | Backend | 3 |
| R-007 | TECH | Les E2E deviennent instables faute d’isolation. | 2 | 3 | 6 | Factories, reset de base, sélecteurs stables, aucune attente arbitraire. | QA / Frontend | 0 |
| R-008 | DATA | Rétention de chat, suppression et export ne sont pas définis précisément. | 2 | 2 | 4 | Implémenter les demandes GDPR et obtenir une décision produit avant production. | Produit / Admin | 5 |

## Exigences non fonctionnelles et testabilité

| Catégorie | Exigence ou seuil | Support actuel | Décision / lacune | Preuve prévue |
|---|---|---|---|---|
| Sécurité | JWT 15 min, refresh sécurisé, RBAC, chiffrement des messages | Partiel ; rien d’implémenté | Secrets, guards et socket auth à centraliser | Tests API/Socket, inspection de persistance, configuration. |
| Données | Intérêts confidentiels, Journey exclusif, audit append-only, GDPR | Absent | Contraintes et transactions Prisma à définir | Migrations, intégration, E2E de parcours et refus. |
| Performance | Feed <1,5 s ; message <300 ms | Absent | Baseline locale ; capacité production inconnue | Mesures instrumentées CI, validation production séparée. |
| Fiabilité | Alerte J30/J85/J90 unique | Absent | Horloge et job injectable requis | Tests de processor à date figée. |
| Accessibilité | WCAG 2.1 AA, contraste, labels, cible tactile 48 px | Absent | Tokens et composants accessibles requis | Analyse automatisée et E2E clavier. |
| Maintenabilité | API documentée, builds et tests reproductibles | Partiel | OpenAPI, scripts workspace et CI à ajouter | Typecheck, lint, build, couverture, docs API. |

Les objectifs d’uptime, volume, utilisateurs concurrents, charge de production et durée exacte de rétention restent inconnus. Ils ne sont pas estimés artificiellement ; ils devront être décidés avant la mise en production.

## Préoccupations de testabilité

| Préoccupation | Impact | Changement obligatoire |
|---|---|---|
| Absence de seed/reset de base | Tests dépendants de l’ordre et impossibles à paralléliser | Factories et environnement base E2E propre. |
| Dépendances externes directes | Tests de médias et notifications floconneux | Ports/adaptateurs avec implémentations locales testables. |
| État métier diffusé entre contrôleurs | Invariants impossibles à garantir | Services de domaine transactionnels pour match et Journey. |
| Horloge système implicite | Tests d’échéance fragiles | Abstraction de temps injectée. |
| UI sans contrat de sélection | E2E fragiles au changement de style | Attributs `data-testid` dédiés aux actions critiques. |

L’architecture choisie est néanmoins favorable aux tests : NestJS isole les modules, Prisma fournit des transactions, et l’usage d’une API unique limite les divergences de règles entre les deux clients. Les intégrations externes sont acceptables au MVP uniquement via adaptateurs, jamais au cœur des règles métier.

## Plans de mitigation prioritaires

### R-001 — Isolation des rôles et de la propriété

Le backend doit extraire un utilisateur authentifié dans un seul décorateur/service, puis appliquer `RolesGuard` et une garde de propriété par Journey/profil. Les sockets authentifient leur token à la connexion et rejoignent seulement la room de leur Journey. La vérification exige des tests API et Socket prouvant les refus 401/403 et l’absence de remise à un tiers.

### R-003 — Machine à états transactionnelle

Les transitions Journey ne sont pas implémentées dans des contrôleurs distincts. Un service transactionnel contrôle l’étape courante, le Responsable assigné, les deux consentements et la disponibilité des partenaires avant toute mutation. La vérification crée des demandes concurrentes et confirme qu’un seul Journey actif et une seule transition aboutissent.

### R-004 / R-005 — Chat protégé par conception

Le contenu est normalisé puis filtré avant chiffrement, enregistrement et événement Socket.io. Le stockage utilise AES-256-GCM avec IV et auth tag distincts ; les secrets ne sont jamais journalisés. Les tests confirment que plusieurs formes de coordonnées sont bloquées, que le ciphertext n’expose pas le texte et qu’une terminaison bloque la lecture comme l’écriture.

### R-006 — Expirations observables et idempotentes

Le processor journalier reçoit une horloge et recherche les Journeys éligibles. Une contrainte d’unicité ou une clé d’événement `journeyId:milestone` empêche les doublons. Les tests exécutent le processor deux fois à J30/J85/J90 et exigent une seule alerte par jalon.

## Hypothèses et dépendances

Le MVP cible l’interface Expo Web, non le packaging natif. Les notifications internes sont suffisantes pour démontrer le workflow tant que les adaptateurs email/push restent interchangeables. Les comptes à privilèges sont provisionnés de manière contrôlée et ne sont pas auto-inscrits. Le déploiement TLS, S3/Cloudinary et Sentry fait l’objet d’une vérification de configuration préalable à la production, hors E2E locaux.

## Sources internes

| Référence | Document |
|---|---|
| [1] | `_bmad-output/planning-artifacts/epics.md` |
| [2] | `_bmad-output/planning-artifacts/architecture.md` |
| [3] | `_bmad-output/planning-artifacts/prds/prd-ImpactC-2026-06-19/prd.md` |
| [4] | `docs/Spécification Fonctionnelle.md` |
| [5] | `docs/epic-delivery-plan.md` |
