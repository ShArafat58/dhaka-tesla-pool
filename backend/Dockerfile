# Multi-stage build for the Dhaka Tesla Pool API.
# The final image runs migrations, seeds demo data, then starts the API.

FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

# --- deps: install workspace dependencies with the lockfile ---
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile

# --- runtime: copy source and run ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY shared ./shared
COPY backend ./backend

WORKDIR /app/backend
EXPOSE 4000

# On start: apply migrations, seed the story cast, then run the API.
CMD ["sh", "-c", "pnpm db:migrate:run && pnpm db:seed && pnpm start"]