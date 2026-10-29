/* pm2 — รันเว็บบน VPS โดยไม่ใช้ Docker
   ครั้งแรก:  cd web && npm ci && npx prisma generate && npx prisma db push && npm run db:seed && npm run build
   รัน:        pm2 start deploy/ecosystem.config.cjs && pm2 save
   อัปเดต:     git pull && npm ci && npx prisma db push && npm run build && pm2 reload ailakorn */
module.exports = {
  apps: [{
    name: "ailakorn",
    cwd: __dirname + "/..",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 3000 -H 127.0.0.1",
    instances: 1,
    exec_mode: "fork",
    env: { NODE_ENV: "production" },
    max_memory_restart: "600M",
    time: true,
  }],
};
