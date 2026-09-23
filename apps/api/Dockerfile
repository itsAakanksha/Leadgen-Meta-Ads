# syntax=docker/dockerfile:1
# Build context: repository root (pnpm workspace). Used by Render and docker-compose.
#   docker build -f apps/api/Dockerfile -t lead-intake-api .

# Debian slim rather than Alpine: Prisma's schema engine (used by `migrate deploy`)
# ships glibc builds, and slim avoids musl/OpenSSL surprises.
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# ---- build: install the api workspace, generate the Prisma client, compile TypeScript
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
RUN pnpm install --frozen-lockfile --filter @lead-intake/api...
COPY apps/api apps/api
RUN pnpm --filter @lead-intake/api build
# A self-contained copy of the api with production dependencies only.
RUN pnpm --filter @lead-intake/api deploy --prod --legacy /out \
  && cp -r apps/api/dist /out/dist

# ---- runtime
FROM base AS runtime
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Render's free plan has no pre-deploy hook, so migrations run on start (idempotent).
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist/server.js"]
