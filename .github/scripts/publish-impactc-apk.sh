#!/usr/bin/env bash
# Publie un APK release ImpactC dans MinIO et met à jour le manifest du canal.
set -euo pipefail

APK_PATH="${1:?APK path required}"
TARGET="${2:?target required (test|prod)}"
VERSION="${3:?version required}"

MINIO_ENDPOINT="${MINIO_ENDPOINT:?MINIO_ENDPOINT required}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:?MINIO_ACCESS_KEY required}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:?MINIO_SECRET_KEY required}"
MINIO_BUCKET="${MINIO_MOBILE_RELEASES_BUCKET:-impactc-mobile-releases}"

if [[ ! -f "$APK_PATH" ]]; then
  echo "APK not found: $APK_PATH" >&2
  exit 1
fi

if [[ "$TARGET" != "test" && "$TARGET" != "prod" ]]; then
  echo "Invalid target: $TARGET (expected test or prod)" >&2
  exit 1
fi

VERSION="${VERSION%%-*}"
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
if [[ ! "$MAJOR" =~ ^[0-9]+$ || ! "$MINOR" =~ ^[0-9]+$ || ! "$PATCH" =~ ^[0-9]+$ ]]; then
  echo "Invalid semantic version: $VERSION" >&2
  exit 1
fi
VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

APK_BASENAME="impactc-mobile-${TARGET}-v${VERSION}.apk"
APK_OBJECT_KEY="${TARGET}/releases/${VERSION}/${APK_BASENAME}"
MANIFEST_OBJECT_KEY="${TARGET}/manifest.json"
SHA256="$(sha256sum "$APK_PATH" | awk '{print $1}')"
SIZE_BYTES="$(stat -c%s "$APK_PATH" 2>/dev/null || stat -f%z "$APK_PATH")"
PUBLISHED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

MC_BIN="${MC_BIN:-mc}"
if ! command -v "$MC_BIN" >/dev/null 2>&1; then
  MC_BIN="/tmp/mc"
  if [[ ! -x "$MC_BIN" ]]; then
    curl -fsSL "https://dl.min.io/client/mc/release/linux-amd64/mc" -o "$MC_BIN"
    chmod +x "$MC_BIN"
  fi
fi

"$MC_BIN" alias set impactc-release "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" --api S3v4
"$MC_BIN" mb --ignore-existing "impactc-release/${MINIO_BUCKET}"
"$MC_BIN" cp "$APK_PATH" "impactc-release/${MINIO_BUCKET}/${APK_OBJECT_KEY}"

MANIFEST_FILE="$(mktemp)"
trap 'rm -f "$MANIFEST_FILE"' EXIT
cat > "$MANIFEST_FILE" <<EOF
{
  "version": "${VERSION}",
  "versionCode": ${VERSION_CODE},
  "minSupportedVersionCode": ${VERSION_CODE},
  "mandatory": false,
  "releaseNotes": "Release ${VERSION} (${TARGET})",
  "apkObjectKey": "${APK_OBJECT_KEY}",
  "sha256": "${SHA256}",
  "sizeBytes": ${SIZE_BYTES},
  "publishedAt": "${PUBLISHED_AT}"
}
EOF

"$MC_BIN" cp "$MANIFEST_FILE" "impactc-release/${MINIO_BUCKET}/${MANIFEST_OBJECT_KEY}"
echo "ImpactC APK published: ${APK_OBJECT_KEY}"
