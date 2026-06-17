# =============================================================================
# Multi-stage build for the NestJS API, targeting GCP Cloud Run.
#
# - Builder stage: install all deps, generate the Prisma client, compile to dist/.
# - Runner stage:  ship only production deps + compiled output (small image).
#
# Cloud Run injects PORT (default 8080); main.ts reads process.env.PORT.
# DATABASE_URL / JWT_SECRET are injected at deploy time (Secret Manager) — never
# baked into the image. See deploy/deploy-cloud-run.sh.
# =============================================================================

# ---- Builder ----------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

# Prisma's query engine needs openssl present at generate/runtime.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better layer caching).
COPY package*.json ./
RUN npm ci

# Generate the Prisma client (reads prisma.config.ts; no DB connection needed).
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Compile TypeScript -> dist/src/main.js
COPY . .
RUN npm run build

# Drop devDependencies but keep the generated client + built native modules.
RUN npm prune --omit=dev

# ---- Runner -----------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Pruned production node_modules (includes the generated Prisma client).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Kept so `prisma migrate deploy` can be run against this image if desired.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY package*.json ./

# Run as the unprivileged user shipped with the node image.
USER node

# Documentation only — Cloud Run routes to whatever $PORT the app listens on.
EXPOSE 8080

CMD ["node", "dist/src/main"]
