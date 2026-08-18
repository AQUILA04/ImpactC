---
project: 'ImpactC'
date: '2026-08-18'
author: 'Murat, Master Test Architect'
status: 'ready-for-implementation'
---

# Handoff qualité BMAD — ImpactC

## Inventaire des artefacts TEA

| Artefact | Finalité |
|---|---|
| `_bmad-output/test-artifacts/test-design-architecture.md` | Risques, blocages de testabilité et exigences non fonctionnelles. |
| `_bmad-output/test-artifacts/test-design-qa.md` | 25 scénarios couvrant chaque story restante et la stratégie d’exécution. |
| `_bmad-output/test-artifacts/test-design/test-design-progress.md` | Traçabilité du workflow de conception système. |
| `docs/epic-delivery-plan.md` | Écart d’implémentation, règles métier complétées et séquencement de livraison. |

## Consignes d’intégration par epic

| Epic | Risques et exigences à intégrer | Vérification de sortie |
|---|---|---|
| 1 — Infrastructure | B-01, B-04 ; contrat d’erreur/réponse, migration reproductible, fixtures de test. | TD-001 et TD-002 passent ; framework Playwright prêt. |
| 2 — Admission | R-001, R-008 ; âge, consentement, rôles, révision après rejet et disponibilités. | TD-003 à TD-007 passent ; un Célibataire ne peut pas ouvrir une vue Responsable. |
| 3 — Découverte | R-002 ; éligibilité stricte du feed, idempotence, confidentialité absolue de l’intérêt. | TD-008 à TD-012 passent ; aucun signal n’est observable par une cible. |
| 4 — Journey | R-003, R-006 ; machine à états transactionnelle, consentements séparés, temps injectable. | TD-013 à TD-019 passent ; aucun Journey double ou changement automatique. |
| 5 — Chat | R-001, R-004, R-005 ; propriété socket, AES-GCM, blocage avant enregistrement/émission. | TD-020 à TD-023 passent ; le corpus anti-contact est entièrement bloqué. |
| 6 — Audit/publication | R-001, R-008 ; audit append-only non sensible et visibilité publique contrôlée. | TD-024 et TD-025 passent ; les brouillons ne sont jamais publics. |

## Guidance story-level P0

| Stories | Test à écrire avant ou avec l’implémentation | Condition obligatoire |
|---|---|---|
| 1.2–1.3 | TD-001, TD-002 | Le contrat API et la migration sont établis avant les modules métier. |
| 2.1–2.4 | TD-003 à TD-006 | Toute route de modération est protégée par un rôle réel. |
| 3.1, 3.2, 3.4 | TD-008, TD-009, TD-011 | Le service, non le client, impose le genre/statut/confidentialité. |
| 4.1, 4.2, 4.4, 4.6 | TD-013, TD-014, TD-016, TD-018 | Les transitions sont transactions de domaine et sont auditées. |
| 5.1–5.3 | TD-020 à TD-022 | Aucune donnée de contact ni contenu clair ne franchit la frontière serveur. |
| 6.1 | TD-024 | L’audit ne peut pas être modifié et reste restreint aux Administrateurs. |

## Séquence recommandée

1. **Itération 0 :** rendre PostgreSQL/Redis/Prisma, les réponses d’erreur, les fixtures et Playwright opérationnels.
2. **Itération 1 :** admission contrôlée de bout en bout, du client mobile à la modération web.
3. **Itération 2 :** découverte, intérêts et match confidentiel sur deux comptes.
4. **Itération 3 :** rendez-vous, Journey, jobs d’alerte, Kanban et KPI.
5. **Itération 4 :** chat temps réel chiffré et anti-contact, après la machine à états.
6. **Itération 5 :** audit, témoignages et droits GDPR ; puis régression de release.

## Gates de passage

Une itération ne passe à la suivante que lorsque ses scénarios P0 ont un taux de réussite de 100 %, que les migrations sont répétables depuis une base vide, que les fonctions sensibles produisent un audit conforme, et que les tests E2E sont stables sans délais arbitraires. Les scénarios P1 doivent atteindre au moins 95 % avant une release ; aucun risque R-001 à R-007 ne peut rester non mitigé.

## Hypothèses ouvertes à arbitrer avant production

La durée de conservation des historiques de chat, les limites de charge de production, la stratégie définitive S3/Cloudinary et la définition de disponibilité/uptime doivent être confirmées. Ces éléments n’empêchent pas le développement local et les E2E, mais sont des conditions de mise en production.
