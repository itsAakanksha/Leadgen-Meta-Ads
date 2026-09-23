# syntax=docker/dockerfile:1
# Local docker-compose only (production web is a static build on Vercel).
# Serves the production build with `vite preview`, which applies the same /api proxy
# as the dev server, pointed at the api container via API_PROXY_TARGET.
FROM node:22-slim
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @lead-intake/web...
COPY apps/web apps/web
RUN pnpm --filter @lead-intake/web build
WORKDIR /repo/apps/web
# vite preview writes a temp copy of its config under node_modules/.vite-temp.
RUN chown -R node:node /repo/apps/web
USER node
EXPOSE 5173
CMD ["node_modules/.bin/vite", "preview", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
