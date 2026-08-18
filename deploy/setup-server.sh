#!/usr/bin/env bash
# Initialise une seule fois l'espace de déploiement ImpactC sur Contabo.
set -euo pipefail

ROOT="${IMPACTC_ROOT:-/opt/optimizesolux/impactc}"
COMMON_ROOT="${COMMON_INFRA_ROOT:-/opt/optimizesolux/common-infra}"
COMMON_COMPOSE="${COMMON_ROOT}/docker-compose.yml"
COMMON_ENV="${COMMON_ROOT}/.env"
APPROLE_FILE="${COMMON_ROOT}/private/impactc/approle.env"
ENV_FILE="${ROOT}/.env"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "docker is required"
[[ -f "$COMMON_COMPOSE" ]] || fail "common-infra compose file is absent: ${COMMON_COMPOSE}"
[[ -f "$COMMON_ENV" ]] || fail "common-infra environment is absent: ${COMMON_ENV}"
[[ -f "$APPROLE_FILE" ]] || fail "ImpactC AppRole file is absent: run P2 provision-impactc.sh first"

for network in optimizesolux-common traefik-public; do
  docker network inspect "$network" >/dev/null 2>&1 || fail "Docker network '${network}' is required"
done

# shellcheck disable=SC1090
source "$APPROLE_FILE"
: "${VAULT_ADDR:?VAULT_ADDR is required in AppRole file}"
: "${VAULT_ROLE_ID:?VAULT_ROLE_ID is required in AppRole file}"
: "${VAULT_SECRET_ID:?VAULT_SECRET_ID is required in AppRole file}"

vault_compose() {
  docker compose --project-name optimizesolux-common --env-file "$COMMON_ENV" -f "$COMMON_COMPOSE" --profile core "$@"
}

vault_token="$(vault_compose exec -T vault vault write -field=token auth/approle/login role_id="$VAULT_ROLE_ID" secret_id="$VAULT_SECRET_ID")"
[[ -n "$vault_token" ]] || fail "unable to authenticate ImpactC AppRole against Vault"

vault_field() {
  local path="$1"
  local field="$2"
  VAULT_TOKEN="$vault_token" vault_compose exec -T -e VAULT_TOKEN vault vault kv get -field="$field" "$path"
}

env_quote() {
  local value="$1"
  if [[ "$value" =~ ^[A-Za-z0-9._:/,+@=-]+$ ]]; then
    printf '%s' "$value"
  else
    printf "'%s'" "${value//\'/\'\\\'}"
  fi
}

url_encode() {
  local value="$1"
  docker run --rm node:22-alpine node -p 'encodeURIComponent(process.argv[1])' "$value"
}

printf '%s\n' '[1/3] Reading ImpactC secrets from Vault...'
db_user="$(vault_field secret/optimizesolux/impactc/db username)"
db_password="$(vault_field secret/optimizesolux/impactc/db password)"
db_name="$(vault_field secret/optimizesolux/impactc/db database)"
redis_password="$(vault_field secret/optimizesolux/impactc/redis password)"
redis_db="$(vault_field secret/optimizesolux/impactc/redis database)"
redis_prefix="$(vault_field secret/optimizesolux/impactc/redis bullmq_prefix)"
s3_endpoint="$(vault_field secret/optimizesolux/impactc/s3 endpoint)"
s3_region="$(vault_field secret/optimizesolux/impactc/s3 region)"
s3_bucket="$(vault_field secret/optimizesolux/impactc/s3 media_bucket)"
s3_access_key="$(vault_field secret/optimizesolux/impactc/s3 media_access_key)"
s3_secret_key="$(vault_field secret/optimizesolux/impactc/s3 media_secret_key)"
jwt_access_secret="$(vault_field secret/optimizesolux/impactc/auth jwt_access_secret)"
jwt_refresh_secret="$(vault_field secret/optimizesolux/impactc/auth jwt_refresh_secret)"
chat_encryption_key="$(vault_field secret/optimizesolux/impactc/auth chat_encryption_key)"
keycloak_issuer="$(vault_field secret/optimizesolux/impactc/oidc issuer)"
keycloak_audience="$(vault_field secret/optimizesolux/impactc/oidc audience)"
notification_hub_base_url="$(vault_field secret/optimizesolux/impactc/notification-hub base_url)"
notification_hub_from="$(vault_field secret/optimizesolux/impactc/notification-hub from)"
notification_hub_token_url="$(vault_field secret/optimizesolux/impactc/notification-hub oauth_token_url)"
notification_hub_client_secret="$(vault_field secret/optimizesolux/impactc/notification-hub oauth_client_secret)"

[[ ${#chat_encryption_key} -eq 32 ]] || fail "Vault chat encryption key must contain exactly 32 bytes"

printf '%s\n' '[2/3] Creating protected ImpactC environment...'
install -d -m 0750 "$ROOT" "$ROOT/releases"
{
  printf 'IMPACTC_API_IMAGE=\n'
  printf 'IMPACTC_MIGRATOR_IMAGE=\n'
  printf 'IMPACTC_BACKOFFICE_IMAGE=\n'
  printf 'IMPACTC_API_HOST=%s\n' "$(env_quote "${IMPACTC_API_HOST:-impactc-api.optimizesolux.com}")"
  printf 'IMPACTC_BACKOFFICE_HOST=%s\n' "$(env_quote "${IMPACTC_BACKOFFICE_HOST:-impactc-admin.optimizesolux.com}")"
  printf 'FRONTEND_ORIGINS=%s\n' "$(env_quote "${FRONTEND_ORIGINS:-https://impactc.optimizesolux.com,https://impactc-admin.optimizesolux.com}")"
  printf 'POSTGRES_DB=%s\n' "$(env_quote "$db_name")"
  printf 'POSTGRES_USER=%s\n' "$(env_quote "$db_user")"
  printf 'POSTGRES_PASSWORD=%s\n' "$(env_quote "$db_password")"
  printf 'DATABASE_URL=%s\n' "$(env_quote "postgresql://${db_user}:$(url_encode "$db_password")@impactc-db:5432/${db_name}?schema=public")"
  printf 'REDIS_HOST=redis\nREDIS_PORT=6379\n'
  printf 'REDIS_PASSWORD=%s\n' "$(env_quote "$redis_password")"
  printf 'REDIS_DB=%s\nBULLMQ_PREFIX=%s\n' "$(env_quote "$redis_db")" "$(env_quote "$redis_prefix")"
  printf 'S3_ENDPOINT=%s\nS3_REGION=%s\nS3_BUCKET=%s\n' "$(env_quote "$s3_endpoint")" "$(env_quote "$s3_region")" "$(env_quote "$s3_bucket")"
  printf 'S3_ACCESS_KEY=%s\nS3_SECRET_KEY=%s\n' "$(env_quote "$s3_access_key")" "$(env_quote "$s3_secret_key")"
  printf 'JWT_ACCESS_SECRET=%s\nJWT_REFRESH_SECRET=%s\nCHAT_ENCRYPTION_KEY=%s\n' "$(env_quote "$jwt_access_secret")" "$(env_quote "$jwt_refresh_secret")" "$(env_quote "$chat_encryption_key")"
  printf 'KEYCLOAK_ISSUER=%s\nKEYCLOAK_BACKOFFICE_CLIENT_ID=%s\n' "$(env_quote "$keycloak_issuer")" "$(env_quote "$keycloak_audience")"
  printf 'NOTIFICATION_HUB_BASE_URL=%s\nNOTIFICATION_HUB_FROM=%s\nNOTIFICATION_HUB_OAUTH_TOKEN_URL=%s\n' "$(env_quote "$notification_hub_base_url")" "$(env_quote "$notification_hub_from")" "$(env_quote "$notification_hub_token_url")"
  printf 'NOTIFICATION_HUB_OAUTH_CLIENT_SECRET=%s\n' "$(env_quote "$notification_hub_client_secret")"
  printf 'JOURNEY_EXPIRATION_CRON=%s\n' "$(env_quote "${JOURNEY_EXPIRATION_CRON:-0 6 * * *}")"
} > "$ENV_FILE"
chmod 0600 "$ENV_FILE"

printf '%s\n' '[3/3] Confirming production compose configuration...'
docker compose --project-name impactc-prod --env-file "$ENV_FILE" -f "${ROOT}/deploy/docker-compose.prod.yml" config >/dev/null
printf 'ImpactC server setup is complete: %s\n' "$ROOT"
