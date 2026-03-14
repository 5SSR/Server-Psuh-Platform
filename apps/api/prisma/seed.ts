import { PrismaClient, ProductCategory, DeliveryType, ProductStatus, RiskLevel } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const demoPassword = process.env.SEED_DEMO_PASSWORD || '12345678';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      passwordHash,
      role: 'BUYER'
    },
    create: {
      email: 'user@example.com',
      passwordHash,
      role: 'BUYER'
    }
  });

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash,
      role: 'ADMIN'
    },
    create: {
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN'
    }
  });

  const now = new Date();
  const products = [
    {
      code: 'DEMO-HK-CN2-001',
      title: '香港 CN2 2C4G 独服',
      category: ProductCategory.DEDICATED,
      region: 'Hong Kong',
      lineType: 'CN2',
      salePrice: 299,
      renewPrice: 320,
      expireAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 60),
      deliveryType: DeliveryType.FULL_ACCOUNT,
      canChangeEmail: true,
      canChangeRealname: false,
      riskLevel: RiskLevel.MEDIUM,
      riskTags: ['到期60天内'],
      description: '2C4G 40G SSD 10M带宽，适合建站'
    },
    {
      code: 'DEMO-JP-VPS-001',
      title: '日本 1C2G VPS BGP',
      category: ProductCategory.VPS,
      region: 'Tokyo',
      lineType: 'BGP',
      salePrice: 99,
      renewPrice: 120,
      expireAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
      deliveryType: DeliveryType.PANEL_TRANSFER,
      canChangeEmail: true,
      canChangeRealname: true,
      riskLevel: RiskLevel.LOW,
      riskTags: ['正规上游'],
      description: '适合轻量博客、学习'
    },
    {
      code: 'DEMO-US-NAT-001',
      title: '美国 NAT 50 端口',
      category: ProductCategory.NAT,
      region: 'Los Angeles',
      lineType: 'CMI',
      salePrice: 20,
      renewPrice: 25,
      expireAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 90),
      deliveryType: DeliveryType.SUB_ACCOUNT,
      canChangeEmail: false,
      canChangeRealname: false,
      riskLevel: RiskLevel.HIGH,
      riskTags: ['NAT', '不可改实名'],
      description: 'NAT 50端口，带宽 10M，慎购'
    }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: {
        sellerId: user.id,
        status: ProductStatus.ONLINE,
        ...p
      },
      create: {
        sellerId: user.id,
        status: ProductStatus.ONLINE,
        ...p
      }
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seeded demo products and accounts');
  // eslint-disable-next-line no-console
  console.log('Demo accounts: user@example.com / admin@example.com');
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
