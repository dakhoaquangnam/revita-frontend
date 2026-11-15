import { apiClient } from "@/lib/api";

export interface InvoiceDetailItem {
  id: string;
  name: string;
  type: "SERVICE" | "DRUG" | "PACKAGE";
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceCode: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  roomName: string;
  serviceCategory: string;
  items: InvoiceDetailItem[];
  subTotal: number;
  depositDeducted: number; // Tiền cọc 100k đã đóng
  discountAmount: number;
  remainingAmount: number; // Tiền còn phải thu
  paymentMethod: "TRANSFER" | "CASH";
  isPaid: boolean;
  paidAt?: string;
  cashierName?: string;
  createdAt: string;
}

/** Dịch vụ chưa thanh toán trong một phiếu chỉ định (từ scan/preview). */
export interface UnpaidService {
  prescriptionServiceId: string;
  serviceId: string;
  serviceCode: string;
  name: string;
  price: number;
  originalPrice: number;
  discountAmount: number;
  status?: string;
}

export interface ScannedPrescription {
  prescriptionCode: string;
  prescriptionId: string;
  patientProfileId: string;
  patientName: string;
  patientPhone?: string | null;
  doctorName?: string;
  status: string;
  services: UnpaidService[];
  totalAmount: number;
}

export interface CreatedInvoice {
  invoiceCode: string;
  totalAmount: number;
  paymentStatus: string;
  prescriptionId: string;
  patientProfileId: string;
  paymentMethod: string;
  transaction?: {
    id: string;
    status: string;
    amount: number;
    paymentUrl?: string | null;
    qrCode?: string | null;
    orderCode?: string | null;
    expiredAt?: string | null;
  };
}

export const cashierService = {
  /**
   * Quét mã phiếu chỉ định, trả về các dịch vụ chưa thanh toán.
   * Lỗi phải nổi lên để thu ngân thấy (mã sai, phiếu đã hủy...),
   * không được trả null rồi hiển thị như không có gì.
   */
  async scanPrescription(code: string): Promise<ScannedPrescription> {
    const res = await apiClient.post("/invoice-payments/scan", {
      prescriptionCode: code,
    });
    const data = res.data;
    const details = data?.prescriptionDetails ?? data;
    const services: UnpaidService[] = (details?.services ?? []).map(
      (s: any) => ({
        prescriptionServiceId: s.id,
        serviceId: s.serviceId ?? s.service?.id,
        serviceCode: s.serviceCode ?? s.service?.serviceCode ?? "",
        name: s.name ?? s.service?.name ?? "",
        price: s.price ?? s.service?.price ?? 0,
        originalPrice: s.originalPrice ?? s.price ?? s.service?.price ?? 0,
        discountAmount: s.discountAmount ?? 0,
        status: s.status ?? "",
      }),
    );
    return {
      prescriptionCode: details?.prescriptionCode ?? code,
      prescriptionId: details?.id ?? details?.prescriptionId ?? "",
      patientProfileId:
        details?.patientProfileId ?? details?.patientProfile?.id ?? "",
      patientName:
        details?.patientProfile?.name ?? details?.patientName ?? "",
      patientPhone: details?.patientProfile?.phone,
      doctorName: details?.doctor?.auth?.name ?? details?.doctorName,
      status: details?.status ?? "",
      services,
      totalAmount: services.reduce((sum, s) => sum + (s.price || 0), 0),
    };
  },

  /**
   * Xem trước hóa đơn: backend tính giá sau khuyến mãi/điểm tích lũy.
   * Trả về danh sách dịch vụ đã chọn kèm giá thật — dùng số này để hiển
   * thị cho thu ngân, không tự tính giá ở frontend.
   */
  async previewPayment(payload: {
    prescriptionCode: string;
    selectedServiceIds?: string[];
    paymentMethod: "CASH" | "TRANSFER";
  }): Promise<{
    prescriptionDetails: unknown;
    selectedServices: UnpaidService[];
    totalAmount: number;
    originalTotalAmount: number;
    totalDiscountAmount: number;
    patientName: string;
  }> {
    const res = await apiClient.post("/invoice-payments/preview", payload);
    return res.data;
  },

  /**
   * Tạo hóa đơn thanh toán (khớp CreatePaymentDto của backend:
   * prescriptionCode + selectedServiceIds + paymentMethod).
   * Với TRANSFER, backend tạo giao dịch PayOS và trả về paymentUrl/qrCode.
   * Lỗi phải nổi lên — không được tự bịa mã hóa đơn.
   */
  async createPayment(payload: {
    prescriptionCode: string;
    selectedServiceIds?: string[];
    paymentMethod: "CASH" | "TRANSFER";
    returnUrl?: string;
    cancelUrl?: string;
  }): Promise<CreatedInvoice> {
    const res = await apiClient.post<CreatedInvoice>(
      "/invoice-payments/create",
      payload,
    );
    return res.data;
  },

  /**
   * Xác nhận đã thu tiền (khớp ConfirmPaymentDto: invoiceCode;
   * cashierId backend tự lấy từ JWT nên không gửi kèm).
   * Lỗi phải nổi lên — không được báo "đã thu thành công" khi chưa thu.
   */
  async confirmPayment(payload: {
    invoiceCode: string;
  }): Promise<unknown> {
    const res = await apiClient.post("/invoice-payments/confirm", payload);
    return res.data;
  },

  /** Lấy trạng thái mới nhất của một hóa đơn (để kiểm tra sau khi quét VietQR). */
  async getInvoice(invoiceCode: string): Promise<{
    invoiceCode: string;
    paymentStatus: string;
    isPaid: boolean;
    totalAmount: number;
  }> {
    const res = await apiClient.get(
      `/invoice-payments/invoice/${encodeURIComponent(invoiceCode)}`,
    );
    return res.data;
  },

  /** Yêu cầu backend đối soát lại trạng thái thanh toán PayOS của hóa đơn. */
  async refreshInvoice(invoiceCode: string): Promise<unknown> {
    const res = await apiClient.post(
      `/invoice-payments/invoice/${encodeURIComponent(invoiceCode)}/refresh`,
      {},
    );
    return res.data;
  },
};
