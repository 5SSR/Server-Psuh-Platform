-- CreateTable
CREATE TABLE `Bargain` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `buyerId` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `status` ENUM('WAIT_SELLER','WAIT_BUYER','ACCEPTED','REJECTED','CANCELED') NOT NULL DEFAULT 'WAIT_SELLER',
  `lastActor` ENUM('BUYER','SELLER') NOT NULL,
  `round` INTEGER NOT NULL DEFAULT 1,
  `currentPrice` DECIMAL(16,2) NOT NULL,
  `buyerLastPrice` DECIMAL(16,2) NULL,
  `sellerLastPrice` DECIMAL(16,2) NULL,
  `remark` VARCHAR(191) NULL,
  `expireAt` DATETIME(3) NULL,
  `orderId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Bargain_orderId_key`(`orderId`),
  INDEX `Bargain_productId_status_idx`(`productId`, `status`),
  INDEX `Bargain_buyerId_status_idx`(`buyerId`, `status`),
  INDEX `Bargain_sellerId_status_idx`(`sellerId`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BargainLog` (
  `id` VARCHAR(191) NOT NULL,
  `bargainId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `actor` ENUM('BUYER','SELLER') NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `price` DECIMAL(16,2) NULL,
  `remark` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `BargainLog_bargainId_createdAt_idx`(`bargainId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Bargain`
  ADD CONSTRAINT `Bargain_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Bargain`
  ADD CONSTRAINT `Bargain_buyerId_fkey`
  FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Bargain`
  ADD CONSTRAINT `Bargain_sellerId_fkey`
  FOREIGN KEY (`sellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Bargain`
  ADD CONSTRAINT `Bargain_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `BargainLog`
  ADD CONSTRAINT `BargainLog_bargainId_fkey`
  FOREIGN KEY (`bargainId`) REFERENCES `Bargain`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
