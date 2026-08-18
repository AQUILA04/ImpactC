#!/bin/sh
set -eu

case "${IMPACTC_PROCESS_ROLE:-api}" in
  api)
    export IMPACTC_PROCESS_ROLE=api
    exec node --require ./dist/src/telemetry.js dist/src/main.js
    ;;
  worker)
    export IMPACTC_PROCESS_ROLE=worker
    exec node --require ./dist/src/telemetry.js dist/src/worker.js
    ;;
  *)
    echo "IMPACTC_PROCESS_ROLE must be api or worker" >&2
    exit 64
    ;;
esac
