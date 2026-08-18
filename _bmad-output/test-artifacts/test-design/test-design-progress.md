---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-08-18'
inputDocuments:
  - '_bmad/tea/config.yaml'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/prds/prd-ImpactC-2026-06-19/prd.md'
  - 'docs/Spécification Fonctionnelle.md'
  - 'docs/epic-delivery-plan.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '.agent/skills/bmad-tea/resources/knowledge/adr-quality-readiness-checklist.md'
  - '.agent/skills/bmad-tea/resources/knowledge/nfr-criteria.md'
  - '.agent/skills/bmad-tea/resources/knowledge/test-levels-framework.md'
  - '.agent/skills/bmad-tea/resources/knowledge/risk-governance.md'
  - '.agent/skills/bmad-tea/resources/knowledge/test-quality.md'
---

# Conception de tests — ImpactC

## Étape 1 — Mode et prérequis

**Mode retenu : conception au niveau système.** La demande exige un produit fonctionnel pour l’ensemble des epics, avec une preuve E2E pour chaque user story. Le dépôt contient simultanément un PRD fonctionnel, une architecture cible, un document d’epics avec critères d’acceptation et un état de sprint. Une stratégie de test uniquement limitée à un epic ne garantirait ni les parcours transverses ni les contrôles de sécurité et de confidentialité requis.

Les prérequis sont satisfaits : `epics.md` fournit les user stories et critères d’acceptation, `architecture.md` précise les choix structurants et les exigences non fonctionnelles, et la spécification fonctionnelle décrit les règles métier de bout en bout. L’implémentation actuelle est un socle initial : seule la story 1.1 est terminée, la story 1.2 reste en revue et les stories 1.3 à 6.2 sont non réalisées selon `implementation-artifacts/sprint-status.yaml`.

La suite du workflow établira la couverture de risque, les parcours E2E et les données de test nécessaires avant et pendant les itérations de développement.

## Étape 2 — Contexte chargé

La configuration TEA est active pour une automatisation navigateur et API avec Playwright lorsque le framework sera installé. La pile détectée est **full-stack** : NestJS/Prisma/PostgreSQL/Redis au backend, Next.js pour le backoffice et Expo Router/React Native Web pour le client membre. Il n’existe pas encore de configuration Playwright ou Cypress, ni de suite navigateur ; le seul E2E existant vérifie l’enveloppe de la route de démonstration NestJS.

Les exigences ont été lues dans le PRD, l’architecture, les epics et la spécification fonctionnelle. Les intégrations critiques sont PostgreSQL/Prisma, Redis/BullMQ, HTTP REST, Socket.io, le chiffrement AES-256-GCM et un adaptateur de média. Les seuils explicitement testables sont : jeton d’accès de 15 minutes, majorité à 18 ans, chargement du feed sous 1,5 seconde, remise de message sous 300 ms, échéances J30/J85/J90 et WCAG 2.1 AA. Les exigences de TLS 1.3 et les canaux S3/Cloudinary relèvent de la configuration d’environnement et seront validées par configuration/documentation plutôt que simulées dans les E2E locaux.

Les fragments qualité chargés confirment une stratégie orientée risque : règles de sécurité et confidentialité en P0, parcours métier à état en P0/P1, et validation UI/E2E au-dessus de tests unitaires et d’intégration systématiques. La matrice complète des stories, tests E2E et règles de produit est enregistrée dans `docs/epic-delivery-plan.md`.

## Étape 3 — Testabilité et risques

### Préoccupations de testabilité à traiter

| Niveau | Constat | Mesure obligatoire avant la story concernée |
|---|---|---|
| Critique | Aucune fixture métier, aucun seed de test ni remise à zéro de base n’existe. | Mettre en place un client Prisma injectable, une base de test isolée et des factories déterministes. |
| Critique | L’authentification, le RBAC et l’identification socket n’existent pas. | Centraliser le contexte utilisateur, protéger REST/WebSocket et publier des helpers de session de test. |
| Critique | Les jobs Bull et le temps réel ne peuvent pas être contrôlés aujourd’hui. | Exposer des services de traitement appelables en test et injecter une horloge/date de référence. |
| Élevé | Il n’existe ni sélecteur E2E, ni framework navigateur, ni application prête à tester. | Installer Playwright, utiliser des `data-testid` stables et ajouter des commandes de démarrage E2E. |
| Élevé | Les médias cloud et notifications externes seraient non déterministes. | Définir des ports/adaptateurs ; employer des implémentations locales en test et valider les appels sortants. |
| Élevé | Aucun audit, métrique ni corrélation des actions sensibles. | Implémenter un service d’audit append-only, des identifiants de requête et des assertions API sur les effets. |

### Synthèse de testabilité

L’architecture cible est testable parce qu’elle sépare les clients, centralise les règles côté NestJS, utilise Prisma et définit des événements Socket.io nommés. La contrepartie est que l’implémentation doit éviter les dépendances statiques ou globales : la persistance, l’horloge, le chiffrement, les notifications et la queue doivent être injectables pour créer des tests reproductibles.

### Exigences architecturales significatives

| ASR | Statut | Validation prévue |
|---|---|---|
| RBAC REST et Socket.io sans escalade de rôle | ACTIONABLE | Tests d’intégration et E2E de refus sur chaque zone protégée. |
| Confidentialité des intérêts et exclusion du feed | ACTIONABLE | E2E à deux utilisateurs, assertions d’absence de notification et de résultat interdit. |
| Machine à états Journey atomique et exclusive | ACTIONABLE | Tests transactionnels, conflits de concurrence et parcours E2E complet. |
| Chiffrement AES-256-GCM des messages | ACTIONABLE | Test unitaire de crypto et inspection de la valeur brute persistée. |
| Anti-contact avant persistance/émission | ACTIONABLE | Tests socket de numéro, e-mail, réseau social et variantes normalisées. |
| Expirations Bull idempotentes J30/J85/J90 | ACTIONABLE | Horloge gelée, exécution manuelle du processor et assertion d’une alerte unique. |
| Chargement feed < 1,5 s, message < 300 ms | ACTIONABLE | Mesure instrumentée locale ; budget à confirmer sur l’environnement de production. |
| TLS 1.3, S3/Cloudinary et monitoring Sentry | FYI pour les E2E locaux | Validation de configuration et de déploiement avant mise en production. |

### Registre de risques initial

| Risque | Catégorie | Probabilité | Impact | Score | Mitigation et échéance |
|---|---|---:|---:|---:|---|
| Accès à un backoffice ou chat non autorisé | SEC | 2 | 3 | 6 | RBAC, garde de propriété et tests négatifs, Itération 0–1. |
| Fuite d’intérêts unilatéraux | DATA | 2 | 3 | 6 | Réponses minimales, aucune notification cible, tests à deux comptes, Itération 2. |
| Deux Journeys actifs ou transition illégitime | BUS | 2 | 3 | 6 | Contraintes, transactions et service d’état, Itération 3. |
| Contournement du filtre anti-contact | SEC | 3 | 3 | 9 | Normalisation, règles conservatrices, test de corpus de contournement, Itération 4. |
| Texte de chat en clair ou clé mal gérée | SEC | 2 | 3 | 6 | AES-GCM, secrets d’environnement et tests d’inspection, Itération 4. |
| Jobs expirations non fiables ou répétés | OPS | 2 | 3 | 6 | Horloge injectable, clés d’idempotence et instrumentations, Itération 3. |
| Suite E2E instable | TECH | 2 | 3 | 6 | Fixtures isolées, sélecteurs dédiés, absence de délais arbitraires, dès l’Itération 0. |
| Absence de conservation/suppression définie | DATA | 2 | 2 | 4 | Implémenter demande GDPR ; décider rétention de chat avec le propriétaire produit avant production. |

### Plan NFR

Les exigences sécurité, conformité, fiabilité, performance, accessibilité et maintenabilité sont dans le périmètre. Les preuves prévues sont : rapports Jest/Playwright, migrations, traces des jobs, logs/audit, tests de rôle, mesure de latence locale et audit automatisé de l’accessibilité. Les seuils J30/J85/J90, 18 ans, 15 minutes, 1,5 s et 300 ms sont testables. Les objectifs de disponibilité, charge concurrente, volume de données, rétention détaillée et budget de performance de production restent **UNKNOWN** ; ils constituent des décisions de mise en production et ne seront pas inventés.

## Étape 4 — Plan de couverture et exécution

Chaque story recevra au minimum une preuve E2E, complétée par les tests de niveau inférieur qui contrôlent ses règles à risque. Les scénarios P0 emploient toujours le chemin nominal, un refus métier et une assertion de sécurité ou de persistance ; les P1 ajoutent le chemin nominal et les principales erreurs ; les P2 vérifient le smoke et l’accessibilité visuelle.

| ID | Stories | Scénario E2E atomique | Niveau complémentaire | Priorité |
|---|---|---|---|---|
| E2E-01 | 1.2–1.3 | Service démarré, migration appliquée, réponse enveloppée et erreur DTO formatée | Migration/Prisma, filtre unitaire | P0 |
| E2E-02 | 2.1–2.2 | Inscription, connexion, refresh et accès refusé à la modération pour un Célibataire | Auth/RBAC API | P0 |
| E2E-03 | 2.3 | Onboarding mobile : âge invalide bloqué puis soumission consentie en Pending | Formulaire/DTO | P0 |
| E2E-04 | 2.4 | Responsable approuve un profil, puis motive un rejet révisable | API de modération/audit | P0 |
| E2E-05 | 2.5 | Membre sauvegarde des disponibilités ; Responsable les consulte pour le couple | Validation plages/API | P1 |
| E2E-06 | 3.1–3.2 | Feed paginé : profil opposé libre visible ; profils même genre, pending et journey invisibles | Query Prisma/pagination | P0 |
| E2E-07 | 3.3 | Chargement contrôlé puis état vide accessible et libellé requis | Composant/UI | P2 |
| E2E-08 | 3.4 | Intérêt confidentiel, absence de notification cible, réciprocité et alerte Responsable | Transaction/API/audit | P0 |
| E2E-09 | 3.5 | Responsable filtre unilateral/match et lance la coordination | API de grille | P1 |
| E2E-10 | 4.1–4.2 | Match assigné, RDV créé, deux consentements positifs et ouverture Étape 2 | Machine à états/transaction | P0 |
| E2E-11 | 4.3–4.4 | Horloge contrôlée : alerte J30 puis promotion Étape 3 et alertes J85/J90 idempotentes | Processor Bull/horloge | P0 |
| E2E-12 | 4.5–4.7 | Kanban affiche 4 colonnes, jours restants et KPI cohérents sans drag-and-drop | API agrégations/UI | P1 |
| E2E-13 | 4.6 | Terminaison ferme le chat, réactive les profils et conserve l’audit | Machine d’état/autorisation | P0 |
| E2E-14 | 5.1–5.2 | Deux partenaires de Journey actif échangent un message temps réel ; valeur brute chiffrée | Crypto/Socket autorisation | P0 |
| E2E-15 | 5.3–5.4 | Numéro, e-mail et identifiant social bloqués avant remise ; UI affiche le feedback | Regex/Socket/audit | P0 |
| E2E-16 | 6.1 | Admin filtre l’audit en lecture seule ; non-admin refusé | RBAC/API recherche | P0 |
| E2E-17 | 6.2 | Brouillon créé puis approuvé ; seul le contenu approuvé est public | API/public UI | P1 |

### Preuves NFR prévues

| Catégorie | Preuve planifiée | Gate ou hypothèse |
|---|---|---|
| Sécurité/RBAC | Tests API et socket de rôle, propriété et durée de token ; secret de chiffrement absent refusé en production | P0 à 100 % ; aucun contournement autorisé. |
| Données/confidentialité | Contraintes Prisma, transaction de match/Journey, inspection de ciphertext, audit sans secret | P0 à 100 % ; tests de suppression/export inclus. |
| Performance | Chronométrage d’un feed seedé et d’une remise socket sur environnement local CI | Seuils documentés, baseline non représentative de la production. |
| Fiabilité | Factories isolées, horloge injectable, queue idempotente et aucune attente fixe Playwright | Aucun test flaky réessayé silencieusement. |
| Accessibilité | Analyse automatisée du backoffice/public et assertions de labels/focus/état | Contraste et navigation clavier à vérifier avant release. |
| Maintenabilité | Typecheck, lint, build, migration clean et documentation OpenAPI | Tous les jobs obligatoires verts. |

### Cadence d’exécution

Les validations P0 et P1, ainsi que lint, typecheck, tests unitaires et tests d’intégration, s’exécutent sur chaque pull request tant que leur durée reste inférieure à quinze minutes. La suite navigateur complète, les mesures de performance élargies et les tests d’accessibilité complets s’exécutent chaque nuit. Les scans de dépendances, parcours de régression à données plus volumineuses et revue de rétention s’exécutent hebdomadairement ou avant une release.

### Estimation et gates

La préparation du framework et des fixtures représente environ **16–28 heures**. La couverture P0 représente **45–70 heures**, la P1 **24–40 heures**, et les contrôles P2/P3 et polish **12–24 heures**. Ces intervalles concernent uniquement l’ingénierie de qualité et sont absorbés itération par itération avec la livraison fonctionnelle ; ils ne justifient aucun report d’un scénario P0.

Les gates sont les suivants : pass rate P0 de 100 %, P1 d’au moins 95 %, aucune mitigation de risque élevé ouverte, couverture de lignes du backend d’au moins 80 % hors bootstrap généré, preuve identifiée pour chaque NFR dans le périmètre et aucun scénario E2E critique instable. L’évaluation finale PASS/CONCERNS/FAIL des NFR sera menée après la collecte des preuves d’implémentation.

## Étape 5 — Livrables générés et validés

Le mode de génération retenu est **séquentiel**, car aucune capacité de délégation autonome n’est disponible dans l’environnement courant. Les trois livrables finaux ont été générés et contrôlés :

| Livrable | Chemin | Résultat |
|---|---|---|
| Architecture de test | `_bmad-output/test-artifacts/test-design-architecture.md` | Risques, ASR, blocages, NFR et mitigations. |
| Plan QA | `_bmad-output/test-artifacts/test-design-qa.md` | 25 scénarios liés aux 25 stories restantes, niveaux et gates. |
| Handoff BMAD | `_bmad-output/test-artifacts/test-design/ImpactC-handoff.md` | Risques et scénarios critiques reliés aux epics/itérations. |

La validation a confirmé la présence des sections clés, l’absence de placeholders de modèle et une matrice de 25 scénarios, correspondant à la totalité des stories non terminées. Les hypothèses ouvertes sont la durée de rétention du chat, les limites de capacité de production, l’intégration média définitive et les objectifs d’uptime. Elles sont visibles dans les livrables mais ne bloquent pas les itérations locales.
