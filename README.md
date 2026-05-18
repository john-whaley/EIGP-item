# Email Identity Graph Platform

基于 `Email Identity Graph Platform V1 Spec Cn.pdf` 落地的前后端分离 MVP，目标是把主邮箱、辅助邮箱、注册号码、辅助号码、平台标签之间的关系统一管理、快速检索并图谱化展示。

当前技术栈：

- 前端：Vue 3 + TypeScript + Vite + Pinia + Naive UI + ECharts
- 后端：NestJS + Prisma + PostgreSQL + JWT + Swagger
- 部署：Docker Compose + Nginx

## 已实现功能

- 邮箱注册
- 邮箱 + 密码登录
- 邮箱验证码登录
- 忘记密码 / 修改密码
- 主邮箱管理
- 统一实体目录
- 平台标签管理
- 关系图谱全屏页
- 全局搜索
- Dashboard 统计总览
- Docker / Nginx / PostgreSQL 部署配置

## 项目结构

```text
.
├── apps/
│   ├── api/   # NestJS + Prisma backend
│   └── web/   # Vue 3 frontend
├── docker-compose.yml
├── .env.example
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

说明：

- `APP_ENCRYPTION_KEY` 用于加密存储主邮箱密码。
- 当 `RESEND_API_KEY` 为空且 `MAIL_DEBUG=true` 时，验证码会以 `debugCode` 形式返回，方便本地联调。

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

## Docker / VPS 部署

### 1. 新建根目录 `.env`

基于 [/.env.example](/F:/我的项目/EIGP-item/.env.example:1) 新建项目根目录 `.env`：

```env
JWT_SECRET=replace-with-a-long-random-secret
APP_ENCRYPTION_KEY=replace-with-a-second-long-random-secret
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/eigp?schema=public
FRONTEND_URL=https://your-domain.com
RESEND_API_KEY=
RESEND_FROM_EMAIL=EIGP <onboarding@resend.dev>
MAIL_DEBUG=false
VERIFICATION_CODE_EXPIRES_MINUTES=10
```

### 2. 启动或更新容器

```bash
docker compose up -d --build
```

默认行为：

- `web` 容器暴露 `80`
- `api` 容器暴露 `3000`
- `postgres` 容器暴露 `5432`
- `web` 内置 Nginx，会把 `/api/*` 反代到 `api:3000`

### 3. 数据库持久化说明

这个项目的 PostgreSQL 使用的是命名卷 `eigp-postgres-data`，所以：

- 你执行 `docker compose up -d --build` 更新容器时，数据库会保留
- 你执行 `docker compose down` 停掉容器时，数据库也会保留
- 后续再次 `docker compose up -d`，仍会继续使用原来的数据库数据

只有以下情况数据库才会真正删除：

- 手动执行 `docker compose down -v`
- 手动删除卷：`docker volume rm eigp-postgres-data`

换句话说，除非你主动删卷，否则数据库会一直存在。

### 4. 域名访问方式

如果你是直接把容器宿主机暴露到公网：

- 域名 A 记录指向 VPS IP
- 访问域名时直接命中宿主机 `80` 端口
- Web 容器内的 Nginx 会负责静态前端和 `/api` 反代

如果你要上 HTTPS，建议：

- 宿主机外层再放一层 Nginx / Caddy / Traefik
- 证书终止放在最外层
- 反向代理到 `web` 容器对应的 `80` 端口

## 主要接口

- `POST /api/auth/register/send-code`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/login/send-code`
- `POST /api/auth/login/code`
- `POST /api/auth/password/send-code`
- `POST /api/auth/password/reset`
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

- 规格里推荐了 Next.js / React Flow；这次实现为了最大化复用 `DVTP-item` 并保证本地可继续快速开发，采用了 Vue + Nest 的同构工程方式。
- 关系图谱页目前使用轻量 SVG 方案，并已支持悬停高亮、节点详情和全屏查看。
- 当前重点是 V1 核心链路，后续还可以继续补：Excel 导入导出、批量编辑、多用户协作、审计日志、自动化检测等。
