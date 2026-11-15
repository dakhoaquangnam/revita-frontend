# Revita Frontend — bản đã sửa lỗi nghiêm trọng (13/11/2026)

Bản này sửa các lỗi "dữ liệu giả / thành công giả" trong code gốc, nối các luồng
chính vào API Revita thật. Đã kiểm chứng: `npx tsc --noEmit` sạch,
`npm run build` thành công, trang chủ trả 200, `POST /api/book` khi chưa cấu
hình tài khoản lễ tân trả 503 đúng như thiết kế.

## 1. Cấu hình trước khi chạy

```bash
npm install        # hoặc npm ci
cp .env.local.example .env.local
```

Mở `.env.local`, giữ nguyên 2 URL công khai, điền thêm:

```
REVITA_SERVICE_EMAIL=<email tài khoản lễ tân>
REVITA_SERVICE_PASSWORD=<mật khẩu tài khoản lễ tân>
```

- Tài khoản lễ tân tạo bằng `POST /api/staff` với vai trò RECEPTIONIST.
- Mật khẩu do backend tự sinh, chỉ biết qua email hoặc log khi
  `EMAIL_DRY_RUN=true` — giữ lại mật khẩu đó khi tạo tài khoản.
- KHÔNG có 2 biến này thì trang /dat-lich vẫn mở được nhưng bấm "Hoàn tất"
  sẽ báo "Chưa cấu hình tài khoản dịch vụ đặt lịch".

Chạy:

```bash
npm run dev
# Mở http://localhost:3001 (cổng 3000 là backend Revita, Next sẽ nhảy sang 3001)
```

## 2. Đã sửa gì

### Bản v4 — 13/11 tối: đăng bài viết nối API thật (Bài viết & Quảng bá)
- **Rà code Gemini**: trang Quản lý Bài viết trước đây là đồ giả — 4 bài mẫu +
  lượt xem tự bịa, tạo/sửa/xóa chỉ ghi vào `localStorage` của trình duyệt,
  nút chia sẻ copy link chết `/#bai-tap-phcn`; không có trang đọc công khai,
  service `post.service.ts` có sẵn nhưng không trang nào dùng.
- **Viết lại `post.service.ts`**: unwrap đúng dạng trả về của backend
  (`{items, pagination}`, chi tiết theo slug trả `{post, ...}`); thêm toàn bộ
  hàm quản trị (danh sách, tạo nháp, cập nhật, xóa, chuyên mục).
- **Viết lại trang `/dashboard/posts` nối API thật**: nạp danh sách + chuyên
  mục từ backend; tạo bài = 2 bước đúng thiết kế backend
  (`POST /posts/admin/draft` rồi `PUT /posts/admin/:id`); sửa/xóa/đổi trạng
  thái qua API; tạo chuyên mục ngay trong form (tạo nháp rồi publish thì mới
  hiện công khai); tác giả lấy theo tài khoản đang đăng nhập (backend không có
  trường nhập tác giả); nút chia sẻ copy link thật `/bai-viet/<slug>` (bài
  nháp chưa có link — báo rõ); bỏ hoàn toàn dữ liệu mẫu, localStorage,
  lượt xem giả (backend không có trường lượt xem — thẻ thống kê đổi thành
  tổng lượt thích thật).
- **Thêm trang đọc công khai**: `/bai-viet` (danh sách bài đã xuất bản, lọc
  theo chuyên mục, tìm kiếm, bài ghim lên đầu) và `/bai-viet/[slug]` (đọc chi
  tiết, có nút Đặt lịch khám); navbar thêm mục “Bài viết”.
- **Cần tài khoản Admin để dùng**: mọi endpoint quản trị bài viết đều yêu cầu
  role ADMIN. Tạo bằng Swagger `POST /api/staff` với role `ADMIN`
  (dùng email khác 2 tài khoản đã có, vd `dakhoaquangnam+admin@gmail.com`,
  bỏ trống SĐT), lấy mật khẩu từ log Docker rồi đăng nhập ở `/dashboard/login`
  và mở `/dashboard/posts`.

### Bản v3 — 13/11 tối: buồng khám có giao diện chọn dịch vụ chỉ định
- Tab "3. Kê đơn & Chỉ định Bài tập" trong buồng khám thêm **Phần 2: Chỉ định Dịch vụ điều trị**:
  danh sách dịch vụ của bác sĩ trong ca hôm nay (kèm giá + thời lượng thật từ
  `GET /appointment-booking/doctors/:id/services`), tick chọn, ghi chú chỉ định,
  xem tạm tính. Khi bấm "Hoàn tất Ca khám & Lưu Bệnh án", hệ thống tạo phiếu
  chỉ định thật qua `POST /prescriptions` (gắn vào bệnh án vừa lưu) — lỗi thì
  báo lỗi, không báo thành công giả. Mã phiếu hiện ngay dưới mục chỉ định và
  trong phiếu in (mục 5) để đưa bệnh nhân ra quầy thu ngân quét.
- Lựa chọn dịch vụ + ghi chú + mã phiếu được đặt lại khi chuyển sang bệnh nhân
  khác (không rò sang bệnh nhân sau).
- Luồng đầy đủ giờ chạy được: đặt lịch web → tiếp đón/kiosk → buồng khám khám
  + chỉ định dịch vụ → thu ngân quét mã phiếu → xem trước giá → tạo hóa đơn →
  xác nhận thu tiền.

### Bản v2 — 13/11 trưa

**Đặt lịch (/dat-lich) — viết lại hoàn toàn**
- Trước: tự sinh mã RV-xxx, chuyên khoa/dịch vụ/giờ hardcode, VietQR cọc tĩnh
  (MB 0369117117) — không nối backend.
- Nay: chuyên khoa, bác sĩ, dịch vụ (kèm giá thật), khung giờ trống đều lấy
  từ API thật. Đặt lịch qua Route Handler `POST /api/book` — tạo hồ sơ rồi
  đặt hộ bằng JWT lễ tân giữ phía server, trả mã `APT-...` thật, giới hạn
  5 lần/10 phút/IP. Ngày mặc định = hôm nay (không còn hardcode 2026-11-13),
  ngày sinh là ô `type="date"`, bỏ tuỳ chọn "bác sĩ bất kỳ" (backend bắt
  buộc doctorId). **Đã bỏ cọc online khỏi luồng đặt lịch** — backend không
  có tính năng cọc; thanh toán tại quầy sau khi khám.

**appointment.service.ts — viết lại**
- Sửa 3 đường sai: slots, đặt lịch, lịch hẹn của tôi (đường cũ không tồn tại
  trên backend). Thêm: bác sĩ theo chuyên khoa, dịch vụ theo bác sĩ+ngày
  (date bắt buộc), tra cứu theo mã, lịch hẹn của bác sĩ. Kiểu response khớp
  DTO thật (`appointmentCode`, không còn `code`/`message` bịa).

**Buồng khám (doctor)**
- Bỏ hàng đợi mẫu A-001..A-004: nạp lịch hẹn thật của bác sĩ hôm nay.
- Lưu bệnh án lỗi thì báo lỗi, không đánh COMPLETED/mở phiếu in nữa.
- Lưu xong tạo thêm đơn thuốc thật từ danh sách thuốc đã kê.
- Phiếu khám reset khi chuyển bệnh nhân (không rò số liệu bệnh nhân trước).

**Thu ngân (cashier)**
- Quét phiếu: lỗi thì báo lỗi thật; xem trước giá thật qua
  `POST /invoice-payments/preview` (giá sau khuyến mãi).
- Tạo hóa đơn đúng DTO `{prescriptionCode, selectedServiceIds, paymentMethod}`;
  xác nhận thu tiền chỉ gửi `{invoiceCode}`. Xóa VietQR tĩnh MB hardcode —
  chuyển khoản giờ dùng QR PayOS động do backend tạo.
- `prescriptionServiceId` và tên bác sĩ map đúng từ response thật.

**Tiếp đón (receptionist) + Kiosk**
- Tra cứu theo mã hẹn thật (404 → báo không tìm thấy, không bịa bệnh nhân).
- Check-in lấy tuổi/ưu tiên (khuyết tật, thai) từ hồ sơ thật, không hardcode.
- Vé giả trong catch đã bỏ hết: lỗi thì hiện banner đỏ + đọc lỗi bằng TTS.
- Bỏ 2 quầy giả hardcode; lỗi tải quầy/hàng đợi hiện banner + nút Thử lại.

**Tài khoản (tai-khoan)**
- Đăng nhập lỗi thì báo lỗi thật (bỏ bịa user demo + token `demo_jwt_token_2026`).
- Đăng ký thành luồng OTP thật 2 bước (thông tin → OTP) + tự đăng nhập sau
  khi tạo. Tra cứu vé dùng API thật trước, biên lai máy chỉ là nguồn phụ.
- 4 tab (lịch hẹn / bệnh án / phiếu chỉ định / hóa đơn) nạp dữ liệu thật;
  bệnh án đọc FIM/ROM/đau từ `content` JSONB.

**Socket + Auth**
- Nghe event `next_patient_called` thay cho `ticket_called` (backend không
  bao giờ phát `ticket_called`).
- Xóa hẳn demo login + khối "Quick Demo Switcher" + mật khẩu demo 123456789
  khỏi trang đăng nhập.

## 3. Còn thiếu — chưa làm trong bản này, cần anh quyết / backend bổ sung

1. **Gọi bệnh nhân vào buồng khám** vẫn chỉ qua BroadcastChannel + TTS nội bộ:
   backend không có endpoint gọi vào buồng (chỉ có `POST /prescriptions/call-next-patient`
   ở quầy). Màn hình buồng khám không tự cập nhật từ server.
2. **Đăng ký OTP** phụ thuộc backend đã cấu hình gửi SMS/email hay chưa.
3. **PayOS**: nút chuyển khoản chỉ tạo được giao dịch khi backend đã cấu hình
   khóa PayOS.
4. **Triệu chứng** form có thu nhưng backend không có trường chứa — chỉ hiển
   thị ở màn xác nhận, bác sĩ ghi nhận lúc khám.

## 4. Luồng thử end-to-end (cần backend Revita Docker đang chạy)

1. Web: /dat-lich → chọn chuyên khoa → bác sĩ → dịch vụ → giờ → nhập thông
   tin → nhận mã `APT-...`.
2. Tiếp đón: /dashboard/receptionist → tra mã → check-in → lấy số thứ tự.
3. Kiosk: /kiosk → nhập mã hẹn → nhận số.
4. Buồng khám: /dashboard/doctor → gọi số → khám, lưu bệnh án, kê đơn thuốc.
5. Thu ngân: /dashboard/cashier → quét mã phiếu → xem trước giá → tạo hóa
   đơn → xác nhận thu tiền (tiền mặt / chuyển khoản PayOS).
