# 开发日志 / Development Notes

> 更新频率：每次开发后追加，便于下一次快速接力。

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

### 使用提示
1) 复制 `.env.example` 为 `.env`，填好 `DATABASE_URL` 与 `REDIS_URL` 等。
2) 生成客户端并创建本地表（PostgreSQL）：  
   - `cd /Users/mac/Documents/vps`  
   - `pnpm --filter @idc/api prisma:generate`  
   - `pnpm --filter @idc/api prisma:migrate -- --name init`  
3) 启动服务：`pnpm dev`（默认 API 端口 3000，前端 3001 若后续配置）。

### 下一步建议
- 基于 schema 落地 Prisma migration（上一步命令）。
- 按领域拆分模块（auth/user/product/order/wallet/notice），生成 DTO 与 Swagger。
- 前端对齐 DTO，补充列表/详情/下单流程页。
- 接入支付回调占位与任务调度（自动确认/提醒/放款）。 
