# IDC 二手服务器交易平台（Server-Psuh-Platform）

一个由 **ChatGPT 辅助规划与推动开发** 的 IDC 二手服务器担保交易平台，聚焦 VPS、独立服务器、NAT、云服务器、线路机等二手场景，围绕发布、审核、下单、支付托管、交付验机、纠纷处理与结算放款，打造可运营的交易闭环。

- 一期目标：跑通“担保交易闭环”，优先安全性与可控性。
- 技术栈（推荐）：NestJS + Next.js + PostgreSQL + Redis + pnpm + turbo。
- 设计文档：`docs/architecture.md`（ERD、状态机、接口草案）。
- 数据层：Prisma schema 位置 `apps/api/prisma/schema.prisma`，API Swagger 访问 `/api/docs`。

## 快速开始（开发）
1. 安装 pnpm：`npm i -g pnpm@9`
2. 安装依赖：`pnpm install`
3. 启动所有应用：`pnpm dev`（turbo 并行 web + api）
4. 复制 `.env.example` 为 `.env`，填入数据库、Redis、支付/邮件等配置。
5. 首次建库：`pnpm --filter @idc/api prisma:generate`，然后 `pnpm --filter @idc/api prisma:migrate -- --name init`
6. Swagger 调试：`http://localhost:3000/api/docs`，鉴权使用 Bearer Token（`/auth/login` 获取）

## 仓库结构
- apps/api：后端 API（NestJS）
- apps/web：前端站点（Next.js App Router）
- packages/shared：共享类型与 DTO
- docs：架构与规范文档
- pnpm-workspace.yaml / turbo.json：工作区与任务编排

## 环境变量（关键）
- `DATABASE_URL` / `REDIS_URL`
- JWT：`JWT_SECRET`、`JWT_EXPIRES`
- 订单超时：`ORDER_AUTO_CONFIRM_HOURS`、`ORDER_UNPAID_CANCEL_MINUTES`
- 支付回调验签：`PAY_WEBHOOK_SECRET_ALIPAY`、`PAY_WEBHOOK_SECRET_WECHAT`、`PAY_WEBHOOK_SECRET_MANUAL`

---

## 1. 项目定位
`Server-Psuh-Platform` 面向 IDC 二手服务器交易的担保型平台，目标解决：
- 配置与到期信息不透明
- 账号找回、虚假机器、黑历史风险
- 直接转账缺乏保障、售后困难

平台采用 **中介担保交易模式**：
1) 卖家提交机器信息并上架  
2) 买家付款到平台托管  
3) 卖家交付账号或控制权  
4) 买家验机确认  
5) 平台结算放款给卖家

---

## 2. 核心业务模式
- 担保交易：支付托管 → 交付 → 验机 → 放款
- 寄售模式：账号先托管平台，审核后直接上架，平台统一交付
- 求购模式（规划）：买家发布需求，卖家匹配资源

---

## 3. 平台角色
- 游客：浏览、搜索、查看公告与规则
- 买家：收藏、下单、支付、验机、售后/纠纷
- 卖家：发布/编辑商品、交付、提现、查看收益
- 管理员/中介：审核商品、处理订单、核验、冻结/放款、纠纷仲裁、风控

---

## 4. 核心功能规划
### 用户端
- 账号系统：邮箱注册/登录、找回、邮箱验证、可选二步验证、实名认证
- 首页：平台介绍、最新/热门、交易流程、担保说明、公告、FAQ
- 商品列表：多维筛选（类型、地区/线路、供应商、CPU/内存/硬盘/带宽/流量/IP/防御、价格、溢价/议价、到期、交付方式、改绑能力等）、排序（最新/价格/到期/热度）
- 商品详情：基础信息、配置、交易信息、交付信息、风险信息、截图凭证、补充说明
- 买家功能：下单支付、订单列表、验机确认、退款/申诉、评价

### 卖家端
- 发布/管理商品：待审/上架/下架/交易中/已售/已取消
- 订单处理：交付记录、状态跟进
- 资金管理：余额/冻结/可提现、提现申请与记录

### 中介担保系统
- 订单流转：待支付 → 已支付待交付 → 核验中 → 买家验机中 → 已完成 → 放款；支路：退款中、纠纷中、已关闭
- 平台核验：账号密码、配置一致性、到期/续费、欠费/风控/限制、封禁或黑历史
- 放款逻辑：确认后放款、超时自动确认、纠纷冻结、扣除服务费后结算

### 风控系统
- 用户风控：新用户限额、异地登录提醒、大额订单人工审核、提现审核、黑名单
- 商品风控：低价/高溢价/到期临近提醒、高风险交付方式、重复发布、历史投诉
- 纠纷处理：买家申诉、卖家证据、平台仲裁，支持部分/全额退款或驳回

### 财务系统
- 支付：余额、支付宝/微信（规划）、USDT（可选）、人工收款（可选）
- 结算：固定/比例/阶梯费率，手续费承担方配置
- 提现：申请、审核、手续费、最低提现额、记录

### 后台管理
- 用户管理：认证、封禁/解封、黑名单
- 商品管理：审核、上下架、编辑、推荐、风险标记、举报处理
- 订单管理：担保订单、退款、纠纷、放款记录、服务费统计
- 财务管理：收款/退款/提现/余额变动/冻结资金、收入统计
- 运营管理：分类/标签、公告、帮助中心、Banner、首页推荐
- 日志审计：用户操作、订单操作、资金操作

---

## 5. 一期开发范围（MVP）
- 必做：注册/登录、商品发布与审核、商品列表/详情、下单与担保流程、验机确认、放款、后台用户/商品/订单管理、举报/纠纷处理、财务记录、通知系统
- 暂缓到二期：议价、求购、寄售、卖家信用等级、自动风控规则引擎、深度第三方支付对接、智能推荐

---

## 6. 推荐技术方案
- 前端：Next.js + TypeScript（可配 Tailwind、Zod/React Hook Form、Zustand/Redux）
- 后端：NestJS + Prisma/TypeORM，JWT + RBAC，Redis（缓存/验证码/限流）
- 数据库：PostgreSQL（或 MySQL）
- 存储：本地 / OSS / S3
- 任务：Cron/队列（自动确认、超时取消、提醒、放款、提现）
- 监控与日志：操作审计、异常监控、性能指标

---

## 7. 目录建议（当前已采用 Monorepo）
```bash
Server-Psuh-Platform/
├── apps/
│   ├── api/    # 后端服务（NestJS）
│   └── web/    # 前台站点（Next.js）
├── packages/
│   └── shared/ # DTO 与通用类型
├── docs/       # 架构与接口文档
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 8. 当前进度
- 完成 Monorepo 脚手架（api/web/shared）、全局 TypeScript/ESLint、turbo pipeline。
- 提供 ERD/状态机/接口草案（`docs/architecture.md`）。
- 已生成 pnpm-lock，安装脚本可直接启动开发。

后续优先事项：
1) 固化数据库 schema（Prisma/TypeORM）与迁移脚本  
2) 补齐 API 模块：auth/user/product/order/wallet/notice + Swagger/OpenAPI  
3) 前端对齐接口契约，完善页面与 BFF 调用  
4) 配置 CI（lint+build）、环境区分与部署脚本  
