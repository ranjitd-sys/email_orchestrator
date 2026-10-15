# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3.14
WORKDIR /app

ENV NODE_ENV=production

# Copy manifests first so the dependency layer is cached until deps change.
COPY package.json bun.lock tsconfig.json ./
COPY apps/orchestrator/package.json ./apps/orchestrator/
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

RUN bun install --frozen-lockfile --production

# Copy the runtime sources the orchestrator imports (@email/db, @email/shared).
COPY packages ./packages
COPY apps/orchestrator ./apps/orchestrator

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "apps/orchestrator/src/index.ts"]
