#!/usr/bin/env bash
# Installe le timer systemd de sauvegarde PostgreSQL ImpactC sur Contabo.
set -euo pipefail

ROOT="${IMPACTC_ROOT:-/opt/optimizesolux/impactc}"
SERVICE_NAME="impactc-postgres-backup.service"
TIMER_NAME="impactc-postgres-backup.timer"
SCHEDULE="${IMPACTC_BACKUP_ON_CALENDAR:-*-*-* 02:15:00}"

[[ "${EUID}" -eq 0 ]] || { echo "ERROR: run this script as root" >&2; exit 1; }
[[ -x "${ROOT}/deploy/backup-postgres.sh" ]] || { echo "ERROR: backup script is absent or not executable" >&2; exit 1; }

cat > "/etc/systemd/system/${SERVICE_NAME}" <<EOF
[Unit]
Description=ImpactC PostgreSQL backup
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=root
ExecStart=${ROOT}/deploy/backup-postgres.sh
Nice=10
IOSchedulingClass=best-effort
IOSchedulingPriority=7
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
ReadWritePaths=/var/backups/impactc ${ROOT}
EOF

cat > "/etc/systemd/system/${TIMER_NAME}" <<EOF
[Unit]
Description=Nightly ImpactC PostgreSQL backup

[Timer]
OnCalendar=${SCHEDULE}
Persistent=true
RandomizedDelaySec=10m
Unit=${SERVICE_NAME}

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now "$TIMER_NAME"
systemctl list-timers --all "$TIMER_NAME"
printf 'ImpactC PostgreSQL backup timer installed: %s\n' "$TIMER_NAME"
