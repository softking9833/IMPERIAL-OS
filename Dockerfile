FROM node:20-bookworm-slim

WORKDIR /app

# Prisma needs OpenSSL on Debian slim
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
# Keep workspace shape valid for npm workspaces (web not built, but listed)
COPY apps/web/package.json apps/web/

RUN npm install

COPY packages/shared packages/shared
COPY apps/api apps/api

ENV DATABASE_URL="file:./prod.db"

RUN npm run build:api

WORKDIR /app/apps/api
EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/index.js"]
