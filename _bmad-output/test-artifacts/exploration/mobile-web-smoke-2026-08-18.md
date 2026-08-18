# Vérification navigateur — Client mobile ImpactC

**Date :** 18 août 2026

Le client Expo Web local est accessible sur `http://localhost:8081`. L’écran membre charge correctement, présente les champs e-mail et mot de passe avec des libellés accessibles, et expose les actions « Se connecter » et « Créer mon compte ». La navigation du parcours membre comprend les rubriques Accès, Profil, Découvrir, RDV et Chat.

Le rendu principal respecte une hiérarchie mobile lisible et des commandes à grande cible tactile. Un élément hérité du template Expo (« Expo Starter » avec liens Home/Explore/Docs) reste visible au sommet de la cible Web. Cet élément ne bloque pas les flux métier, mais doit être supprimé dans l’itération de polish afin d’éviter une navigation parasite.
