-- 为订单记录固化手续费承担方，避免后续配置调整影响历史订单结算
ALTER TABLE `Order`
  ADD COLUMN `feePayer` ENUM('BUYER', 'SELLER', 'SHARED') NOT NULL DEFAULT 'SELLER';

-- 平台手续费配置（支持固定费率、比例费率、阶梯费率）
CREATE TABLE `FeeConfig` (
  `id` VARCHAR(191) NOT NULL,
  `scene` ENUM('ORDER', 'WITHDRAW') NOT NULL,
  `mode` ENUM('FIXED', 'RATE', 'TIER') NOT NULL DEFAULT 'RATE',
  `payer` ENUM('BUYER', 'SELLER', 'SHARED') NULL,
  `fixedFee` DECIMAL(16, 2) NULL,
  `rate` DECIMAL(8, 4) NULL,
  `minFee` DECIMAL(16, 2) NULL,
  `tiers` JSON NULL,
  `remark` VARCHAR(191) NULL,
  `updatedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `FeeConfig_scene_key`(`scene`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
