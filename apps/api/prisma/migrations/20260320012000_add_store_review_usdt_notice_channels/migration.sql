-- Extend pay channel enums for USDT
ALTER TABLE `Order`
  MODIFY `payChannel` ENUM('BALANCE','ALIPAY','WECHAT','USDT','MANUAL') NOT NULL DEFAULT 'BALANCE';

ALTER TABLE `Payment`
  MODIFY `channel` ENUM('BALANCE','ALIPAY','WECHAT','USDT','MANUAL') NOT NULL;

ALTER TABLE `ReconcileTask`
  MODIFY `channel` ENUM('BALANCE','ALIPAY','WECHAT','USDT','MANUAL') NOT NULL;

-- Extend notice channels for SMS / WeChat template
ALTER TABLE `Notice`
  MODIFY `channel` ENUM('SITE','EMAIL','TG','SMS','WECHAT_TEMPLATE') NOT NULL DEFAULT 'SITE';

ALTER TABLE `NoticeTemplate`
  MODIFY `channel` ENUM('SITE','EMAIL','TG','SMS','WECHAT_TEMPLATE') NOT NULL DEFAULT 'SITE';

-- Add product fields for transaction capability and fee bearer
ALTER TABLE `Product`
  ADD COLUMN `feePayer` ENUM('BUYER','SELLER','SHARED') NOT NULL DEFAULT 'SELLER',
  ADD COLUMN `canTest` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `canTransfer` BOOLEAN NOT NULL DEFAULT false;

-- Create store profile
CREATE TABLE `StoreProfile` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `logo` VARCHAR(191) NULL,
  `banner` VARCHAR(191) NULL,
  `intro` VARCHAR(191) NULL,
  `notice` VARCHAR(191) NULL,
  `verifiedBadge` BOOLEAN NOT NULL DEFAULT false,
  `responseMinutes` INTEGER NOT NULL DEFAULT 30,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `StoreProfile_userId_key`(`userId`),
  UNIQUE INDEX `StoreProfile_slug_key`(`slug`),
  INDEX `StoreProfile_name_idx`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create order review
CREATE TABLE `OrderReview` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `buyerId` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `rating` INTEGER NOT NULL,
  `content` VARCHAR(191) NULL,
  `tags` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `OrderReview_orderId_key`(`orderId`),
  INDEX `OrderReview_sellerId_createdAt_idx`(`sellerId`, `createdAt`),
  INDEX `OrderReview_buyerId_createdAt_idx`(`buyerId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys
ALTER TABLE `StoreProfile`
  ADD CONSTRAINT `StoreProfile_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `OrderReview`
  ADD CONSTRAINT `OrderReview_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `OrderReview`
  ADD CONSTRAINT `OrderReview_buyerId_fkey`
  FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `OrderReview`
  ADD CONSTRAINT `OrderReview_sellerId_fkey`
  FOREIGN KEY (`sellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
