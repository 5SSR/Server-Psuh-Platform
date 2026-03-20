FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# Builder
FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @idc/web build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

ENV PORT=3001
EXPOSE 3001
CMD ["node", "apps/web/server.js"]
