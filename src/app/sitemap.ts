import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* Sitemap (19/11/2026): trang công khai + từng bài viết đã xuất bản.
 * Lấy danh sách bài từ API công khai; lỗi mạng thì chỉ trả các trang tĩnh
 * để sitemap không bao giờ làm hỏng build. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/dat-lich`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/bai-viet`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  try {
    const apiBase = (
      process.env.NEXT_PUBLIC_API_URL ?? "http://23.132.252.189/api"
    ).replace(/\/$/, "");
    const res = await fetch(`${apiBase}/posts?limit=100`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return staticRoutes;
    const data = (await res.json()) as {
      items?: { slug: string; updatedAt?: string; createdAt: string }[];
    };
    const posts = Array.isArray(data) ? [] : (data.items ?? []);
    const postRoutes: MetadataRoute.Sitemap = posts
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${SITE_URL}/bai-viet/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(p.createdAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }));
    return [...staticRoutes, ...postRoutes];
  } catch {
    return staticRoutes;
  }
}
