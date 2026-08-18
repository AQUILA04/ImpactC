#!/usr/bin/env bash
# Revient à une release ImpactC antérieure sans modifier le schéma PostgreSQL.
set -euo pipefail

ROOT="${IMPACTC_ROOT:-/opt/optimizesolux/impactc}"
RELEASES_DIR="${ROOT}/releases"
TARGET="${1:---last}"
CURRENT_LINK="${RELEASES_DIR}/prod_current.txt"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

release_files() {
  find "$RELEASES_DIR" -maxdepth 1 -type f -name 'prod_*.txt' -print | sort
}

if [[ "$TARGET" == "--last" ]]; then
  [[ -e "$CURRENT_LINK" ]] || fail "no current release pointer exists"
  current="$(readlink -f "$CURRENT_LINK")"
  previous=""
  while IFS= read -r release; do
    [[ "$release" == "$current" ]] && break
    previous="$release"
  done < <(release_files)
  [[ -n "$previous" ]] || fail "no previous release exists"
  TARGET="$previous"
fi

[[ -f "$TARGET" ]] || fail "release file not found: ${TARGET}"
api_image="$(sed -n 's/^API_IMAGE=//p' "$TARGET")"
migrator_image="$(sed -n 's/^MIGRATOR_IMAGE=//p' "$TARGET")"
backoffice_image="$(sed -n 's/^BACKOFFICE_IMAGE=//p' "$TARGET")"
[[ -n "$api_image" && -n "$migrator_image" && -n "$backoffice_image" ]] || fail "release metadata is incomplete"

printf 'Rolling back ImpactC to %s without applying database migrations.\n' "$TARGET"
"${ROOT}/deploy/deploy.sh" prod "$api_image" "$migrator_image" "$backoffice_image" --skip-migrate
ln -sfn "$TARGET" "$CURRENT_LINK"
printf 'Rollback completed. Confirm business compatibility with the retained database schema.\n'
