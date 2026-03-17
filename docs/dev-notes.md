# 开发日志 / Development Notes

> 更新频率：每次开发后追加，便于下一次快速接力。

## 2026-03-18
- 全量需求收尾（P0/P1 延伸项）完成：订单取消与管理员强制完成、用户资料更新与改密、MFA（TOTP）启用/停用/登录校验、收藏/浏览历史/价格提醒、通知模板管理、管理员操作审计日志、任务巡检增强（价格提醒）。
- 数据层扩展并落库：`User` 新增 `nickname/avatar/mfaSecret`，新增 `AdminLog`、`NoticeTemplate`、`Favorite`、`BrowsingHistory`、`PriceAlert` 模型；补充迁移目录：
   - `apps/api/prisma/migrations/20260317152945_add_admin_log_favorites_mfa`
   - `apps/api/prisma/migrations/20260317153623_add_user_profile_fields`
   - `apps/api/prisma/migrations/20260317160000_add_browsing_history_unique`
- 后端能力补齐：
   - 订单：新增买家取消接口与管理员强制完成接口。
   - 认证：新增改密、MFA 设置/启用/停用/二次校验，统一 TOTP 调用适配当前 `otplib` 版本。
   - 用户交互：新增收藏、浏览历史、价格提醒服务与控制器。
   - 通知：新增模板 CRUD、邮件服务、Telegram 服务。
   - 管理端：新增操作审计服务/拦截器/查询接口，修复审计字段与 Prisma 模型对齐（`resource/resourceId`）。
   - 基础设施：接入全局限流（`@nestjs/throttler`）。
- 前端页面与交互补齐：新增 `404`、个人资料页、安全中心页、收藏页、管理员审计日志页、卖家入口重定向；增强商品筛选分页、商品详情图集与收藏、订单时间线与取消、卖家商品编辑。
- 容器化交付：新增 API/Web Dockerfile、根目录 `docker-compose.yml`（MySQL + Redis + API + Web）以及 `.dockerignore`。
- 单元测试补齐：新增并通过 `OrderService`、`AuthService`、`WalletService`、`UserInteractionService` 测试。
- 构建与测试回归：`pnpm --filter @idc/api build`、`pnpm --filter @idc/web build`、`pnpm --filter @idc/api test -- --passWithNoTests` 通过。
- 支付与对账（阶段一）落地：新增支付对账模型与服务（`ReconcileTask`/`ReconcileItem`、`ReconciliationService`）、支付宝/微信网关抽象、管理员对账接口 `POST /admin/payments/reconcile/run`、`GET /admin/payments/reconcile/tasks`、`GET /admin/payments/reconcile/tasks/:taskId/items`。
- 风控引擎（MVP）落地：新增 `RiskRule`、`RiskHit`、`RiskEntityList` 数据模型与 `RiskService` 规则执行器（黑名单优先 + 条件表达式匹配 + 命中日志）；支付回调与提现流程已接入风控判定。
- 任务调度增强：`TaskService` 新增每日 1 点支付对账任务（T+1），自动执行 ALIPAY/WECHAT 对账并记录差异数量。
- 可观测性增强：新增 `GET /ready`、`GET /metrics` 健康与运行指标接口；请求日志改为结构化 JSON，并注入 `requestId` 便于链路追踪。
- 数据迁移新增：`apps/api/prisma/migrations/20260318103000_reconcile_risk_payment_ops/migration.sql`（支付字段增强 + 对账/风控新表 + 索引）。
- 测试扩面：新增 `risk.service.spec.ts` 与 `reconciliation.service.spec.ts`；API 测试总计 `7 suites / 49 tests` 全通过。
- 管理端风控 API 补齐：新增 `AdminRiskController`，支持规则列表/新增/更新（启停）、命中记录查询、黑白名单列表与维护（upsert/update）。
- 管理端对账闭环增强：新增差异项状态更新接口 `PATCH /admin/payments/reconcile/items/:itemId`（OPEN -> RESOLVED/IGNORED）。
- 前端管理页新增：`/admin/reconcile`（手动执行对账、查看任务、处理差异）与 `/admin/risk`（新增阈值规则、名单维护、查看命中）；顶部导航补充“支付对账”“风控策略”入口。
- 回归验证：`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test -- --passWithNoTests`、`pnpm --filter @idc/web build` 通过（web 构建阶段本地 API 未启动时会出现 `fetch failed` 预渲染提示，不影响产物生成）。

## 2026-03-17
- 内容运营模块（后端）上线：新增 `ContentModule`，提供公开接口 `GET /content/home|banners|faqs|help|tags`，以及管理员接口 `GET/POST/PATCH/DELETE /admin/content/*`（Banner/FAQ/帮助文档/标签）。
- Prisma 数据层新增 `Banner`、`Faq`、`HelpArticle`、`MarketTag` 四张表，补充迁移脚本 `apps/api/prisma/migrations/20260317102000_content_ops/migration.sql`，并完成 Prisma Client 重新生成。
- 前端首页改造：`apps/web/app/page.tsx` 从占位信息切换为内容接口驱动，支持 Banner 区、热门标签区、FAQ 区，并连接商品浏览与发布入口。
- 前端新增帮助中心页 `apps/web/app/help/page.tsx`，后台新增内容运营页 `apps/web/app/admin/content/page.tsx`，用于配置 Banner/FAQ/帮助文档。
- 导航补充“帮助中心”“内容运营”入口，`pnpm --filter @idc/api build` 与 `pnpm --filter @idc/web build` 通过（前端构建时 API 未启动会出现 `fetch failed` 预渲染提示，不影响产物生成）。

## 2026-03-14
- 引入 Prisma 数据模型（`apps/api/prisma/schema.prisma`），覆盖用户/钱包/商品/订单/支付/交付/验机/结算/退款/纠纷/通知核心实体与枚举。
- 为 API 应用添加 Prisma 支撑：`PrismaModule`、`PrismaService`；`AppModule` 引入 `ConfigModule` 与 `PrismaModule`；Prisma Client 生成路径基于 API 层。
- 新增产品列表/详情模块：`ProductModule` + `ProductService` + `ProductController`，支持分页、关键词、分类、地区、价格过滤；默认只返回上架商品。
- 接入 Swagger：`/api/docs` 暴露接口文档（DocumentBuilder）。
- 公共 DTO：分页 `PaginationDto`。
- 用户与认证基础：`AuthModule`（注册/登录，bcrypt+JWT），`JwtStrategy` + `JwtAuthGuard`，`CurrentUser` 装饰器；`UserModule` 提供 `GET /user/me`。
- API 包脚本：`prisma:generate/migrate/studio`；依赖新增 `@prisma/client`、`prisma`、`@nestjs/config`、`@nestjs/jwt`、`@nestjs/passport`、`passport`、`passport-jwt`、`bcryptjs`。
- 调整 `.gitignore`，忽略 `.env` 但保留 `pnpm-lock.yaml`。
- 依赖已安装（pnpm workspace）。
- 订单基础闭环（最小版）：`OrderModule` 支持创建订单、买家支付、卖家交付、买家确认收货、按角色查看订单列表；记录日志与结算占位。Swagger 已含 BearerAuth。

### 当天操作时间线（UTC+8）
- 15:10 引入角色守卫与装饰器（`RolesGuard`/`Roles`）以支撑管理员接口。
- 15:18 新增钱包模块：`WalletModule`（余额、流水查询，开发期充值），放款逻辑封装 `releaseSettlement`，写入钱包与流水。
- 15:26 扩展订单模块引入管理员放款接口：`PATCH /admin/settlements/:orderId/release`（需 ADMIN 角色），订单模块依赖钱包模块。
- 15:32 更新 Swagger（BearerAuth），保持 Prisma Client 生成。
- 00:48 引入定时任务 `TaskModule`（关闭未支付、验机超时自动确认、待结算自动放款），依赖 `@nestjs/schedule`。
- 00:48 新增支付回调占位 `PaymentModule`（`POST /webhook/payment/:channel`），后续补验签与支付推进。
- 00:49 管理端商品审核接口：`GET /admin/products/pending`，`PATCH /admin/products/:id/audit`（ADMIN）。
- 00:51 补充退款/纠纷入口：`POST /orders/:id/refund`、`PATCH /admin/orders/:id/refund`，`POST /orders/:id/dispute`；订单服务增加自动取消/自动确认/自动放款配置化，支付回调服务落地占位逻辑。
- 00:53 托管资金闭环：余额支付会冻结买家余额（ESCROW_FREEZE），放款时解冻买家并转入卖家，退款时解冻并退回买家；新增钱包流水记录。环境变量补充托管超时配置。
- 00:54 支付回调验签占位：`PaymentWebhookService` 使用 channel 对应 secret（env）做 HMAC 校验后，调用 `markPaidFromWebhook` 推进订单支付状态；新增 `markPaidFromWebhook`（不校验 buyerId）。
- 00:56 商品卖家侧：新增创建/更新/提交审核/上架下架接口（需登录）；产品审核记录管理员 ID；新增支付回调 secret 配置。
- 00:56 README 增补关键环境变量列表；API package.json 补充 test 脚本占位。
- 00:58 纠纷/退款管理：增加证据提交、纠纷详情、管理员查询退款/纠纷列表；审核拒绝需填写原因；Prisma 生成校验。
- 01:00 商品风险标签：商品支持 `riskTags` 数组；卖家创建/更新可提交风险标签；管理员可查询指定商品审核记录。
- 01:01 权限收紧：商品卖家接口与订单创建/支付/交付/确认接口使用角色守卫（SELLER/BUYER）。
- 01:02 商品资料完善：卖家可上传/删除商品图片（type+url），风险标签写入；Prisma 生成校验通过。
- 01:04 纠纷仲裁与时间线：管理员可裁决纠纷（RESOLVED/REJECTED）、查询退款/纠纷列表；订单时间线 `GET /orders/:id/timeline`；纠纷证据上传接口完善。
- 01:05 全局请求日志：新增 LoggingInterceptor，输出 method/path/耗时；挂载为全局拦截器。
- 01:07 订单日志补充：退款通过、纠纷裁决写入 Logger；Prisma 生成校验通过。
- 01:08 引入 Jest 基础：新增 jest.config.ts、示例测试，`pnpm --filter @idc/api test` 通过。
- 01:09 支付模块占位：`PaymentService` 支持买家发起非余额支付（记录待回调），`POST /webhook/payment/initiate/:orderId`；支付模块纳入服务层。测试再次通过。
- 01:09 CI：新增 GitHub Actions 工作流 `.github/workflows/ci.yml`（pnpm install -> lint -> @idc/api test）。
- 01:11 纠纷仲裁落地：管理员裁决带 action（REFUND/RELEASE），自动执行退款或放款并更新订单状态；测试回归通过。
- 01:12 支付回调防重放：Webhook 验签增加时间戳校验（env `PAY_WEBHOOK_MAX_SKEW`，默认 300 秒），签名包含 ts；无效时间戳或签名直接拒绝。
- 01:16 支付回调 DTO 化：Webhook 接口使用 `PaymentWebhookDto`（orderId/channel/amount/ts/sign/payload），保持 HMAC 验签与时间戳校验，测试通过。
- 01:17 支付安全强化：Webhook 验签数据按 key 排序后 HMAC；校验金额>0；`markPaidFromWebhook` 接收回调金额写入 payment；测试回归通过。
- 01:19 支付占位收尾：非余额支付发起走 PaymentService 记录待回调；回调金额校验与写入维持；回归测试通过。
- 01:21 前端骨架：Next.js 增产品列表/详情页、顶部导航；封装 `lib/api` 调用后端 `/products`；样式补充卡片/标签/导航。
- 01:22 示例数据：新增 Prisma seed 脚本（demo 卖家+3 个商品），命令 `pnpm --filter @idc/api prisma:seed`（需配置 DATABASE_URL）。
- 01:25 前端认证表单：新增登录/注册页（保存 token 到 localStorage），表单样式完善，回归测试通过。
- 01:41 修复 TaskModule/Admin 依赖导出，OrderModule 导出 OrderService；处理端口占用，dev 服务正常启动（API:4000，Web:3005）。
- 01:44 支付模块完善：支付意图/签名/回调（ALIPAY、WECHAT、MANUAL、BALANCE）、新增 `/payments/:orderId` 状态查询与 `/payments/:orderId/mock-success` 本地模拟，Webhook DTO 支持 tradeNo/payload。
- 01:47 前端商品详情加入担保下单 & 支付组件，可创建订单、发起支付、展示 webhook payload 并一键模拟成功；补充按钮/状态样式。
- 01:49 `.env.example` 切换 MySQL & 端口 4000，新增 PAY_WEBHOOK_BASE/PAY_ENTRY_BASE 示例，确保本地 dev 与 MySQL socket 配置一致。
- 17:02 买家订单中心 `/orders` 页面：列表查看、余额支付、确认收货入口；导航新增“订单”入口与通用副按钮样式。
- 17:08 认证安全闭环（P0-1）数据层：`schema.prisma` 新增 `AuthCode`（邮箱验证码）、`UserLoginLog`（登录日志），`User` 新增 `emailVerifiedAt`、`lastLoginIp` 字段；迁移 `20260314091002_auth_security` 已生成并应用。
- 17:11 认证模块接口增强：新增 `POST /auth/password/forgot`、`POST /auth/password/reset`、`POST /auth/email/send-verify-code`、`POST /auth/email/verify`、`GET /auth/security/logs`；登录成功/失败写入 `UserLoginLog`，异地 IP 登录写入安全提醒通知（Notice）。
- 17:13 前端认证页面补齐：新增 `/auth/forgot`、`/auth/verify-email` 页面；登录/注册页增加快捷入口，统一前端默认 API 地址为 `http://localhost:4000/api/v1`。
- 17:14 回归验证：`pnpm --filter @idc/api test` 通过；`pnpm --filter @idc/web build` 通过（无 lint/type 报错）。
- 17:16 接口联调自测：通过 `curl` 完成注册→邮箱验证→忘记密码→重置密码→登录→安全日志查询全链路，返回结果符合预期（开发环境回传 `devCode`）。
- 17:18 P0-2 数据层扩展：新增 `SellerApplication`（卖家认证申请）模型与状态枚举，迁移 `20260314091801_kyc_seller_verification` 已应用。
- 17:20 用户侧认证接口：新增 `POST /user/kyc`、`GET /user/kyc`、`POST /user/seller-application`、`GET /user/seller-application`；卖家申请强制要求实名认证通过。
- 17:21 管理员审核接口：新增 `GET /admin/users/kyc`、`PATCH /admin/users/:userId/kyc`、`GET /admin/users/seller-applications`、`PATCH /admin/users/:userId/seller-application`；审核通过自动将用户角色切换为 `SELLER` 并初始化 `SellerProfile`。
- 17:22 前端新增认证中心页 `/profile/verify`，整合实名认证提交与卖家申请提交流程；顶部导航新增“认证中心”入口。
- 17:23 安全修复：注册角色限制为 `BUYER/SELLER`（禁止前端传入 `ADMIN`），后端注册逻辑也做白名单兜底。
- 17:23 联调验证（4001 端口临时实例）：用户提交 KYC -> 管理员审核通过 -> 用户提交卖家申请 -> 管理员审核通过 -> 用户再次登录角色变为 `SELLER`。
- 17:25 P0-3 平台核验流程：新增管理员订单管理接口 `GET /admin/orders`、`PATCH /admin/orders/:id/verify`，支持按状态筛选订单并执行核验（PASS/FAIL/NEED_MORE）。
- 17:25 状态机调整：卖家交付后默认进入 `VERIFYING`（可通过 `ORDER_REQUIRE_PLATFORM_VERIFY=false` 关闭）；管理员核验 `PASS -> BUYER_CHECKING`、`FAIL -> PAID_WAITING_DELIVERY`、`NEED_MORE -> VERIFYING`，并新增 `VERIFY` 订单日志。
- 17:26 前端订单状态展示补充 `VERIFYING`（平台核验中）。
- 17:26 联调验证（4001 端口临时实例）：买家下单支付 -> 卖家交付 -> 订单进入 `VERIFYING` -> 管理员核验 `PASS` -> 买家订单状态变为 `BUYER_CHECKING`。
- 17:31 P0-4 提现闭环（后端）：`WalletService` 新增卖家提现申请、用户提现记录查询、管理员提现列表/审核能力；状态流转为 `pending -> approved -> paid / rejected`，审核驳回自动解冻退回，打款完成自动扣减冻结金额并写入 `WITHDRAW/FEE/ADJUST` 流水与站内通知。
- 17:32 新增提现接口：用户侧 `POST /wallet/withdrawals`、`GET /wallet/withdrawals`；管理侧 `GET /admin/withdrawals`、`PATCH /admin/withdrawals/:id/review`；新增 DTO `QueryWithdrawDto`、`ReviewWithdrawDto`，提现申请字段做数值与长度校验。
- 17:34 前端新增钱包中心 `/wallet`（余额、冻结、测试充值、卖家提现申请、提现记录、流水）与管理员提现审核页 `/admin/withdrawals`（筛选、通过/驳回/打款）；顶部导航新增“钱包”“提现审核”。
- 17:35 配置补充：`.env.example` 新增提现参数 `WITHDRAW_MIN_AMOUNT`、`WITHDRAW_FEE_RATE`、`WITHDRAW_MIN_FEE`，并统一 `NEXT_PUBLIC_API_BASE` 默认示例到 `http://localhost:4000/api/v1`。
- 17:38 回归验证：`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test`、`pnpm --filter @idc/web build` 全部通过（前端静态构建阶段因本地未启动 API 出现 `fetch failed` 提示，但构建产物成功生成）。
- 17:39 前端 `apps/web/lib/api.ts` 默认 API 地址回退值修正为 `http://localhost:4000/api/v1`，避免未配置环境变量时错误回退到 3000 端口。
- 17:41 P0-5 通知中心（后端）上线：新增 `NoticeModule`、`NoticeService`、`NoticeController`，提供用户通知列表、未读计数、单条已读、全部已读接口（站内通知以 `Notice.status` 映射未读/已读）。
- 17:42 管理端通知能力：新增 `AdminNoticeController`，支持 `GET /admin/notices` 通知列表查询与 `POST /admin/notices` 发送通知（支持单用户发送与全站广播给 ACTIVE 用户）。
- 17:43 前端通知页面：新增用户通知页 `/notices`（状态筛选、未读计数、单条已读、全部已读）与管理员通知页 `/admin/notices`（发送通知、查看记录）；导航新增“通知”“通知管理”入口。
- 17:45 回归验证：`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test`、`pnpm --filter @idc/web build` 通过；前端构建期间仍会出现 `fetch failed`（本地未启动 API 的静态预渲染读取失败提示），但不影响构建完成。
- 17:47 P0-6 商品工作台（后端）：商品模块新增卖家商品列表接口 `GET /products/mine`，支持按状态分页查询并返回最新审核记录（用于卖家管理台）。
- 17:48 P0-6 商品工作台（前端）：新增卖家商品页 `/seller/products`（创建商品、筛选列表、提交审核、上/下架）与管理员审核页 `/admin/products`（待审列表、通过/驳回、审核备注）；导航新增“卖家商品”“商品审核”入口。
- 17:49 回归验证：`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test`、`pnpm --filter @idc/web build` 通过；静态构建阶段存在 `fetch failed` 提示（构建时本地 API 未启动），不影响页面产物生成。
- 17:51 P0-7 售后仲裁工作台（前端-管理端）：新增退款审核页 `/admin/refunds`（调用 `GET /admin/refunds` + `PATCH /admin/orders/:id/refund`）与纠纷仲裁页 `/admin/disputes`（调用 `GET /admin/disputes` + `PATCH /admin/disputes/:id/decision`）；导航新增“退款审核”“纠纷仲裁”。
- 17:53 P0-7 售后仲裁工作台（前端-用户端）：增强 `/orders` 页面，补充“申请退款”“发起纠纷”“补充证据”“查看时间线/纠纷详情”能力，对接 `orders/:id/refund`、`orders/:id/dispute`、`orders/:id/dispute/evidence`、`orders/:id/timeline`、`orders/:id/dispute`。
- 17:54 回归验证：`pnpm --filter @idc/web build`、`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test` 通过；前端构建中的 `fetch failed` 仍是静态构建时 API 未启动导致的提示，不影响产物生成。
- 17:55 P0-8 订单履约工作台（后端）：`OrderService.listMine` 增补买家/卖家信息与最近交付、最近核验记录，满足卖家交付页和运营排障所需上下文。
- 17:56 P0-8 订单履约工作台（前端）：新增卖家订单页 `/seller/orders`（卖家订单列表 + 交付信息提交）与管理员核验页 `/admin/orders`（订单筛选 + PASS/FAIL/NEED_MORE 核验）；导航新增“卖家订单”“订单核验”入口。
- 17:57 回归验证：`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test`、`pnpm --filter @idc/web build` 通过；前端构建阶段 `fetch failed` 仍为本地 API 未启动的静态预渲染提示，不影响构建成功。
- 17:59 P0-9 结算放款看板（后端）：新增结算查询能力，管理员端 `GET /admin/settlements`（支持状态/卖家/订单筛选），卖家端 `GET /wallet/settlements`（带累计金额/手续费统计）；保留 `PATCH /admin/settlements/:orderId/release` 手动放款能力。
- 18:00 P0-9 结算放款看板（前端）：新增管理员结算页 `/admin/settlements`（待放款筛选 + 一键放款）与卖家结算页 `/seller/settlements`（累计收益统计 + 结算明细）；导航新增“卖家结算”“结算放款”入口。
- 18:01 回归验证：`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test`、`pnpm --filter @idc/web build` 通过；前端构建阶段 `fetch failed` 仍为本地 API 未启动导致的预渲染提示，不影响产物生成。
- 18:03 P0-10 用户风控管理（后端）：新增管理员用户管理接口 `GET /admin/users`（支持 role/status/关键词筛选，附带 KYC、卖家申请、钱包信息）与 `PATCH /admin/users/:userId/status`（ACTIVE/BANNED）；封禁/恢复会写入站内通知，且禁止封禁管理员账号。
- 18:04 P0-10 用户风控管理（前端）：新增管理页 `/admin/users`，支持角色/状态/关键词筛选、查看用户核心风控信息（邮箱验证、最近登录、KYC、钱包）并执行封禁/恢复；导航新增“用户管理”入口。
- 18:05 回归验证：`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test`、`pnpm --filter @idc/web build` 通过；前端构建阶段 `fetch failed` 仍是本地 API 未启动时的静态预渲染提示，不影响构建结果。
- 18:08 P0-11 运营数据看板（后端）：新增管理员看板接口 `GET /admin/dashboard/overview`，统计用户规模、商品/订单状态分布、交易额、待放款/待提现金额、风险积压（退款/纠纷/KYC/卖家认证/登录失败）及最近订单列表。
- 18:09 P0-11 卖家经营看板（后端）：新增卖家看板接口 `GET /seller/dashboard/overview`，统计卖家商品/订单状态、近周期成交额、结算待放款与已放款、钱包余额、提现状态分布、最近订单与最近结算。
- 18:10 P0-11 看板页面（前端）：新增 `/admin/dashboard` 与 `/seller/dashboard` 页面，支持 7/30/90 天区间切换并展示核心 KPI；导航新增“运营看板”“卖家看板”入口。
- 18:12 回归验证：`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test`、`pnpm --filter @idc/web build` 通过；前端构建阶段 `fetch failed` 仍为本地 API 未启动导致的静态预渲染提示，不影响构建成功。
- 18:14 P0-12 卖家信用体系（后端）：新增 `refreshSellerProfileMetrics` 指标计算（成交单量、交付平均时长、纠纷率、好评率、等级），并在 `releaseSettlement` 与 `resolveDispute` 后自动刷新卖家信用画像。
- 18:15 P0-12 卖家信用体系（后端接口数据增强）：商品列表/详情接口补充卖家信息与 `sellerProfile` 指标；新增用户侧 `GET /user/seller-profile` 查询当前账号信用档案。
- 18:16 P0-12 卖家信用体系（前端）：商品列表与商品详情新增卖家信誉展示（等级、成交、交付时效、纠纷率、好评率）；卖家看板增加“卖家信誉画像”卡片。
- 18:17 回归验证：`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test`、`pnpm --filter @idc/web build` 通过；前端构建阶段 `fetch failed` 仍是本地 API 未启动导致的预渲染提示，不影响构建结果。
- 18:28 账号角色收敛（USER/ADMIN）修复：修正 `apps/api/src/admin/user-management.controller.ts` Prisma 查询类型，显式使用 `UserRole` 与 `Prisma.UserWhereInput`，解决 API 构建报错。
- 18:31 接口返回角色统一：`admin/user-review`、`wallet/listWithdrawalsForAdmin`、`notice/listForAdmin` 增加角色映射，所有返回角色统一输出为 `USER` / `ADMIN`。
- 18:33 文案统一：`apps/api/src/user/user.controller.ts` 与 `apps/api/src/admin/user-review.controller.ts` 将“卖家认证”文案改为“交易资质”，避免账号角色歧义；前端 `admin/dashboard`、`admin/users` 同步改文案。
- 18:35 示例账号收敛：`apps/api/prisma/seed.ts` 改为初始化 `user@example.com`（普通用户）与 `admin@example.com`（管理员），并生成可登录密码（默认 `12345678`，可用 `SEED_DEMO_PASSWORD` 覆盖）。
- 18:36 回归验证：`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test`、`pnpm --filter @idc/web build` 全部通过。
- 18:37 Seed 幂等修复：将 `prisma/seed.ts` 从 `deleteMany + random code` 调整为“固定商品编码 + upsert”，避免历史订单外键导致的种子执行失败。
- 18:38 联调验证：执行 `pnpm --filter @idc/api prisma:seed` 成功；通过 `/auth/login` 验证 `user@example.com` 与 `admin@example.com` 均可登录且返回角色分别为 `USER`/`ADMIN`；本地页面 `http://localhost:3000` 与 API `http://localhost:4000/api/v1/products` 可访问。
- 18:47 前端 UI 故障排查：定位到 `next dev` 进程异常导致 `/_next/static/css/app/layout.css` 返回 404（样式未加载）；重启 Web 开发服务后样式文件恢复 200，页面 UI 恢复正常。
- 19:01 全量模拟数据填充：重构 `apps/api/prisma/seed.ts`，覆盖用户/实名认证/交易资质/钱包/商品（草稿+待审+上架+下架）/订单全状态/支付/交付/核验/结算/退款/纠纷/提现/通知/验证码/登录日志；执行 `pnpm --filter @idc/api prisma:seed` 成功，并校验 demo 订单 9 个状态齐全。
- 21:32 前端权限模块补齐：新增 `AuthGuard` 与分区布局守卫（`app/admin|seller|orders|wallet|notices|profile/layout.tsx`），实现登录态拦截与管理员页面权限校验，未登录自动跳转登录页并携带 redirect。
- 21:36 导航与登录体验优化：新增 `components/top-nav.tsx`，按当前登录角色动态展示导航（游客/用户/管理员），支持一键退出；登录/注册页支持 redirect 回跳。
- 21:41 回归验证：`pnpm --filter @idc/web build`、`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test` 通过（Web 构建阶段仍可能出现本地 API 未启动导致的 `fetch failed` 提示，不影响构建产物）。
- 21:45 支付监控模块（后端）：新增 `GET /admin/payments`，支持按 `payStatus/channel/orderId/tradeNo/userId` 筛选支付记录，返回支付单 + 订单买卖双方 + 商品信息，用于运营与财务排查。
- 21:46 支付监控模块（前端）：新增管理页 `apps/web/app/admin/payments/page.tsx`，支持支付状态/渠道/订单号/交易号/用户ID筛选；导航新增“支付监控”入口。
- 21:47 买家订单支付体验增强：升级 `apps/web/app/orders/page.tsx`，待支付订单支持多渠道发起支付（BALANCE/ALIPAY/WECHAT/MANUAL）、支付状态刷新、模拟支付成功；新增支付意图与回执展示卡片（含 webhook payload）。
- 21:47 联调验证：启动 API 后通过 `curl` 验证 `/admin/payments` 返回正确；`pnpm --filter @idc/api build`、`pnpm --filter @idc/api test`、`pnpm --filter @idc/web build` 通过。
- 21:51 支付风控补强（后端）：`PaymentWebhookService` 新增渠道一致性校验（URL channel 与 body channel 必须一致）与回调金额校验（按支付单金额/订单应付金额核对），防止错误回调推进支付状态。
- 21:52 支付排查闭环（后端+前端）：新增 `PATCH /admin/payments/:orderId/review`，管理员可写入 `NORMAL/SUSPICIOUS/FRAUD` 标记与备注（存入 `notifyPayload.adminReview` 并写 `PAYMENT_REVIEW` 订单日志）；管理端支付监控页新增“排查标记+备注+保存”操作。

### 使用提示
1) 复制 `.env.example` 为 `.env`，填好 `DATABASE_URL` 与 `REDIS_URL` 等。
2) 生成客户端并创建本地表（MySQL）：  
   - `cd /Users/mac/Documents/vps`  
   - `pnpm --filter @idc/api prisma:generate`  
   - `pnpm --filter @idc/api prisma:migrate -- --name init`  
3) 启动服务：`pnpm dev`（默认 API 端口 4000；前端从 3000 起自动寻找可用端口）。

### 下一步建议
- 基于 schema 落地 Prisma migration（上一步命令）。
- 按领域拆分模块（auth/user/product/order/wallet/notice），生成 DTO 与 Swagger。
- 前端对齐 DTO，补充列表/详情/下单流程页。
- 接入支付回调占位与任务调度（自动确认/提醒/放款）。 
