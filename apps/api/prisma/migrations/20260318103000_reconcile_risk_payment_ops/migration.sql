-- AlterTable
ALTER TABLE `Payment`
  ADD COLUMN `channelOrderId` VARCHAR(191) NULL,
  ADD COLUMN `thirdTradeNo` VARCHAR(191) NULL,
  ADD COLUMN `paidAmount` DECIMAL(16,2) NULL,
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'CNY',
  ADD COLUMN `notifyAt` DATETIME(3) NULL,
  ADD COLUMN `closeAt` DATETIME(3) NULL,
  ADD COLUMN `failReason` VARCHAR(191) NULL,
  ADD COLUMN `notifyRaw` JSON NULL;

-- Update enum columns for new PayStatus values
ALTER TABLE `Order`
  MODIFY `payStatus` ENUM('UNPAID','PAID','REFUNDED','FAILED','CLOSED') NOT NULL DEFAULT 'UNPAID';

ALTER TABLE `Payment`
  MODIFY `payStatus` ENUM('UNPAID','PAID','REFUNDED','FAILED','CLOSED') NOT NULL DEFAULT 'UNPAID';

-- CreateTable
CREATE TABLE `PaymentEvent` (
  `id` VARCHAR(191) NOT NULL,
  `paymentId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(191) NOT NULL,
  `source` VARCHAR(191) NULL,
  `payload` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `PaymentEvent_paymentId_createdAt_idx`(`paymentId`, `createdAt`),
  INDEX `PaymentEvent_eventType_createdAt_idx`(`eventType`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReconcileTask` (
  `id` VARCHAR(191) NOT NULL,
  `channel` ENUM('BALANCE','ALIPAY','WECHAT','MANUAL') NOT NULL,
  `bizDate` DATETIME(3) NOT NULL,
  `status` ENUM('PENDING','RUNNING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  `startedAt` DATETIME(3) NULL,
  `finishedAt` DATETIME(3) NULL,
  `summary` JSON NULL,
  `error` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ReconcileTask_channel_bizDate_key`(`channel`, `bizDate`),
  INDEX `ReconcileTask_status_createdAt_idx`(`status`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReconcileItem` (
  `id` VARCHAR(191) NOT NULL,
  `taskId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NULL,
  `tradeNo` VARCHAR(191) NULL,
  `thirdTradeNo` VARCHAR(191) NULL,
  `diffType` ENUM('MISSING_LOCAL','MISSING_REMOTE','AMOUNT_MISMATCH','STATUS_MISMATCH','DUPLICATE_REMOTE') NOT NULL,
  `status` ENUM('OPEN','RESOLVED','IGNORED') NOT NULL DEFAULT 'OPEN',
  `localAmount` DECIMAL(16,2) NULL,
  `remoteAmount` DECIMAL(16,2) NULL,
  `localStatus` VARCHAR(191) NULL,
  `remoteStatus` VARCHAR(191) NULL,
  `note` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `ReconcileItem_taskId_status_idx`(`taskId`, `status`),
  INDEX `ReconcileItem_diffType_createdAt_idx`(`diffType`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiskRule` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `scene` ENUM('LOGIN','CREATE_ORDER','PAYMENT_CALLBACK','WITHDRAW') NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `priority` INTEGER NOT NULL DEFAULT 100,
  `action` ENUM('ALLOW','REVIEW','LIMIT','ALERT','BLOCK') NOT NULL DEFAULT 'ALERT',
  `condition` JSON NOT NULL,
  `reason` VARCHAR(191) NULL,
  `createdBy` VARCHAR(191) NULL,
  `updatedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `RiskRule_code_key`(`code`),
  INDEX `RiskRule_scene_enabled_priority_idx`(`scene`, `enabled`, `priority`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiskHit` (
  `id` VARCHAR(191) NOT NULL,
  `scene` ENUM('LOGIN','CREATE_ORDER','PAYMENT_CALLBACK','WITHDRAW') NOT NULL,
  `action` ENUM('ALLOW','REVIEW','LIMIT','ALERT','BLOCK') NOT NULL,
  `matchedRuleIds` JSON NULL,
  `decisionReason` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NULL,
  `ip` VARCHAR(191) NULL,
  `input` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `RiskHit_scene_createdAt_idx`(`scene`, `createdAt`),
  INDEX `RiskHit_userId_createdAt_idx`(`userId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiskEntityList` (
  `id` VARCHAR(191) NOT NULL,
  `listType` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityValue` VARCHAR(191) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `reason` VARCHAR(191) NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `RiskEntityList_listType_entityType_entityValue_key`(`listType`, `entityType`, `entityValue`),
  INDEX `RiskEntityList_entityType_entityValue_enabled_idx`(`entityType`, `entityValue`, `enabled`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PaymentEvent`
  ADD CONSTRAINT `PaymentEvent_paymentId_fkey`
  FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ReconcileItem`
  ADD CONSTRAINT `ReconcileItem_taskId_fkey`
  FOREIGN KEY (`taskId`) REFERENCES `ReconcileTask`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddIndex
CREATE INDEX `Payment_tradeNo_idx` ON `Payment`(`tradeNo`);
CREATE INDEX `Payment_thirdTradeNo_idx` ON `Payment`(`thirdTradeNo`);
CREATE INDEX `Payment_channelOrderId_idx` ON `Payment`(`channelOrderId`);
CREATE INDEX `Payment_payStatus_createdAt_idx` ON `Payment`(`payStatus`, `createdAt`);
