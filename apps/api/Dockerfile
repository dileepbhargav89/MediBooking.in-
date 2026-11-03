# Stage 1: Pruning & Building
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy root monorepo manifests
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies and build API package
RUN pnpm install
RUN pnpm --filter @medibooking/types build || true
RUN pnpm --filter @medibooking/database build || true
RUN pnpm --filter @medibooking/api build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Security: run as non-root user
USER node

# Copy compiled artifacts and modules
COPY --chown=node:node --from=builder /app ./

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "apps/api/dist/server.js"]

