#!/usr/bin/env bash
set -euo pipefail
umask 077
BUNDLE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
(cd "$BUNDLE" && sha256sum --quiet -c SHA256SUMS)
test "$(id -u)" = 0
test -s /www/wwwroot/very-three/dist/cloud-config.js
command -v curl >/dev/null
PYTHON=$(command -v python3)
"$PYTHON" -c 'import sys; assert sys.version_info >= (3,9), "需要 Python 3.9 或更高版本"'
mkdir -p /www/server/very-three-tools
install -m 700 "$BUNDLE/deploy.py" /www/server/very-three-tools/deploy.py
# 网站改为原子切换链接后，已有备份必须跟随链接打包实际文件。
if test -f /www/server/very-three-tools/backup.py; then
  cp -p /www/server/very-three-tools/backup.py /www/server/very-three-tools/backup.py.before-autodeploy
  install -m 700 "$BUNDLE/backup.py" /www/server/very-three-tools/backup.py
fi
cat >/etc/systemd/system/very-three-deploy.service <<UNIT
[Unit]
Description=Check GitHub and atomically deploy Very Three frontend
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=root
UMask=0022
ExecStart=$PYTHON /www/server/very-three-tools/deploy.py check
TimeoutStartSec=15min
Nice=10
NoNewPrivileges=true
UNIT
cat >/etc/systemd/system/very-three-deploy.timer <<'UNIT'
[Unit]
Description=Check Very Three GitHub main every five minutes

[Timer]
OnBootSec=2min
OnUnitInactiveSec=5min
AccuracySec=15s
Unit=very-three-deploy.service

[Install]
WantedBy=timers.target
UNIT
systemd-analyze verify /etc/systemd/system/very-three-deploy.service /etc/systemd/system/very-three-deploy.timer
systemctl daemon-reload
echo '正在下载并验证首次部署；失败时保持当前站点。'
if ! systemctl start very-three-deploy.service; then
  journalctl -u very-three-deploy.service -n 12 --no-pager
  exit 1
fi
test -s /www/server/very-three-autodeploy/state.json
systemctl enable --now very-three-deploy.timer
journalctl -u very-three-deploy.service -n 8 --no-pager
systemctl list-timers very-three-deploy.timer --no-pager
echo '自动部署已启用：每 5 分钟检查 GitHub main，保留服务器后端连接配置。'
