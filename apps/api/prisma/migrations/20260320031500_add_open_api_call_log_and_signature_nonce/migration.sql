-- CreateTable
CREATE TABLE `OpenApiCallLog` (
  `id` VARCHAR(191) NOT NULL,
  `openApiKeyId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NULL,
  `keyPrefix` VARCHAR(191) NULL,
  `requestPath` VARCHAR(191) NOT NULL,
  `requestMethod` VARCHAR(191) NOT NULL,
  `nonce` VARCHAR(191) NULL,
  `signatureMode` VARCHAR(191) NULL,
  `ip` VARCHAR(191) NULL,
  `statusCode` INTEGER NOT NULL,
  `success` BOOLEAN NOT NULL DEFAULT false,
  `errorCode` VARCHAR(191) NULL,
  `errorMessage` VARCHAR(191) NULL,
  `durationMs` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `OpenApiCallLog_openApiKeyId_createdAt_idx`(`openApiKeyId`, `createdAt`),
  INDEX `OpenApiCallLog_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `OpenApiCallLog_keyPrefix_createdAt_idx`(`keyPrefix`, `createdAt`),
  INDEX `OpenApiCallLog_requestPath_createdAt_idx`(`requestPath`, `createdAt`),
  INDEX `OpenApiCallLog_success_createdAt_idx`(`success`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OpenApiNonce` (
  `id` VARCHAR(191) NOT NULL,
  `openApiKeyId` VARCHAR(191) NOT NULL,
  `nonce` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `OpenApiNonce_openApiKeyId_nonce_key`(`openApiKeyId`, `nonce`),
  INDEX `OpenApiNonce_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OpenApiCallLog` ADD CONSTRAINT `OpenApiCallLog_openApiKeyId_fkey`
  FOREIGN KEY (`openApiKeyId`) REFERENCES `OpenApiKey`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpenApiNonce` ADD CONSTRAINT `OpenApiNonce_openApiKeyId_fkey`
  FOREIGN KEY (`openApiKeyId`) REFERENCES `OpenApiKey`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
