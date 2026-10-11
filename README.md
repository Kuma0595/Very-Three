# Very Three · 本地开发版

包含最新共享客厅和 Piggy、4010、Joey 三个个性房间，与线上第二版代码一致。三维模型、纹理生成代码和 Three.js 依赖全部包含在包内。

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
- dist/app.js：角色信息、房间切换、留言、相册和计划
- dist/scene.js：Three.js 模型、灯光、相机和点击交互
- dist/vendor：Three.js r170、OrbitControls，均为 MIT 授权
- scripts/dev.mjs：只使用 Node 内置模块的静态开发服务

## 数据说明

留言、照片和计划保存在浏览器 localStorage 中。localhost 与线上网址是不同的来源，因此线上已有内容不会自动出现在本地。源码包不包含任何用户上传的照片或留言，也不包含站点凭据。三人同步和后台尚未实现。

房间模型与插画为原创；房间式导航和交互参考 https://github.com/andrewwoan/sooahs-room-folio 的思路，未复制其模型、声音或纹理。

## 房间相框上传

三位成员都是男生，Joey 调整为短发男生造型。每个个人房间有三个可点击的墙上相框。点击相框或“相框 · 上传照片”入口，可以选择、替换、移除图片；点击“回房间看看”查看真实三维贴图。图片居中裁为 640×640 JPEG，再保存在当前浏览器的 localStorage；不上传服务器，没有跨设备同步。修改房间名或心情会保留已有照片。

## 自动昼夜

默认按照浏览器设备的本地时间，22:00（含）到次日 07:00（不含）为黑夜，其他时间为白天。在精确时间边界、重新进入页面、标签恢复可见和窗口聚焦时检查时间。手动切换仍保留，点击“自动”可恢复时间模式。

## 更新与停止

更新源码通常不用停止服务：另开终端执行 git pull，dist 页面自动刷新。若更新 scripts/dev.mjs 启动脚本，需要停止并重新运行 npm run dev。Ctrl+C 会先关闭自动刷新长连接和套接字，再退出，不再因 SSE 请求持续等待。
