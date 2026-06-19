# Spécification Visuelle (UI/UX)
## Plateforme Matrimoniale Intra-Communautaire

**Nom du projet :** ImpactC — Module Matrimonial
**Version :** 1.0
**Auteur :** Manus AI
**Date :** Mai 2026

---

## 1. Principes de Design Fondamentaux

L'interface doit incarner les valeurs de la communauté : confiance, sérieux, bienveillance et espoir. Le design sera épuré, moderne et centré sur l'humain. Chaque décision visuelle doit renforcer le sentiment de sécurité et de respect que les utilisateurs doivent ressentir en utilisant la plateforme.

Conformément aux bonnes pratiques actuelles, l'approche sera strictement **Mobile-First**. La majorité des célibataires consulteront l'application via leur smartphone. L'interface back-office des responsables sera, quant à elle, optimisée pour les tablettes et les ordinateurs de bureau. Le style visuel adoptera une esthétique moderne de type SaaS, en utilisant des composants Shadcn/ui avec Tailwind CSS, et en suivant les principes du Material Design pour les cartes et les éléments interactifs.

---

## 2. Charte Graphique

### 2.1. Palette de Couleurs

La palette est conçue pour être apaisante, chaleureuse et inspirant la confiance. Elle évite les couleurs agressives ou trop ludiques, qui ne correspondraient pas au sérieux de la démarche.

| Rôle | Couleur | Code Hex | Utilisation |
| :--- | :--- | :--- | :--- |
| **Primaire** | Bleu Ardoise | `#3B5998` | En-têtes, boutons d'action principaux, liens actifs. Inspire la confiance et la stabilité. |
| **Secondaire** | Doré Doux | `#C9A84C` | Badges de statut, accents, icônes de mise en valeur. Symbolise la valeur et l'engagement. |
| **Succès / Validation** | Vert Sauge | `#4CAF82` | Confirmations, statuts positifs (match, accepté). |
| **Attention / Alerte** | Ambre | `#F59E0B` | Notifications, délais imminents. |
| **Erreur / Refus** | Rouge Doux | `#EF4444` | Messages d'erreur, statuts de refus. |
| **Fond Principal** | Blanc Cassé | `#F8F7F4` | Fond de l'application. Réduit la fatigue visuelle par rapport au blanc pur. |
| **Fond Secondaire** | Gris Très Clair | `#EFEFEF` | Fond des cartes, des sections secondaires. |
| **Texte Principal** | Gris Anthracite | `#1F2937` | Corps de texte. Contraste optimal sans l'agressivité du noir pur. |
| **Texte Secondaire** | Gris Moyen | `#6B7280` | Sous-titres, métadonnées, textes d'aide. |

### 2.2. Typographie

Une typographie lisible et élégante est requise pour refléter le sérieux de la plateforme.

| Élément | Police | Graisses utilisées | Justification |
| :--- | :--- | :--- | :--- |
| **Titres (H1, H2)** | Playfair Display | Bold (700) | Élégante et solennelle, apporte une touche de prestige sans être austère. |
| **Sous-titres (H3, H4)** | Montserrat | SemiBold (600) | Moderne et lisible, assure une hiérarchie visuelle claire. |
| **Corps de Texte** | Inter | Regular (400), Medium (500) | Excellente lisibilité sur tous les écrans, y compris les petits mobiles. |
| **Labels & Badges** | Inter | SemiBold (600) | Clarté et lisibilité pour les informations courtes et importantes. |

**Tailles de base :** 16px pour le corps de texte sur mobile. L'échelle typographique suit une progression de 1.25 (Major Third).

### 2.3. Iconographie et Illustration

Les icônes proviendront de la bibliothèque **Lucide Icons**, qui offre un style épuré et cohérent. Les illustrations (pour les états vides, les onboarding) seront de style "line art" avec les couleurs primaires et secondaires de la charte, évitant les illustrations trop cartoonesques.

### 2.4. Espacement et Grille

Le système d'espacement est basé sur une unité de 4px (grille de 4). Les marges internes des composants (padding) suivent les multiples de 4 : 4, 8, 12, 16, 24, 32, 48px. Les coins arrondis des composants seront de 8px pour les cartes, 6px pour les boutons et 4px pour les champs de formulaire.

---

## 3. Composants UI Clés

### 3.1. La Carte de Profil (Profile Card)
C'est le composant central de l'application. Elle doit être visuellement attrayante et informative en un coup d'œil.

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │         [PHOTO DE PROFIL]       │    │
│  │         (ratio 4:5)             │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Prénom, Âge                            │
│  Profession · Département               │
│                                         │
│  "Phrase d'accroche de l'utilisateur"   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  ❤️  Je suis intéressé(e)        │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

La carte a un fond blanc, une ombre légère (`shadow-md`), des coins arrondis à 12px. La photo occupe les deux tiers supérieurs de la carte. Le bouton "Je suis intéressé(e)" est en couleur primaire (Bleu Ardoise) avec un texte blanc.

### 3.2. Le Badge de Statut
Un composant pill (pastille) indiquant le statut du célibataire.

| Statut | Couleur de fond | Couleur du texte | Icône |
| :--- | :--- | :--- | :--- |
| Célibataire Libre | Vert Sauge (10% opacité) | Vert Sauge | ✓ |
| En Cheminement | Doré Doux (10% opacité) | Doré Doux | ⟳ |
| Suspendu | Gris (10% opacité) | Gris Moyen | — |

### 3.3. La Barre de Progression du Cheminement
Affichée sur le profil d'un couple en cheminement (visible par les responsables), elle indique visuellement l'étape actuelle.

```
  ●━━━━━━━━━●━━━━━━━━━○━━━━━━━━━○
 RDV 1    Étude 1M  Étude 3M  Final
(Fait)   (En cours) (À venir) (À venir)
```

---

## 4. Parcours Utilisateurs (User Journeys) et Écrans Détaillés

### 4.1. Espace Célibataire (Application Mobile)

**Écran 1 — Onboarding / Inscription**
Un processus en plusieurs étapes (stepper) avec une barre de progression en haut de l'écran. Chaque étape correspond à une catégorie d'informations (Identité, Vie Spirituelle, Présentation, Critères). Les champs sont larges, avec des labels flottants. Un bouton "Suivant" en bas de chaque étape. Le design est épuré, sans distractions.

**Écran 2 — Flux de Profils (Accueil)**
Navigation en bas de l'écran avec 4 onglets : Découvrir, Cheminement, Notifications, Mon Profil. L'onglet "Découvrir" affiche une liste de cartes de profil en défilement vertical. Un filtre discret en haut permet de trier par département ou critères.

**Écran 3 — Profil Détaillé**
En-tête avec la photo en plein écran (avec un dégradé sombre en bas pour le texte). Défilement vers le bas pour voir les informations détaillées organisées en sections (Présentation, Vie Spirituelle, Critères de Recherche). Un bouton flottant fixe en bas de l'écran pour manifester son intérêt.

**Écran 4 — Espace Cheminement (Chat)**
Accessible uniquement si l'utilisateur est en phase d'étude. Un bandeau d'avertissement rouge/ambre en haut rappelle les règles d'utilisation (interdiction d'échange de contacts). L'interface de chat est classique : bulles de messages (bleu pour l'émetteur, gris pour le récepteur), champ de saisie en bas. Un indicateur de temps restant dans la phase est affiché en haut.

**Écran 5 — Notifications**
Liste chronologique des notifications (nouveau message, rappel de RDV, fin de phase imminente). Chaque notification a une icône colorée correspondant à son type.

### 4.2. Espace Responsable (Application Web — Bureau/Tablette)

**Écran 1 — Tableau de Bord (Dashboard)**
Mise en page en deux colonnes sur desktop. Quatre KPI cards en haut (Nouveaux inscrits, Matchs en attente, RDV cette semaine, Couples en cheminement). Un graphique en courbe montrant l'évolution des inscriptions. Une liste des actions urgentes (fins de phase dans les 7 jours).

**Écran 2 — Gestion des Intérêts**
Tableau avec colonnes : Émetteur, Récepteur, Type (Unilatéral / Match), Date, Statut, Actions. Des filtres permettent de trier par type d'intérêt. Les boutons d'action rapide permettent de déclencher la planification d'un RDV ou d'enregistrer un refus.

**Écran 3 — Suivi des Cheminements (Vue Kanban)**
Quatre colonnes représentant les étapes (RDV 1, Étude 1 Mois, Étude 3 Mois, Étape Finale). Chaque couple est représenté par une mini-carte avec les prénoms et un indicateur de temps restant. Les responsables peuvent cliquer sur une carte pour accéder au dossier complet.

**Écran 4 — Dossier Couple**
Vue détaillée d'un couple en cheminement. Deux colonnes affichant les profils résumés des deux célibataires côte à côte. Une section "Historique" listant tous les RDV passés avec les notes du responsable. Un bouton "Valider le passage à l'étape suivante" ou "Clôturer le cheminement".

**Écran 5 — Gestion des Profils (Modération)**
Tableau de tous les profils inscrits avec leur statut. Possibilité de valider un nouveau profil, de le suspendre ou de le supprimer. Accès au profil complet en lecture seule.

---

## 5. Responsive Design et Adaptations

L'application est conçue selon trois breakpoints principaux.

| Breakpoint | Largeur | Adaptations Clés |
| :--- | :--- | :--- |
| **Mobile** | < 768px | Navigation par onglets en bas. Cartes en pleine largeur. Formulaires en une colonne. |
| **Tablette** | 768px – 1024px | Navigation latérale rétractable. Cartes en grille 2 colonnes. Tableaux simplifiés. |
| **Desktop** | > 1024px | Navigation latérale fixe. Grille 3-4 colonnes. Tableaux complets avec toutes les colonnes. |

---

## 6. Accessibilité (WCAG 2.1 AA)

La plateforme doit respecter les standards d'accessibilité pour être utilisable par tous les membres de la communauté, y compris ceux ayant des difficultés visuelles. Le ratio de contraste entre le texte et le fond doit être d'au moins 4.5:1 pour le texte normal et 3:1 pour les grands textes. Tous les éléments interactifs doivent être accessibles au clavier. Les images doivent avoir des attributs `alt` descriptifs. Les formulaires doivent avoir des labels explicites liés à leurs champs.

---

## 7. États des Composants et Micro-interactions

Chaque composant interactif doit avoir des états visuels clairement définis pour offrir un retour visuel immédiat à l'utilisateur.

| État | Description Visuelle |
| :--- | :--- |
| **Default** | Apparence standard du composant. |
| **Hover** | Légère élévation de l'ombre (`shadow-lg`), changement de curseur en pointeur. |
| **Focus** | Anneau de focus bleu visible (pour l'accessibilité clavier). |
| **Active / Pressed** | Légère réduction de taille (scale 0.98) pour simuler un appui physique. |
| **Loading** | Remplacement du contenu par un skeleton loader animé (shimmer effect). |
| **Disabled** | Opacité réduite à 50%, curseur "not-allowed". |
| **Error** | Bordure rouge, icône d'erreur, message d'aide en rouge sous le champ. |
| **Success** | Bordure verte, icône de validation. |

Le bouton "Je suis intéressé(e)" doit avoir une micro-animation lors du clic : une légère animation de pulsation du cœur, suivie d'un changement de couleur vers le vert (confirmant l'action), puis un retour à l'état normal avec le texte "Intérêt enregistré". Cela renforce le sentiment que l'action a bien été prise en compte, sans révéler d'informations supplémentaires.
