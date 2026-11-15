import { apiClient } from "@/lib/api";

/**
 * Bài viết — nối API Revita thật.
 *
 * Công khai: GET /posts, /posts/pinned, /posts/categories, /posts/:slug
 * (chỉ bài PUBLISHED mới đọc được; bài đọc theo slug trả {post, ...}).
 * Quản trị (ADMIN): GET/POST/PUT/DELETE /posts/admin/... — tạo bài là
 * 2 bước: POST /posts/admin/draft {title} rồi PUT /posts/admin/:id
 * với nội dung đầy đủ (backend không có endpoint tạo bài 1 bước).
 */

export interface PostCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  coverImage?: string | null;
  status?: string;
}

export interface PostAuthor {
  id?: string;
  adminCode?: string;
  name?: string | null;
}

export interface PostItem {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  coverImage?: string | null;
  status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  isPinned?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  likesCount?: number;
  commentsCount?: number;
  categories?: PostCategory[];
  author?: PostAuthor;
}

export interface PostListResult {
  items: PostItem[];
  total: number;
}

function asItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.posts)) return o.posts as T[];
    if (Array.isArray(o.data)) return o.data as T[];
  }
  return [];
}

function asTotal(data: unknown, items: unknown[]): number {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const p = o.pagination as Record<string, unknown> | undefined;
    if (typeof p?.total === "number") return p.total;
    if (typeof o.total === "number") return o.total;
  }
  return items.length;
}

export interface AdminPostPayload {
  title?: string;
  summary?: string;
  content?: string;
  coverImage?: string;
  status?: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  isPinned?: boolean;
  tags?: string[];
  categoryIds?: string[];
}

export const postService = {
  /* ---------------- Công khai ---------------- */

  /** Danh sách bài viết đã xuất bản (phân trang). */
  async getPosts(params?: {
    search?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PostListResult> {
    const res = await apiClient.get("/posts", { params });
    const items = asItems<PostItem>(res.data);
    return { items, total: asTotal(res.data, items) };
  },

  /** Các bài viết ghim nổi bật. */
  async getPinnedPosts(limit = 10): Promise<PostItem[]> {
    const res = await apiClient.get("/posts/pinned", { params: { limit } });
    return asItems<PostItem>(res.data);
  },

  /** Danh mục bài viết đã xuất bản (công khai). */
  async getCategories(): Promise<PostCategory[]> {
    const res = await apiClient.get("/posts/categories");
    return asItems<PostCategory>(res.data);
  },

  /** Chi tiết bài viết theo slug — chỉ bài PUBLISHED mới đọc được. */
  async getPostBySlug(slug: string): Promise<PostItem> {
    const res = await apiClient.get(`/posts/${slug}`);
    const data = res.data as { post?: PostItem } | PostItem;
    if (data && typeof data === "object" && "post" in data && data.post) {
      return data.post;
    }
    return data as PostItem;
  },

  /* ---------------- Quản trị (ADMIN) ---------------- */

  /** Danh sách bài viết cho quản trị (cả nháp + đã xuất bản). */
  async getAdminPosts(params?: {
    status?: string;
    search?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PostListResult> {
    const res = await apiClient.get("/posts/admin", { params });
    const items = asItems<PostItem>(res.data);
    return { items, total: asTotal(res.data, items) };
  },

  /** Chi tiết 1 bài viết cho quản trị (kể cả nháp). */
  async getAdminPost(postId: string): Promise<PostItem> {
    const res = await apiClient.get(`/posts/admin/${postId}`);
    return res.data as PostItem;
  },

  /**
   * Tạo bài nháp mới — chỉ nhận tiêu đề, backend tự sinh slug.
   * Muốn có nội dung thì gọi updatePost ngay sau đó.
   */
  async createDraft(title?: string): Promise<PostItem> {
    const res = await apiClient.post("/posts/admin/draft", {
      title: title?.trim() || undefined,
    });
    return res.data as PostItem;
  },

  /** Cập nhật bài viết (tiêu đề, tóm tắt, nội dung, ảnh bìa, trạng thái, ghim, chuyên mục). */
  async updatePost(postId: string, payload: AdminPostPayload): Promise<PostItem> {
    const res = await apiClient.put(`/posts/admin/${postId}`, payload);
    return res.data as PostItem;
  },

  /** Xóa bài viết. */
  async deletePost(postId: string): Promise<void> {
    await apiClient.delete(`/posts/admin/${postId}`);
  },

  /** Danh mục cho quản trị (cả nháp + đã xuất bản). */
  async getAdminCategories(): Promise<PostCategory[]> {
    const res = await apiClient.get("/posts/admin/categories");
    return asItems<PostCategory>(res.data);
  },

  /**
   * Tạo chuyên mục mới — backend tạo ở trạng thái DRAFT nên phải gọi
   * updateCategory publish ngay sau đó thì chuyên mục mới hiện công khai.
   */
  async createCategory(payload: {
    name: string;
    description?: string;
    slug?: string;
  }): Promise<PostCategory> {
    const res = await apiClient.post("/posts/admin/categories/draft", payload);
    return res.data as PostCategory;
  },

  /** Cập nhật chuyên mục (đổi tên/mô tả/trạng thái...). */
  async updateCategory(
    categoryId: string,
    payload: { name?: string; description?: string; slug?: string; status?: string },
  ): Promise<PostCategory> {
    const res = await apiClient.put(`/posts/admin/categories/${categoryId}`, payload);
    return res.data as PostCategory;
  },
};
