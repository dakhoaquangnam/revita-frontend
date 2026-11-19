// SEO cho bài viết: lọc HTML, trích FAQ, sinh JSON-LD. Chạy phía server.
import DOMPurify from "isomorphic-dompurify";
import { SITE_URL } from "@/lib/site";
import type { PostItem } from "@/services/post.service";

/** Lọc HTML bài viết: bỏ <script>/<style>/thuộc tính nguy hiểm, giữ lại
 *  tiêu đề, đoạn, danh sách, bảng, link, ảnh và class (để hộp cảnh báo,
 *  bảng của bài viết giữ được kiểu). */
export function sanitizeArticleHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel"],
    // Không cho ảnh/link chạy JS; DOMPurify mặc định đã chặn javascript:.
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "style"],
  });
}

/** Bỏ thẻ HTML, giải thực thể cơ bản → chữ thuần. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Đoạn mở đầu ~160 ký tự để làm meta description khi bài không có tóm tắt. */
export function articleExcerpt(html: string, maxLen = 160): string {
  const text = stripHtml(html);
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** Trích cặp Hỏi–Đáp từ mục "Câu hỏi thường gặp" trong nội dung HTML
 *  (mỗi <h3> là một câu hỏi, <p> ngay sau là câu trả lời). */
export function extractFaq(html: string): FaqItem[] {
  const section = html.match(
    /<h2[^>]*>[^<]*Câu hỏi thường gặp[^<]*<\/h2>([\s\S]*)/i,
  );
  if (!section) return [];
  const body = section[1].split(/<h2[\s>]/i)[0];
  const pairs: FaqItem[] = [];
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const question = stripHtml(m[1]);
    const answer = stripHtml(m[2]);
    if (question && answer) pairs.push({ question, answer });
  }
  return pairs;
}

/** JSON-LD cho trang bài viết: MedicalWebPage + Person (tác giả) + FAQPage
 *  (chỉ khi trích được FAQ). @context phải là URL thuần "https://schema.org"
 *  — bản Blogger cũ ghi dạng link Markdown nên Google bỏ qua toàn bộ khối. */
export function buildArticleJsonLd(args: {
  post: PostItem;
  slug: string;
  description: string;
  faq: FaqItem[];
}): Record<string, unknown> {
  const { post, slug, description, faq } = args;
  const url = `${SITE_URL}/bai-viet/${slug}`;
  const authorName = post.author?.name ?? "Bác sĩ Thanh Sang";
  const graph: Record<string, unknown>[] = [
    {
      "@type": "MedicalWebPage",
      headline: post.title,
      name: post.title,
      description,
      inLanguage: "vi",
      url,
      datePublished: post.createdAt,
      dateModified: post.updatedAt ?? post.createdAt,
      author: { "@id": "#author" },
      ...(post.coverImage ? { image: [post.coverImage] } : {}),
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
    {
      "@type": "Person",
      "@id": "#author",
      name: authorName,
      jobTitle: "Bác sĩ Vật lý trị liệu – Phục hồi chức năng",
      url: SITE_URL,
    },
  ];
  if (faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
