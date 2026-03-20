#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const schemaPath = './prisma/schema.prisma';
const isWindows = process.platform === 'win32';
const prismaBin = path.join(projectRoot, 'node_modules', '.bin', isWindows ? 'prisma.cmd' : 'prisma');

function shouldSkipAutoMigrate() {
  const raw = (process.env.SKIP_DB_AUTO_MIGRATE || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    ...options
  });
}

function resolvePrismaCommand() {
  if (fs.existsSync(prismaBin)) {
    return { cmd: prismaBin, prefixArgs: [] };
  }

  return {
    cmd: isWindows ? 'npx.cmd' : 'npx',
    prefixArgs: ['prisma']
  };
}

function main() {
  if (shouldSkipAutoMigrate()) {
    console.log('[启动检查] 已跳过自动数据库迁移（SKIP_DB_AUTO_MIGRATE=true）');
    return;
  }

  const { cmd, prefixArgs } = resolvePrismaCommand();
  console.log('[启动检查] 开始执行数据库迁移检查（prisma migrate deploy）...');

  const result = run(cmd, [...prefixArgs, 'migrate', 'deploy', '--schema', schemaPath]);
  if (result.status === 0) {
    console.log('[启动检查] 数据库迁移已就绪，继续启动 API。');
    return;
  }

  console.error('[启动检查] 数据库迁移失败，API 启动已中止。');
  console.error('[启动检查] 请先检查 DATABASE_URL 与数据库连接，再手动执行：');
  console.error('pnpm --filter @idc/api prisma:migrate -- --name init');
  process.exit(result.status || 1);
}

main();
