#!/usr/bin/env bash
# Sauvegarde PostgreSQL ImpactC au format pg_dump personnalisé restaurable.
set -euo pipefail

ROOT="${IMPACTC_ROOT:-/opt/optimizesolux/impactc}"
ENV_FILE="${ROOT}/.env"
COMPOSE_FILE="${ROOT}/deploy/docker-compose.prod.yml"
PROJECT="impactc-prod"
BACKUP_ROOT="${IMPACTC_BACKUP_ROOT:-/var/backups/impactc/postgresql}"
RETENTION_DAYS="${IMPACTC_BACKUP_RETENTION_DAYS:-30}"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -f "$ENV_FILE" ]] || fail "environment file is absent: ${ENV_FILE}"
[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || fail "IMPACTC_BACKUP_RETENTION_DAYS must be numeric"
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

compose() {
  docker compose --project-name "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

db_container="$(compose ps -q impactc-db)"
[[ -n "$db_container" ]] || fail "ImpactC PostgreSQL container is not running"
[[ "$(docker inspect --format '{{.State.Status}}' "$db_container")" == "running" ]] || fail "ImpactC PostgreSQL container is not running"

umask 077
timestamp="$(date -u +%Y%m%dT%H%M%S%NZ)"
date_dir="$(date -u +%F)"
destination_dir="${BACKUP_ROOT}/${date_dir}"
install -d -m 0700 "$destination_dir"
temporary_dump="${destination_dir}/.impactc_${timestamp}.dump.tmp"
final_dump="${destination_dir}/impactc_${timestamp}.dump"
manifest="${final_dump}.sha256"

printf 'Creating PostgreSQL custom-format dump from %s...\n' "$db_container"
docker exec "$db_container" pg_dump \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --format=custom \
  --no-owner \
  --no-privileges > "$temporary_dump"

[[ -s "$temporary_dump" ]] || fail "backup dump is empty"
docker exec -i "$db_container" pg_restore --list < "$temporary_dump" >/dev/null
mv "$temporary_dump" "$final_dump"
sha256sum "$final_dump" > "$manifest"
chmod 0600 "$final_dump" "$manifest"

find "$BACKUP_ROOT" -type f \( -name 'impactc_*.dump' -o -name 'impactc_*.dump.sha256' \) -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_ROOT" -type d -empty -delete

printf 'ImpactC PostgreSQL backup created: %s\n' "$final_dump"
printf 'SHA-256 manifest created: %s\n' "$manifest"
