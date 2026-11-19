import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* Robots (19/11/2026): cho phép mọi bot lập chỉ mục, trỏ tới sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
