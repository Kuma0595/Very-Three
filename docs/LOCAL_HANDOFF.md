# 本地接续入口

最新、统一的项目进度请阅读同目录 [CLOUD_HANDOFF.md](CLOUD_HANDOFF.md)。该文档同样适用于本地 Codex，包含服务器路径、迁移状态、自动部署、手机适配和待办。

先读根目录 AGENTS.md，再核验最新 Git HEAD 与实际线上状态。不要重复导入数据库。

本地 Codex 可使用用户在本机配置并授权的 SSH；云端先前连接服务器 22 端口返回 Network is unreachable。不能仅凭网站 HTTPS 可访问就认为具备服务器 shell 权限。不要在聊天传递私钥、root 密码或数据库服务端密钥。
