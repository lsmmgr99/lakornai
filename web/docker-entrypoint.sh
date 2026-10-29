#!/bin/sh
# สร้าง/อัปเดต schema ของฐานข้อมูลใน volume แล้วค่อยเปิดเซิร์ฟเวอร์ · seed ครั้งแรกถ้ายังไม่มีผู้ใช้
set -e
cd /app
export DATABASE_URL="${DATABASE_URL:-file:/app/data/ailakorn.db}"
export UPLOAD_DIR="${UPLOAD_DIR:-/app/data/uploads}"
node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss >/dev/null
if [ ! -f /app/data/.seeded ]; then
  node node_modules/tsx/dist/cli.mjs prisma/seed.ts || true
  touch /app/data/.seeded
fi
exec node server.js
