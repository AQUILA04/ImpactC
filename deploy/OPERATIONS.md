# Fiabilité opérationnelle ImpactC — P4

Le lot P4 complète la livraison ImpactC avec l’export OpenTelemetry vers le collecteur partagé du socle, des sauvegardes PostgreSQL en format restaurable et une procédure de restauration explicitement destructive. Il ne déploie ni Prometheus, ni Grafana, ni Loki supplémentaires : ces services sont déjà fournis par `optimize-common-infra`.

> **Règle d’exploitation.** Une restauration modifie les données métier. Elle exige un fichier validé, la confirmation littérale `RESTORE-IMPACTC`, une sauvegarde pré-restauration automatique et une vérification fonctionnelle avant de reprendre les opérations.

## Observabilité

L’API et le worker chargent `telemetry.js` avant NestJS. Lorsque `OTEL_EXPORTER_OTLP_ENDPOINT` est défini, les instrumentations Node exportent traces et métriques au collecteur. Les services portent des noms distincts : `impactc-api` et `impactc-worker`. Les attributs communs sont `service.namespace=optimizesolux` et `deployment.environment=prod`.

| Signal                           | Source                            | Destination                     | Contrôle opérationnel                                              |
| -------------------------------- | --------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| Traces HTTP, PostgreSQL et Redis | API / worker OpenTelemetry        | `otel-collector:4318`           | Activer le profil tracing du socle pour consulter Jaeger.          |
| Métriques applicatives           | API / worker OpenTelemetry        | Prometheus via collecteur       | Vérifier la cible `otel-collector:8889` dans Prometheus.           |
| CPU, mémoire et réseau           | cAdvisor                          | Prometheus / Grafana communs    | Dashboard conteneurs, filtré sur le projet Compose `impactc-prod`. |
| Logs stdout/stderr               | Promtail                          | Loki commun                     | Explorer par labels Compose du projet et service.                  |
| Santé de disponibilité           | `/health/live` et `/health/ready` | Docker / Traefik / exploitation | `ready` exige PostgreSQL, Redis et MinIO.                          |

Les identifiants, messages de chat et secrets ne doivent jamais être ajoutés comme attributs, événements ou labels de télémétrie. En cas de surcharge temporaire du collecteur, l’application reste disponible : la télémétrie est uniquement activée lorsqu’un endpoint est configuré.

## Installer et vérifier les sauvegardes

Après le premier déploiement production, installer le timer en tant que root. Il lance une sauvegarde chaque nuit à 02:15 UTC avec un décalage aléatoire maximal de dix minutes et rattrape une exécution manquée au prochain démarrage du VPS.

```bash
cd /opt/optimizesolux/impactc
sudo ./deploy/install-backup-timer.sh
sudo systemctl start impactc-postgres-backup.service
sudo systemctl status impactc-postgres-backup.service --no-pager
sudo systemctl list-timers impactc-postgres-backup.timer
```

Les sauvegardes sont écrites par défaut sous `/var/backups/impactc/postgresql/YYYY-MM-DD/`. Chaque archive `.dump` est au format PostgreSQL personnalisé et possède un manifeste `.sha256`. La rétention locale est de 30 jours par défaut et se règle au moyen de `IMPACTC_BACKUP_RETENTION_DAYS` dans `/opt/optimizesolux/impactc/.env`.

| Contrôle              | Commande                                                                                                                                                        | Résultat attendu                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Dernière archive      | `find /var/backups/impactc/postgresql -name 'impactc_*.dump' -printf '%TY-%Tm-%Td %TT %p\n'                                                                     | sort                                                         | tail -1` | Archive récente et non vide. |
| Intégrité             | `sha256sum --check <archive>.sha256`                                                                                                                            | Réponse `OK`.                                                |
| Lisibilité PostgreSQL | `docker exec -i $(docker compose --project-name impactc-prod --env-file .env -f deploy/docker-compose.prod.yml ps -q impactc-db) pg_restore --list < <archive>` | Liste de contenu non vide.                                   |
| Timer                 | `systemctl list-timers impactc-postgres-backup.timer`                                                                                                           | Prochaine exécution planifiée et dernière exécution réussie. |

## Test de restauration

Le test doit être réalisé d’abord sur une copie isolée de production ou durant une fenêtre de maintenance approuvée. La commande effectue automatiquement une sauvegarde d’avant restauration, arrête les écrivains API/worker, vérifie l’archive puis redémarre les services et attend la readiness de l’API.

```bash
cd /opt/optimizesolux/impactc
sudo ./deploy/restore-postgres.sh \
  /var/backups/impactc/postgresql/2026-08-18/impactc_<timestamp>.dump \
  RESTORE-IMPACTC

curl --fail --silent https://impactc-api.optimizesolux.com/health/ready
```

Après toute restauration, le Responsable doit vérifier une connexion backoffice, un profil de test, un parcours, un rendez-vous et l’absence d’envoi duplicatif dans l’outbox notification-hub. Une mise en production ne doit pas être considérée terminée sans ces contrôles métier.

## Cadence de vérification

| Activité                                                        | Cadence                         | Responsable                           |
| --------------------------------------------------------------- | ------------------------------- | ------------------------------------- |
| Vérifier la dernière sauvegarde et son checksum                 | Quotidienne                     | Exploitation.                         |
| Examiner les services ImpactC et Redis/MinIO                    | Quotidienne                     | Exploitation.                         |
| Tester la restauration sur environnement isolé                  | Trimestrielle                   | Exploitation avec Responsable métier. |
| Vérifier que les secrets Vault et l’AppRole sont encore valides | Trimestrielle et après rotation | Administrateur infrastructure.        |
| Réviser les dashboards, alertes et rétention                    | À chaque release majeure        | Équipe plateforme.                    |

La réplication chiffrée hors VPS est le prochain durcissement requis avant une mise en service à volume élevé. Conserver uniquement des archives locales ne protège pas contre la perte complète du serveur.
