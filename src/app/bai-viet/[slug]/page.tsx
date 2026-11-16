"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { postService, PostItem } from "@/services/post.service";
import { Calendar, User, Heart, MessageSquare, ArrowLeft, ArrowRight } from "lucide-react";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

export default function BaiVietDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-[#fffefc] text-[#222222]">
          <Navbar />
          <main className="flex-1 py-12 md:py-16">
            <p className="text-center text-sm text-[#222222]/70">
              Đang tải bài viết...
            </p>
          </main>
          <Footer />
        </div>
      }
    >
      <BaiVietDetailContent />
    </Suspense>
  );
}

function BaiVietDetailContent() {
  const params = useParams();
  const slug = String(params.slug ?? "");
  const [post, setPost] = useState<PostItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setIsLoading(true);
      setNotFound(false);
      setLoadError("");
      try {
        const data = await postService.getPostBySlug(slug);
        setPost(data);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setNotFound(true);
        } else {
          setLoadError("Không tải được bài viết. Kiểm tra kết nối máy chủ rồi thử lại.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [slug]);

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

          {isLoading ? (
            <p className="text-center text-sm text-[#222222]/70 py-12">
              Đang tải bài viết...
            </p>
          ) : notFound ? (
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
          ) : loadError ? (
            <div className="p-6 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-sm text-center">
              {loadError}
            </div>
          ) : post ? (
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
                  {post.author?.name ?? "Phòng khám Bác sĩ Thanh Sang"}
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

              {post.content ? (
                <div className="text-[15px] leading-[1.9] text-[#222222]/90 whitespace-pre-line">
                  {post.content}
                </div>
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
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
