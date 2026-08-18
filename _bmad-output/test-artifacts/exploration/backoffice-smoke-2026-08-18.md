# Vérification navigateur — Backoffice ImpactC

**Date :** 18 août 2026

La page locale `http://localhost:3000` charge correctement et présente l’écran de connexion de supervision avec les champs e-mail et mot de passe, les onglets de navigation attendus et un message d’état accessible. L’interface utilise les couleurs de marque prévues et présente une navigation latérale lisible.

Le compte de démonstration `responsable@impactc.local` a été authentifié avec succès via le vrai endpoint backend. Après connexion, l’interface affiche l’état « Session sécurisée », confirme le rôle `RESPONSABLE` et expose la vue d’ensemble avec les cartes KPI ainsi que les sections Modération, Matches, Cheminements, Audit et Témoignages.

Les valeurs KPI restent à charger tant que l’utilisateur n’appuie pas sur « Actualiser », ce qui est le comportement actuel de l’interface. La capture des valeurs nécessite un rafraîchissement API supplémentaire dans la suite de validation.

## Régression identifiée et correction

Le premier rafraîchissement des KPI a retourné « Authentication is required » malgré une connexion Responsable valide. L’analyse a établi que le `RolesGuard` était global et était exécuté avant le `JwtAuthGuard`, empêchant ce dernier de peupler l’identité de requête. La configuration a été corrigée : le guard de rôle est désormais exécuté uniquement au niveau des routes, après le guard JWT déclaré dans leurs décorateurs. Le backend a été recompilé avec succès. Une nouvelle tentative de rafraîchissement est requise après le rechargement client pour confirmer le comportement corrigé.
