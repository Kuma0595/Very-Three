# Very Three 云端初始化

前端仍在 GitHub Pages，后端使用你的 Supabase 项目。此分支已包含登录、三人权限、房间心情、相框、留言、计划、共享相册和每十秒同步。完成以下设置后再合并上线。

## 1. 创建数据库与私有图片桶

打开项目左侧 **SQL Editor → New query**，粘贴本目录 `setup.sql` 的全部内容，点击 **Run**。脚本创建六张 `vt_` 表、三位成员的初始房间、RLS 权限和名为 `very-three` 的私有图片桶；可以重复执行，不清空已有数据。

Publishable key 已配置在 `dist/cloud-config.js`。不需要数据库密码、secret key 或 service_role。它不能创建表，也不能分配成员身份。

## 2. 创建三个登录账号

到 **Authentication → Users → Add user / Create new user**，为 Piggy、4010、Joey 分别填写真实邮箱并设置各自密码；如果提供 **Auto Confirm User** 选项，勾选它。

账号密码由每个人自己保管，不放入 GitHub 或建表 SQL。网页不开放注册；还需在 Authentication 的用户注册设置里关闭公开 signup，保留 Email/Password 登录。

## 3. 绑定成员

复制三个账号在 Users 列表中的 **User UID**。在 `bind-members.sql` 里替换三个占位符，再到 SQL Editor 运行。id 0 = Piggy、id 1 = 4010、id 2 = Joey。只有绑定的账号可以读取内容，其他已注册账号也无法进入。

不要用前端可编辑的 user_metadata 来分配成员身份。成员绑定只允许在 Supabase 后台管理。

## 4. 上线和验证

合并本分支到 `main`，GitHub Actions 自动发布。登录页使用邮箱 + 账号密码，取代之前的 xiaosi 前端暗号。正式地址仍为 https://kuma0595.github.io/Very-Three/ 。

用 Piggy 账号登录，上传 Piggy 相框，留下留言；再用另一个账号/浏览器验证可读但不能修改 Piggy 房间。共享计划三人都能打勾、移除，留言和合照仅上传者可删除。同步每十秒一次，恢复可见时立即检查。图片使用有效期一小时的签名地址，页面会提前更新。

## 本地旧数据

原有 `three-at-home-v1` 数据键没有清空或改名，旧照片和留言保留在原浏览器。云端不会自动导入、覆盖这些内容；旧数据可以在本地旧版本查看，之后按需要上传。登录后的共享内容以云端为准，外观、灯和音乐偏好仍属于当前设备。

## 说明

Supabase JS SDK 2.117.3 已打包到 `dist/vendor/supabase.js`，网页不依赖额外 CDN；本地仍 `npm run dev`，无需 npm install。以后更换项目，仅替换 `dist/cloud-config.js` 并在新项目执行初始化。

## 已有项目启用庭院

在 SQL Editor 新建查询，执行 `garden.sql`，再刷新网页。九个种植位会自动创建。账号绑定、原有照片和留言不变；仅自己的花圃可播种，家人均可帮忙浇水。

## 启用房间装饰
在 SQL Editor 执行 `decoration.sql`。点击“布置我的房间”，可更换墙面、地板、地毯颜色，摆放六种装饰；点地面选位置、旋转、确定，再保存。退出会放弃未保存改动，恢复默认也需保存后生效。每人最多十二件，仅房间主人可保存。版本检查避免多个设备相互覆盖。

## 新增两页装饰
已有装饰功能的项目执行 `decoration-items.sql`，只更新保存函数的物品类型名单，不清空布置。新项目可直接执行最新版 `decoration.sql`。弹窗共有日常小物、兴趣收藏、慢生活角落三页，每页六件；每间房仍最多摆放十二件。

## 启用互动家具
执行 `activities.sql` 后，摆放街机、鱼缸或望远镜并保存，退出布置，再点击物件即可互动。街机每局六十秒，按房间保存三人的个人最高分；鱼缸主人改名，三人均可投喂，十分钟冷却；星空为原创示意，愿望仅三位成员可读，每人一分钟最多提交一次。未执行 SQL 时，小游戏和观星可试玩，不把本次成绩报告为云端已保存。

## Zakery 加入并与 Joey 共用房间
已有项目先执行 `zakery.sql`。它扩展成员到四位、给成员添加 room_id，Zakery 的成员 id=3、room_id=2。Joey 与 Zakery 共同编辑房间 2 的心情、照片、装饰、鱼缸和花圃，各自只能编辑自己的名字与状态，街机最高分仍分别记录。迁移不删除已有数据。不要重新执行旧版 setup.sql。

到 Authentication → Users → Add user 创建 Zakery 的邮箱/密码，确认账号；复制 UID，然后在 SQL Editor 执行：

```sql
update public.vt_members set user_id = '替换为 Zakery 的 User UID' where id = 3;
select id, name, room_id, user_id from public.vt_members order by id;
```

不要把账号密码或管理密钥提交到仓库。四个人的自主日常是当前浏览器模拟，位置不上传云端；手动控制时对应人物停止自主动作，退出后恢复。家具布置期间暂停日常；系统减少动画设置会停止自主移动。
