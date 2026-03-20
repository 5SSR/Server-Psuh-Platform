# IDC 服务器担保交易平台

面向 VPS / 独服 / NAT / 云服务器二手交易的担保平台，目标是把“私聊转账交易”升级为可审计、可追溯、可仲裁的标准化闭环。

核心流程：`发布 -> 审核 -> 下单 -> 支付托管 -> 卖家交付 -> 平台核验 -> 买家确认 -> 结算/售后`

## 1. 当前能力概览

### 前台交易端
- 首页、交易市场、商品详情、求购市场、议价中心
- 担保流程页、帮助中心、公告中心
- 游客可浏览主要市场与公告内容

### 用户与买家侧
- 注册、登录、找回密码、邮箱验证
- 订单中心、站内通知、钱包流水
- 个人中心与工单入口

### 卖家侧
- 卖家看板
- 商品发布/管理
- 卖家订单处理
- 店铺配置
- Open API Key 管理

### 管理后台
- 运营总览看板
- 商品审核、订单核验、支付监控
- 风控审核、退款审核、财务报表
- 内容运营、用户管理
- 审计日志与规则配置（按模块页）

## 2. 技术栈

- 前端：`Next.js 15` + `React 18` + `TypeScript`
- 后端：`NestJS` + `Prisma`
- 数据层：`MySQL` + `Redis`
- 工程化：`pnpm workspace` + `turbo`

## 3. 本地快速启动

### 环境要求
- Node.js `20.x`
- pnpm `9.x`
- MySQL `8.x`
- Redis `7.x`

### 安装与初始化
```bash
pnpm install
cp .env.example .env

pnpm --filter @idc/api prisma:generate
pnpm --filter @idc/api prisma:migrate -- --name init
# 可选：导入演示数据
pnpm --filter @idc/api prisma:seed
```

### 启动开发环境
```bash
pnpm dev
```

默认地址：
- Web：`http://localhost:3001`
- API：`http://localhost:4000/api/v1`
- Swagger：`http://localhost:4000/api/docs`

## 4. 演示账号（seed 后可用）

默认密码：`12345678`

- `admin@example.com`（管理员）
- `user@example.com`（普通用户）
- `buyer@example.com`（买家场景）
- `ops@example.com`（运维场景）
- `pending.user@example.com`（未验证场景）
- `rejected.user@example.com`（审核拒绝场景）
- `banned.user@example.com`（封禁场景）

## 5. 页面截图展示

> 截图目录：`docs/screenshots/`，以下图片均来自当前代码版本本地运行环境。

### 5.1 前台与游客可访问页面

#### 首页
![首页](docs/screenshots/home.png)

#### 交易市场
![交易市场](docs/screenshots/products.png)

#### 商品详情
![商品详情](docs/screenshots/product-detail.png)

#### 求购市场
![求购市场](docs/screenshots/wanted.png)

#### 求购详情
![求购详情](docs/screenshots/wanted-detail.png)

#### 议价中心
![议价中心](docs/screenshots/bargains.png)

#### 公告中心
![公告中心](docs/screenshots/announcements.png)

#### 担保流程
![担保流程](docs/screenshots/escrow.png)

#### 帮助中心
![帮助中心](docs/screenshots/help.png)

#### 登录页
![登录页](docs/screenshots/auth-login.png)

#### 注册页
![注册页](docs/screenshots/auth-register.png)

### 5.2 买家侧/个人中心

#### 订单中心
![订单中心](docs/screenshots/orders.png)

#### 钱包中心
![钱包中心](docs/screenshots/wallet.png)

#### 站内通知
![站内通知](docs/screenshots/notices.png)

#### 个人中心
![个人中心](docs/screenshots/profile.png)

#### 支持工单
![支持工单](docs/screenshots/profile-support.png)

### 5.3 卖家中心

#### 卖家看板
![卖家看板](docs/screenshots/seller-dashboard.png)

#### 卖家商品管理
![卖家商品管理](docs/screenshots/seller-products.png)

#### 卖家订单
![卖家订单](docs/screenshots/seller-orders.png)

#### 卖家店铺
![卖家店铺](docs/screenshots/seller-store.png)

#### 卖家 Open API
![卖家 Open API](docs/screenshots/seller-open-api.png)

### 5.4 管理后台

#### 运营看板
![后台运营看板](docs/screenshots/admin-dashboard.png)

#### 商品审核
![后台商品审核](docs/screenshots/admin-products.png)

#### 订单核验
![后台订单核验](docs/screenshots/admin-orders.png)

#### 支付监控
![后台支付监控](docs/screenshots/admin-payments.png)

#### 风控中心
![后台风控中心](docs/screenshots/admin-risk.png)

#### 财务报表
![后台财务报表](docs/screenshots/admin-finance.png)

#### 内容运营
![后台内容运营](docs/screenshots/admin-content.png)

#### 用户管理
![后台用户管理](docs/screenshots/admin-users.png)

#### 退款审核
![后台退款审核](docs/screenshots/admin-refunds.png)

## 6. 常用命令

```bash
# 全量构建
pnpm build

# 仅启动后端（开发）
pnpm --filter @idc/api dev

# 仅启动前端（开发）
pnpm --filter @idc/web dev

# 代码检查
pnpm lint
```

## 7. 项目结构

```text
apps/
  api/      # NestJS 后端
  web/      # Next.js 前端
packages/
  shared/   # 共享类型与 DTO
docs/
  screenshots/  # README 展示截图
```

## 8. 说明

- 当前仓库处于持续迭代状态，后台模块仍在细化交互与策略配置。
- 若你用于线上部署，建议结合 PM2 + Nginx 反向代理，并对支付/通知通道改为 `REMOTE` 真实模式。
