-- CreateTable
CREATE TABLE `WantedRequest` (
  `id` VARCHAR(191) NOT NULL,
  `buyerId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `category` ENUM('DEDICATED','VPS','CLOUD','NAT','LINE') NULL,
  `region` VARCHAR(191) NOT NULL,
  `lineType` VARCHAR(191) NULL,
  `cpuCores` INTEGER NULL,
  `memoryGb` INTEGER NULL,
  `diskGb` INTEGER NULL,
  `bandwidthMbps` INTEGER NULL,
  `budgetMin` DECIMAL(16,2) NULL,
  `budgetMax` DECIMAL(16,2) NULL,
  `acceptPremium` BOOLEAN NOT NULL DEFAULT false,
  `description` TEXT NULL,
  `expireAt` DATETIME(3) NULL,
  `status` ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `WantedRequest_buyerId_status_idx`(`buyerId`, `status`),
  INDEX `WantedRequest_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `WantedRequest_category_region_idx`(`category`, `region`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WantedOffer` (
  `id` VARCHAR(191) NOT NULL,
  `wantedId` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NULL,
  `offerPrice` DECIMAL(16,2) NOT NULL,
  `message` VARCHAR(191) NULL,
  `status` ENUM('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WantedOffer_wantedId_sellerId_key`(`wantedId`, `sellerId`),
  INDEX `WantedOffer_sellerId_status_idx`(`sellerId`, `status`),
  INDEX `WantedOffer_wantedId_status_idx`(`wantedId`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WantedRequest`
  ADD CONSTRAINT `WantedRequest_buyerId_fkey`
  FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `WantedOffer`
  ADD CONSTRAINT `WantedOffer_wantedId_fkey`
  FOREIGN KEY (`wantedId`) REFERENCES `WantedRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `WantedOffer`
  ADD CONSTRAINT `WantedOffer_sellerId_fkey`
  FOREIGN KEY (`sellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `WantedOffer`
  ADD CONSTRAINT `WantedOffer_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
