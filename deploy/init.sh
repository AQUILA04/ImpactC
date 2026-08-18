#!/usr/bin/env bash
# Synchronise les scripts ImpactC sur le serveur, puis initialise les secrets si nécessaire.
set -euo pipefail

ROOT="${IMPACTC_ROOT:-/opt/optimizesolux/impactc}"
SOURCE_DIR="${ROOT}/source"
REPOSITORY="${IMPACTC_REPOSITORY:-https://github.com/AQUILA04/ImpactC.git}"
REF="${IMPACTC_SOURCE_REF:-main}"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git is required"
install -d -m 0750 "$ROOT"

git_with_auth() {
  if [[ -n "${GIT_HTTP_EXTRAHEADER:-}" ]]; then
    git -c http.extraheader="$GIT_HTTP_EXTRAHEADER" "$@"
  else
    git "$@"
  fi
}

if [[ ! -d "${SOURCE_DIR}/.git" ]]; then
  git_with_auth clone --no-checkout "$REPOSITORY" "$SOURCE_DIR"
fi

git_with_auth -C "$SOURCE_DIR" fetch --depth=1 origin "$REF"
git -C "$SOURCE_DIR" checkout --detach FETCH_HEAD

new_deploy="${ROOT}/deploy.new"
old_deploy="${ROOT}/deploy.old.$(date -u +%Y%m%dT%H%M%SZ)"
rm -rf "$new_deploy"
cp -a "$SOURCE_DIR/deploy" "$new_deploy"
chmod 0750 "$new_deploy"/*.sh

if [[ -d "${ROOT}/deploy" ]]; then
  mv "${ROOT}/deploy" "$old_deploy"
fi
mv "$new_deploy" "${ROOT}/deploy"

if [[ ! -f "${ROOT}/.env" ]]; then
  "${ROOT}/deploy/setup-server.sh"
else
  docker compose --project-name impactc-prod --env-file "${ROOT}/.env" -f "${ROOT}/deploy/docker-compose.prod.yml" config >/dev/null
fi

printf 'ImpactC deployment scripts are synchronized at source ref %s.\n' "$REF"
