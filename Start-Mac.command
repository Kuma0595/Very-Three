#!/bin/bash
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "需要安装 Node.js 18 或以上版本，再运行本脚本。"
  read -r -p "按回车关闭…"
  exit 1
fi
node scripts/dev.mjs
