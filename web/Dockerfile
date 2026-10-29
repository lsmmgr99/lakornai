# AiLakorn (Next.js) — image เดียวรันทั้งเว็บผู้ชมและหลังบ้าน
# build:  docker build -t ailakorn .
# run:    docker run -d --name ailakorn -p 3000:3000 -v ailakorn-data:/app/data --env-file .env ailakorn
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="file:./data/build.db" AUTH_SECRET="build-only-not-used-at-runtime-0000" UPLOAD_DIR="./data/uploads" SITE_ORIGIN="https://ailakorn.com"
# build ต้องมีฐานข้อมูลให้ generateStaticParams อ่าน (ว่างก็ได้) — สร้างชั่วคราวแล้วทิ้ง
RUN npx prisma generate && npx prisma db push --skip-generate && npm run build && rm -rf data

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/tsx ./node_modules/tsx
COPY --from=build /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=build /app/node_modules/sharp ./node_modules/sharp
COPY --from=build /app/node_modules/@img ./node_modules/@img
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p data/uploads
VOLUME ["/app/data"]
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
