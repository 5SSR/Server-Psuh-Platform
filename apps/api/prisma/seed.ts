import {
  ActorType,
  AuthCodeScene,
  DeliveryType,
  DisputeInitiator,
  DisputeStatus,
  NoticeChannel,
  NoticeStatus,
  OrderStatus,
  PayChannel,
  PayStatus,
  Prisma,
  PrismaClient,
  ProductAuditStatus,
  ProductCategory,
  ProductImageType,
  ProductStatus,
  RefundStatus,
  RiskLevel,
  SellerApplicationStatus,
  SettlementStatus,
  UserRole,
  UserStatus,
  VerifyResult,
  WalletLedgerType
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const daysAgo = (d: number) => new Date(Date.now() - d * DAY);
const daysFromNow = (d: number) => new Date(Date.now() + d * DAY);
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR);
const hoursFromNow = (h: number) => new Date(Date.now() + h * HOUR);
const decimal = (v: number | string) => new Prisma.Decimal(v);

function hashCode(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

async function main() {
  const demoPassword = process.env.SEED_DEMO_PASSWORD || '12345678';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const userSeeds = [
    {
      key: 'admin',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: daysAgo(120),
      lastLoginAt: hoursAgo(2),
      lastLoginIp: '127.0.0.1'
    },
    {
      key: 'user',
      email: 'user@example.com',
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: daysAgo(35),
      lastLoginAt: hoursAgo(1),
      lastLoginIp: '203.0.113.10'
    },
    {
      key: 'buyer',
      email: 'buyer@example.com',
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: daysAgo(22),
      lastLoginAt: hoursAgo(8),
      lastLoginIp: '198.51.100.23'
    },
    {
      key: 'ops',
      email: 'ops@example.com',
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: daysAgo(18),
      lastLoginAt: hoursAgo(3),
      lastLoginIp: '198.51.100.9'
    },
    {
      key: 'pending',
      email: 'pending.user@example.com',
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      lastLoginAt: hoursAgo(14),
      lastLoginIp: '198.51.100.66'
    },
    {
      key: 'rejected',
      email: 'rejected.user@example.com',
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: daysAgo(10),
      lastLoginAt: hoursAgo(28),
      lastLoginIp: '198.51.100.77'
    },
    {
      key: 'banned',
      email: 'banned.user@example.com',
      role: UserRole.BUYER,
      status: UserStatus.BANNED,
      emailVerifiedAt: daysAgo(7),
      lastLoginAt: hoursAgo(40),
      lastLoginIp: '203.0.113.250'
    }
  ] as const;

  const users: Record<string, { id: string; email: string }> = {};
  for (const seed of userSeeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        passwordHash,
        role: seed.role,
        status: seed.status,
        emailVerifiedAt: seed.emailVerifiedAt,
        lastLoginAt: seed.lastLoginAt,
        lastLoginIp: seed.lastLoginIp
      },
      create: {
        email: seed.email,
        passwordHash,
        role: seed.role,
        status: seed.status,
        emailVerifiedAt: seed.emailVerifiedAt,
        lastLoginAt: seed.lastLoginAt,
        lastLoginIp: seed.lastLoginIp
      },
      select: { id: true, email: true }
    });
    users[seed.key] = user;
  }

  const walletSeeds = [
    { userKey: 'admin', balance: 0, frozen: 0 },
    { userKey: 'user', balance: 9800, frozen: 1200 },
    { userKey: 'buyer', balance: 5600, frozen: 300 },
    { userKey: 'ops', balance: 4300, frozen: 150 },
    { userKey: 'pending', balance: 880, frozen: 0 },
    { userKey: 'rejected', balance: 1280, frozen: 0 },
    { userKey: 'banned', balance: 66, frozen: 0 }
  ] as const;

  const wallets: Record<string, { id: string; userId: string }> = {};
  for (const seed of walletSeeds) {
    const wallet = await prisma.wallet.upsert({
      where: { userId: users[seed.userKey].id },
      update: {
        balance: decimal(seed.balance),
        frozen: decimal(seed.frozen),
        currency: 'CNY'
      },
      create: {
        userId: users[seed.userKey].id,
        balance: decimal(seed.balance),
        frozen: decimal(seed.frozen),
        currency: 'CNY'
      },
      select: { id: true, userId: true }
    });
    wallets[seed.userKey] = wallet;
  }

  const kycSeeds = [
    { userKey: 'user', status: 'approved', realName: '张明', idNumber: '110101199001010011', reason: null },
    { userKey: 'buyer', status: 'approved', realName: '李华', idNumber: '310101199202020022', reason: null },
    { userKey: 'ops', status: 'approved', realName: '王晨', idNumber: '440101199303030033', reason: null },
    { userKey: 'pending', status: 'pending', realName: '赵雨', idNumber: '320101199404040044', reason: null },
    {
      userKey: 'rejected',
      status: 'rejected',
      realName: '周航',
      idNumber: '330101199505050055',
      reason: '证件照片不清晰，请补充清晰正反面照片'
    },
    {
      userKey: 'banned',
      status: 'rejected',
      realName: '吴刚',
      idNumber: '120101199606060066',
      reason: '实名信息与账号行为不一致'
    }
  ] as const;

  for (const seed of kycSeeds) {
    await prisma.userKyc.upsert({
      where: { userId: users[seed.userKey].id },
      update: {
        realName: seed.realName,
        idNumber: seed.idNumber,
        docImages: 'https://dummyimage.com/800x450/1f2937/ffffff&text=KYC',
        status: seed.status,
        reason: seed.reason
      },
      create: {
        userId: users[seed.userKey].id,
        realName: seed.realName,
        idNumber: seed.idNumber,
        docImages: 'https://dummyimage.com/800x450/1f2937/ffffff&text=KYC',
        status: seed.status,
        reason: seed.reason
      }
    });
  }

  const sellerAppSeeds = [
    {
      userKey: 'user',
      status: SellerApplicationStatus.APPROVED,
      reason: '历史交易稳定，履约率较高'
    },
    {
      userKey: 'ops',
      status: SellerApplicationStatus.APPROVED,
      reason: '供应链合规，资质齐全'
    },
    {
      userKey: 'pending',
      status: SellerApplicationStatus.PENDING,
      reason: '等待管理员复核补充材料'
    },
    {
      userKey: 'rejected',
      status: SellerApplicationStatus.REJECTED,
      reason: '近 30 天投诉率偏高，暂不通过'
    }
  ] as const;

  for (const seed of sellerAppSeeds) {
    await prisma.sellerApplication.upsert({
      where: { userId: users[seed.userKey].id },
      update: {
        status: seed.status,
        reason: seed.reason
      },
      create: {
        userId: users[seed.userKey].id,
        status: seed.status,
        reason: seed.reason
      }
    });
  }

  const sellerProfileSeeds = [
    {
      userKey: 'user',
      level: 4,
      tradeCount: 52,
      disputeRate: 0.038,
      avgDeliveryMinutes: 26,
      positiveRate: 0.97
    },
    {
      userKey: 'ops',
      level: 3,
      tradeCount: 27,
      disputeRate: 0.051,
      avgDeliveryMinutes: 41,
      positiveRate: 0.93
    }
  ] as const;

  for (const seed of sellerProfileSeeds) {
    await prisma.sellerProfile.upsert({
      where: { userId: users[seed.userKey].id },
      update: {
        level: seed.level,
        tradeCount: seed.tradeCount,
        disputeRate: seed.disputeRate,
        avgDeliveryMinutes: seed.avgDeliveryMinutes,
        positiveRate: seed.positiveRate
      },
      create: {
        userId: users[seed.userKey].id,
        level: seed.level,
        tradeCount: seed.tradeCount,
        disputeRate: seed.disputeRate,
        avgDeliveryMinutes: seed.avgDeliveryMinutes,
        positiveRate: seed.positiveRate
      }
    });
  }

  const productSeeds = [
    {
      code: 'DEMO-HK-CN2-001',
      sellerKey: 'user',
      status: ProductStatus.ONLINE,
      title: '香港 CN2 2C4G 独服',
      category: ProductCategory.DEDICATED,
      region: 'Hong Kong',
      lineType: 'CN2',
      salePrice: 299,
      renewPrice: 320,
      expireAt: daysFromNow(60),
      deliveryType: DeliveryType.FULL_ACCOUNT,
      canChangeEmail: true,
      canChangeRealname: false,
      riskLevel: RiskLevel.MEDIUM,
      riskTags: ['到期60天内', '支持迁移'],
      description: '2C4G 40G SSD 10M 带宽，适合建站和代理转发'
    },
    {
      code: 'DEMO-JP-VPS-001',
      sellerKey: 'user',
      status: ProductStatus.ONLINE,
      title: '日本 1C2G VPS BGP',
      category: ProductCategory.VPS,
      region: 'Tokyo',
      lineType: 'BGP',
      salePrice: 99,
      renewPrice: 120,
      expireAt: daysFromNow(30),
      deliveryType: DeliveryType.PANEL_TRANSFER,
      canChangeEmail: true,
      canChangeRealname: true,
      riskLevel: RiskLevel.LOW,
      riskTags: ['正规上游', '支持改绑'],
      description: '轻量业务稳定，线路优先面向东亚访问'
    },
    {
      code: 'DEMO-US-NAT-001',
      sellerKey: 'ops',
      status: ProductStatus.ONLINE,
      title: '美国 NAT 50 端口',
      category: ProductCategory.NAT,
      region: 'Los Angeles',
      lineType: 'CMI',
      salePrice: 20,
      renewPrice: 25,
      expireAt: daysFromNow(90),
      deliveryType: DeliveryType.SUB_ACCOUNT,
      canChangeEmail: false,
      canChangeRealname: false,
      riskLevel: RiskLevel.HIGH,
      riskTags: ['NAT', '不可改实名'],
      description: 'NAT 50 端口，10M 带宽，适合低成本轻量场景'
    },
    {
      code: 'DEMO-HK-DEDICATED-002',
      sellerKey: 'ops',
      status: ProductStatus.ONLINE,
      title: '香港 4C8G 高防独服',
      category: ProductCategory.DEDICATED,
      region: 'Hong Kong',
      lineType: 'CN2 GIA',
      salePrice: 468,
      renewPrice: 499,
      expireAt: daysFromNow(45),
      deliveryType: DeliveryType.FULL_ACCOUNT,
      canChangeEmail: true,
      canChangeRealname: true,
      riskLevel: RiskLevel.MEDIUM,
      riskTags: ['高防', '支持过户'],
      description: '4C8G/100G NVMe/30M 带宽，适合业务承载'
    },
    {
      code: 'DEMO-SG-CLOUD-PENDING-001',
      sellerKey: 'user',
      status: ProductStatus.PENDING,
      title: '新加坡云主机 2C4G 待审',
      category: ProductCategory.CLOUD,
      region: 'Singapore',
      lineType: 'BGP',
      salePrice: 188,
      renewPrice: 199,
      expireAt: daysFromNow(75),
      deliveryType: DeliveryType.EMAIL_CHANGE,
      canChangeEmail: true,
      canChangeRealname: false,
      riskLevel: RiskLevel.LOW,
      riskTags: ['待审核'],
      description: '资料待管理员审核，演示待审商品状态'
    },
    {
      code: 'DEMO-DE-LINE-DRAFT-001',
      sellerKey: 'user',
      status: ProductStatus.DRAFT,
      title: '德国线路机草稿',
      category: ProductCategory.LINE,
      region: 'Frankfurt',
      lineType: 'DE-CN',
      salePrice: 66,
      renewPrice: 70,
      expireAt: daysFromNow(20),
      deliveryType: DeliveryType.SUB_ACCOUNT,
      canChangeEmail: false,
      canChangeRealname: false,
      riskLevel: RiskLevel.MEDIUM,
      riskTags: ['草稿'],
      description: '未提交审核，仅用于展示草稿状态'
    },
    {
      code: 'DEMO-US-CLOUD-OFFLINE-001',
      sellerKey: 'ops',
      status: ProductStatus.OFFLINE,
      title: '美国云主机已下架',
      category: ProductCategory.CLOUD,
      region: 'Dallas',
      lineType: 'HE',
      salePrice: 120,
      renewPrice: 138,
      expireAt: daysFromNow(55),
      deliveryType: DeliveryType.PANEL_TRANSFER,
      canChangeEmail: true,
      canChangeRealname: true,
      riskLevel: RiskLevel.MEDIUM,
      riskTags: ['历史下架'],
      description: '历史上架后下架，用于演示离线状态'
    },
    {
      code: 'DEMO-JP-VPS-PENDING-002',
      sellerKey: 'ops',
      status: ProductStatus.PENDING,
      title: '日本 VPS 待复审',
      category: ProductCategory.VPS,
      region: 'Tokyo',
      lineType: 'IIJ',
      salePrice: 88,
      renewPrice: 98,
      expireAt: daysFromNow(42),
      deliveryType: DeliveryType.PANEL_TRANSFER,
      canChangeEmail: true,
      canChangeRealname: false,
      riskLevel: RiskLevel.MEDIUM,
      riskTags: ['补资料中'],
      description: '管理员要求补充机器控制台截图后再复审'
    }
  ] as const;

  const products: Record<string, { id: string; sellerId: string; salePrice: Prisma.Decimal }> = {};
  for (const seed of productSeeds) {
    const product = await prisma.product.upsert({
      where: { code: seed.code },
      update: {
        sellerId: users[seed.sellerKey].id,
        title: seed.title,
        category: seed.category,
        region: seed.region,
        lineType: seed.lineType,
        salePrice: decimal(seed.salePrice),
        renewPrice: decimal(seed.renewPrice),
        expireAt: seed.expireAt,
        deliveryType: seed.deliveryType,
        canChangeEmail: seed.canChangeEmail,
        canChangeRealname: seed.canChangeRealname,
        riskLevel: seed.riskLevel,
        riskTags: seed.riskTags as any,
        description: seed.description,
        status: seed.status
      },
      create: {
        code: seed.code,
        sellerId: users[seed.sellerKey].id,
        title: seed.title,
        category: seed.category,
        region: seed.region,
        lineType: seed.lineType,
        salePrice: decimal(seed.salePrice),
        renewPrice: decimal(seed.renewPrice),
        expireAt: seed.expireAt,
        deliveryType: seed.deliveryType,
        canChangeEmail: seed.canChangeEmail,
        canChangeRealname: seed.canChangeRealname,
        riskLevel: seed.riskLevel,
        riskTags: seed.riskTags as any,
        description: seed.description,
        status: seed.status
      },
      select: { id: true, sellerId: true, salePrice: true }
    });
    products[seed.code] = product;
  }

  const productImageSeeds = [
    {
      id: 'demo-product-image-1',
      productCode: 'DEMO-HK-CN2-001',
      type: ProductImageType.PANEL,
      url: 'https://dummyimage.com/1200x700/0f172a/ffffff&text=HK+CN2+PANEL'
    },
    {
      id: 'demo-product-image-2',
      productCode: 'DEMO-HK-CN2-001',
      type: ProductImageType.BILL,
      url: 'https://dummyimage.com/1200x700/1e293b/ffffff&text=HK+CN2+BILL'
    },
    {
      id: 'demo-product-image-3',
      productCode: 'DEMO-JP-VPS-001',
      type: ProductImageType.BENCHMARK,
      url: 'https://dummyimage.com/1200x700/0f766e/ffffff&text=JP+VPS+BENCH'
    },
    {
      id: 'demo-product-image-4',
      productCode: 'DEMO-US-NAT-001',
      type: ProductImageType.OTHER,
      url: 'https://dummyimage.com/1200x700/7f1d1d/ffffff&text=US+NAT+INFO'
    },
    {
      id: 'demo-product-image-5',
      productCode: 'DEMO-SG-CLOUD-PENDING-001',
      type: ProductImageType.PANEL,
      url: 'https://dummyimage.com/1200x700/1d4ed8/ffffff&text=SG+CLOUD+PANEL'
    }
  ] as const;

  for (const seed of productImageSeeds) {
    await prisma.productImage.upsert({
      where: { id: seed.id },
      update: {
        productId: products[seed.productCode].id,
        type: seed.type,
        url: seed.url
      },
      create: {
        id: seed.id,
        productId: products[seed.productCode].id,
        type: seed.type,
        url: seed.url
      }
    });
  }

  const productAuditSeeds = [
    {
      id: 'demo-product-audit-1',
      productCode: 'DEMO-HK-CN2-001',
      status: ProductAuditStatus.APPROVED,
      reason: '配置信息齐全，允许上架'
    },
    {
      id: 'demo-product-audit-2',
      productCode: 'DEMO-JP-VPS-001',
      status: ProductAuditStatus.APPROVED,
      reason: '风控等级低，允许上架'
    },
    {
      id: 'demo-product-audit-3',
      productCode: 'DEMO-SG-CLOUD-PENDING-001',
      status: ProductAuditStatus.PENDING,
      reason: '待补充控制台截图'
    },
    {
      id: 'demo-product-audit-4',
      productCode: 'DEMO-JP-VPS-PENDING-002',
      status: ProductAuditStatus.PENDING,
      reason: '二审中'
    },
    {
      id: 'demo-product-audit-5',
      productCode: 'DEMO-US-CLOUD-OFFLINE-001',
      status: ProductAuditStatus.REJECTED,
      reason: '历史投诉偏高，已下架处理'
    }
  ] as const;

  for (const seed of productAuditSeeds) {
    await prisma.productAudit.upsert({
      where: { id: seed.id },
      update: {
        productId: products[seed.productCode].id,
        adminId: users.admin.id,
        status: seed.status,
        reason: seed.reason,
        snapshot: {
          reviewer: 'admin@example.com',
          checkedAt: new Date().toISOString(),
          note: seed.reason
        } as any
      },
      create: {
        id: seed.id,
        productId: products[seed.productCode].id,
        adminId: users.admin.id,
        status: seed.status,
        reason: seed.reason,
        snapshot: {
          reviewer: 'admin@example.com',
          checkedAt: new Date().toISOString(),
          note: seed.reason
        } as any
      }
    });
  }

  const orderSeeds = [
    {
      id: 'demo-order-pending-payment',
      buyerKey: 'buyer',
      productCode: 'DEMO-JP-VPS-001',
      price: 99,
      fee: 2,
      payChannel: PayChannel.ALIPAY,
      payStatus: PayStatus.UNPAID,
      status: OrderStatus.PENDING_PAYMENT,
      escrowAmount: 99,
      expiresAt: hoursFromNow(6),
      autoConfirmAt: null
    },
    {
      id: 'demo-order-paid-waiting-delivery',
      buyerKey: 'buyer',
      productCode: 'DEMO-HK-CN2-001',
      price: 299,
      fee: 4,
      payChannel: PayChannel.WECHAT,
      payStatus: PayStatus.PAID,
      status: OrderStatus.PAID_WAITING_DELIVERY,
      escrowAmount: 299,
      expiresAt: null,
      autoConfirmAt: daysFromNow(2)
    },
    {
      id: 'demo-order-verifying',
      buyerKey: 'pending',
      productCode: 'DEMO-US-NAT-001',
      price: 20,
      fee: 0,
      payChannel: PayChannel.BALANCE,
      payStatus: PayStatus.PAID,
      status: OrderStatus.VERIFYING,
      escrowAmount: 20,
      expiresAt: null,
      autoConfirmAt: daysFromNow(2)
    },
    {
      id: 'demo-order-buyer-checking',
      buyerKey: 'rejected',
      productCode: 'DEMO-HK-DEDICATED-002',
      price: 468,
      fee: 6,
      payChannel: PayChannel.MANUAL,
      payStatus: PayStatus.PAID,
      status: OrderStatus.BUYER_CHECKING,
      escrowAmount: 468,
      expiresAt: null,
      autoConfirmAt: daysFromNow(1)
    },
    {
      id: 'demo-order-completed-pending-settlement',
      buyerKey: 'buyer',
      productCode: 'DEMO-HK-DEDICATED-002',
      price: 468,
      fee: 8,
      payChannel: PayChannel.ALIPAY,
      payStatus: PayStatus.PAID,
      status: OrderStatus.COMPLETED_PENDING_SETTLEMENT,
      escrowAmount: 468,
      expiresAt: null,
      autoConfirmAt: daysAgo(1)
    },
    {
      id: 'demo-order-completed',
      buyerKey: 'buyer',
      productCode: 'DEMO-HK-CN2-001',
      price: 299,
      fee: 4,
      payChannel: PayChannel.BALANCE,
      payStatus: PayStatus.PAID,
      status: OrderStatus.COMPLETED,
      escrowAmount: 299,
      expiresAt: null,
      autoConfirmAt: daysAgo(4)
    },
    {
      id: 'demo-order-refunding',
      buyerKey: 'pending',
      productCode: 'DEMO-JP-VPS-001',
      price: 99,
      fee: 1,
      payChannel: PayChannel.WECHAT,
      payStatus: PayStatus.PAID,
      status: OrderStatus.REFUNDING,
      escrowAmount: 99,
      expiresAt: null,
      autoConfirmAt: daysFromNow(1)
    },
    {
      id: 'demo-order-disputing',
      buyerKey: 'buyer',
      productCode: 'DEMO-US-NAT-001',
      price: 20,
      fee: 0,
      payChannel: PayChannel.MANUAL,
      payStatus: PayStatus.PAID,
      status: OrderStatus.DISPUTING,
      escrowAmount: 20,
      expiresAt: null,
      autoConfirmAt: daysFromNow(1)
    },
    {
      id: 'demo-order-canceled',
      buyerKey: 'rejected',
      productCode: 'DEMO-HK-DEDICATED-002',
      price: 468,
      fee: 8,
      payChannel: PayChannel.ALIPAY,
      payStatus: PayStatus.REFUNDED,
      status: OrderStatus.CANCELED,
      escrowAmount: 468,
      expiresAt: daysAgo(1),
      autoConfirmAt: null
    }
  ] as const;

  for (const seed of orderSeeds) {
    const product = products[seed.productCode];
    await prisma.order.upsert({
      where: { id: seed.id },
      update: {
        buyerId: users[seed.buyerKey].id,
        sellerId: product.sellerId,
        productId: product.id,
        price: decimal(seed.price),
        fee: decimal(seed.fee),
        payChannel: seed.payChannel,
        payStatus: seed.payStatus,
        escrowAmount: decimal(seed.escrowAmount),
        status: seed.status,
        expiresAt: seed.expiresAt,
        autoConfirmAt: seed.autoConfirmAt
      },
      create: {
        id: seed.id,
        buyerId: users[seed.buyerKey].id,
        sellerId: product.sellerId,
        productId: product.id,
        price: decimal(seed.price),
        fee: decimal(seed.fee),
        payChannel: seed.payChannel,
        payStatus: seed.payStatus,
        escrowAmount: decimal(seed.escrowAmount),
        status: seed.status,
        expiresAt: seed.expiresAt,
        autoConfirmAt: seed.autoConfirmAt
      }
    });
  }

  const paymentSeeds = [
    {
      orderId: 'demo-order-paid-waiting-delivery',
      channel: PayChannel.WECHAT,
      amount: 299,
      payStatus: PayStatus.PAID,
      paidAt: hoursAgo(20),
      tradeNo: 'WX-DEMO-0001'
    },
    {
      orderId: 'demo-order-verifying',
      channel: PayChannel.BALANCE,
      amount: 20,
      payStatus: PayStatus.PAID,
      paidAt: hoursAgo(18),
      tradeNo: 'BAL-DEMO-0001'
    },
    {
      orderId: 'demo-order-buyer-checking',
      channel: PayChannel.MANUAL,
      amount: 468,
      payStatus: PayStatus.PAID,
      paidAt: hoursAgo(44),
      tradeNo: 'MANUAL-DEMO-0001'
    },
    {
      orderId: 'demo-order-completed-pending-settlement',
      channel: PayChannel.ALIPAY,
      amount: 468,
      payStatus: PayStatus.PAID,
      paidAt: daysAgo(3),
      tradeNo: 'ALI-DEMO-0001'
    },
    {
      orderId: 'demo-order-completed',
      channel: PayChannel.BALANCE,
      amount: 299,
      payStatus: PayStatus.PAID,
      paidAt: daysAgo(7),
      tradeNo: 'BAL-DEMO-0002'
    },
    {
      orderId: 'demo-order-refunding',
      channel: PayChannel.WECHAT,
      amount: 99,
      payStatus: PayStatus.PAID,
      paidAt: daysAgo(2),
      tradeNo: 'WX-DEMO-0002'
    },
    {
      orderId: 'demo-order-disputing',
      channel: PayChannel.MANUAL,
      amount: 20,
      payStatus: PayStatus.PAID,
      paidAt: daysAgo(1),
      tradeNo: 'MANUAL-DEMO-0002'
    },
    {
      orderId: 'demo-order-canceled',
      channel: PayChannel.ALIPAY,
      amount: 468,
      payStatus: PayStatus.REFUNDED,
      paidAt: daysAgo(1),
      tradeNo: 'ALI-DEMO-0003'
    }
  ] as const;

  for (const seed of paymentSeeds) {
    await prisma.payment.upsert({
      where: { orderId: seed.orderId },
      update: {
        channel: seed.channel,
        amount: decimal(seed.amount),
        payStatus: seed.payStatus,
        paidAt: seed.paidAt,
        tradeNo: seed.tradeNo,
        notifyPayload: {
          source: 'seed',
          orderId: seed.orderId,
          tradeNo: seed.tradeNo
        } as any
      },
      create: {
        orderId: seed.orderId,
        channel: seed.channel,
        amount: decimal(seed.amount),
        payStatus: seed.payStatus,
        paidAt: seed.paidAt,
        tradeNo: seed.tradeNo,
        notifyPayload: {
          source: 'seed',
          orderId: seed.orderId,
          tradeNo: seed.tradeNo
        } as any
      }
    });
  }

  const deliverySeeds = [
    {
      id: 'demo-delivery-1',
      orderId: 'demo-order-verifying',
      providerAccount: 'seed_nat_01',
      panelUrl: 'https://panel.example.com/nat-01',
      loginInfo: 'root / demo@123',
      changeEmailPossible: false,
      changeRealnamePossible: false,
      remark: '已交付主机登录信息，等待平台核验'
    },
    {
      id: 'demo-delivery-2',
      orderId: 'demo-order-buyer-checking',
      providerAccount: 'seed_hk_02',
      panelUrl: 'https://panel.example.com/hk-02',
      loginInfo: 'admin / pass@456',
      changeEmailPossible: true,
      changeRealnamePossible: true,
      remark: '平台核验通过，买家验机中'
    },
    {
      id: 'demo-delivery-3',
      orderId: 'demo-order-completed-pending-settlement',
      providerAccount: 'seed_hk_03',
      panelUrl: 'https://panel.example.com/hk-03',
      loginInfo: 'root / ready@789',
      changeEmailPossible: true,
      changeRealnamePossible: false,
      remark: '交易完成，等待平台放款'
    },
    {
      id: 'demo-delivery-4',
      orderId: 'demo-order-completed',
      providerAccount: 'seed_hk_04',
      panelUrl: 'https://panel.example.com/hk-04',
      loginInfo: 'root / done@999',
      changeEmailPossible: true,
      changeRealnamePossible: true,
      remark: '交易完结'
    },
    {
      id: 'demo-delivery-5',
      orderId: 'demo-order-refunding',
      providerAccount: 'seed_jp_05',
      panelUrl: 'https://panel.example.com/jp-05',
      loginInfo: 'root / refund@111',
      changeEmailPossible: true,
      changeRealnamePossible: true,
      remark: '买家发起退款中'
    },
    {
      id: 'demo-delivery-6',
      orderId: 'demo-order-disputing',
      providerAccount: 'seed_nat_06',
      panelUrl: 'https://panel.example.com/nat-06',
      loginInfo: 'root / dispute@222',
      changeEmailPossible: false,
      changeRealnamePossible: false,
      remark: '纠纷处理中'
    }
  ] as const;

  for (const seed of deliverySeeds) {
    await prisma.deliveryRecord.upsert({
      where: { id: seed.id },
      update: {
        orderId: seed.orderId,
        providerAccount: seed.providerAccount,
        panelUrl: seed.panelUrl,
        loginInfo: seed.loginInfo,
        changeEmailPossible: seed.changeEmailPossible,
        changeRealnamePossible: seed.changeRealnamePossible,
        remark: seed.remark
      },
      create: {
        id: seed.id,
        orderId: seed.orderId,
        providerAccount: seed.providerAccount,
        panelUrl: seed.panelUrl,
        loginInfo: seed.loginInfo,
        changeEmailPossible: seed.changeEmailPossible,
        changeRealnamePossible: seed.changeRealnamePossible,
        remark: seed.remark
      }
    });
  }

  const verifySeeds = [
    {
      id: 'demo-verify-1',
      orderId: 'demo-order-verifying',
      result: VerifyResult.NEED_MORE,
      checklist: {
        osLogin: true,
        configMatch: false,
        reason: '内存规格不一致，待补充说明'
      }
    },
    {
      id: 'demo-verify-2',
      orderId: 'demo-order-buyer-checking',
      result: VerifyResult.PASS,
      checklist: {
        osLogin: true,
        configMatch: true,
        billingMatch: true
      }
    },
    {
      id: 'demo-verify-3',
      orderId: 'demo-order-completed-pending-settlement',
      result: VerifyResult.PASS,
      checklist: {
        osLogin: true,
        configMatch: true,
        billingMatch: true
      }
    }
  ] as const;

  for (const seed of verifySeeds) {
    await prisma.verifyRecord.upsert({
      where: { id: seed.id },
      update: {
        orderId: seed.orderId,
        verifierId: users.admin.id,
        result: seed.result,
        checklist: seed.checklist as any
      },
      create: {
        id: seed.id,
        orderId: seed.orderId,
        verifierId: users.admin.id,
        result: seed.result,
        checklist: seed.checklist as any
      }
    });
  }

  const settlementSeeds = [
    {
      orderId: 'demo-order-completed-pending-settlement',
      sellerId: products['DEMO-HK-DEDICATED-002'].sellerId,
      amount: 460,
      fee: 8,
      status: SettlementStatus.PENDING,
      releasedAt: null
    },
    {
      orderId: 'demo-order-completed',
      sellerId: products['DEMO-HK-CN2-001'].sellerId,
      amount: 295,
      fee: 4,
      status: SettlementStatus.RELEASED,
      releasedAt: daysAgo(5)
    }
  ] as const;

  for (const seed of settlementSeeds) {
    await prisma.settlement.upsert({
      where: { orderId: seed.orderId },
      update: {
        sellerId: seed.sellerId,
        amount: decimal(seed.amount),
        fee: decimal(seed.fee),
        status: seed.status,
        releasedAt: seed.releasedAt
      },
      create: {
        orderId: seed.orderId,
        sellerId: seed.sellerId,
        amount: decimal(seed.amount),
        fee: decimal(seed.fee),
        status: seed.status,
        releasedAt: seed.releasedAt
      }
    });
  }

  const refundSeeds = [
    {
      orderId: 'demo-order-refunding',
      applicantKey: 'pending',
      reason: '配置与描述不一致，申请退款',
      amount: 99,
      status: RefundStatus.PENDING
    },
    {
      orderId: 'demo-order-canceled',
      applicantKey: 'rejected',
      reason: '卖家未按时交付，平台同意退款',
      amount: 468,
      status: RefundStatus.APPROVED
    }
  ] as const;

  for (const seed of refundSeeds) {
    await prisma.refund.upsert({
      where: { orderId: seed.orderId },
      update: {
        applicantId: users[seed.applicantKey].id,
        reason: seed.reason,
        amount: decimal(seed.amount),
        status: seed.status
      },
      create: {
        orderId: seed.orderId,
        applicantId: users[seed.applicantKey].id,
        reason: seed.reason,
        amount: decimal(seed.amount),
        status: seed.status
      }
    });
  }

  const dispute = await prisma.dispute.upsert({
    where: { orderId: 'demo-order-disputing' },
    update: {
      initiator: DisputeInitiator.BUYER,
      initiatorUserId: users.buyer.id,
      status: DisputeStatus.PROCESSING,
      result: null,
      resolution: null
    },
    create: {
      orderId: 'demo-order-disputing',
      initiator: DisputeInitiator.BUYER,
      initiatorUserId: users.buyer.id,
      status: DisputeStatus.PROCESSING
    }
  });

  const disputeEvidenceSeeds = [
    {
      id: 'demo-dispute-evidence-1',
      userKey: 'buyer',
      url: 'https://dummyimage.com/1200x700/111827/ffffff&text=DISPUTE+EVIDENCE+1',
      note: '买家提供配置不一致截图'
    },
    {
      id: 'demo-dispute-evidence-2',
      userKey: 'ops',
      url: 'https://dummyimage.com/1200x700/0f172a/ffffff&text=DISPUTE+EVIDENCE+2',
      note: '卖家提供控制台核验记录'
    }
  ] as const;

  for (const seed of disputeEvidenceSeeds) {
    await prisma.disputeEvidence.upsert({
      where: { id: seed.id },
      update: {
        disputeId: dispute.id,
        userId: users[seed.userKey].id,
        url: seed.url,
        note: seed.note
      },
      create: {
        id: seed.id,
        disputeId: dispute.id,
        userId: users[seed.userKey].id,
        url: seed.url,
        note: seed.note
      }
    });
  }

  const orderLogSeeds = [
    {
      id: 'demo-order-log-1',
      orderId: 'demo-order-pending-payment',
      action: 'CREATE',
      actorType: ActorType.USER,
      actorId: users.buyer.id,
      remark: '买家创建订单'
    },
    {
      id: 'demo-order-log-2',
      orderId: 'demo-order-paid-waiting-delivery',
      action: 'PAY',
      actorType: ActorType.USER,
      actorId: users.buyer.id,
      remark: '微信支付成功'
    },
    {
      id: 'demo-order-log-3',
      orderId: 'demo-order-verifying',
      action: 'DELIVER',
      actorType: ActorType.USER,
      actorId: users.ops.id,
      remark: '卖方已交付，等待核验'
    },
    {
      id: 'demo-order-log-4',
      orderId: 'demo-order-verifying',
      action: 'VERIFY',
      actorType: ActorType.ADMIN,
      actorId: users.admin.id,
      remark: '核验结果 NEED_MORE'
    },
    {
      id: 'demo-order-log-5',
      orderId: 'demo-order-buyer-checking',
      action: 'VERIFY',
      actorType: ActorType.ADMIN,
      actorId: users.admin.id,
      remark: '核验通过，进入买家验机'
    },
    {
      id: 'demo-order-log-6',
      orderId: 'demo-order-completed-pending-settlement',
      action: 'BUYER_CONFIRM',
      actorType: ActorType.USER,
      actorId: users.buyer.id,
      remark: '买家确认收货'
    },
    {
      id: 'demo-order-log-7',
      orderId: 'demo-order-completed',
      action: 'SETTLEMENT_RELEASE',
      actorType: ActorType.SYSTEM,
      actorId: null,
      remark: '系统自动放款完成'
    },
    {
      id: 'demo-order-log-8',
      orderId: 'demo-order-refunding',
      action: 'REFUND_APPLY',
      actorType: ActorType.USER,
      actorId: users.pending.id,
      remark: '买家发起退款'
    },
    {
      id: 'demo-order-log-9',
      orderId: 'demo-order-disputing',
      action: 'DISPUTE_OPEN',
      actorType: ActorType.USER,
      actorId: users.buyer.id,
      remark: '发起纠纷，等待仲裁'
    },
    {
      id: 'demo-order-log-10',
      orderId: 'demo-order-canceled',
      action: 'REFUND_APPROVED',
      actorType: ActorType.ADMIN,
      actorId: users.admin.id,
      remark: '退款通过，订单关闭'
    }
  ] as const;

  for (const seed of orderLogSeeds) {
    await prisma.orderLog.upsert({
      where: { id: seed.id },
      update: {
        orderId: seed.orderId,
        action: seed.action,
        actorType: seed.actorType,
        actorId: seed.actorId,
        remark: seed.remark
      },
      create: {
        id: seed.id,
        orderId: seed.orderId,
        action: seed.action,
        actorType: seed.actorType,
        actorId: seed.actorId,
        remark: seed.remark
      }
    });
  }

  const withdrawalSeeds = [
    {
      id: 'demo-withdraw-1',
      walletKey: 'user',
      amount: 500,
      fee: 3,
      channel: 'ALIPAY',
      accountInfo: 'alipay:user@example.com',
      status: 'pending',
      processedAt: null
    },
    {
      id: 'demo-withdraw-2',
      walletKey: 'ops',
      amount: 300,
      fee: 2,
      channel: 'WECHAT',
      accountInfo: 'wechat:ops@example.com',
      status: 'approved',
      processedAt: hoursAgo(12)
    },
    {
      id: 'demo-withdraw-3',
      walletKey: 'user',
      amount: 260,
      fee: 1.8,
      channel: 'BANK',
      accountInfo: 'bank:6222****1024',
      status: 'paid',
      processedAt: daysAgo(2)
    },
    {
      id: 'demo-withdraw-4',
      walletKey: 'buyer',
      amount: 180,
      fee: 1,
      channel: 'ALIPAY',
      accountInfo: 'alipay:buyer@example.com',
      status: 'rejected',
      processedAt: daysAgo(1)
    }
  ] as const;

  for (const seed of withdrawalSeeds) {
    await prisma.withdrawal.upsert({
      where: { id: seed.id },
      update: {
        walletId: wallets[seed.walletKey].id,
        amount: decimal(seed.amount),
        fee: decimal(seed.fee),
        channel: seed.channel,
        accountInfo: seed.accountInfo,
        status: seed.status,
        processedAt: seed.processedAt
      },
      create: {
        id: seed.id,
        walletId: wallets[seed.walletKey].id,
        amount: decimal(seed.amount),
        fee: decimal(seed.fee),
        channel: seed.channel,
        accountInfo: seed.accountInfo,
        status: seed.status,
        processedAt: seed.processedAt
      }
    });
  }

  const walletLedgerSeeds = [
    {
      id: 'demo-ledger-1',
      walletKey: 'buyer',
      type: WalletLedgerType.ESCROW_FREEZE,
      amount: 299,
      refId: 'demo-order-paid-waiting-delivery',
      memo: '[DEMO] 订单托管冻结'
    },
    {
      id: 'demo-ledger-2',
      walletKey: 'user',
      type: WalletLedgerType.ESCROW_RELEASE,
      amount: 295,
      refId: 'demo-order-completed',
      memo: '[DEMO] 平台放款入账'
    },
    {
      id: 'demo-ledger-3',
      walletKey: 'user',
      type: WalletLedgerType.WITHDRAW,
      amount: 500,
      refId: 'demo-withdraw-1',
      memo: '[DEMO] 提现申请冻结'
    },
    {
      id: 'demo-ledger-4',
      walletKey: 'user',
      type: WalletLedgerType.FEE,
      amount: 1.8,
      refId: 'demo-withdraw-3',
      memo: '[DEMO] 提现手续费'
    },
    {
      id: 'demo-ledger-5',
      walletKey: 'buyer',
      type: WalletLedgerType.REFUND,
      amount: 468,
      refId: 'demo-order-canceled',
      memo: '[DEMO] 退款回退'
    },
    {
      id: 'demo-ledger-6',
      walletKey: 'ops',
      type: WalletLedgerType.ADJUST,
      amount: 120,
      refId: 'ops-adjust-01',
      memo: '[DEMO] 运营手动调账'
    }
  ] as const;

  for (const seed of walletLedgerSeeds) {
    await prisma.walletLedger.upsert({
      where: { id: seed.id },
      update: {
        walletId: wallets[seed.walletKey].id,
        type: seed.type,
        amount: decimal(seed.amount),
        refType: 'DEMO',
        refId: seed.refId,
        memo: seed.memo
      },
      create: {
        id: seed.id,
        walletId: wallets[seed.walletKey].id,
        type: seed.type,
        amount: decimal(seed.amount),
        refType: 'DEMO',
        refId: seed.refId,
        memo: seed.memo
      }
    });
  }

  const noticeSeeds = [
    {
      id: 'demo-notice-1',
      userKey: 'user',
      type: 'DEMO_SYSTEM_NOTICE',
      status: NoticeStatus.PENDING,
      payload: { title: '系统通知', content: '演示数据已刷新，可开始联调。' }
    },
    {
      id: 'demo-notice-2',
      userKey: 'buyer',
      type: 'DEMO_ORDER_NOTICE',
      status: NoticeStatus.PENDING,
      payload: { title: '订单更新', content: '订单 demo-order-buyer-checking 已进入验机阶段。' }
    },
    {
      id: 'demo-notice-3',
      userKey: 'ops',
      type: 'DEMO_SETTLEMENT_NOTICE',
      status: NoticeStatus.SENT,
      payload: { title: '结算提醒', content: '你有 1 笔结算待放款。' }
    },
    {
      id: 'demo-notice-4',
      userKey: 'pending',
      type: 'DEMO_KYC_NOTICE',
      status: NoticeStatus.PENDING,
      payload: { title: '实名认证待审', content: '请等待管理员审核实名认证申请。' }
    },
    {
      id: 'demo-notice-5',
      userKey: 'rejected',
      type: 'DEMO_WITHDRAW_NOTICE',
      status: NoticeStatus.SENT,
      payload: { title: '提现驳回', content: '请补充收款信息后重新发起提现。' }
    }
  ] as const;

  for (const seed of noticeSeeds) {
    await prisma.notice.upsert({
      where: { id: seed.id },
      update: {
        userId: users[seed.userKey].id,
        type: seed.type,
        channel: NoticeChannel.SITE,
        status: seed.status,
        payload: seed.payload as any,
        sentAt: seed.status === NoticeStatus.SENT ? hoursAgo(6) : null
      },
      create: {
        id: seed.id,
        userId: users[seed.userKey].id,
        type: seed.type,
        channel: NoticeChannel.SITE,
        status: seed.status,
        payload: seed.payload as any,
        sentAt: seed.status === NoticeStatus.SENT ? hoursAgo(6) : null
      }
    });
  }

  const authCodeSeeds = [
    {
      id: 'demo-auth-code-1',
      email: 'pending.user@example.com',
      scene: AuthCodeScene.VERIFY_EMAIL,
      codeHash: hashCode('111111'),
      expiresAt: hoursFromNow(8),
      usedAt: null
    },
    {
      id: 'demo-auth-code-2',
      email: 'buyer@example.com',
      scene: AuthCodeScene.RESET_PASSWORD,
      codeHash: hashCode('222222'),
      expiresAt: hoursFromNow(2),
      usedAt: null
    }
  ] as const;

  for (const seed of authCodeSeeds) {
    await prisma.authCode.upsert({
      where: { id: seed.id },
      update: {
        email: seed.email,
        scene: seed.scene,
        codeHash: seed.codeHash,
        expiresAt: seed.expiresAt,
        usedAt: seed.usedAt
      },
      create: {
        id: seed.id,
        email: seed.email,
        scene: seed.scene,
        codeHash: seed.codeHash,
        expiresAt: seed.expiresAt,
        usedAt: seed.usedAt
      }
    });
  }

  const loginLogSeeds = [
    {
      id: 'demo-login-log-1',
      userKey: 'user',
      email: 'user@example.com',
      ip: '203.0.113.10',
      userAgent: 'Mozilla/5.0 Demo Seed',
      success: true,
      reason: null,
      createdAt: hoursAgo(2)
    },
    {
      id: 'demo-login-log-2',
      userKey: 'buyer',
      email: 'buyer@example.com',
      ip: '198.51.100.23',
      userAgent: 'Mozilla/5.0 Demo Seed',
      success: true,
      reason: null,
      createdAt: hoursAgo(6)
    },
    {
      id: 'demo-login-log-3',
      userKey: 'pending',
      email: 'pending.user@example.com',
      ip: '198.51.100.66',
      userAgent: 'Mozilla/5.0 Demo Seed',
      success: false,
      reason: 'BAD_PASSWORD',
      createdAt: hoursAgo(4)
    },
    {
      id: 'demo-login-log-4',
      userKey: 'rejected',
      email: 'rejected.user@example.com',
      ip: '198.51.100.77',
      userAgent: 'Mozilla/5.0 Demo Seed',
      success: false,
      reason: 'USER_NOT_FOUND',
      createdAt: hoursAgo(12)
    },
    {
      id: 'demo-login-log-5',
      userKey: 'banned',
      email: 'banned.user@example.com',
      ip: '203.0.113.250',
      userAgent: 'Mozilla/5.0 Demo Seed',
      success: false,
      reason: 'USER_BANNED',
      createdAt: hoursAgo(20)
    }
  ] as const;

  for (const seed of loginLogSeeds) {
    await prisma.userLoginLog.upsert({
      where: { id: seed.id },
      update: {
        userId: users[seed.userKey].id,
        email: seed.email,
        ip: seed.ip,
        userAgent: seed.userAgent,
        success: seed.success,
        reason: seed.reason,
        createdAt: seed.createdAt
      },
      create: {
        id: seed.id,
        userId: users[seed.userKey].id,
        email: seed.email,
        ip: seed.ip,
        userAgent: seed.userAgent,
        success: seed.success,
        reason: seed.reason,
        createdAt: seed.createdAt
      }
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seeded full demo dataset (users/products/orders/payments/wallet/notices)');
  // eslint-disable-next-line no-console
  console.log('Demo accounts: admin@example.com / user@example.com / buyer@example.com / ops@example.com');
  // eslint-disable-next-line no-console
  console.log(`Demo password: ${demoPassword}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
