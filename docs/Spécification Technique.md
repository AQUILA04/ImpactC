# Spécification Technique
## Plateforme Matrimoniale Intra-Communautaire

**Nom du projet :** ImpactC — Module Matrimonial
**Version :** 1.0
**Auteur :** Manus AI
**Date :** Mai 2026

---

## 1. Architecture Globale

L'application sera conçue selon une architecture **découplée (Decoupled Architecture)**, séparant clairement le frontend (client), le backend (API) et les services tiers. Cette approche garantit une meilleure évolutivité, facilite la maintenance indépendante de chaque couche, et permet de développer ultérieurement des applications mobiles natives (iOS/Android) utilisant la même API REST.

L'ensemble de l'infrastructure sera hébergée sur le cloud (AWS ou GCP) pour assurer une haute disponibilité, une sécurité renforcée et une scalabilité à la demande.

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTS                                 │
│  ┌──────────────────┐      ┌──────────────────────────────┐ │
│  │  App Mobile      │      │  Web App (Responsables)      │ │
│  │  (React Native)  │      │  (Next.js)                   │ │
│  └────────┬─────────┘      └──────────────┬───────────────┘ │
└───────────┼────────────────────────────────┼────────────────┘
            │  HTTPS / WSS                   │
┌───────────▼────────────────────────────────▼────────────────┐
│                  API GATEWAY (Nginx / AWS API GW)           │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                  BACKEND (Node.js / NestJS)                 │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Auth API  │  │  Core API    │  │  WebSocket Server    │ │
│  │  (JWT)     │  │  (REST)      │  │  (Socket.io - Chat)  │ │
│  └────────────┘  └──────────────┘  └──────────────────────┘ │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                  COUCHE DE DONNÉES                          │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL  │  │  Redis   │  │  AWS S3 / Cloudinary  │  │
│  │  (DB Princ.) │  │  (Cache) │  │  (Stockage Médias)   │  │
│  └──────────────┘  └──────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Choix Technologiques

### 2.1. Frontend

L'interface utilisateur doit être réactive, rapide et offrir une excellente expérience sur mobile (approche Mobile-First).

| Technologie | Rôle | Justification |
| :--- | :--- | :--- |
| **Next.js 14** | Framework Web (Back-office Responsables) | Rendu côté serveur (SSR) pour les performances, routing intégré, idéal pour les tableaux de bord. |
| **React Native (Expo)** | Application Mobile Célibataires | Permet de cibler iOS et Android avec une base de code commune. Expérience native fluide. |
| **Tailwind CSS** | Framework de Style | Design moderne, responsive design natif, personnalisation aisée. Évite les CSS surchargés. |
| **Shadcn/ui ou Radix UI** | Bibliothèque de Composants | Composants accessibles (WCAG), bien documentés, facilement thématisables. |
| **React Query (TanStack)** | Gestion des Données Serveur | Gestion du cache, des états de chargement et des erreurs pour les appels API. |

### 2.2. Backend

Le backend doit gérer de manière sécurisée les profils, la logique de matching et les communications en temps réel.

| Technologie | Rôle | Justification |
| :--- | :--- | :--- |
| **Node.js + NestJS** | Serveur API | Architecture modulaire et structurée (modules, contrôleurs, services). Idéal pour les grandes applications. |
| **Socket.io** | Communication Temps Réel | Nécessaire pour le chat instantané entre les utilisateurs en phase d'étude. Gère les connexions persistantes. |
| **JWT (JSON Web Tokens)** | Authentification | Standard sécurisé pour les sessions. Les tokens contiennent le rôle (Célibataire, Responsable, Admin). |
| **Passport.js** | Stratégies d'Authentification | Gestion simplifiée de l'authentification locale et potentiellement OAuth (Google). |
| **Bcrypt** | Hachage des Mots de Passe | Algorithme de hachage robuste pour stocker les mots de passe de manière sécurisée. |
| **Bull (Redis Queue)** | File d'Attente de Tâches | Pour les tâches asynchrones : envoi d'emails, notifications push, vérification des fins de phase. |

### 2.3. Base de Données et Stockage

| Technologie | Rôle | Justification |
| :--- | :--- | :--- |
| **PostgreSQL** | Base de données relationnelle principale | Parfait pour les relations complexes (utilisateurs, statuts, historiques). Robuste et éprouvé. |
| **Prisma ORM** | Object-Relational Mapper | Simplifie les interactions avec PostgreSQL, génère les types TypeScript automatiquement. |
| **Redis** | Cache et Sessions | Accélère les requêtes fréquentes, gère les sessions WebSocket pour le chat. |
| **AWS S3 / Cloudinary** | Stockage de Médias | Stockage sécurisé et optimisé des photos de profil avec redimensionnement automatique. |

---

## 3. Modélisation de la Base de Données

Le schéma de données s'articule autour des entités suivantes.

### Table `users`
Stocke les informations d'authentification et le rôle de chaque utilisateur.

| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Identifiant unique. |
| `email` | VARCHAR(255) UNIQUE | Email de connexion. |
| `password_hash` | VARCHAR(255) | Mot de passe haché avec Bcrypt. |
| `role` | ENUM('celibataire', 'responsable', 'admin') | Rôle de l'utilisateur. |
| `is_active` | BOOLEAN | Compte validé par un responsable. |
| `created_at` | TIMESTAMP | Date de création. |

### Table `celibataire_profiles`
Contient toutes les informations du profil d'un célibataire, liée à `users`.

| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Identifiant unique. |
| `user_id` | UUID (FK → users) | Lien vers le compte utilisateur. |
| `first_name` | VARCHAR(100) | Prénom. |
| `last_name` | VARCHAR(100) | Nom. |
| `date_of_birth` | DATE | Date de naissance. |
| `gender` | ENUM('homme', 'femme') | Sexe. |
| `profession` | VARCHAR(255) | Profession. |
| `financial_situation` | VARCHAR(100) | Situation financière. |
| `church_department` | VARCHAR(255) | Département de service. |
| `department_leader` | VARCHAR(255) | Nom du responsable de département. |
| `tagline` | TEXT | Phrase d'accroche. |
| `search_criteria` | JSONB | Critères de recherche (stockés en JSON). |
| `status` | ENUM('libre', 'en_cheminement', 'suspendu') | Statut de visibilité. |
| `profile_photo_url` | VARCHAR(500) | URL de la photo principale. |

### Table `interests`
Gère les "likes" aveugles entre célibataires.

| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Identifiant unique. |
| `sender_id` | UUID (FK → celibataire_profiles) | Profil qui a manifesté l'intérêt. |
| `receiver_id` | UUID (FK → celibataire_profiles) | Profil ciblé. |
| `status` | ENUM('pending', 'rdv_planned', 'rejected') | État de traitement par le responsable. |
| `created_at` | TIMESTAMP | Date de l'intérêt. |

### Table `journeys` (Cheminements)
Suit le parcours d'un couple tout au long des étapes.

| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Identifiant unique. |
| `profile_a_id` | UUID (FK) | Premier célibataire. |
| `profile_b_id` | UUID (FK) | Second célibataire. |
| `current_step` | ENUM('step_1', 'step_2', 'step_3', 'step_4') | Étape actuelle. |
| `step_started_at` | TIMESTAMP | Date de début de l'étape actuelle. |
| `step_expires_at` | TIMESTAMP | Date d'expiration de l'étape (ex: +30 jours pour step_2). |
| `responsible_id` | UUID (FK → users) | Responsable assigné au couple. |
| `is_active` | BOOLEAN | Cheminement en cours ou terminé. |

### Table `messages`
Historique des messages du chat entre deux célibataires en phase d'étude.

| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Identifiant unique. |
| `journey_id` | UUID (FK → journeys) | Cheminement auquel appartient ce message. |
| `sender_id` | UUID (FK → users) | Expéditeur du message. |
| `content` | TEXT (chiffré) | Contenu du message (chiffré au repos). |
| `is_flagged` | BOOLEAN | Marqué par le filtre anti-contact. |
| `sent_at` | TIMESTAMP | Date d'envoi. |

---

## 4. Sécurité et Conformité

La sécurité est un pilier non négociable de cette plateforme, qui traite des données personnelles et sensibles.

**Authentification et Autorisation :** L'accès à chaque endpoint de l'API est protégé par un système de contrôle d'accès basé sur les rôles (RBAC). Un célibataire ne peut jamais accéder aux données du back-office des responsables. Les tokens JWT ont une durée de vie courte (15 minutes) et sont renouvelés via des refresh tokens sécurisés (httpOnly cookies).

**Confidentialité des Intérêts :** L'endpoint `/api/interests` est exclusivement accessible aux responsables. Aucun endpoint ne renvoie au frontend d'un célibataire la liste des personnes intéressées par lui.

**Filtrage Anti-Contact dans le Chat :** Un middleware côté serveur analyse chaque message avant enregistrement. Il détecte les patterns de numéros de téléphone (regex), d'adresses email et d'URLs de réseaux sociaux. Si un pattern est détecté, le message est bloqué et l'utilisateur reçoit un avertissement. L'incident est loggé pour les responsables.

**Chiffrement des Données :** Les mots de passe sont hachés avec Bcrypt (coût 12). Le contenu des messages est chiffré au repos dans la base de données. Toutes les communications transitent via HTTPS/TLS 1.3.

**Protection contre les Attaques Courantes :** Le backend implémente une protection contre les injections SQL (via l'ORM Prisma), les attaques XSS (sanitisation des entrées), les attaques CSRF (tokens CSRF pour les formulaires) et les attaques par force brute (rate limiting sur les endpoints d'authentification).

---

## 5. Infrastructure et Déploiement

| Composant | Service Recommandé | Environnement |
| :--- | :--- | :--- |
| Hébergement Backend | AWS ECS (Docker) ou Railway | Production |
| Hébergement Frontend Web | Vercel | Production |
| Base de Données | AWS RDS (PostgreSQL) | Production |
| Cache | AWS ElastiCache (Redis) | Production |
| Stockage Médias | AWS S3 + CloudFront (CDN) | Production |
| CI/CD | GitHub Actions | Dev → Staging → Prod |
| Monitoring | Sentry (erreurs) + Datadog (métriques) | Production |

Le déploiement suivra une stratégie d'intégration et de déploiement continus (CI/CD). Chaque push sur la branche `main` déclenche automatiquement les tests unitaires, les tests d'intégration, puis le déploiement en production si tous les tests passent.

---

## 6. Performances et Scalabilité

L'application doit être capable de gérer une croissance du nombre d'utilisateurs sans dégradation de performance. La mise en cache Redis permettra de réduire la charge sur la base de données pour les requêtes fréquentes (liste des profils, statuts). L'architecture en microservices pourra être envisagée à long terme pour isoler le service de chat du service de gestion des profils. Les images de profil seront servies via un CDN (CloudFront) pour minimiser la latence géographique.
