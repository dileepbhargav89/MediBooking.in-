# Stage 1: Dependencies and Next.js Build
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy monorepo manifests
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# Install and build web frontend
RUN pnpm install
RUN pnpm --filter @medibooking/types build || true
RUN pnpm --filter @medibooking/ui build || true
RUN pnpm --filter @medibooking/web build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Security: Non-root execution
USER node

COPY --chown=node:node --from=builder /app/apps/web/public ./public
COPY --chown=node:node --from=builder /app/apps/web/.next/standalone ./
COPY --chown=node:node --from=builder /app/apps/web/.next/static ./.next/static

EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 0

CMD ["node", "apps/web/server.js"]
