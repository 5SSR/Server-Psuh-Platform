import { PrismaClient, ProductCategory, DeliveryType, ProductStatus, RiskLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.product.deleteMany({});

  const seller = await prisma.user.upsert({
    where: { email: 'seller@example.com' },
    update: {},
    create: {
      email: 'seller@example.com',
      passwordHash: 'placeholder', // 仅示例
      role: 'SELLER'
    }
  });

  const now = new Date();
  const products = [
    {
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
    await prisma.product.create({
      data: {
        sellerId: seller.id,
        code: `DEMO-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        status: ProductStatus.ONLINE,
        ...p
      }
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seeded demo products and seller');
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
