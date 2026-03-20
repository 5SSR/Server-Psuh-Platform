# IDC 二手服务器担保交易平台（Server-Psuh-Platform）

一个面向 **VPS / 独服 / NAT / 云服务器二手交易** 的担保平台项目，核心目标是跑通真实可运营的交易闭环：  
`发布 -> 审核 -> 下单 -> 支付托管 -> 交付 -> 核验 -> 确认 -> 结算/售后`

当前技术栈：`NestJS + Next.js + Prisma(MySQL) + Redis + pnpm + turbo`

## 当前版本特性（可用于发帖）

### 1) 前台交易端
- 首页、交易市场、担保流程、帮助中心、公告中心
- 商品列表与详情（配置参数、线路、地区、价格、状态标签）
- 求购市场（发布求购、卖家报价、买家处理）
- 议价中心（发起议价、还价、接受/拒绝、会话流转）
- 店铺页与卖家信息展示

### 2) 用户与安全
- 注册、登录、找回密码、邮箱验证
- 安全中心（修改密码、MFA）
- 个人中心（收藏、浏览历史、价格提醒）
- 认证与交易资质流程（KYC/资质提审与状态查询）

### 3) 交易与担保闭环
- 下单、支付发起、支付状态查询
- 卖家交付、平台核验、买家确认
- 订单时间线与状态流转
- 退款申请、纠纷申请、证据补充
- 结算放款与手续费策略（固定/比例/阶梯）

### 4) 钱包与资金
- 钱包总览（可用/冻结）
- 流水、充值、提现申请
- 卖家结算记录

### 5) 卖家中心
- 卖家看板（经营指标）
- 商品管理（发布/编辑/上下架/提交审核/图片）
- 卖家订单处理
- 寄售申请与状态跟踪
- Open API Key 管理与调用示例

### 6) 管理后台（控制台风格）
- `admin/dashboard` 运营总览
- `admin/products` 商品审核 + 运营池管理
- `admin/orders` 订单核验与处置
- `admin/payments` 支付监控/诊断/费率配置
- `admin/refunds` 退款审核
- `admin/disputes` 纠纷仲裁
- `admin/withdrawals` 提现审核
- `admin/users` 用户与资质管理
- `admin/notices` 通知与模板
- `admin/settlements` 结算放款
- `admin/risk` 风控规则、命中、名单同步
- `admin/reconcile` 对账任务与差异处理
- `admin/logs` 审计日志

---

## 本地开发（推荐）

### 1. 环境要求
- Node.js `20.x`
- pnpm `9.x`
- MySQL `8.x`
- Redis `7.x`

### 2. 安装与初始化
```bash
pnpm install
cp .env.example .env

# 生成 Prisma Client
pnpm --filter @idc/api prisma:generate

# 执行迁移（开发环境）
pnpm --filter @idc/api prisma:migrate -- --name init

# 可选：导入演示数据
pnpm --filter @idc/api prisma:seed
```

### 3. 启动项目
```bash
pnpm dev
```

默认地址：
- Web：`http://localhost:3001`
- API：`http://localhost:4000/api/v1`
- Swagger：`http://localhost:4000/api/docs`

---

## 宝塔 / Linux 临时部署（当前实战方案）

> 适用于你现在的部署方式（PM2 常驻进程）。

### 1. 准备环境
```bash
# 进入项目目录
cd /www/wwwroot/idc.qaqmax.xyz

# 启用 pnpm（若提示 pnpm 不存在）
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

### 2. 安装依赖 + 构建
```bash
pnpm install
pnpm --filter @idc/api prisma:generate
pnpm --filter @idc/api build
pnpm --filter @idc/web build
```

### 3. 数据库迁移与种子（按需）
```bash
pnpm --filter @idc/api prisma:migrate -- --name init
pnpm --filter @idc/api prisma:seed
```

### 4. PM2 启动
```bash
pm2 start "pnpm --filter @idc/api start" --name idc-api
pm2 start "pnpm --filter @idc/web start" --name idc-web

pm2 save
pm2 startup
```

### 5. 健康检查
```bash
curl http://127.0.0.1:4000/api/v1/health
curl -I http://127.0.0.1:3001
pm2 status
```

---

## 测试账号（seed 后可用）

默认密码：`12345678`  
可通过环境变量 `SEED_DEMO_PASSWORD` 覆盖。

- `admin@example.com`（管理员）
- `user@example.com`（普通用户）
- `buyer@example.com`（普通用户）
- `ops@example.com`（普通用户）
- `pending.user@example.com`（未验证场景）
- `rejected.user@example.com`（审核拒绝场景）
- `banned.user@example.com`（封禁场景）

---

## 常见问题排查

### 1) 登录提示 `Failed to fetch`
先看浏览器控制台是否有：
- `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`

这通常不是账号问题，而是 **前端请求的 API 域名 HTTPS 配置异常**（证书/TLS 协议错误）。

检查项：
1. `NEXT_PUBLIC_API_BASE` 是否配置为正确可访问地址  
2. 反向代理是否把 API 域名正确转发到 `127.0.0.1:4000`  
3. API 域名证书是否有效，TLS 协议是否开启正常  
4. `curl https://你的-api域名/api/v1/health` 是否可通

### 2) API 启动后健康检查失败
如果启动日志后手动按了 `Ctrl+C`，进程会退出，`curl` 自然失败。  
生产环境请用 PM2 常驻，不要前台直接跑。

### 3) `pnpm: command not found`
```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

---

## 关键环境变量

- 基础：`DATABASE_URL`、`REDIS_URL`
- 认证：`JWT_SECRET`、`JWT_EXPIRES`、`AUTH_CODE_SECRET`
- 交易：`ORDER_*`
- 提现：`WITHDRAW_*`
- 支付回调：`PAY_WEBHOOK_SECRET_*`、`PAY_WEBHOOK_MAX_SKEW`
- 前端：`NEXT_PUBLIC_API_BASE`

完整示例见：[`.env.example`](./.env.example)

---

## 项目结构

```bash
apps/
  api/    # NestJS 后端
  web/    # Next.js 前端
packages/
  shared/ # 共享类型与 DTO
docs/
  architecture.md
  dev-notes.md
```

---

## 效果截图

> 以下为当前项目页面示意（可继续替换为你最新截图）。

![首页](https://github.com/user-attachments/assets/f2133c04-4eb4-42bc-bd37-713196510f02)
![交易市场/详情](https://github.com/user-attachments/assets/c6eff1c8-6812-41d8-8e42-cb7d12449fc4)
![订单/流程](https://github.com/user-attachments/assets/b308e322-0dfc-499a-a118-108fd982d6ef)
![后台控制台](https://github.com/user-attachments/assets/8875030d-8199-45c2-a716-c87fd103aff3)

---

## 开发记录

- 详细开发日志见：[docs/dev-notes.md](./docs/dev-notes.md)
- 架构与模型见：[docs/architecture.md](./docs/architecture.md)
