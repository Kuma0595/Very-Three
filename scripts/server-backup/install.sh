#!/usr/bin/env bash
set -euo pipefail
umask 077
BUNDLE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
(cd "$BUNDLE" && sha256sum --quiet -c SHA256SUMS)
test -f /www/server/very-three-backend/.env
PYTHON=$(command -v python3)
mkdir -p /www/server/very-three-tools
install -m 700 "$BUNDLE/backup.py" /www/server/very-three-tools/backup.py

cat >/etc/systemd/system/very-three-backup.service <<UNIT
[Unit]
Description=Very Three database, photos and configuration backup
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
User=root
UMask=0077
WorkingDirectory=/www/server/very-three-backend
ExecStart=$PYTHON /www/server/very-three-tools/backup.py
TimeoutStartSec=20min
Nice=10
NoNewPrivileges=true
UNIT

cat >/etc/systemd/system/very-three-backup.timer <<'UNIT'
[Unit]
Description=Daily Very Three backup at 04:00 Asia/Shanghai

[Timer]
OnCalendar=*-*-* 04:00:00 Asia/Shanghai
Persistent=true
AccuracySec=1min
Unit=very-three-backup.service

[Install]
WantedBy=timers.target
UNIT

systemd-analyze verify /etc/systemd/system/very-three-backup.service /etc/systemd/system/very-three-backup.timer
systemctl daemon-reload
echo "正在执行首次备份，API 会短暂停止，随后自动恢复……"
if ! systemctl start very-three-backup.service; then
  journalctl -u very-three-backup.service -n 12 --no-pager
  exit 1
fi
systemctl enable --now very-three-backup.timer
journalctl -u very-three-backup.service -n 8 --no-pager
systemctl list-timers very-three-backup.timer --no-pager
echo "每日自动备份已配置：北京时间 04:00，保留最近 7 份成功备份。"
