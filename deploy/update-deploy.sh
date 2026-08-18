#!/usr/bin/env bash
# Met à jour atomiquement /opt/optimizesolux/impactc/deploy depuis un SHA de dépôt.
set -euo pipefail

ROOT="${IMPACTC_ROOT:-/opt/optimizesolux/impactc}"
SOURCE_DIR="${ROOT}/source"
REF="${IMPACTC_SOURCE_REF:?IMPACTC_SOURCE_REF is required}"

[[ -d "${SOURCE_DIR}/.git" ]] || { echo "ERROR: source repository is absent" >&2; exit 1; }

if [[ -n "${GIT_HTTP_EXTRAHEADER:-}" ]]; then
  git -c http.extraheader="$GIT_HTTP_EXTRAHEADER" -C "$SOURCE_DIR" fetch --depth=1 origin "$REF"
else
  git -C "$SOURCE_DIR" fetch --depth=1 origin "$REF"
fi
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
printf 'ImpactC deploy assets updated from %s\n' "$REF"
