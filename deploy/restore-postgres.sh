#!/usr/bin/env bash
# Restaure une sauvegarde PostgreSQL ImpactC avec protections contre les erreurs opérateur.
set -euo pipefail

ROOT="${IMPACTC_ROOT:-/opt/optimizesolux/impactc}"
ENV_FILE="${ROOT}/.env"
COMPOSE_FILE="${ROOT}/deploy/docker-compose.prod.yml"
PROJECT="impactc-prod"
BACKUP_FILE="${1:-}"
CONFIRMATION="${2:-}"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -n "$BACKUP_FILE" && -f "$BACKUP_FILE" ]] || fail "usage: $0 <backup.dump> RESTORE-IMPACTC"
[[ "$CONFIRMATION" == "RESTORE-IMPACTC" ]] || fail "explicit confirmation RESTORE-IMPACTC is required"
[[ -f "$ENV_FILE" ]] || fail "environment file is absent: ${ENV_FILE}"
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

compose() {
  docker compose --project-name "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

if [[ -f "${BACKUP_FILE}.sha256" ]]; then
  (cd "$(dirname "$BACKUP_FILE")" && sha256sum --check "$(basename "${BACKUP_FILE}.sha256")")
else
  printf 'WARNING: no SHA-256 manifest found next to %s\n' "$BACKUP_FILE" >&2
fi

db_container="$(compose ps -q impactc-db)"
[[ -n "$db_container" ]] || fail "ImpactC PostgreSQL container is not running"
[[ "$(docker inspect --format '{{.State.Status}}' "$db_container")" == "running" ]] || fail "ImpactC PostgreSQL container is not running"

printf 'Creating an automatic pre-restore backup...\n'
"${ROOT}/deploy/backup-postgres.sh"

container_dump="/tmp/impactc_restore_$(date -u +%Y%m%dT%H%M%S%NZ).dump"
cleanup() {
  docker exec "$db_container" rm -f "$container_dump" >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf 'Stopping API and worker writers...\n'
compose stop impactc-api impactc-worker

printf 'Copying and validating restore archive...\n'
docker cp "$BACKUP_FILE" "${db_container}:${container_dump}"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$db_container" pg_restore \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --list "$container_dump" >/dev/null

printf 'Restoring PostgreSQL archive...\n'
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$db_container" pg_restore \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "$container_dump"

printf 'Restarting API and worker...\n'
compose up -d impactc-api impactc-worker
api_container="$(compose ps -q impactc-api)"
for _ in $(seq 1 45); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$api_container")"
  [[ "$status" == "healthy" ]] && break
  [[ "$status" == "exited" || "$status" == "dead" ]] && fail "API stopped after restore"
  sleep 2
done
[[ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$api_container")" == "healthy" ]] || fail "API did not become healthy after restore"
printf 'ImpactC PostgreSQL restore completed. Verify business smoke tests before reopening operations.\n'
