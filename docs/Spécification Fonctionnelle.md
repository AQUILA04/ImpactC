# Spécification Fonctionnelle
## Plateforme Matrimoniale Intra-Communautaire

**Nom du projet :** ImpactC — Module Matrimonial
**Version :** 1.0
**Auteur :** Manus AI
**Date :** Mai 2026

---

## 1. Contexte et Objectifs

Au sein de nombreuses communautés religieuses, les règles de bienséance et de respect mutuel limitent les interactions directes entre célibataires de sexe opposé. Cette contrainte, bien qu'ancrée dans des valeurs profondes, a pour conséquence que les membres finissent par chercher un partenaire en dehors de leur communauté d'appartenance, fragilisant ainsi la cohésion et l'identité du groupe.

La présente plateforme a pour vocation de résoudre cette problématique en offrant un espace numérique sécurisé, supervisé et conforme aux valeurs de l'église. Elle permet aux célibataires de se découvrir mutuellement, d'exprimer un intérêt de manière confidentielle, et de cheminer vers le mariage selon un processus structuré en plusieurs étapes, chacune validée par des responsables désignés.

---

## 2. Acteurs du Système

Le système implique trois profils d'acteurs distincts, chacun disposant d'un espace et de droits spécifiques.

| Acteur | Description | Droits Principaux |
| :--- | :--- | :--- |
| **Célibataire** | Membre de l'église inscrit sur la plateforme pour trouver un partenaire. | Créer un profil, consulter les profils, manifester un intérêt, chatter (si en phase d'étude). |
| **Responsable** | Membre désigné par l'église pour superviser les mises en relation. | Accéder au back-office, voir les intérêts, planifier les RDV, valider les transitions d'étapes. |
| **Administrateur** | Gestionnaire technique de la plateforme. | Gérer les comptes, les rôles, les paramètres globaux et les statistiques. |

---

## 3. Fonctionnalités Détaillées

### 3.1. Inscription et Gestion du Profil Célibataire

L'inscription est la porte d'entrée de la plateforme. Elle doit être simple, guidée et complète. Un célibataire remplit un formulaire en plusieurs étapes (onboarding) comprenant les informations suivantes :

| Catégorie | Champs requis |
| :--- | :--- |
| **Identité** | Prénom, Nom, Date de naissance, Sexe, Nationalité, Ville de résidence |
| **Vie Spirituelle** | Département de service à l'église, Nom du responsable de département, Ancienneté dans l'église |
| **Vie Professionnelle** | Profession, Secteur d'activité, Situation financière (fourchette) |
| **Présentation** | Photo(s) de profil, Phrase d'accroche, Description personnelle |
| **Critères de Recherche** | Tranche d'âge souhaitée, Critères spirituels, Critères professionnels |

Une fois le profil créé, il est soumis à validation par un responsable avant d'être visible sur la plateforme. Cela garantit l'authenticité des profils et le respect des règles communautaires.

### 3.2. Consultation des Profils et Manifestation d'Intérêt

Les célibataires peuvent naviguer dans un flux de profils de membres du sexe opposé. Chaque profil est présenté sous forme de carte (card) avec les informations essentielles. En accédant au profil complet, l'utilisateur peut cliquer sur un bouton "Je suis intéressé(e)".

**Règle fondamentale :** Cette action est totalement confidentielle. La personne ciblée ne reçoit aucune notification. Seuls les responsables en back-office ont accès à cette information.

### 3.3. Processus de Mise en Relation (Géré par les Responsables)

Le traitement des intérêts manifestés suit une logique précise, résumée dans le tableau ci-dessous.

| Scénario | Déclencheur | Action du Responsable | Résultat |
| :--- | :--- | :--- | :--- |
| **Intérêt Unilatéral** | A est intéressé par B, mais B n'a pas encore vu le profil de A ou n'est pas intéressé. | Le responsable contacte B (via la plateforme ou en personne) pour lui proposer un RDV avec A. | Si B accepte → Planification du RDV. Si B refuse → Notification discrète à A. |
| **Match Bilatéral** | A et B ont tous les deux cliqué sur "Intéressé" sur le profil de l'autre. | Le système notifie automatiquement les responsables. | Le responsable planifie directement un RDV entre A et B. |

### 3.4. Processus de Cheminement en 4 Étapes

Le cheminement vers le mariage est structuré en quatre étapes progressives, chacune nécessitant un accord mutuel pour être franchie.

#### Étape 1 — Premier Rendez-vous (Supervisé)

Un responsable planifie une rencontre physique entre les deux célibataires. Ce rendez-vous se déroule en présence d'un ou deux responsables qui assurent la supervision. Les deux parties disposent du temps nécessaire pour se présenter, poser leurs questions et évaluer leur compatibilité. À l'issue de la rencontre, les deux parties donnent séparément leur avis au responsable : continuer ou s'arrêter. Si les deux souhaitent continuer, le processus passe à l'étape 2. Si l'un des deux refuse, les profils restent visibles et libres.

#### Étape 2 — Étude d'un Mois (Chat Sécurisé)

Cette phase marque le début de la connaissance mutuelle approfondie. Les deux profils passent en statut **"En cheminement"** et disparaissent du flux de recherche des autres célibataires. Un canal de messagerie privé et sécurisé est ouvert entre les deux utilisateurs sur la plateforme. La durée de cette phase est fixée à **un mois**. À l'expiration, un rendez-vous bilan est planifié avec un responsable pour décider de la suite.

> **Règle d'or :** Les conditions d'utilisation interdisent formellement l'échange de contacts personnels (numéro de téléphone, email, réseaux sociaux) via le chat. Toute communication doit se faire exclusivement sur la plateforme. Un système de filtrage automatique peut détecter et bloquer les tentatives de partage de contacts.

#### Étape 3 — Étude Prolongée (3 Mois, Rencontres Supervisées)

Si les deux parties souhaitent approfondir leur connaissance, elles entrent dans une phase de trois mois. Cette étape permet des rencontres physiques plus régulières, y compris des visites dans les familles respectives, toujours sous la supervision d'un responsable. Le chat reste actif. Un bilan est effectué à la fin des trois mois.

#### Étape 4 — Étude Finale et Préparatifs de Mariage

Cette dernière étape est similaire à l'étape 3 mais constitue la phase finale avant l'engagement. À l'issue de cette étape, soit les préparatifs de mariage commencent, soit les deux parties décident de mettre fin au cheminement.

**En cas d'arrêt à n'importe quelle étape :** Le canal de chat est immédiatement fermé, les profils des deux utilisateurs repassent en statut **"Célibataire Libre"** et redeviennent visibles dans le flux de recherche.

---

## 4. Fonctionnalités Complémentaires (Proactives)

En plus du cœur fonctionnel décrit ci-dessus, les fonctionnalités suivantes sont recommandées pour une application moderne et utile à la communauté.

**Notifications Intelligentes :** Envoi de notifications push (et/ou email) aux responsables pour les alerter des nouveaux matchs, des RDV à venir et des fins de phase imminentes. Les célibataires reçoivent des rappels pour compléter leur profil.

**Système de Témoignages :** Une section publique (accessible à tous les membres de l'église, même non inscrits) où les couples mariés grâce à la plateforme peuvent partager leur témoignage. Cela renforce la confiance et encourage les inscriptions.

**Tableau de Bord Statistique (Admin) :** Visualisation des données clés : nombre d'inscrits, taux de match, taux de conversion par étape, nombre de mariages conclus. Ces données aident les responsables à améliorer le processus.

**Modération du Contenu :** Les responsables peuvent signaler et masquer des profils ne respectant pas les règles de la communauté.

**Gestion des Disponibilités pour les RDV :** Les célibataires peuvent indiquer leurs créneaux de disponibilité, facilitant la planification des rendez-vous par les responsables.

---

## 5. Règles de Gestion Globales

La confidentialité des intérêts est absolue et non négociable. La communication entre célibataires est strictement limitée à la plateforme pendant les phases d'étude. La visibilité d'un profil est dynamiquement gérée en fonction du statut de l'utilisateur. Aucune transition d'étape ne peut se faire sans validation explicite d'un responsable. L'ensemble des actions sensibles (validation de profil, changement de statut, planification de RDV) est tracé et auditable par les administrateurs.
