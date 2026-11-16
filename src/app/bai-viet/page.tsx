"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { postService, PostItem, PostCategory } from "@/services/post.service";
import { FileText, Calendar, User, Heart, Search } from "lucide-react";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

export default function BaiVietPage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [postResult, cats] = await Promise.all([
        postService.getPosts({ limit: 50 }),
        postService.getCategories(),
      ]);
      setPosts(postResult.items);
      setCategories(cats);
    } catch {
      setLoadError("Không tải được danh sách bài viết. Kiểm tra kết nối máy chủ rồi thử lại.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPosts = posts.filter((p) => {
    const matchCategory =
      selectedCategoryId === "all" ||
      (p.categories ?? []).some((c) => c.id === selectedCategoryId);
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.summary ?? "").toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const pinned = filteredPosts.filter((p) => p.isPinned);
  const rest = filteredPosts.filter((p) => !p.isPinned);

  return (
    <div className="min-h-screen flex flex-col bg-[#fffefc] text-[#222222]">
      <Navbar />

      <main className="flex-1 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="block eyebrow text-[#0f3e17]">
              CẨM NANG SỨC KHỎE & PHỤC HỒI CHỨC NĂNG
            </span>
            <h1 className="text-3xl sm:text-4xl font-display-serif text-[#0f3e17] tracking-[-0.01em] mt-3">
              Bài viết & Kiến thức PHCN
            </h1>
            <p className="text-sm text-[#222222]/80 mt-2">
              Phòng khám Bác sĩ Thanh Sang • 193 Quang Trung, Đại Lộc, Đà Nẵng
            </p>
          </div>

          {/* Tìm kiếm + lọc chuyên mục */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-[#fffefc] rounded-[14px] border border-[#efeeeb] mb-8">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#222222]/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm bài viết..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategoryId("all")}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  selectedCategoryId === "all"
                    ? "bg-[#0f3e17] text-[#fffefc] font-semibold"
                    : "bg-[#fffefc] text-[#222222]/70 hover:bg-[#e1f4df] border border-[#efeeeb]"
                }`}
              >
                Tất cả
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                    selectedCategoryId === cat.id
                      ? "bg-[#0f3e17] text-[#fffefc] font-semibold"
                      : "bg-[#fffefc] text-[#222222]/70 hover:bg-[#e1f4df] border border-[#efeeeb]"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <p className="text-center text-sm text-[#222222]/70 py-12">
              Đang tải danh sách bài viết...
            </p>
          ) : loadError ? (
            <div className="p-6 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-sm text-center space-y-3">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={loadData}
                className="px-4 py-2 bg-[#0f3e17] text-[#fffefc] rounded-[14px] text-xs font-semibold"
              >
                Tải lại
              </button>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#222222]/70 bg-[#fffefc] border border-[#efeeeb] rounded-[14px]">
              <FileText className="w-8 h-8 mx-auto text-[#0f3e17]/40 mb-2" />
              <p>Chưa có bài viết nào. Phòng khám sẽ cập nhật bài viết mới sớm.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pinned.length > 0 && (
                <div className="space-y-4">
                  <h2 className="eyebrow text-[#0f3e17]">
                    Bài viết nổi bật
                  </h2>
                  {pinned.map((post) => (
                    <PostCard key={post.id} post={post} featured />
                  ))}
                </div>
              )}
              <div className="space-y-4">
                {pinned.length > 0 && (
                  <h2 className="eyebrow text-[#0f3e17]">
                    Bài viết mới nhất
                  </h2>
                )}
                {rest.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PostCard({ post, featured }: { post: PostItem; featured?: boolean }) {
  return (
    <Link
      href={`/bai-viet/${post.slug}`}
      className={`block bg-[#fffefc] rounded-[14px] border p-5 sm:p-6 ${
        featured ? "border-[#efeeeb] bg-[#e1f4df]/30" : "border-[#efeeeb]"
      }`}
    >
      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt={post.title}
          className="w-full h-48 object-cover rounded-[14px] mb-4"
        />
      )}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold text-[#0f3e17] bg-[#e1f4df] px-2.5 py-0.5 rounded-full border border-[#efeeeb]">
          {post.categories?.[0]?.name ?? "Kiến thức PHCN"}
        </span>
        {post.isPinned && (
          <span className="text-[11px] font-semibold text-[#fffefc] bg-[#0f3e17] px-2 py-0.5 rounded-full">
            Ghim
          </span>
        )}
        <span className="text-[11px] text-[#222222]/50 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(post.createdAt)}
        </span>
      </div>
      <h3 className="font-display-serif text-[#0f3e17] text-lg leading-snug hover:underline">
        {post.title}
      </h3>
      {post.summary && (
        <p className="text-sm text-[#222222]/75 line-clamp-2 leading-relaxed mt-1.5">
          {post.summary}
        </p>
      )}
      <div className="flex items-center gap-4 text-[11px] text-[#222222]/60 mt-3">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3 text-[#0f3e17]" />
          {post.author?.name ?? "Phòng khám Bác sĩ Thanh Sang"}
        </span>
        <span className="flex items-center gap-1">
          <Heart className="w-3 h-3 text-[#0f3e17]" />
          {(post.likesCount ?? 0).toLocaleString("vi-VN")} lượt thích
        </span>
      </div>
    </Link>
  );
}
