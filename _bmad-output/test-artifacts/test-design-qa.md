---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-08-18'
workflowType: 'testarch-test-design'
project: 'ImpactC'
---

# Plan d’exécution qualité — ImpactC

**Objet :** Couverture opérationnelle des epics, scénarios prioritaires et gates de livraison.  
**Date :** 18 août 2026  
**Auteur :** Murat, Master Test Architect  
**Statut :** Prêt pour implémentation incrémentale

## Portée et approche

Les critères d’acceptation de toutes les stories restantes sont couverts par au moins un scénario E2E. Les tests de niveau inférieur portent les assertions précises de calcul, de cryptographie, de transaction et d’autorisation afin que les E2E restent centrés sur les parcours d’utilisateur réels. Le backend est la source unique des règles métier ; le mobile Expo Web et le backoffice Next.js sont les surfaces navigateur de référence du MVP.

Les données sont isolées par test. Chaque scénario crée ses comptes, profils, disponibilités et Journeys dans une base dédiée, et ne dépend ni d’un ordre d’exécution ni d’un service cloud réel. Les événements de notification, la queue et le média passent par des adaptateurs contrôlables.

## Préconditions de framework

| Domaine | Implémentation requise | Usage |
|---|---|---|
| Exécution E2E | Playwright avec démarrage contrôlé de l’API, backoffice et client Expo Web | Parcours navigateur, traces, captures en échec. |
| Base de test | PostgreSQL dédiée, migrations, reset transactionnel/factories Prisma | Données fiables et exécution répétable. |
| Auth de test | Helpers de génération de sessions par rôle, sans contourner le guard | Tests API et navigateur avec vrais privilèges. |
| Temps/queue | Horloge injectable et exécution directe du processor Bull | Alertes J30/J85/J90 testables sans attente réelle. |
| Socket | Clients Socket.io connectés avec tokens valides | Livraison, propriété de room, blocages de message. |
| Sélecteurs | `data-testid` sur actions et états métier ; labels accessibles en priorité | E2E résilients et contrôle a11y. |

## Matrice de scénarios

| ID | Story | Parcours et oracle de succès | Niveaux associés | Priorité |
|---|---|---|---|---|
| TD-001 | 1.2 | Démarrer PostgreSQL/Redis, appliquer migration, lire/écrire une entité Prisma réelle. | Migration, intégration | P0 |
| TD-002 | 1.3 | Une réussite REST utilise l’enveloppe standard ; DTO invalide renvoie une erreur structurée. | API | P0 |
| TD-003 | 2.1 | Un User/Profile valide est persisté ; doublon et valeurs interdites sont rejetés. | Prisma, API | P0 |
| TD-004 | 2.2 | Inscription/connexion renvoient access token et refresh cookie ; Célibataire refusé du backoffice. | API, navigateur | P0 |
| TD-005 | 2.3 | Le wizard mobile bloque un âge inférieur à 18 ans et soumet un profil consentant en Pending. | Composant, navigateur | P0 |
| TD-006 | 2.4 | Un Responsable approuve un profil puis rejette un autre avec note ; le rejet est resoumissible. | API, navigateur | P0 |
| TD-007 | 2.5 | Un membre valide et enregistre ses créneaux ; le Responsable les lit lors d’une coordination. | API, navigateur | P1 |
| TD-008 | 3.1 | Un intérêt unique est idempotent ; l’inverse crée exactement un match et une alerte. | Transaction, API | P0 |
| TD-009 | 3.2 | Le feed ne retourne que les profils opposés, approuvés et libres, en pages stables. | API, navigateur | P0 |
| TD-010 | 3.3 | Skeleton pendant le chargement ; état vide avec le texte et les instructions requis. | Composant, navigateur | P2 |
| TD-011 | 3.4 | Intérêt sans signal à la cible ; réciprocité visible seulement au Responsable. | API, navigateur | P0 |
| TD-012 | 3.5 | Grille Responsable filtre unilateral et match, puis ouvre la coordination. | API, navigateur | P1 |
| TD-013 | 4.1 | Un partenaire dans un Journey actif ne peut être inséré dans un second. | Transaction, API | P0 |
| TD-014 | 4.2 | Match assigné, RDV, deux consentements positifs, promotion Étape 2, chat autorisé. | API, navigateur | P0 |
| TD-015 | 4.3 | Processor à J30 crée une alerte unique sans changer l’étape. | Unitaire, intégration | P1 |
| TD-016 | 4.4 | Responsable promeut Étape 3 ; dates et alertes J85/J90 sont correctes. | API, navigateur | P0 |
| TD-017 | 4.5 | Kanban rend quatre colonnes, jours restants, badge critique, et aucune interaction drag. | Composant, navigateur | P1 |
| TD-018 | 4.6 | Terminaison ferme chat, rétablit profils, invalide room et trace l’action. | API, socket, navigateur | P0 |
| TD-019 | 4.7 | KPI et tendance correspondent aux données seedées et restent accessibles. | API, navigateur | P1 |
| TD-020 | 5.1 | Le contenu brut en base ne contient pas le texte clair ; service autorisé le déchiffre. | Unitaire, intégration | P0 |
| TD-021 | 5.2 | Deux partenaires autorisés échangent un message dans `/chat`; tiers et ancien partenaire refusés. | Socket, E2E | P0 |
| TD-022 | 5.3 | Téléphone, e-mail et réseau social sont bloqués avant persistance/émission, journalisés et alertés. | Unitaire, socket, E2E | P0 |
| TD-023 | 5.4 | Bannière fixe, état erreur, toast et bouton désactivé exposent le blocage au membre. | Composant, navigateur | P1 |
| TD-024 | 6.1 | Un Admin filtre un audit read-only ; un autre rôle ne peut ni l’écrire ni le lire. | API, navigateur | P0 |
| TD-025 | 6.2 | Témoignage brouillon invisible en public ; après approbation, page publique le rend. | API, navigateur | P1 |

## Parcours E2E de référence

Le parcours P0 de non-régression traverse deux célibataires, un Responsable et un Administrateur. Les deux membres terminent leur onboarding et sont approuvés. Ils renseignent leurs disponibilités, se voient dans le feed admissible, expriment réciproquement un intérêt sans fuite de confidentialité, puis le Responsable planifie un rendez-vous et recueille deux consentements. La promotion ouvre le Journey et le chat ; le test prouve à la fois une remise autorisée et un blocage de coordonnées. Le Responsable termine ensuite le Journey, ce qui rend les profils à nouveau découvrables et laisse l’Administrateur consulter un audit sans texte sensible.

Ce parcours est scindé en fichiers Playwright par objet fonctionnel pour éviter un test monolithique. Les fixtures partagées ont la responsabilité exclusive de créer les rôles et de se connecter ; chaque spec crée les données propres à sa règle.

## Couverture NFR planifiée

| NFR | Validation | Artefact attendu |
|---|---|---|
| JWT, RBAC, propriété | Cas négatifs REST/WebSocket et validation de cookies | Résultats Jest/Playwright, traces d’échec. |
| Chiffrement au repos | Inspection de ciphertext et tests AES-GCM/clé manquante | Rapport Jest d’intégration. |
| Confidentialité d’intérêt | Réponses et événements observés côté cible | Trace E2E à deux sessions. |
| Performance feed/chat | Chronométrage local contrôlé et baselines CI | Rapport JSON de mesures ; limite production à confirmer. |
| Jobs d’expiration | Horloge fixe, relance processor, une alerte par jalon | Tests et logs de job. |
| WCAG 2.1 AA | Labels, focus, états, contraste et analyse automatisée | Rapport accessibility de build nocturne. |
| GDPR | Consentement, export, suppression authentifiée et auditée | E2E API/navigateur et entrée audit. |

## Exécution et gates

Les commits exécutent typecheck, lint, unitaires et intégration. Les pull requests exécutent les tests P0/P1 et E2E ciblés en moins de quinze minutes. Les nuits exécutent la suite navigateur complète, l’analyse d’accessibilité et les mesures de performance ; la revue hebdomadaire examine le scan de dépendances et les tests de charge lorsque des seuils de production sont définis.

| Gate | Exigence |
|---|---|
| P0 | 100 % de réussite, y compris les cas négatifs sécurité/données. |
| P1 | Au moins 95 % de réussite ; tout échec est trié avant merge. |
| Fiabilité | Aucun retry masquant un test flaky ; traces/captures sur tout échec E2E. |
| Couverture | Backend métier à au moins 80 % hors code bootstrap généré ; toutes les stories liées à un ID E2E. |
| NFR | Une preuve est produite pour chaque NFR dans le périmètre ; les inconnus sont maintenus visibles. |
| Release | Aucun risque score ≥6 non mitigé et aucun P0 non exécuté. |

## Planning qualité

La fondation de test et les fixtures sont réalisées avec l’Itération 0. Les cas P0 sont écrits en ATDD avant ou avec chaque capability qui porte un risque haut ; les P1/P2 accompagnent les écrans et agrégations. L’effort estimé est de 16–28 heures pour la fondation, 45–70 heures P0, 24–40 heures P1 et 12–24 heures P2/P3, intégré aux lots de développement et non reporté à la fin.

## Annexe — Convention de tags

Les specs Playwright et Jest emploient `@p0`, `@p1`, `@p2` et le domaine, par exemple `@chat`, `@rbac` ou `@journey`. Les scripts de CI ciblent d’abord `@p0`, puis `@p0|@p1`, et la régression complète ne filtre pas les tags. Les sélecteurs se basent en priorité sur le rôle et le libellé accessible, avec `data-testid` seulement pour les interactions métier dont l’intitulé peut évoluer.

## Sources internes

| Référence | Document |
|---|---|
| [1] | `_bmad-output/planning-artifacts/epics.md` |
| [2] | `_bmad-output/planning-artifacts/architecture.md` |
| [3] | `_bmad-output/test-artifacts/test-design-architecture.md` |
| [4] | `docs/epic-delivery-plan.md` |
