import Link from "next/link";
import type { Catalog } from "@/lib/content";
import { U } from "@/lib/urls";
import { CoverImg } from "./CoverImg";

/* ไทล์ "เลือกตามแนว" (หน้าแรก + /browse/) · ปกแต่ละไทล์มาจาก genreCover ซึ่งจับคู่ไม่ให้ซ้ำกัน */
export function GenreBento({ c }: { c: Catalog }) {
  return (
    <div className="genre-bento">
      {c.genres.map((g) => {
        const items = c.seriesOfGenre(g.slug);
        const cover = c.genreCover.get(g.slug);
        return (
          <Link key={g.slug} className="gtile" href={U.genre(g.slug)}>
            {cover && <CoverImg s={cover} sizes="(min-width:960px) 200px, 30vw" />}
            <span>{g.label}</span><span className="cnt num">{items.length} เรื่อง</span>
          </Link>
        );
      })}
    </div>
  );
}
