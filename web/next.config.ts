import type { NextConfig } from "next";

/* URL ของเว็บเดิมลงท้ายด้วย / ทุกหน้า (/series/<slug>/ · /watch/<slug>/ep-<n>/) — คงไว้เพื่อ SEO
   ไม่ให้ URL เปลี่ยนตอนย้ายระบบ · redirect ของลิงก์รุ่นเก่า (.html) อยู่ใน redirects() ข้างล่าง */
const nextConfig: NextConfig = {
  trailingSlash: true,
  output: "standalone",
  poweredByHeader: false,
  /* ปกใช้ไฟล์ย่อยที่สร้างไว้ล่วงหน้า (src/lib/covers.ts) แทน /_next/image — เครื่อง 1 CPU ย่อสดช้า 1–2 วิ/รูป และ Cloudflare ไม่แคช URL ที่ไม่มีนามสกุล
     ขนาดต้องตรงกับ POSTER_WIDTHS/WIDE_WIDTHS (loader จะปัดขึ้นให้ไฟล์ที่มีอยู่) */
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [414, 640, 828, 1024, 1440, 1920, 2640],
    imageSizes: [96, 160, 260],
  },
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
  async redirects() {
    const legacy: [string, string][] = [
      ["/search.html", "/search/"],
      ["/new.html", "/new/"],
      ["/popular.html", "/popular/"],
      ["/about.html", "/about/"],
      ["/contact.html", "/contact/"],
      ["/continue.html", "/library/?tab=continue"],
      ["/following.html", "/library/?tab=following"],
      ["/poster-gallery.html", "/behind-the-ai/"],
      ["/404.html", "/404/"],
    ];
    return [
      ...legacy.map(([source, destination]) => ({ source, destination, permanent: true })),
      { source: "/genre-:slug.html", destination: "/genre/:slug/", permanent: true },
      { source: "/series/:slug.html", destination: "/series/:slug/", permanent: true },
      { source: "/watch/:slug.html", destination: "/watch/:slug/ep-1/", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
