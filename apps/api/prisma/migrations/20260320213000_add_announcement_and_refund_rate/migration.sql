ALTER TABLE `SellerProfile`
  ADD COLUMN `refundRate` DOUBLE NOT NULL DEFAULT 0;

CREATE TABLE `Announcement` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `summary` VARCHAR(191) NULL,
  `content` TEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `isPinned` BOOLEAN NOT NULL DEFAULT false,
  `position` INTEGER NOT NULL DEFAULT 0,
  `startsAt` DATETIME(3) NULL,
  `endsAt` DATETIME(3) NULL,
  `publishedAt` DATETIME(3) NULL,
  `createdBy` VARCHAR(191) NULL,
  `updatedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `Announcement_isActive_isPinned_position_idx`(`isActive`, `isPinned`, `position`),
  INDEX `Announcement_publishedAt_createdAt_idx`(`publishedAt`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
