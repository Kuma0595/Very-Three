# 服务器小屋与备份

正式入口：`https://114.132.201.227/`；管理台：`/admin/`。
GitHub Pages 仅生成跳转入口，不再发布连接旧云端的网页客户端。
前端 `dist/cloud-config.js` 仅含自建后端地址和 anon 公开密钥，禁止写入 service_role、数据库密码或 JWT 签名密钥。

## 每日备份

将 `scripts/server-backup/` 打包上传服务器，在终端执行 `bash install.sh`。
安装会先执行一次备份，通过后启用 systemd timer：每天 **Asia/Shanghai 04:00**。
备份时暂时停止 API、登录、REST、实时和照片服务，以保持数据库与文件一致；随后自动恢复并等待健康检查。
脚本不停止 Nginx 或 PostgreSQL。

备份目录：`/www/backup/very-three-auto/`（root 专用）。内容包含：

- PostgreSQL 自定义格式全库备份和全局角色；
- 照片文件；
- 后端 Compose、`.env` 和初始化配置；
- `db-config` 命名卷，包括 pgsodium 密钥；
- 网站文件、Nginx 配置、TLS 证书和 ACME 续期账户；
- 表记录数量和文件 SHA256 清单。

仅轮换本工具创建且标记成功的备份，保留最近 **7 份**；迁移备份不删除。
失败备份暂时保留用于排查，不删除之前的成功备份。
这些是同机备份，尚未配置异地副本。

## 查看与手工执行

```bash
systemctl list-timers very-three-backup.timer
systemctl start very-three-backup.service
journalctl -u very-three-backup.service -n 20 --no-pager
```

## 恢复准备

备份含密钥与账号密码哈希，不要上传到 GitHub、聊天或网站目录。
实际恢复应先在隔离实例使用对应镜像版本，恢复角色、数据库、照片、配置和命名卷后验证，再切换入口。
`globals.sql` 记录内置角色和密码，恢复到已初始化实例时需处理已有角色，不能盲目整份覆盖正在使用的数据库。
目前完整性检查验证备份格式、关键表和文件可读性；尚未执行整机恢复演练。
