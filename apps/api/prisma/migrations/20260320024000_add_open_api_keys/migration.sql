-- CreateTable
CREATE TABLE `OpenApiKey` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `keyPrefix` VARCHAR(191) NOT NULL,
  `keyHash` VARCHAR(191) NOT NULL,
  `scope` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `lastUsedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `OpenApiKey_keyHash_key`(`keyHash`),
  INDEX `OpenApiKey_userId_status_idx`(`userId`, `status`),
  INDEX `OpenApiKey_status_expiresAt_idx`(`status`, `expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OpenApiKey` ADD CONSTRAINT `OpenApiKey_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
