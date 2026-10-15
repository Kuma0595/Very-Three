# 服务器自动部署

安装一次后，服务器每 5 分钟检查公开仓库 `Kuma0595/Very-Three` 的 `main`。只在 `dist` 文件变化时发布，不需要用户电脑开机，也不需要在服务器保存 GitHub token、SSH 私钥或开放新的入站端口。

## 安装

使用本次提供的 `very-three-autodeploy.tar.gz`，上传到服务器 `/root`：

```bash
tar -xzf /root/very-three-autodeploy.tar.gz -C /root
bash /root/very-three-autodeploy/install.sh
```

安装器先检查包内校验和，再安装 systemd service/timer，执行首次发布。首次下载或 HTTPS 检查失败时不启用定时器，当前网页保持原样。排除问题后重新执行安装器即可。

安装成功必须同时看到“自动部署成功”与“自动部署已启用”，且 `systemctl list-timers very-three-deploy.timer` 有下次运行时间。尚未收到服务器日志前，只能认为安装包就绪，不能认为已启用。

## 发布范围与检查

- 固定拉取官方 GitHub API 的 `main`，锁定提交 SHA 后下载官方 codeload 包，只提取 `dist`。
- 不运行仓库里的 shell/npm 脚本，不执行数据库迁移，不改 Nginx 和后端 Compose。
- **始终保留服务器当前 `dist/cloud-config.js`**。域名和后端地址变更需要单独配置；不会被仓库旧配置覆盖。
- 先检查关键页面与 HTML 引用的本地脚本、样式，再以 Linux 原子交换切换 `dist`。
- 通过本机 127.0.0.1 的 HTTPS，以 `verythree.online` 的真实 Host/SNI 验证新版本标记、首页、后台和模型管理页。证书必须有效且域名应指向该部署目录。
- HTTP 检查失败自动回退；网络下载失败不触碰当前站点。异常中断留下 pending.json 时暂停部署，供人工确认，不猜测恢复状态。
- 这不是浏览器全功能测试。真实登录、照片保存与 3D 交互仍应在对应功能变更中验证。
- 只保留最近 3 个受管理的发布目录，并额外保护当前版、上一版；首次安装前的原站目录单独保留。
- 部署与每日备份共享锁，避免备份过程中切换网站版本。

注意：启用后，后续推送到 `main` 的 `dist` 修改会自动上线。未准备上线的工作放在其他分支。

## 路径

- 程序：`/www/server/very-three-tools/deploy.py`
- 状态：`/www/server/very-three-autodeploy/state.json`
- 版本：`/www/wwwroot/very-three-releases/`
- 网站入口保持：`/www/wwwroot/very-three/dist`（安装后为版本目录的链接）。

安装器若发现已有 `backup.py`，会保存安装前副本，再更新为支持打包实际网页文件的版本。没有安装每日备份时，不会擅自启用备份服务。安装包也包含更新后的备份安装材料，请不要再使用旧版备份安装包覆盖新脚本。

## 状态、暂停和回退

```bash
systemctl list-timers very-three-deploy.timer
journalctl -u very-three-deploy.service -n 20 --no-pager
systemctl start very-three-deploy.service

# 暂停发布（定时检查保留，检测到暂停标记后不更新）
python3 /www/server/very-three-tools/deploy.py pause

# 回退上一版，同时暂停发布，避免下一轮把问题版本重新部署
python3 /www/server/very-three-tools/deploy.py rollback

# 恢复自动发布；下次检查会重新对照 main
python3 /www/server/very-three-tools/deploy.py resume
```

如果需要停用整个定时器：`systemctl disable --now very-three-deploy.timer`。
该功能不会自动更新自己或执行 SQL；改变部署器、服务器配置和数据库结构仍需单独安装并验证。
