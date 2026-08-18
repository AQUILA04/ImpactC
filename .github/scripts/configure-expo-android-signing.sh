#!/usr/bin/env bash
set -euo pipefail

ANDROID_DIR="${1:?Android project directory required}"
REQUIRE_SIGNING="${2:-false}"
BUILD_GRADLE="${ANDROID_DIR}/app/build.gradle"
KEY_PROPERTIES="${ANDROID_DIR}/key.properties"

if [[ ! -f "$BUILD_GRADLE" ]]; then
  echo "Android build.gradle not found: $BUILD_GRADLE" >&2
  exit 1
fi

if [[ ! -f "$KEY_PROPERTIES" ]]; then
  if [[ "$REQUIRE_SIGNING" == "true" ]]; then
    echo "A production APK requires a release keystore." >&2
    exit 1
  fi
  echo "No keystore provided; using Expo-generated debug signing for non-production validation."
  exit 0
fi

if grep -q 'impactcReleaseSigning' "$BUILD_GRADLE"; then
  echo "ImpactC release signing already configured."
  exit 0
fi

cat >> "$BUILD_GRADLE" <<'EOF'

def impactcKeystoreProperties = new Properties()
def impactcKeystorePropertiesFile = rootProject.file('key.properties')
if (impactcKeystorePropertiesFile.exists()) {
    impactcKeystoreProperties.load(new FileInputStream(impactcKeystorePropertiesFile))
}

android {
    signingConfigs {
        impactcReleaseSigning {
            storeFile file(impactcKeystoreProperties['storeFile'])
            storePassword impactcKeystoreProperties['storePassword']
            keyAlias impactcKeystoreProperties['keyAlias']
            keyPassword impactcKeystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.impactcReleaseSigning
        }
    }
}
EOF
