import type { Metadata, Viewport } from "next";
import "@/styles/tokens.css";
import "@/styles/site.css";
import "@/styles/next.css";
import { getCatalog } from "@/lib/content";
import { CatalogProvider } from "@/components/client/CatalogContext";
import { Toast } from "@/components/client/Toast";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getCatalog();
  return {
    metadataBase: new URL(settings.siteOrigin),
    title: { default: settings.siteName, template: `%s` },
    applicationName: settings.siteName,
    icons: { icon: "/favicon.svg" },
  };
}
export const viewport: Viewport = { themeColor: "#0E0D12", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await getCatalog();
  const lite = c.series.map((s) => ({
    slug: s.slug, title: s.title, hook: s.hook, synopsis: s.synopsis, genres: s.genres, cast: s.cast, eps: s.eps,
    status: s.status, ended: s.ended, orientation: s.orientation, c1: s.c1, c2: s.c2, cover: s.cover, coverWide: s.coverWide,
    episodes: s.episodes,
  }));
  return (
    <html lang="th">
      <body>
        <a className="skip" href="#main">ข้ามไปเนื้อหาหลัก</a>
        <CatalogProvider series={lite} genres={c.genres.map((g) => ({ slug: g.slug, label: g.label }))} hasViews={c.hasViews}>
          {children}
          <Toast />
        </CatalogProvider>
      </body>
    </html>
  );
}
