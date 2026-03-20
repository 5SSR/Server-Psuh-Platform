-- CreateTable
CREATE TABLE `ConsignmentApplication` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED','CANCELED') NOT NULL DEFAULT 'PENDING',
  `sellerNote` VARCHAR(191) NULL,
  `adminRemark` VARCHAR(191) NULL,
  `reviewedBy` VARCHAR(191) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `ConsignmentApplication_sellerId_status_idx`(`sellerId`, `status`),
  INDEX `ConsignmentApplication_productId_status_idx`(`productId`, `status`),
  INDEX `ConsignmentApplication_status_createdAt_idx`(`status`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConsignmentApplication`
  ADD CONSTRAINT `ConsignmentApplication_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ConsignmentApplication`
  ADD CONSTRAINT `ConsignmentApplication_sellerId_fkey`
  FOREIGN KEY (`sellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ConsignmentApplication`
  ADD CONSTRAINT `ConsignmentApplication_reviewedBy_fkey`
  FOREIGN KEY (`reviewedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
