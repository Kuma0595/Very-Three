# Very Three · 本地开发版

包含共享客厅和 Piggy、4010、Joey 三个个性卧室，整合在同一个三维小家中。最新修改以 GitHub main 分支为准。三维模型、纹理生成代码和 Three.js 依赖全部包含在包内。

## 在 Mac 上启动

需要 Node.js 18 或以上版本。无需 npm install。

1. 解压代码包，在终端进入 `very-three-local` 文件夹。
2. 执行 `npm run dev`。
3. 浏览器会打开 http://localhost:5173。

也可以双击 `Start-Mac.command`。如果系统不允许执行，直接使用终端的 `npm run dev`。

停止服务：在终端按 Ctrl+C。
端口被占用：`npm run dev -- --port 5174`。

## 开发方式

用 VS Code、HBuilder X 或 Codex 打开整个 `very-three-local` 文件夹。
修改 `dist/` 中的文件后，浏览器自动刷新。今后以本地开发为默认，明确需要更新线上版本时再部署。
不要直接双击 index.html；ES modules 需要通过本地 HTTP 服务访问。

- dist/index.html：页面布局和入口
- dist/style.css：响应式样式和昼夜配色
- dist/app.js：角色信息、镜头切换、留言、相册和计划
- dist/scene.js：Three.js 模型、灯光、相机和点击交互
- dist/vendor：Three.js r170、OrbitControls，均为 MIT 授权
- scripts/dev.mjs：只使用 Node 内置模块的静态开发服务

## 数据说明

留言、照片和计划保存在浏览器 localStorage 中。localhost 与线上网址是不同的来源，因此线上已有内容不会自动出现在本地。源码包不包含任何用户上传的照片或留言，也不包含站点凭据。三人同步和后台尚未实现。

房间模型与插画为原创；房间式导航和交互参考 https://github.com/andrewwoan/sooahs-room-folio 的思路，未复制其模型、声音或纹理。

## 房间相框上传

三位成员都是男生，Joey 调整为短发男生造型。每个个人房间有三个可点击的墙上相框。点击相框或“相框 · 上传照片”入口，可以选择、替换、移除图片；点击“回房间看看”查看真实三维贴图。图片居中裁为 640×640 JPEG，再保存在当前浏览器的 localStorage；不上传服务器，没有跨设备同步。修改房间名或心情会保留已有照片。

## 自动昼夜

默认跟随系统外观：深色模式为黑夜，浅色模式为白天。监听系统外观变化，并在页面恢复可见、窗口聚焦时重新同步；不再按时间切换。手动切换仍保留，点击“自动”可恢复跟随系统。

## 更新与停止

更新源码通常不用停止服务：另开终端执行 git pull，dist 页面自动刷新。若更新 scripts/dev.mjs 启动脚本，需要停止并重新运行 npm run dev。Ctrl+C 会先关闭自动刷新长连接和套接字，再退出，不再因 SSE 请求持续等待。

## 一体化户型

客厅与三个卧室现在共享同一个场景和连续地台：客厅居中，北侧 Piggy、西侧 4010、东侧 Joey，南侧玄关，内墙留门洞与名字牌，门前保留通行空间。十字形地台与房间地板各自独立，阴影平面位于地台下方，避免拖动时共面闪烁。所有房间始终可见；全景、客厅和人物入口只移动相机及观察目标。三个玩偶各自在自己的卧室。每个房间独立的床头灯随统一昼夜变化，相框上传接口与本地数据保持不变。


## 访问暗号与 GitHub Pages

访问先输入暗号「xiaosi」。当前标签页通过后刷新无需重输；点击页脚「锁门」可以退出。只有输入正确暗号后才加载应用与三维场景，已有照片、留言等本地数据不受影响。

这是前端体验门，不能保护公开源码或静态资源，也不能代替服务器认证。不要将私人照片或敏感内容提交到公开仓库。

GitHub Pages 使用 `.github/workflows/pages.yml` 将 `dist/` 发布到站点根目录。首次在仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**，随后在 Actions 中运行 **Deploy Very Three to GitHub Pages**。后续 `main` 分支的 `dist/` 更新自动发布。所有资源使用相对路径，兼容 `/Very-Three/` 子目录。


## 房间音乐

每次点击进入卧室播放 15 秒原创 Web Audio 合成短曲，播放一次后结束。Piggy 为摇滚与电玩音色，4010 为黑胶底噪与复古流行，Joey 为 K-pop 风格电子舞曲。切换房间、回全景/客厅或隐藏页面会停止，支持重播和记住静音偏好。音频仅在用户点击后启动；若浏览器限制音频可点「播放」重试，不下载外部音乐。
