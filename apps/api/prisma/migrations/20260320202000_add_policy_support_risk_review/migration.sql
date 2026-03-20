-- 扩展风控场景枚举：新增 CREATE_PRODUCT
ALTER TABLE `RiskRule`
  MODIFY `scene` ENUM('LOGIN', 'CREATE_PRODUCT', 'CREATE_ORDER', 'PAYMENT_CALLBACK', 'WITHDRAW') NOT NULL;

ALTER TABLE `RiskHit`
  MODIFY `scene` ENUM('LOGIN', 'CREATE_PRODUCT', 'CREATE_ORDER', 'PAYMENT_CALLBACK', 'WITHDRAW') NOT NULL;

-- 订单增加风控审核闭环字段
ALTER TABLE `Order`
  ADD COLUMN `riskAction` ENUM('ALLOW', 'REVIEW', 'LIMIT', 'ALERT', 'BLOCK') NOT NULL DEFAULT 'ALLOW',
  ADD COLUMN `riskReviewRequired` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `riskReviewPassed` BOOLEAN NULL,
  ADD COLUMN `riskReviewedAt` DATETIME(3) NULL,
  ADD COLUMN `riskReviewedBy` VARCHAR(191) NULL,
  ADD COLUMN `riskReviewRemark` VARCHAR(191) NULL;

CREATE INDEX `Order_riskReviewRequired_riskReviewPassed_createdAt_idx`
  ON `Order`(`riskReviewRequired`, `riskReviewPassed`, `createdAt`);

-- 平台规则/协议文档
CREATE TABLE `PolicyDocument` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `position` INTEGER NOT NULL DEFAULT 0,
  `updatedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PolicyDocument_code_key`(`code`),
  INDEX `PolicyDocument_isActive_position_idx`(`isActive`, `position`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `PolicyDocument` (`id`, `code`, `title`, `content`, `isActive`, `position`, `updatedBy`, `createdAt`, `updatedAt`)
VALUES
  ('policy-rules-default', 'RULES', '平台交易规则', '1. 平台采用担保托管模式，买卖双方需按流程完成下单、支付、交付、核验与确认。\\n\\n2. 商品信息需真实可核验，若配置与描述不一致，买家可在验机期内发起退款或纠纷。\\n\\n3. 纠纷处理以订单日志、交付记录、核验记录与证据材料为准，平台裁决结果为最终执行依据。', true, 10, 'SYSTEM', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('policy-agreement-default', 'AGREEMENT', '平台服务协议', '1. 用户使用本平台即视为同意平台服务协议及交易规则，并承诺信息真实有效。\\n\\n2. 平台提供担保托管与风险控制能力，不参与线下私下转账行为。\\n\\n3. 平台可根据风控策略对高风险订单进行审核、限制或拒绝处理。', true, 20, 'SYSTEM', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- 售后工单/申诉系统
CREATE TABLE `SupportTicket` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NULL,
  `productId` VARCHAR(191) NULL,
  `type` ENUM('AFTER_SALE', 'APPEAL', 'OTHER') NOT NULL DEFAULT 'AFTER_SALE',
  `status` ENUM('OPEN', 'PROCESSING', 'RESOLVED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
  `subject` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `evidence` JSON NULL,
  `contact` VARCHAR(191) NULL,
  `reviewRemark` VARCHAR(191) NULL,
  `resolverId` VARCHAR(191) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `SupportTicket_userId_status_createdAt_idx`(`userId`, `status`, `createdAt`),
  INDEX `SupportTicket_status_type_createdAt_idx`(`status`, `type`, `createdAt`),
  INDEX `SupportTicket_orderId_createdAt_idx`(`orderId`, `createdAt`),
  INDEX `SupportTicket_productId_createdAt_idx`(`productId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SupportTicket`
  ADD CONSTRAINT `SupportTicket_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `SupportTicket_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `SupportTicket_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `SupportTicket_resolverId_fkey`
    FOREIGN KEY (`resolverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
