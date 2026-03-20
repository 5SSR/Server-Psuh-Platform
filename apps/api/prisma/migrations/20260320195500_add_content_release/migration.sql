CREATE TABLE `ContentRelease` (
  `id` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL,
  `action` VARCHAR(64) NOT NULL DEFAULT 'PUBLISH',
  `sourceReleaseId` VARCHAR(191) NULL,
  `snapshot` JSON NOT NULL,
  `summary` JSON NULL,
  `note` VARCHAR(191) NULL,
  `createdBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ContentRelease_version_key`(`version`),
  INDEX `ContentRelease_createdAt_idx`(`createdAt`),
  INDEX `ContentRelease_action_createdAt_idx`(`action`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
