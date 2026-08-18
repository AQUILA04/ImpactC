#!/usr/bin/env bash
# Déploie une release ImpactC immuable sur Contabo.
set -euo pipefail

ROOT="${IMPACTC_ROOT:-/opt/optimizesolux/impactc}"
ENVIRONMENT="${1:-}"
API_IMAGE="${2:-}"
MIGRATOR_IMAGE="${3:-}"
BACKOFFICE_IMAGE="${4:-}"
MODE="${5:-}"
ENV_FILE="${ROOT}/.env"
COMPOSE_FILE="${ROOT}/deploy/docker-compose.prod.yml"
RELEASES_DIR="${ROOT}/releases"
PROJECT="impactc-prod"

usage() {
  printf 'Usage: %s <prod> <api-image> <migrator-image> <backoffice-image> [--skip-migrate]\n' "$0" >&2
  exit 2
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "$ENVIRONMENT" == "prod" ]] || usage
[[ -f "$ENV_FILE" ]] || fail "environment file is absent: ${ENV_FILE}; run init.sh first"
[[ -f "$COMPOSE_FILE" ]] || fail "compose file is absent: ${COMPOSE_FILE}"
[[ -n "$API_IMAGE" && -n "$MIGRATOR_IMAGE" && -n "$BACKOFFICE_IMAGE" ]] || usage
[[ -z "$MODE" || "$MODE" == "--skip-migrate" ]] || usage

image_is_immutable() {
  [[ "$1" =~ ^ghcr\.io/aquila04/impactc-(api|migrator|backoffice):[a-f0-9]{40}$ ]]
}
for image in "$API_IMAGE" "$MIGRATOR_IMAGE" "$BACKOFFICE_IMAGE"; do
  image_is_immutable "$image" || fail "image must be an ImpactC GHCR tag by full commit SHA: ${image}"
done

set_env_var() {
  local key="$1"
  local value="$2"
  local temporary
  temporary="$(mktemp)"
  if grep -q -E "^${key}=" "$ENV_FILE"; then
    sed "s~^${key}=.*~${key}=${value}~" "$ENV_FILE" > "$temporary"
  else
    cat "$ENV_FILE" > "$temporary"
    printf '%s=%s\n' "$key" "$value" >> "$temporary"
  fi
  cat "$temporary" > "$ENV_FILE"
  rm -f "$temporary"
}

set_env_var IMPACTC_API_IMAGE "$API_IMAGE"
set_env_var IMPACTC_MIGRATOR_IMAGE "$MIGRATOR_IMAGE"
set_env_var IMPACTC_BACKOFFICE_IMAGE "$BACKOFFICE_IMAGE"
chmod 0600 "$ENV_FILE"

compose() {
  docker compose --project-name "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

wait_healthy() {
  local service="$1"
  local attempts="${2:-30}"
  local container status
  container="$(compose ps -q "$service")"
  [[ -n "$container" ]] || fail "no container found for ${service}"
  for _ in $(seq 1 "$attempts"); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")"
    if [[ "$status" == "healthy" ]]; then
      return 0
    fi
    if [[ "$status" == "exited" || "$status" == "dead" ]]; then
      compose logs --tail=200 "$service" >&2 || true
      fail "${service} stopped before becoming healthy"
    fi
    sleep 2
  done
  compose logs --tail=200 "$service" >&2 || true
  fail "${service} did not become healthy"
}

if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io --username "$GHCR_USERNAME" --password-stdin
fi

compose config >/dev/null
compose --profile migrate pull impactc-migrate
compose pull impactc-api impactc-worker impactc-backoffice
compose up -d impactc-db
wait_healthy impactc-db 30

if [[ "$MODE" != "--skip-migrate" ]]; then
  compose --profile migrate run --rm impactc-migrate
fi

compose up -d impactc-api impactc-worker impactc-backoffice
wait_healthy impactc-api 45
wait_healthy impactc-backoffice 45

install -d -m 0750 "$RELEASES_DIR"
timestamp="$(date -u +"%Y%m%dT%H%M%S%NZ")"
release_file="${RELEASES_DIR}/prod_${timestamp}.txt"
{
  printf 'API_IMAGE=%s\n' "$API_IMAGE"
  printf 'MIGRATOR_IMAGE=%s\n' "$MIGRATOR_IMAGE"
  printf 'BACKOFFICE_IMAGE=%s\n' "$BACKOFFICE_IMAGE"
  printf 'SOURCE_SHA=%s\n' "${API_IMAGE##*:}"
  printf 'DEPLOYED_AT=%s\n' "$timestamp"
} > "$release_file"
chmod 0640 "$release_file"
ln -sfn "$release_file" "${RELEASES_DIR}/prod_current.txt"
printf 'ImpactC release succeeded: %s\n' "$release_file"
