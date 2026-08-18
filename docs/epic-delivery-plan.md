# Plan de livraison incrémental — ImpactC

**Date :** 18 août 2026  
**Périmètre :** Tous les epics et user stories définis dans `_bmad-output/planning-artifacts/epics.md`.

## Synthèse de l’audit

Le dépôt est à l’état de **socle technique**. La story 1.1 est effectivement réalisée : les trois applications existent. La story 1.2 est seulement en revue et ne fournit actuellement qu’une instance PostgreSQL/Redis et un modèle Prisma de test. La story 1.3 ainsi que toutes les stories des epics 2 à 6 sont absentes du code, ce que confirment l’état de sprint et l’arborescence des applications. En conséquence, les epics ne peuvent pas être traités comme des compléments d’interface : le produit requiert une implémentation full-stack complète, avec le backend et son modèle de données comme chemin critique.

| Epic | Stories | État constaté | Décision de livraison |
|---|---:|---|---|
| Epic 1 — Infrastructure | 1.1 à 1.3 | 1.1 terminée ; 1.2 incomplète ; 1.3 absente | Clore le socle avant toute fonctionnalité métier. |
| Epic 2 — Onboarding | 2.1 à 2.5 | Aucune implémentation métier | Première tranche fonctionnelle et sécurisée. |
| Epic 3 — Découverte et match | 3.1 à 3.5 | Aucune implémentation métier | Dépend de l’approbation des profils et de l’authentification. |
| Epic 4 — Cheminement | 4.1 à 4.7 | Aucune implémentation métier | Dépend des matches et des disponibilités. |
| Epic 5 — Chat sécurisé | 5.1 à 5.4 | Aucune implémentation métier | Dépend d’un cheminement actif et d’un contrôle d’accès robuste. |
| Epic 6 — Audit et témoignages | 6.1 à 6.2 | Aucune implémentation métier | Transversal : l’audit doit être branché dès la première action métier. |

> **Conclusion de couverture :** 25 des 26 stories ne disposent pas encore d’une preuve fonctionnelle. La story 1.2 n’est pas considérée livrée tant que les migrations, le client Prisma et la base démarrée ne sont pas validés automatiquement.

## Règles métier et sous-fonctionnalités à expliciter puis implémenter

Les documents spécifient le parcours nominal, mais un produit exploitable doit aussi résoudre les décisions opérationnelles suivantes. Elles seront intégrées aux incréments, documentées dans les DTO et protégées par des tests d’acceptation.

| Sujet | Règle de produit retenue | Justification opérationnelle |
|---|---|---|
| Comptes des Responsables et Administrateurs | Aucun acteur à privilège ne peut s’auto-inscrire. Les comptes de supervision sont provisionnés de manière contrôlée (seed local, administration future), avec rôle explicite. | Empêche l’élévation de privilège et rend le RBAC testable. |
| Consentement, protection des données et majorité | L’inscription exige un consentement explicite ; un profil ne peut être soumis qu’à 18 ans révolus. L’export et la demande de suppression sont authentifiés et journalisés. | Couvre le GDPR prévu par le NFR10 et évite l’exposition de mineurs. |
| Modération de profil | Une approbation ou un rejet nécessite l’identité du modérateur et une note. Un profil rejeté reste invisible ; son titulaire peut corriger puis soumettre à nouveau. | Évite l’impasse utilisateur créée par un rejet définitif non révisable. |
| Photo de profil | Le MVP accepte une URL contrôlée avec validation de format, taille et ratio 4:5 ; l’adaptateur média rend l’intégration S3/Cloudinary remplaçable. Le flux ne dépend pas de clés cloud en développement. | Assure un parcours de démo complet, sans contourner les exigences de sécurité et de cadrage média. |
| Intérêts et matches | Un intérêt est idempotent : un même expéditeur ne peut pas créer deux intérêts actifs vers la même cible. Les intérêts propres, les cibles non approuvées, de même genre ou déjà engagées sont refusés. | Préserve la confidentialité, l’intégrité du match et les règles d’éligibilité du feed. |
| Affectation d’un Responsable | Un match nécessite un Responsable assigné avant planification ; le backoffice permet l’affectation manuelle par un Responsable/Admin autorisé. | Le PRD laisse la méthode ouverte ; la supervision ne doit jamais être orpheline. |
| Rendez-vous et consentements | Un rendez-vous possède date, lieu, responsable, statut et deux décisions individuelles. La promotion vers l’étape 2 exige les deux décisions positives et l’action explicite du Responsable. | Évite qu’une seule confirmation ou qu’un rendez-vous non tenu ouvre le chat. |
| Machine à états Journey | Les transitions sont strictes : Étape 1 → 2 → 3 → 4 ou terminaison. Une terminaison est possible depuis toute étape active ; aucune transition directe ou glisser-déposer n’est permise. | Garantit le processus pastoral supervisé et facilite les tests négatifs. |
| Expiration et alertes | Les contrôles quotidiens produisent une alerte dédupliquée par journey et jalon : J30 pour l’étape 2, J85 puis J90 pour l’étape 3. Le statut ne change jamais automatiquement. | Évite des décisions automatisées non autorisées et les alertes répétitives. |
| Chat et historique | Le chat est permis uniquement aux deux partenaires d’un Journey actif aux étapes 2, 3 et 4. La terminaison ferme le canal, conserve le journal chiffré pour les Administrateurs autorisés et interdit toute lecture par les membres. | Concilie la confidentialité, l’audit et la règle de fermeture immédiate. |
| Filtre anti-contact | Le filtrage est appliqué côté serveur avant persistance et émission. Le message bloqué n’est jamais remis ; la violation est journalisée et crée une alerte au Responsable. | Ne fait pas reposer une règle de sécurité sur le seul client. |
| Notifications | Un journal de notifications interne est créé pour les événements métier. Les canaux push/email peuvent être branchés ultérieurement sans modifier les décisions métier. | Rend visibles les alertes sans exiger un prestataire externe pour un environnement fonctionnel. |
| Audit et confidentialité | Les entrées d’audit sont append-only, comprennent l’acteur, le type d’action, la cible, les métadonnées non sensibles et l’horodatage. Les mots de passe, jetons et texte déchiffré des messages n’y figurent jamais. | Fournit une preuve exploitable sans créer une fuite de données personnelles. |

## Stratégie de tests TEA

La stratégie utilise l’approche de l’agent TEA : priorité aux risques, preuves E2E des parcours critiques, fixtures déterministes, test API pour chaque règle métier et test navigateur pour chaque flux utilisateur. Le client Expo est validé en cible web pour le MVP, ce qui permet de tester le vrai parcours mobile responsive avec Playwright. Les API restent testables avec Supertest ; les scénarios temps réel emploient des clients Socket.io contrôlés.

| Niveau | Finalité | Outil prévu | Critère de sortie |
|---|---|---|---|
| Unitaire | Règles de calcul, machine à états, chiffrement et détection de contacts | Jest | Tous les cas positifs et négatifs passent. |
| Intégration API | RBAC, persistance Prisma, migrations, réponses enveloppées et transactions | Jest + Supertest + PostgreSQL | Les contrats d’API sont stables et les effets base sont vérifiés. |
| E2E navigateur | Onboarding, modération, découverte, planification, Kanban, audit, témoignages | Playwright | Au moins un scénario de bout en bout relié à chaque user story. |
| E2E temps réel | Autorisation Socket.io, livraison, chiffrement et blocage anti-contact | Socket.io client + Jest | Le destinataire reçoit uniquement les messages autorisés. |
| Qualité de release | Build, lint, accessibilité, flux critiques et non-régression | Scripts CI | Aucune erreur bloquante ni test P0/P1 en échec. |

## Matrice de couverture des user stories

| Story | Résultat livrable | Preuve E2E minimale | Priorité risque |
|---|---|---|---|
| 1.2 | PostgreSQL, Redis, Prisma et migration réelle | Démarrage des services, migration, lecture/écriture Prisma | P0 |
| 1.3 | Filtre d’exception, validation globale et enveloppe API | Requête réussie et erreur de validation au format standard | P0 |
| 2.1 | Modèles User et Profile avec contraintes | Création, contraintes uniques et index contrôlés par API | P0 |
| 2.2 | Inscription, connexion, refresh et RBAC | Authentification ; refus 403 d’un Célibataire vers un endpoint backoffice | P0 |
| 2.3 | Onboarding mobile validé, consentement et soumission | Formulaire mobile ; âge invalide ; profil Pending créé | P0 |
| 2.4 | File de modération et décisions motivées | Responsable approuve puis rejette un profil dans le backoffice | P0 |
| 2.5 | Disponibilités hebdomadaires | Membre sauvegarde ; Responsable les lit pour un match | P1 |
| 3.1 | Interests et Match persistants | Intérêt idempotent puis match créé transactionnellement | P0 |
| 3.2 | Feed paginé et isolé par genre/statut | Profil admissible visible ; profils interdits invisibles | P0 |
| 3.3 | Skeleton et état vide accessible | Chargement simulé puis état « Expanding the Search » | P2 |
| 3.4 | Intérêt confidentiel et match réciproque | Aucun signal à la cible ; match et alerte Responsable après réciprocité | P0 |
| 3.5 | Grille de match filtrable | Filtre Unilateral/Match et action de coordination | P1 |
| 4.1 | Journey exclusif et affecté | Refus du second Journey actif pour un partenaire | P0 |
| 4.2 | RDV et consentements séparés | Création RDV, deux avis, promotion Étape 2 et chat ouvert | P0 |
| 4.3 | Alerte expiration Étape 2 | Traitement quotidien génère une alerte J30 sans transition auto | P1 |
| 4.4 | Promotion Étape 3 et échéance | Approbation Responsable, échéance 90 jours et alerte J85 | P0 |
| 4.5 | Kanban à quatre colonnes sans drag-and-drop | Carte, responsable, jours restants et badge critique | P1 |
| 4.6 | Terminaison sûre du Journey | Chat fermé, profils réactivés, audit conservé | P0 |
| 4.7 | KPI et tendances | Chiffres cohérents avec les données seedées | P1 |
| 5.1 | Messages chiffrés au repos | Colonne brute non lisible ; déchiffrement autorisé | P0 |
| 5.2 | Messagerie temps réel autorisée | Deux clients de Journey reçoivent un message sous contrainte | P0 |
| 5.3 | Filtre anti-contact serveur | Numéro, e-mail et réseau social bloqués et journalisés | P0 |
| 5.4 | Interface de chat et feedback utilisateur | Bannière, erreur d’entrée et action désactivée après violation | P1 |
| 6.1 | Audit en lecture seule et recherche | Admin filtre les actions ; écriture non autorisée | P0 |
| 6.2 | Témoignages publics et modération | Brouillon invisible, approbation, affichage public | P1 |

## Itérations de développement

Les itérations sont verticales : chaque lot produit une capacité utilisable, conserve les contrôles de sécurité et ajoute ses preuves de test avant d’ouvrir le suivant. Les histoires étroitement liées sont regroupées pour éviter des API fictives et des frontends sans workflow réel.

| Itération | Stories principales | Produit utilisable à l’issue | Validation impérative |
|---|---|---|---|
| 0 — Socle fiable | 1.2, 1.3 | Base migrée, contrat HTTP homogène, validation, Swagger, observabilité locale | Migrations, E2E API, builds des trois applications. |
| 1 — Admission contrôlée | 2.1 à 2.5 | Inscription mobile, consentement, profil en attente, modération web, disponibilités | E2E membre → Responsable ; RBAC et âge 18+ négatifs. |
| 2 — Découverte confidentielle | 3.1 à 3.5 | Feed filtré, intérêt confidentiel, détection de match, grille Responsable | E2E de deux membres et vérification d’absence de divulgation. |
| 3 — Cheminement supervisé | 4.1 à 4.7 | RDV, deux consentements, Journey, échéances, Kanban et KPI | E2E match → RDV → Étape 2 → Étape 3 → terminaison ; job d’expiration déterministe. |
| 4 — Chat protégé | 5.1 à 5.4 | Canal privé temps réel, chiffrement, anti-contact et alertes | E2E Socket.io, inspection persistée, tentatives de contournement du filtre. |
| 5 — Confiance et publication | 6.1 à 6.2 | Audit Administrateur et témoignages publics modérés | E2E des permissions, recherche audit, cycle brouillon → approuvé → public. |
| 6 — Release candidate | Toutes | Produit intégrable, documenté et cohérent | Suite complète, revue TEA, analyse accessibilité, test manuel des parcours P0. |

## Définition de terminé par story

Une story n’est déclarée terminée que lorsque ses critères d’acceptation sont satisfaits dans le code, ses routes sont protégées et documentées, ses erreurs respectent l’enveloppe conventionnelle, son action est auditée lorsqu’elle est sensible, et au moins un scénario E2E déterministe couvre le comportement attendu. Toute dépendance à une infrastructure externe est remplacée en développement par un adaptateur local testable, jamais par un contournement des règles métier.

## Risques principaux et mitigations

| Risque | Impact | Mitigation intégrée |
|---|---|---|
| Fuite d’intérêt ou accès à un espace Responsable | Très élevé | Autorisation serveur par rôle et propriété, tests de refus transverses. |
| Transition de Journey invalide ou double relation active | Très élevé | Contraintes base, transactions et machine à états testée. |
| Partage de coordonnées via chat | Très élevé | Filtre serveur avant stockage/émission, variantes de formats testées, audit/alerte. |
| Perte de confidentialité des messages | Très élevé | AES-256-GCM, clé de chiffrement configurable, contrôle de lecture, absence de texte en audit. |
| Alertes d’échéance bruyantes ou inactives | Élevé | Idempotence par jalon, job testable à une date figée, tableau d’alertes. |
| Tests E2E instables | Élevé | Fixtures isolées, données seedées, API de préparation contrôlée, sélecteurs dédiés et aucune attente arbitraire. |

## Sources internes

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/prds/prd-ImpactC-2026-06-19/prd.md`
- `docs/Spécification Fonctionnelle.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
