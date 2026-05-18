# Email Identity Graph Platform

基于 `Email Identity Graph Platform V1 Spec Cn.pdf` 落地的前后端分离 MVP，目标是把主邮箱、辅助邮箱、注册号码、辅助号码、平台标签之间的关系统一管理、快速检索并图谱化展示。

技术栈：

- 前端：Vue 3 + TypeScript + Vite + Pinia + Naive UI + ECharts
- 后端：NestJS + Prisma + PostgreSQL + JWT + Swagger
- 部署：Docker Compose + Nginx

## 已实现功能

- 邮箱注册
- 邮箱 + 密码登录
- 邮箱验证码登录
- 忘记密码
- 验证码修改密码
- 主邮箱管理
- 统一实体目录
- 全局搜索
- 全屏关系图谱
- Docker / VPS 多实例脚本化部署

## 项目结构

```text
.
├── apps/
│   ├── api/                     # NestJS + Prisma backend
│   └── web/                     # Vue 3 frontend
├── deploy/
│   ├── docker-compose.vps.yml   # VPS 多实例 compose 模板
│   ├── instance.env.example     # 实例 env 模板
│   ├── instances/               # 每个实例自己的 env 文件
│   └── manage-vps.sh            # VPS 交互式管理脚本
├── docker-compose.yml           # 本地/简单单实例 compose
└── README.md
```

## 本地运行

### 1. 准备环境

- Node.js 18+
- npm 10+
- PostgreSQL 16+

### 2. 配置后端环境变量

基于 [apps/api/.env.example](/F:/我的项目/EIGP-item/apps/api/.env.example:1) 新建 `apps/api/.env`：

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eigp?schema=public
JWT_SECRET=replace-with-a-long-random-secret
APP_ENCRYPTION_KEY=replace-with-a-second-long-random-secret
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=
RESEND_FROM_EMAIL=EIGP <onboarding@resend.dev>
MAIL_DEBUG=true
VERIFICATION_CODE_EXPIRES_MINUTES=10
```

### 3. 安装依赖

```bash
npm install
```

### 4. 生成 Prisma Client

```bash
npm run prisma:generate
```

### 5. 初始化数据库

先创建数据库 `eigp`，然后执行：

```bash
npm run prisma:migrate
```

### 6. 启动前后端

```bash
npm run dev
```

启动后访问：

- 前端：`http://localhost:5173`
- 后端 API：`http://localhost:3000/api`
- Swagger：`http://localhost:3000/docs`

## VPS 部署

## 推荐方式

推荐直接使用交互式脚本：

```bash
cd /path/to/EIGP-item
chmod +x deploy/manage-vps.sh
./deploy/manage-vps.sh
```

脚本能力：

- 列出所有已配置实例，并标记 `running / stopped / configured`
- 新建实例
- 修改实例配置并重建
- 使用当前配置重建/重启
- `git pull` 后重建容器
- 停止实例
- 删除实例容器但保留数据库
- 删除实例容器和数据库卷

## 新建实例时会询问的配置

脚本会交互式询问这些项目：

- 实例名称
- 域名或公网 IP
- 协议 `http / https`
- VPS 对外访问端口
- PostgreSQL 数据库名
- PostgreSQL 用户名
- PostgreSQL 密码
- `JWT_SECRET`
- `APP_ENCRYPTION_KEY`
- `RESEND_API_KEY`（选填）
- `RESEND_FROM_EMAIL`
- `MAIL_DEBUG`
- 验证码有效期

脚本会自动提醒：

- 强烈建议为 `JWT_SECRET`、`APP_ENCRYPTION_KEY`、`POSTGRES_PASSWORD` 使用强随机值
- 每次拉取最新代码后，需要执行“更新实例”来同步容器
- API 容器启动时会自动执行 `prisma migrate deploy`

## 多实例部署原理

脚本使用的是 [deploy/docker-compose.vps.yml](/F:/我的项目/EIGP-item/deploy/docker-compose.vps.yml:1)。

每个实例会有自己独立的：

- Compose project name
- 容器组
- PostgreSQL volume
- 环境变量文件

实例配置会写到：

```text
deploy/instances/<instance-name>.env
```

## 数据库持久化说明

数据库卷不会因为容器停止、删除、重建而消失。

也就是说：

- `docker compose up -d --build` 更新代码时，数据库会保留
- `docker compose down` 删除容器时，数据库也会保留
- 再次启动实例时，会继续使用原来的数据库数据

只有以下情况数据库才会真正删除：

- 手动执行 `docker compose down -v`
- 或者手动删除卷
- 或者在脚本里明确选择“删除实例容器和数据库卷”

换句话说，除非你主动删除数据库卷，否则数据库会一直存在。

## 域名访问

脚本会根据你输入的：

- 域名
- 协议
- 对外端口

自动生成 `FRONTEND_URL`。

如果你直接把容器端口暴露到公网：

- 域名 A 记录指向 VPS IP
- 浏览器访问 `域名[:端口]`
- `web` 容器内的 Nginx 负责前端静态资源、`/api` 和 `/docs`

如果你要上 HTTPS，建议：

- 在宿主机最外层再放 Nginx / Caddy / Traefik
- 证书终止放最外层
- 再反代到脚本生成的 Web 访问端口

## 主要接口

- `POST /api/auth/register/send-code`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/login/send-code`
- `POST /api/auth/login/code`
- `POST /api/auth/password/send-code`
- `POST /api/auth/password/reset`
- `POST /api/auth/password/change/send-code`
- `POST /api/auth/password/change`
- `GET /api/auth/profile`
- `GET /api/dashboard/overview`
- `GET /api/emails`
- `GET /api/emails/:id`
- `POST /api/emails`
- `PATCH /api/emails/:id`
- `DELETE /api/emails/:id`
- `GET /api/recovery-emails`
- `POST /api/recovery-emails`
- `PATCH /api/recovery-emails/:id`
- `DELETE /api/recovery-emails/:id`
- `GET /api/register-phones`
- `POST /api/register-phones`
- `PATCH /api/register-phones/:id`
- `DELETE /api/register-phones/:id`
- `GET /api/recovery-phones`
- `POST /api/recovery-phones`
- `PATCH /api/recovery-phones/:id`
- `DELETE /api/recovery-phones/:id`
- `GET /api/platforms`
- `POST /api/platforms`
- `PATCH /api/platforms/:id`
- `DELETE /api/platforms/:id`
- `GET /api/search?q=`
- `GET /api/graph`

## 说明

- 规格里推荐了 Next.js / React Flow；这次实现为了最大化复用现有工程并保持交付速度，采用了 Vue + Nest 的同构工程方式。
- 图谱页使用轻量 SVG 方案，已支持悬停高亮、节点详情和全屏查看。
- 当前重点是 V1 核心链路，后续还可以继续补：Excel 导入导出、批量编辑、多用户协作、审计日志、自动化检测等。
