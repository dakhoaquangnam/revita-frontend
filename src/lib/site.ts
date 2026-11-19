// Địa chỉ công khai của web phòng khám — dùng cho canonical, Open Graph,
// JSON-LD và sitemap. Khi có tên miền riêng: đặt NEXT_PUBLIC_SITE_URL rồi
// build lại (không cần sửa code).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://23.132.252.189"
).replace(/\/$/, "");

export const SITE_NAME = "Phòng khám PHCN Bác sĩ Thanh Sang";

// Tên tác giả hiển thị công khai cho các bài viết của phòng khám.
// Tài khoản admin đăng bài có tên hệ thống "Admin Web" — không dùng tên đó
// làm tên tác giả vì độc giả và Google sẽ thấy một tài khoản chung chung.
export const SITE_AUTHOR_NAME = "Bs Nguyễn Thanh Sang";

/** Tên tác giả hiển thị công khai: tên thật của bác sĩ thay cho tên hệ
 *  thống của tài khoản admin; tên tác giả khác (nếu có) giữ nguyên. */
export function displayAuthorName(name?: string | null): string {
  if (!name || name === "Admin Web") return SITE_AUTHOR_NAME;
  return name;
}
