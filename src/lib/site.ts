// Địa chỉ công khai của web phòng khám — dùng cho canonical, Open Graph,
// JSON-LD và sitemap. Khi có tên miền riêng: đặt NEXT_PUBLIC_SITE_URL rồi
// build lại (không cần sửa code).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://23.132.252.189"
).replace(/\/$/, "");

export const SITE_NAME = "Phòng khám PHCN Bác sĩ Thanh Sang";
