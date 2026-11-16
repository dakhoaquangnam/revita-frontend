"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit3,
  Trash2,
  Share2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  X,
  ExternalLink,
  Tag,
  Calendar,
  User,
  Filter,
  ShieldAlert,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  postService,
  PostItem,
  PostCategory,
  AdminPostPayload,
} from "@/services/post.service";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

function errorMessage(err: any): string {
  return (
    err?.response?.data?.message ||
    err?.message ||
    "Đã xảy ra lỗi. Vui lòng thử lại."
  );
}

export default function PostsManagementPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Tạo chuyên mục mới ngay trong form (khi chưa có chuyên mục nào).
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    categoryId: "",
    summary: "",
    content: "",
    coverImage: "",
    isPinned: false,
    status: "PUBLISHED" as "PUBLISHED" | "DRAFT",
  });

  // Nạp bài viết + chuyên mục thật từ backend (không còn dữ liệu mẫu localStorage).
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [postResult, cats] = await Promise.all([
        postService.getAdminPosts({ limit: 100 }),
        postService.getAdminCategories(),
      ]);
      setPosts(postResult.items);
      setCategories(cats);
    } catch (err: any) {
      setLoadError(
        err?.response?.status === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại bằng tài khoản Admin."
          : err?.response?.status === 403
            ? "Tài khoản này không có quyền quản trị bài viết. Cần đăng nhập bằng tài khoản Admin."
            : "Không tải được danh sách bài viết: " + errorMessage(err),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setToastError("");
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const showError = (msg: string) => {
    setToastMessage("");
    setToastError(msg);
    setTimeout(() => setToastError(""), 5000);
  };

  const handleOpenCreateModal = () => {
    setEditingPost(null);
    setShowNewCategory(false);
    setNewCategoryName("");
    setFormData({
      title: "",
      categoryId: categories[0]?.id ?? "",
      summary: "",
      content: "",
      coverImage: "",
      isPinned: false,
      status: "PUBLISHED",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (post: PostItem) => {
    setEditingPost(post);
    setShowNewCategory(false);
    setNewCategoryName("");
    setFormData({
      title: post.title,
      categoryId: post.categories?.[0]?.id ?? "",
      summary: post.summary ?? "",
      content: post.content ?? "",
      coverImage: post.coverImage ?? "",
      isPinned: post.isPinned ?? false,
      status: post.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    });
    setIsModalOpen(true);
  };

  const buildPayload = (): AdminPostPayload => ({
    title: formData.title.trim(),
    summary: formData.summary.trim() || undefined,
    content: formData.content.trim() || undefined,
    coverImage: formData.coverImage.trim() || undefined,
    status: formData.status,
    isPinned: formData.isPinned,
    categoryIds: formData.categoryId ? [formData.categoryId] : undefined,
  });

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showError("Vui lòng nhập tiêu đề bài viết.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingPost) {
        // Cập nhật bài viết thật trên backend.
        await postService.updatePost(editingPost.id, buildPayload());
        showToast("Đã cập nhật bài viết thành công!");
      } else {
        // Backend chỉ có tạo nháp (nhận mỗi tiêu đề) rồi cập nhật nội dung:
        // 2 bước trong 1 lần bấm — lỗi ở bước nào thì báo đúng bước đó.
        const draft = await postService.createDraft(formData.title.trim());
        try {
          await postService.updatePost(draft.id, buildPayload());
        } catch (updateErr: any) {
          showError(
            "Đã tạo bản nháp nhưng chưa lưu được nội dung: " +
              errorMessage(updateErr) +
              ".",
          );
          setIsModalOpen(false);
          await loadData();
          return;
        }
        showToast("Đã tạo bài viết mới thành công!");
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      showError("Lưu bài viết thất bại: " + errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    try {
      await postService.deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      showToast("Đã xóa bài viết.");
    } catch (err: any) {
      showError("Xóa bài viết thất bại: " + errorMessage(err));
    }
  };

  const handleToggleStatus = async (post: PostItem) => {
    const nextStatus = post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await postService.updatePost(post.id, { status: nextStatus });
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: nextStatus } : p)),
      );
      showToast(
        nextStatus === "PUBLISHED"
          ? "Đã xuất bản bài viết."
          : "Đã chuyển bài viết về bản nháp.",
      );
    } catch (err: any) {
      showError("Đổi trạng thái thất bại: " + errorMessage(err));
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      showError("Vui lòng nhập tên chuyên mục.");
      return;
    }
    setIsCreatingCategory(true);
    try {
      // Backend tạo chuyên mục ở trạng thái DRAFT nên phải publish ngay
      // thì chuyên mục mới hiện công khai.
      const created = await postService.createCategory({ name });
      await postService.updateCategory(created.id, { status: "PUBLISHED" });
      const cats = await postService.getAdminCategories();
      setCategories(cats);
      setFormData((prev) => ({ ...prev, categoryId: created.id }));
      setShowNewCategory(false);
      setNewCategoryName("");
      showToast(`Đã tạo chuyên mục “${name}”.`);
    } catch (err: any) {
      showError("Tạo chuyên mục thất bại: " + errorMessage(err));
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSharePost = (post: PostItem) => {
    if (post.status !== "PUBLISHED") {
      showError("Bài nháp chưa có link công khai — hãy xuất bản trước khi chia sẻ.");
      return;
    }
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(
        `${window.location.origin}/bai-viet/${post.slug}`,
      );
      showToast("Đã sao chép liên kết bài viết!");
    }
  };

  // Filter logic (lọc trên danh sách đã nạp).
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

  const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;
  const draftCount = posts.filter((p) => p.status !== "PUBLISHED").length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount ?? 0), 0);

  if (user && user.role !== "ADMIN") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#fffefc] border border-rose-200 rounded-[14px] p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-display-serif text-rose-800 tracking-[-0.01em]">Quyền truy cập bị từ chối</h2>
            <p className="text-xs text-[#222222]/70 mt-1">
              Mục Quản lý Bài viết & Chiến dịch Quảng bá chỉ dành riêng cho tài khoản Quản trị viên (Admin).
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#0f3e17] text-[#fffefc] rounded-[14px] text-xs font-semibold hover:bg-[#0c2f10] transition-colors"
          >
            Quay lại Bàn làm việc
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#0f3e17] text-[#fffefc] px-4 py-2.5 rounded-[14px] text-xs font-semibold animate-in fade-in duration-200 flex items-center gap-2 border border-[#efeeeb]">
          <CheckCircle2 className="w-4 h-4 text-[#e1f4df]" />
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-20 right-6 z-50 bg-rose-700 text-white px-4 py-2.5 rounded-[14px] text-xs font-semibold animate-in fade-in duration-200 flex items-center gap-2 border border-rose-500 max-w-md">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#efeeeb]">
        <div>
          <span className="text-[#0f3e17] eyebrow">
            QUẢNG BÁ PHÒNG KHÁM & MARKETING
          </span>
          <h1 className="text-2xl sm:text-3xl font-display-serif text-[#0f3e17] tracking-[-0.01em] mt-1">
            Quản lý Bài viết & Cẩm nang Y tế
          </h1>
          <p className="text-xs text-[#222222]/70 mt-1">
            Biên tập bài viết chuyên khoa, hướng dẫn bài tập và câu chuyện phục hồi tại 193 Quang Trung, Đại Lộc, Đà Nẵng
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="btn-forest inline-flex items-center gap-2 text-xs py-2.5 px-4 rounded-[14px] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Viết bài quảng bá mới</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-[14px] bg-[#fffefc] border border-[#efeeeb]">
          <p className="text-[11px] text-[#222222]/60 font-medium">Tổng số bài viết</p>
          <p className="text-2xl font-display-serif text-[#0f3e17] mt-1 tracking-[-0.01em]">{posts.length}</p>
        </div>
        <div className="p-4 rounded-[14px] bg-[#e1f4df]/50 border border-[#efeeeb]">
          <p className="text-[11px] text-[#0f3e17] font-semibold">Đã xuất bản</p>
          <p className="text-2xl font-display-serif text-[#0f3e17] mt-1 tracking-[-0.01em]">{publishedCount}</p>
        </div>
        <div className="p-4 rounded-[14px] bg-[#fffefc] border border-[#efeeeb]">
          <p className="text-[11px] text-[#222222]/60 font-medium">Bản nháp</p>
          <p className="text-2xl font-display-serif text-[#222222]/80 mt-1 tracking-[-0.01em]">{draftCount}</p>
        </div>
        <div className="p-4 rounded-[14px] bg-[#b1dbb8]/30 border border-[#efeeeb]">
          <p className="text-[11px] text-[#0f3e17] font-semibold">Tổng lượt thích</p>
          <p className="text-2xl font-display-serif text-[#0f3e17] mt-1 tracking-[-0.01em]">
            {totalLikes.toLocaleString("vi-VN")}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#fffefc] rounded-[14px] border border-[#efeeeb]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#222222]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm bài viết theo tiêu đề hoặc nội dung..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
          />
        </div>

        {/* Categories Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategoryId("all")}
            className={`text-xs px-3 py-1.5 rounded-[14px] transition-colors cursor-pointer ${
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
              className={`text-xs px-3 py-1.5 rounded-[14px] transition-colors cursor-pointer ${
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

      {/* Load error */}
      {loadError && (
        <div className="p-4 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {loadError}
          </span>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1.5 bg-[#0f3e17] text-[#fffefc] rounded-[14px] font-semibold shrink-0"
          >
            Tải lại
          </button>
        </div>
      )}

      {/* Posts Table / Card List */}
      <div className="bg-[#fffefc] rounded-[14px] border border-[#efeeeb] overflow-hidden">
        <div className="divide-y divide-[#efeeeb]">
          {isLoading ? (
            <div className="p-12 text-center text-[#222222]/60 text-xs">
              Đang tải danh sách bài viết...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-12 text-center text-[#222222]/60 text-xs space-y-2">
              <p>
                {posts.length === 0
                  ? "Chưa có bài viết nào trên hệ thống."
                  : "Không tìm thấy bài viết nào phù hợp với bộ lọc."}
              </p>
              {posts.length === 0 && (
                <p>
                  Bấm “Viết bài quảng bá mới” để đăng bài đầu tiên — bài xuất bản sẽ
                  hiện ở trang Bài viết cho bệnh nhân đọc.
                </p>
              )}
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className="p-5 sm:p-6 hover:bg-[#e1f4df]/20 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#0f3e17] bg-[#e1f4df] px-2.5 py-0.5 rounded-full border border-[#efeeeb]">
                      {post.categories?.[0]?.name ?? "Chưa xếp chuyên mục"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(post)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                        post.status === "PUBLISHED"
                          ? "bg-[#0f3e17] text-[#fffefc] border-transparent"
                          : "bg-[#efeeeb] text-[#222222]/70 border-[#efeeeb]"
                      }`}
                      title="Bấm để đổi trạng thái"
                    >
                      {post.status === "PUBLISHED" ? "✓ Đã xuất bản" : "Bản nháp"}
                    </button>
                    <span className="text-[11px] text-[#222222]/50 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(post.createdAt)}
                    </span>
                  </div>

                  <h3 className="font-display-serif text-[#0f3e17] text-base leading-snug tracking-[-0.01em]">
                    {post.status === "PUBLISHED" ? (
                      <Link
                        href={`/bai-viet/${post.slug}`}
                        target="_blank"
                        className="hover:underline"
                      >
                        {post.title}
                      </Link>
                    ) : (
                      post.title
                    )}
                  </h3>

                  <p className="text-xs text-[#222222]/75 line-clamp-2 leading-relaxed">
                    {post.summary ?? ""}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-[#222222]/60 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-[#0f3e17]" />
                      {post.author?.name ?? user?.name ?? "Quản trị viên"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-[#0f3e17]" />
                      {(post.likesCount ?? 0).toLocaleString("vi-VN")} lượt thích
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-[#0f3e17]" />
                      {(post.commentsCount ?? 0).toLocaleString("vi-VN")} bình luận
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(post)}
                    className="p-2 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-[#0f3e17] hover:bg-[#e1f4df] transition-colors"
                    title="Chỉnh sửa bài viết"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSharePost(post)}
                    className="p-2 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-[#0f3e17] hover:bg-[#e1f4df] transition-colors"
                    title="Sao chép link chia sẻ"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-red-600 hover:bg-red-50 transition-colors"
                    title="Xóa bài viết"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create / Edit Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f3e17]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fffefc] rounded-[14px] border border-[#efeeeb] max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#efeeeb] flex items-center justify-between">
              <div>
                <span className="text-[#0f3e17] eyebrow">
                  Biên tập bài viết
                </span>
                <h3 className="text-lg font-display-serif text-[#0f3e17] tracking-[-0.01em]">
                  {editingPost ? "Chỉnh sửa bài viết quảng bá" : "Tạo bài viết quảng bá mới"}
                </h3>
                <p className="text-[11px] text-[#222222]/60 mt-0.5">
                  Tác giả: {user?.name ?? "Quản trị viên"} (lấy theo tài khoản đang đăng nhập)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-[14px] hover:bg-[#efeeeb] text-[#222222]/60 hover:text-[#222222]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSavePost} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Tiêu đề */}
              <div>
                <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                  Tiêu đề bài viết quảng bá *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Phục hồi chức năng sau mổ dây chằng ACL tại Bác sĩ Thanh Sang..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                />
              </div>

              {/* Chuyên mục */}
              <div>
                <label className="block text-xs font-semibold text-[#0f3e17] mb-1">Chuyên mục</label>
                {categories.length === 0 ? (
                  <p className="text-xs text-[#222222]/70">
                    Chưa có chuyên mục nào. Tạo chuyên mục đầu tiên ở dưới để xếp bài viết.
                  </p>
                ) : (
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                  >
                    <option value="">— Không xếp chuyên mục —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
                {showNewCategory ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Tên chuyên mục mới, ví dụ: Kiến thức PHCN"
                      className="flex-1 px-3 py-2 text-xs bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={isCreatingCategory}
                      className="px-3 py-2 text-xs font-semibold bg-[#0f3e17] text-[#fffefc] rounded-[14px] disabled:opacity-50"
                    >
                      {isCreatingCategory ? "Đang tạo..." : "Tạo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewCategory(false)}
                      className="px-3 py-2 text-xs border border-[#efeeeb] rounded-[14px]"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="mt-1.5 text-xs text-[#0f3e17] hover:text-[#0c2f10] font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tạo chuyên mục mới
                  </button>
                )}
              </div>

              {/* Tóm tắt */}
              <div>
                <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                  Tóm tắt ngắn (Hiển thị thẻ Facebook/Zalo/SEO)
                </label>
                <textarea
                  rows={2}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Mô tả ngắn gọn từ 1 - 2 câu nêu bật giá trị điều trị..."
                  className="w-full px-3.5 py-2 text-xs bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                />
              </div>

              {/* Nội dung chi tiết */}
              <div>
                <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                  Nội dung chi tiết bài viết
                </label>
                <textarea
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Nội dung phác đồ điều trị, kỹ thuật tập, lời dặn của bác sĩ..."
                  className="w-full px-3.5 py-2.5 text-xs bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                />
              </div>

              {/* Ảnh bìa + Ghim */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                    Ảnh bìa (đường dẫn URL, không bắt buộc)
                  </label>
                  <input
                    type="text"
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 text-xs bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#0f3e17] cursor-pointer pt-5">
                  <input
                    type="checkbox"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="w-4 h-4 accent-[#0f3e17]"
                  />
                  Ghim bài viết nổi bật
                </label>
              </div>

              {/* Trạng thái */}
              <div>
                <label className="block text-xs font-semibold text-[#0f3e17] mb-1">Trạng thái bài đăng</label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === "PUBLISHED"}
                      onChange={() => setFormData({ ...formData, status: "PUBLISHED" })}
                      className="text-[#0f3e17] focus:ring-[#0f3e17]"
                    />
                    <span className="font-semibold text-[#0f3e17]">Xuất bản ngay</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === "DRAFT"}
                      onChange={() => setFormData({ ...formData, status: "DRAFT" })}
                      className="text-[#0f3e17] focus:ring-[#0f3e17]"
                    />
                    <span className="text-[#222222]/80">Lưu bản nháp</span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[#efeeeb] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-[14px] border border-[#efeeeb] hover:bg-[#efeeeb]/50 text-[#222222]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-forest text-xs py-2 px-5 rounded-[14px] disabled:opacity-50"
                >
                  {isSaving ? "Đang lưu..." : editingPost ? "Lưu thay đổi" : "Tạo bài viết"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
