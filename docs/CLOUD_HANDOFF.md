# Very Three 云端交接

更新：2026-10-16（新增全屋布置与统一家具分类记录；线上状态以各节实测为准）。先读根目录 AGENTS.md、本文件及相关源代码，再核验外部服务状态。本文是进度交接，不是全部聊天；成功提示只代表当时检查结果。

## 先看这五项

1. 网站、数据库、账号和照片已迁移腾讯云自建 Supabase，**不要重复导入覆盖新数据**。
2. 自动部署已安装，并通过两次公开版本标记确认工作；最近一次已核验的线上前端为 `2bfba8315d480e271426e9d092381ea4a506fc66`。后续全屋布置代码已提交，线上部署尚未核验。
3. 手机横向溢出修复已上线，但**真机效果待用户确认，本轮浏览器布局测试未运行**。
4. 域名网页和 HTTPS 已配置，域名下后端路由此前 404、前端仍用 IP 后端；完整域名切换尚未完成。
5. 每日备份脚本和安装包已交付，**未收到首次备份与定时器成功日志，不能宣称已启用**。

## 用户与项目

- 用户 Piggy，前端工程师，中文沟通。希望直接完成工作，减少宝塔终端和聊天间转发。不得把待执行/待验证的步骤报告为完成。
- 仓库：<https://github.com/Kuma0595/Very-Three>，默认分支 main。
- 静态 HTML/CSS/JS、Three.js，小屋在 dist/，管理台在 dist/admin/；无需安装 npm 依赖即可 npm run dev。以 package.json 为准，不擅自换框架。
- 四位成员：Piggy、4010、Joey、Zakery。Zakery 是 Joey 的男朋友，两人共享卧室。三室一厅加庭院。
- 个人房间面积接近；客厅后面是墙而不是过道；窗户朝外，避免朝向其他卧室。保持门口/家具间寻路通畅。
- 公共区域文字使用“我们家”，不是“一家人”。客厅布置上限 30 件、成员共同编辑、支持墙面物品。
- 已移除“串门”开关，默认点地面移动，椅子可坐、自己的床可躺。睡眠依据真实时间，视觉昼夜切换不应强制上床。
- 照片支持大图和相册内左右切换；Joey 房间两人都能上传，最多 6 张。
- 避免回归：地毯/沙发深度闪烁、照片点击错位、窗户残留建模、起床后被模型卡住。
- 保留既有本地数据、权限和云端备份，不能擅自删除/重置。

## 部署路径

| 项目 | 配置 |
| --- | --- |
| 小屋 / 后台 | <https://verythree.online/> / <https://verythree.online/admin/> |
| IP 入口 | <https://114.132.201.227/> |
| 旧 GitHub Pages | <https://kuma0595.github.io/Very-Three/> |
| 主机 | 腾讯云 OpenCloudOS 9.6 x86_64，4 核、约 4GB 内存、40GB 磁盘、1GB swap，宝塔 |
| 网站 | /www/wwwroot/very-three/dist（自动部署后为版本目录链接） |
| Nginx / 服务 | /www/server/nginx/sbin/nginx / /etc/init.d/nginx |
| 原 IP vhost | /www/server/panel/vhost/nginx/very-three.conf |
| 原 IP 证书 | /www/server/panel/vhost/cert/very-three/ |
| 后端 | /www/server/very-three-backend |
| 内网 API | 127.0.0.1:18000 |

**访问边界**：此前云端 SSH 连接 114.132.201.227:22 返回 Network is unreachable，未进入认证；没有保存可用 SSH 凭据。HTTPS 读取、GitHub 连接可用不等于能执行服务器命令。不要要求用户在聊天发送私钥/root 密码。确需服务器配置时，准备校验过的一次性包，由用户宝塔终端执行，再核验非敏感结果。

过去 Safari HTTP IP 页面约 10 FPS，HTTPS 同一模型约 49 FPS；不要回退 HTTP。

## 自建 Supabase：迁移完成

- 已迁移并验证数据库、账号/权限、照片，切换 IP 站前端。迁移时验证 4 个账号、16 张业务表逐条数据、9 张照片字节/SHA256及真实登录；用户需要重新登录。
- 当前公开 API URL：https://114.132.201.227/backend 。dist/cloud-config.js 仅含公开 anon key，不得放入 service_role、数据库密码、JWT 签名密钥。
- Compose 环境：COMPOSE_FILE=docker-compose.yml:docker-compose.very-three.yml；COMPOSE_PROJECT_NAME=very-three-backend。
- 官方源版本 self-hosted/v0.8.2，源提交 564eab8ad7840b13324f68b1bfac074ef8d51c21。
- 正常启用 db、auth、rest、realtime、storage、imgproxy、api-gw；其他管理/维护服务不按全套默认启用。
- 旧云端项目 yfbyyfpazdjsgpyzktak 保留。托管 Supabase 插件连接不等于能管理自建后端；操作前确认目标。不要重复导入。
- 业务表：vt_admin_log、vt_admin_users、vt_common_decor、vt_decor、vt_frames、vt_garden、vt_members、vt_model_catalog、vt_model_workspace、vt_notes、vt_photos、vt_plans、vt_play、vt_rooms、vt_settings、vt_wishes。

保留材料：

- /www/backup/very-three-cloud-u9fC7fc7（云端初始备份）
- /www/backup/very-three-restore-eudMCXcb（数据库恢复记录）
- /www/backup/very-three-migrate-all-86bpn9vu（整批迁移成功记录）

这些材料可能含账号密码哈希、密钥和私人照片，不能上传到公开仓库或聊天。

## 自动部署：已安装并验证

说明：docs/server-autodeploy.md；代码：scripts/server-autodeploy/。

- 3f8e30b4ab9bfc9242c7fde892d0a6a0279990d9：部署器及备份链接兼容修改。用户安装后公开版本标记确认首次发布，首页/后台返回 200。
- 2bfba8315d480e271426e9d092381ea4a506fc66：手机适配。约 09:35 再读公开标记确认已上线，created_at 为 2026-10-16T01:30:53.185201+00:00。
- 标记地址：<https://verythree.online/very-three-release.json>。

机制：约每 5 分钟检查 main，锁定提交 SHA 下载官方 GitHub 包，仅 dist 有变化时发布；不运行仓库 shell/npm 或数据库迁移。**保留服务器当前 cloud-config.js**，不能靠改仓库此文件来变更线上后端地址。

先检查静态文件，再原子切换目录；本机 HTTPS 检查版本标记、首页、后台、模型页，失败自动回退。首次安装前的原站目录保留，最近 3 个受管理版本轮换并保护当前/上一版。与备份共享锁，异常中断留下 pending 时暂停。

路径：/www/server/very-three-tools/deploy.py；状态 /www/server/very-three-autodeploy/state.json；版本 /www/wwwroot/very-three-releases/。

```bash
systemctl list-timers very-three-deploy.timer
journalctl -u very-three-deploy.service -n 20 --no-pager
systemctl start very-three-deploy.service
python3 /www/server/very-three-tools/deploy.py pause
python3 /www/server/very-three-tools/deploy.py rollback
python3 /www/server/very-three-tools/deploy.py resume
```

main 的后续 dist 改动会自动上线，未准备发布的代码放其他分支。部署器本身不会自更新。**文档/脚本提交不会重新发布网页，因此网页版本标记不等于最新 HEAD 不一定是故障。**

## 手机适配：已上线，实际显示待确认

用户 iPhone 内嵌浏览器截图显示左侧被切、右侧大块紫色空白、底部横向滚动条。对话中可见截图，但工具环境无法重新打开原文件；不要声称已在同款 iPhone 复现。

2bfba83 的修改：

- dist/style.css：<=850px 改自然文档流/grid；四位成员一行、六个房间入口两行；画布/工具栏/底栏限制在可用宽度内；页面和场景分别约束横向溢出。
- dist/scene.js：离屏、非有限或相机外标签设 hidden，不写极大投影坐标；零尺寸跳过 renderer resize。
- dist/index.html、access.js、app.js：缓存版本链 39-mobile-fit / 30-mobile-fit。
- 新增 scripts/check-mobile-overflow.mjs：实际投影片段回归，已通过。
- 扩展 scripts/check-player-browser.mjs：320/360/393/430/768/850/851/1440 宽度，全景/聚焦模式、成员/导航/画布边界和极端投影回归。

本轮通过：JS 语法、投影回归、npm run test:player、npm run test:admin、node scripts/check-navigation.mjs、node scripts/check-cat-sound.mjs。

**本轮没有执行真实浏览器布局/截图测试**：环境缺少内核，Playwright 下载得到不可用 HTML/损坏包。不能称桌面/手机像素布局已验证。内核可用时运行 package.json 中浏览器测试，可用 VT_CHROME 指定内核，脚本支持 VT_PLAYWRIGHT_MODULE。用户真机效果是当前优先待办。

## 每日备份：安装状态待确认

代码 scripts/server-backup/，说明 docs/server-operations.md。设计为北京时间 04:00 systemd timer，先成功执行首次备份再启用定时器。API 会短暂停止以保持数据库/照片一致，finally 恢复并等健康；不停止 Nginx/PostgreSQL。

包含数据库 custom dump、角色、照片、后端配置/密钥、Postgres 配置卷、网页、原 IP Nginx/证书/acme.sh 材料。目录 /www/backup/very-three-auto，仅轮换本工具最近 7 份成功备份，手工/迁移备份不删。仅同机备份，没有异地副本，也没有整机恢复演练。

自动部署安装器会更新已安装的 backup.py，用 tar -h 打包链接后的实际网页；未装备份则不会擅自启用。新域名可能使用独立 vhost/证书目录，必须补齐备份覆盖。

```bash
systemctl list-timers very-three-backup.timer
journalctl -u very-three-backup.service -n 20 --no-pager
```

旧对话临时下载包不保证新环境可访问。需要交付包时从仓库脚本重新打包，并生成/检查 SHA256SUMS；不要把服务器实际 .env 放进交付包。

## 2026-10-16 补充：跨对话与宝塔代理状态

- 用户已在 ChatGPT Projects 的 Very Three 项目设置开发指令；新对话不保证完整读取其他对话，必须主动读取 GitHub 最新 AGENTS.md 和本文件。
- 用户在电脑与 iPhone 间切换，希望多个短对话接力，尽量避免逐条复制宝塔命令。优先 GitHub 自动部署；探索 Work 浏览器或受限、可审计、可回滚的自动化运维通道。**目前没有已验证的宝塔浏览器或 SSH 执行权限。**
- 宝塔终端确认域名 vhost 为 `/www/server/panel/vhost/nginx/verythree.online.conf`，其中有 `server_name verythree.online`、`root /www/wwwroot/very-three/dist` 和 `include /www/server/panel/vhost/nginx/extension/verythree.online/*.conf;`。
- 扩展目录 `grep -Rn 'proxy_pass' ...` 当时无结果，但没有完整检查 `nginx -T`。本机 `curl -I http://127.0.0.1:18000/auth/v1/health` 返回 401 Unauthorized（server: envoy），仅表明网关响应。
- 曾向用户提供**待执行**的单行 Python 命令：仅当目标文件不存在时创建 `/www/server/panel/vhost/nginx/extension/verythree.online/backend.conf`，使用 `location ^~ /backend/`、`proxy_pass http://127.0.0.1:18000/;`。**没有收到执行成功证据，不能认定文件已创建、Nginx 已重载或代理已生效。**
- 后续先确认文件、备份和回滚，再 `/www/server/nginx/sbin/nginx -t`，通过后才 reload；验证域名后端认证/照片、Compose 外部 URL、服务器保留的 cloud-config.js、域名证书/vhost 备份和每日备份 timer。
- 重要任务完成后记录已完成、已验证、未完成、待验证；仅在 GitHub 提交并重新读取成功后称文档已更新。禁止重复迁移或删除业务数据、照片、备份。

## 2026-10-16：全屋布置第一版

### 已完成

- 保留静态 HTML/CSS/JS 和 Three.js。新增 `dist/builtin-furniture.js`，将三间卧室、客厅的原有家具接入既有布置系统，共 49 组（卧室 9/12/10，客厅 18）。床架/床垫/枕头、桌面小物等完整分组；书桌椅、穿衣镜、餐椅等可单独调整。
- 在原“布置我的房间 / 布置客厅”中点选原有家具，或展开“原有家具 · 移动与收纳”清单；点地面移动、90° 旋转、确认、收纳/重新摆出、撤销、取消、恢复默认、保存。保留新增装饰及原有件数限制，原有家具不占新增装饰额度。
- 原有家具用稳定 ID 保存至现有配置的 `furniture` 字段：`{id:{x,z,rotation,hidden}}`。旧配置没有该字段时保持默认布局；原有 `colors/items`、localStorage 键及照片保留。
- 沿用 `vt_save_decor / vt_save_common_decor` 和 `p_version` 版本校验。仓库 `living-decoration.sql / living-decor-limit.sql / models.sql` 的校验允许附加配置字段，保存函数原样写入 JSON；本次没有执行 SQL、迁移或改服务器，不要求用户重新导入数据库。
- 坐卧根对象与原有模型保持相同引用，床移动/旋转后玩家及 NPC 睡眠锚点跟随；收纳后不在旧坐标继续躺卧。原有家具布局更新时安全结束手动控制、清理 NPC 旧路径；维护通道、门口和房间边界校验。灯光、茶几点击代理跟随所属家具，猫狗回窝使用世界坐标。
- 编辑预览克隆几何体/材质/纹理，清除预览不会销毁原家具资源；网络读取失败不再当成空布局覆盖最后一次读到的状态。保存必须收到含 config/version 的成功结果才提示成功。
- 主站及模型工作台缓存入口已更新（主站 `40-whole-home`，scene `31-whole-home`）。后台模型草稿继续保留完整房间 JSON，预览读取同版场景。

### 已验证

- `npm run test:layout`：49 组家具注册与预览清理、各组在腾空房间内有可摆位置、床移动/旋转后的玩家坐卧和 NPC 睡眠、收纳/摆出、默认/旧数据兼容、越界/门口拒绝、控制器保存 RPC 参数/版本、撤销/取消/恢复默认、版本冲突保留草稿。
- `npm run test:player`：四位成员自己的床、下床安全落脚/离开房间、沙发、新增旋转缩放座椅、家具移除、他人床权限、真实时间睡眠回归通过。
- `npm run test:admin`、`node scripts/check-navigation.mjs`、`node scripts/check-mobile-overflow.mjs` 通过；修改的 JS 语法检查通过。
- 临时对比改动前后场景：1274 个可见 Mesh 的世界位置/朝向完全一致，默认摆设没有因重新分组而跳动。该对比使用提交前的原 scene.js，不将临时基线文件纳入发布。

### 未完成 / 待验证

- 真实浏览器测试尝试未能启动：当前环境没有 Chromium 可执行文件。不能宣称手机视觉效果、实际触摸选择或 WebGL 截图已通过。
- 在线账号的真实保存/刷新/多设备同步尚未验证；现有 RPC 兼容性基于仓库 SQL 与模拟接口测试，不冒充已连接自建数据库验证。
- 当前对话实测主域名曾返回 `502 / connection closed`，用户访问 panel 子域名跳 DNSPod 拦截页；备案原因尚未独立核实。SSH 再次测试仍 `Network is unreachable`，宝塔浏览器也没有已验证的登录权限。不要把权限开启或 GitHub 提交当作服务器执行成功。
- 功能已提交 GitHub main：`c35b412b1dddb0ffda26b4f74aee5a09e4bf8baa`，分支 ref、新增模块与本文内容已重新读取核验。dist 更新交给既有自动部署器。
- 提交后实际访问 `https://verythree.online/very-three-release.json` 被当前云端浏览器阻止：`net::ERR_BLOCKED_BY_CLIENT`，未读到线上版本。**自动部署结果待验证，不宣称已上线**；该错误也不能证明服务器自身故障。
- 第一版仍固定墙体、门窗和原有相册/墙面入口；未新增自由桌面摆放、原有墙饰高度编辑或庭院编辑。功能区内部分收藏与家具作为完整组移动，后续可继续细分。

## 2026-10-16：原有家具合并到分类面板

本节替代上一版“独立原有家具清单”的入口说明。用户要求像客厅一样统一分类编辑，不另做一套清单。

### 已完成

- 移除侧栏独立“原有家具 · 移动与收纳”清单。进入卧室/客厅布置即打开统一分类面板，侧栏只保留“家具与装饰 · 分类选择”入口。
- 49 组原有家具按分类与新增装饰共同展示；新增“卧室家具”（床、床头柜、穿衣镜等），原“客厅家具”在统一选择面板显示为“沙发与桌椅”，其余沿用日常小物、兴趣收藏、慢生活角落、趣味角落、墙面装饰。空的卧室分类及卧室不可用的墙饰分类不展示。
- 原有家具卡片显示“已摆放 / 已收纳”；点击调整已有家具或重新摆出，不会添加副本、不占新增装饰额度。新增装饰达到数量上限时，原有家具卡片仍可使用。
- 新增 `dist/furniture-catalog.js` 定义稳定 ID 到分类的映射；既有 DECOR_ITEMS、分类编号和保存字段不变，现有布局及收纳状态直接兼容。
- 原有家具缩略图与新增装饰共用主场景渲染器生成，不额外创建 WebGL 上下文。更新主站、模型工作台缓存入口（主站 `41-furniture-catalog`，scene `32-furniture-catalog`）及帮助说明。

### 已验证 / 待验证

- `npm run test:layout` 通过：49 组家具分类范围、缩略图生成与缓存调用（模拟 renderer，非真实 WebGL 截图）、预览不销毁原模型、从卧室分类选择床、收纳状态、装饰上限不禁用原家具、保存/撤销/取消/版本冲突。
- `npm run test:player`、`npm run test:admin`、`node scripts/check-navigation.mjs`、`node scripts/check-mobile-overflow.mjs` 通过，修改 JS 语法检查通过。
- 当前环境仍无可用 Chromium，手机实际布局、触摸交互、真实缩略图和在线账号保存尚未验证。
- 本轮再次读取线上版本标记，被云端浏览器以 `net::ERR_BLOCKED_BY_CLIENT` 阻止；未取得版本内容，自动部署结果仍待验证，不能宣称已上线。
- 没有执行 SQL、数据库迁移或任何服务器配置修改。

## 后续待办顺序

1. 确认手机适配效果；若仍偏移，获取实际视口/横向滚动偏移及内嵌浏览器与 Safari 差异，不直接断言根因完全查清。
2. 完整域名切换：约 03:03 实测域名首页/后台 200、HTTP 301 到 HTTPS；/backend/auth/v1/health 为 404，cloud-config 为 IP URL。目前未修，先重新核验。
3. 服务器 nginx -T 查明域名真实 vhost/证书目录，备份后代理 /backend/{auth/v1,rest/v1,storage/v1,realtime/v1} 到本机 API，保留重写/WebSocket，不公开数据库/管理端口。
4. 核验当前 Compose 实际使用的登录/外部 URL 变量后再改，不能机械替换未使用变量；同步服务器与仓库公开 URL。
5. 域名后端可用后，将 scripts/build-pages-redirect.py 从 IP 目的地改为域名并发布验证。
6. 确认每日备份状态，补齐新域名配置/证书覆盖。

边界：前端/文档修改不授权重置数据库、删除备份或关闭旧项目。遇权限限制说明并停下，不能以网站可访问冒充服务器 shell 权限。

