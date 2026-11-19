import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getPostBySlug } from "@/lib/revita-server";
import { SITE_URL, displayAuthorName } from "@/lib/site";
import {
  sanitizeArticleHtml,
  articleExcerpt,
  extractFaq,
  buildArticleJsonLd,
} from "@/lib/article-seo";
import type { PostItem } from "@/services/post.service";
import {
  Calendar,
  User,
  Heart,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

/* SEO từng bài (19/11/2026): trước đây trang là Client Component, mọi bài
 * dùng chung metadata của toàn trang và nội dung fetch ở trình duyệt nên
 * Google không thấy bài trong HTML trả về. Nay là Server Component: bài
 * có sẵn trong HTML, metadata + JSON-LD riêng từng bài. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let post: PostItem | null = null;
  try {
    post = await getPostBySlug(slug);
  } catch {
    post = null;
  }
  if (!post) {
    return {
      title: "Bài viết không tồn tại | Bác sĩ Thanh Sang",
      description:
        "Bài viết này có thể đã bị gỡ hoặc đang ở trạng thái bản nháp.",
    };
  }
  const description =
    post.summary?.trim() || articleExcerpt(post.content ?? "", 160);
  const url = `${SITE_URL}/bai-viet/${slug}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: `${post.title} | Bác sĩ Thanh Sang`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description,
      url,
      type: "article",
      locale: "vi_VN",
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt ?? post.createdAt,
      authors: [displayAuthorName(post.author?.name)],
      images: post.coverImage
        ? [{ url: post.coverImage, alt: post.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default function BaiVietDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#fffefc] text-[#222222]">
      <Navbar />

      <main className="flex-1 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link
            href="/bai-viet"
            className="inline-flex items-center gap-1.5 text-sm text-[#222222]/70 hover:text-[#0f3e17] font-semibold mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tất cả bài viết</span>
          </Link>

          {/* Next 16 Cache Components: nội dung bài (fetch không cache) phải
              nằm sau <Suspense> để khung trang tĩnh vẫn prerender được;
              bài viết stream vào sau, vẫn đầy đủ trong HTML trả về. */}
          <Suspense
            fallback={
              <p className="text-center text-sm text-[#222222]/70 py-12">
                Đang tải bài viết...
              </p>
            }
          >
            <ArticleContent params={params} />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}

async function ArticleContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let post: PostItem | null = null;
  let loadError = "";
  try {
    post = await getPostBySlug(slug);
  } catch {
    loadError = "Không tải được bài viết. Kiểm tra kết nối máy chủ rồi thử lại.";
  }

  const html = post?.content ? sanitizeArticleHtml(post.content) : "";
  const faq = html ? extractFaq(html) : [];
  const description =
    post?.summary?.trim() || articleExcerpt(post?.content ?? "", 160);
  const jsonLd = post
    ? buildArticleJsonLd({ post, slug, description, faq })
    : null;

  if (!post) {
    return loadError ? (
      <div className="p-6 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-sm text-center">
        {loadError}
      </div>
    ) : (
      <div className="p-12 text-center bg-[#fffefc] border border-[#efeeeb] rounded-[14px] space-y-3">
        <h1 className="text-lg font-semibold text-[#0f3e17]">
          Bài viết không tồn tại hoặc chưa được xuất bản
        </h1>
        <p className="text-sm text-[#222222]/70">
          Bài viết này có thể đã bị gỡ hoặc đang ở trạng thái bản nháp.
        </p>
        <Link
          href="/bai-viet"
          className="inline-block px-5 py-2.5 bg-[#0f3e17] text-[#fffefc] rounded-[14px] text-xs font-semibold"
        >
          Xem các bài viết khác
        </Link>
      </div>
    );
  }

  return (
    <>
      <article>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {(post.categories ?? []).map((cat) => (
                  <span
                    key={cat.id}
                    className="text-[11px] font-semibold text-[#0f3e17] bg-[#e1f4df] px-2.5 py-0.5 rounded-full border border-[#efeeeb]"
                  >
                    {cat.name}
                  </span>
                ))}
                {post.isPinned && (
                  <span className="text-[11px] font-semibold text-[#fffefc] bg-[#0f3e17] px-2 py-0.5 rounded-full">
                    Ghim
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-display-serif text-[#0f3e17] tracking-[-0.01em] leading-snug">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#222222]/60 mt-3 pb-5 border-b border-[#efeeeb]">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#0f3e17]" />
                  {displayAuthorName(post.author?.name)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#0f3e17]" />
                  {formatDate(post.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-[#0f3e17]" />
                  {(post.likesCount ?? 0).toLocaleString("vi-VN")} lượt thích
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#0f3e17]" />
                  {(post.commentsCount ?? 0).toLocaleString("vi-VN")} bình luận
                </span>
              </div>

              {post.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-64 sm:h-80 object-cover rounded-[14px] my-6"
                />
              )}

              {post.summary && (
                <p className="text-base font-semibold text-[#0f3e17]/90 leading-relaxed my-6">
                  {post.summary}
                </p>
              )}

              {html ? (
                <div
                  className="post-content"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <p className="text-sm text-[#222222]/60 my-6">
                  Bài viết chưa có nội dung chi tiết.
                </p>
              )}

              {(post.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8">
                  {(post.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1 rounded-full bg-[#efeeeb] text-[#222222]/70"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA đặt lịch */}
              <div className="mt-10 p-6 rounded-[14px] bg-[#e1f4df] border border-[#efeeeb] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display-serif-medium text-[#0c2f10] text-lg">Cần tư vấn phục hồi chức năng?</h2>
                  <p className="text-xs text-[#222222]/70 mt-1">
                    Đặt lịch khám 1:1 với Bác sĩ Thanh Sang tại 193 Quang Trung, Đại Lộc, Đà Nẵng.
                  </p>
                </div>
                <Link
                  href="/dat-lich"
                  className="inline-flex items-center justify-center gap-2 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm px-6 py-3 rounded-[14px] transition-colors shrink-0"
                >
                  <span>Đặt lịch khám</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>

      {/* Dữ liệu có cấu trúc: JSON-LD phải nằm trong head/trang (qua code),
          không dán vào ô nội dung — dán vào nội dung sẽ hiện thành chữ. */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
}
