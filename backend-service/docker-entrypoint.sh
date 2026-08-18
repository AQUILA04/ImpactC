#!/bin/sh
set -eu

case "${IMPACTC_PROCESS_ROLE:-api}" in
  api)
    export IMPACTC_PROCESS_ROLE=api
    exec node dist/src/main
    ;;
  worker)
    export IMPACTC_PROCESS_ROLE=worker
    exec node dist/src/worker
    ;;
  *)
    echo "IMPACTC_PROCESS_ROLE must be api or worker" >&2
    exit 64
    ;;
esac
