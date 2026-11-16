"use client";

import React, { useState } from "react";
import {
  CreditCard,
  QrCode,
  Receipt,
  CheckCircle2,
  Printer,
  Search,
  Banknote,
  Check,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  cashierService,
  UnpaidService,
  CreatedInvoice,
} from "@/services/cashier.service";

/** Một phiếu thu đang xử lý trong phiên làm việc của thu ngân. */
interface ActiveBill {
  prescriptionCode: string;
  patientName: string;
  patientPhone?: string | null;
  doctorName?: string;
  services: UnpaidService[];
  totalAmount: number;
  originalTotalAmount: number;
  totalDiscountAmount: number;
  invoice?: CreatedInvoice;
  isPaid: boolean;
  paymentStatus: string;
}

export default function CashierWorkspacePage() {
  const { user } = useAuth();

  // Quét phiếu chỉ định
  const [scanCode, setScanCode] = useState("");
  const [scanError, setScanError] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  // Phiếu đang xử lý + lịch sử trong phiên
  const [bills, setBills] = useState<ActiveBill[]>([]);
  const [activeCode, setActiveCode] = useState<string>("");

  const [paymentType, setPaymentType] = useState<"CASH" | "TRANSFER">("TRANSFER");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const activeBill = bills.find((b) => b.prescriptionCode === activeCode) ?? null;
  const activeInvoice = activeBill?.invoice ?? null;

  const paidBills = bills.filter((b) => b.isPaid);
  const pendingBills = bills.filter((b) => !b.isPaid);
  const totalCollected = paidBills.reduce((sum, b) => sum + b.totalAmount, 0);

  const cashNum = parseFloat(cashGiven.replace(/\D/g, "")) || 0;
  const changeDue = activeBill ? Math.max(0, cashNum - activeBill.totalAmount) : 0;

  // 1. Quét mã phiếu chỉ định -> xem trước giá thật từ backend.
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanCode.trim();
    if (!code) return;
    setIsScanning(true);
    setScanError("");
    setActionError("");
    try {
      const scanned = await cashierService.scanPrescription(code);
      const preview = await cashierService.previewPayment({
        prescriptionCode: scanned.prescriptionCode,
        paymentMethod: paymentType,
      });
      const bill: ActiveBill = {
        prescriptionCode: scanned.prescriptionCode,
        patientName: scanned.patientName,
        patientPhone: scanned.patientPhone,
        doctorName: scanned.doctorName,
        services: preview.selectedServices ?? [],
        totalAmount: preview.totalAmount,
        originalTotalAmount: preview.originalTotalAmount,
        totalDiscountAmount: preview.totalDiscountAmount,
        isPaid: false,
        paymentStatus: "PENDING",
      };
      setBills((prev) => {
        const exists = prev.find((b) => b.prescriptionCode === bill.prescriptionCode);
        if (exists) {
          return prev.map((b) =>
            b.prescriptionCode === bill.prescriptionCode ? { ...bill, invoice: b.invoice, isPaid: b.isPaid, paymentStatus: b.paymentStatus } : b,
          );
        }
        return [bill, ...prev];
      });
      setActiveCode(bill.prescriptionCode);
      setCashGiven(String(bill.totalAmount));
    } catch (err: any) {
      setScanError(
        err.response?.status === 404
          ? `Không tìm thấy phiếu chỉ định có mã ${code}.`
          : err.response?.data?.message ||
              "Không quét được phiếu chỉ định. Vui lòng thử lại.",
      );
    } finally {
      setIsScanning(false);
    }
  };

  // 2. Tạo hóa đơn từ phiếu đã quét (giá lấy từ preview của backend).
  const handleCreateInvoice = async () => {
    if (!activeBill || activeBill.invoice) return;
    setIsProcessing(true);
    setActionError("");
    try {
      const invoice = await cashierService.createPayment({
        prescriptionCode: activeBill.prescriptionCode,
        selectedServiceIds: activeBill.services.map((s) => s.prescriptionServiceId),
        paymentMethod: paymentType,
      });
      setBills((prev) =>
        prev.map((b) =>
          b.prescriptionCode === activeBill.prescriptionCode
            ? { ...b, invoice, paymentStatus: invoice.paymentStatus }
            : b,
        ),
      );
      setToastMessage(`Đã tạo hóa đơn ${invoice.invoiceCode} — ${invoice.totalAmount.toLocaleString("vi-VN")} đ`);
    } catch (err: any) {
      setActionError(
        err.response?.data?.message ||
          "Không tạo được hóa đơn. Vui lòng thử lại.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // 3a. Thu tiền mặt: xác nhận đã thu (backend tự lấy cashierId từ JWT).
  const handleConfirmPayment = async () => {
    if (!activeBill || !activeInvoice) return;
    setIsProcessing(true);
    setActionError("");
    try {
      await cashierService.confirmPayment({ invoiceCode: activeInvoice.invoiceCode });
      setBills((prev) =>
        prev.map((b) =>
          b.prescriptionCode === activeBill.prescriptionCode
            ? { ...b, isPaid: true, paymentStatus: "PAID" }
            : b,
        ),
      );
      setToastMessage(`Đã thu thành công ${activeBill.totalAmount.toLocaleString("vi-VN")} đ`);
      setTimeout(() => setShowReceiptModal(true), 400);
    } catch (err: any) {
      setActionError(
        err.response?.data?.message ||
          "Xác nhận thu tiền thất bại. Hóa đơn chưa được ghi nhận — vui lòng thử lại, không thu tiền mặt khi chưa xác nhận được.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // 3b. Chuyển khoản PayOS: đối soát lại trạng thái với backend.
  const handleRefreshPayment = async () => {
    if (!activeBill || !activeInvoice) return;
    setIsRefreshing(true);
    setActionError("");
    try {
      await cashierService.refreshInvoice(activeInvoice.invoiceCode);
      const latest = await cashierService.getInvoice(activeInvoice.invoiceCode);
      const paid = latest.isPaid || latest.paymentStatus === "PAID";
      setBills((prev) =>
        prev.map((b) =>
          b.prescriptionCode === activeBill.prescriptionCode
            ? { ...b, isPaid: paid, paymentStatus: latest.paymentStatus }
            : b,
        ),
      );
      if (paid) {
        setToastMessage(`Đã nhận thanh toán ${activeBill.totalAmount.toLocaleString("vi-VN")} đ qua PayOS`);
        setTimeout(() => setShowReceiptModal(true), 400);
      } else {
        setToastMessage("Chưa ghi nhận thanh toán. Nhờ bệnh nhân kiểm tra lại giao dịch rồi bấm kiểm tra lại.");
      }
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "Không kiểm tra được trạng thái thanh toán.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const qrCode = activeInvoice?.transaction?.qrCode ?? "";
  const paymentUrl = activeInvoice?.transaction?.paymentUrl ?? "";

  return (
    <div className="space-y-6 text-[#222222]">
      {/* Top Banner: Thu ngân & Báo cáo nhanh */}
      <div className="bg-[#e1f4df] border border-[#efeeeb] rounded-[14px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fffefc] border border-[#efeeeb] text-[#0f3e17] text-xs font-semibold mb-2">
            <CreditCard className="w-4 h-4 text-[#0f3e17]" />
            <span>Phân hệ Thu ngân & Viện phí</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display-serif text-[#0f3e17] tracking-[-0.01em]">
            Quầy Thu Viện phí: {user?.name || "Thu ngân"}
          </h1>
          <p className="text-xs text-[#222222]/80 mt-1">
            Quét mã phiếu chỉ định để tạo hóa đơn • Thanh toán qua PayOS hoặc tiền mặt tại quầy
          </p>
        </div>

        {/* Quick Shift Stats — chỉ tính các hóa đơn đã xử lý trong phiên này */}
        <div className="flex items-center gap-4 bg-[#fffefc] p-3.5 rounded-[14px] border border-[#efeeeb] text-xs">
          <div>
            <span className="text-[11px] text-[#222222]/60">Đã thu trong phiên này:</span>
            <div className="text-lg font-semibold text-[#0f3e17]">
              {totalCollected.toLocaleString("vi-VN")} đ
            </div>
          </div>
          <div className="h-8 w-px bg-[#efeeeb]" />
          <div>
            <span className="text-[11px] text-[#222222]/60">Hóa đơn chờ:</span>
            <div className="text-lg font-semibold text-amber-800">{pendingBills.length} ca</div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-[14px] bg-[#e1f4df] border border-[#efeeeb] text-[#0f3e17] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0f3e17]" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage("")} className="text-[#0f3e17]/60 hover:text-[#0f3e17]">
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Grid: Left = Scan & Bills, Right = Billing Details & PayOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quét phiếu & Hóa đơn trong phiên */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scan Box */}
          <form onSubmit={handleScan} className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#222222]/40">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="Nhập mã phiếu chỉ định"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-xs text-[#222222] placeholder-[#222222]/40 focus:outline-none focus:border-[#0f3e17]"
              />
            </div>
            <button
              type="submit"
              disabled={isScanning}
              className="px-4 py-2.5 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] rounded-[14px] text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isScanning ? "Đang quét..." : "Quét phiếu"}
            </button>
          </form>
          {scanError && (
            <div className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Bills in this session */}
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[#0f3e17] flex items-center gap-2 eyebrow">
                <Receipt className="w-4 h-4 text-[#0f3e17]" />
                <span>Hóa đơn trong phiên ({bills.length})</span>
              </h3>
            </div>

            {bills.length === 0 ? (
              <p className="text-xs text-[#222222]/60 py-4 text-center">
                Chưa có phiếu nào. Quét mã phiếu chỉ định do bác sĩ tạo để bắt đầu thu phí.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {bills.map((bill) => {
                  const isSelected = bill.prescriptionCode === activeCode;
                  return (
                    <button
                      key={bill.prescriptionCode}
                      type="button"
                      onClick={() => {
                        setActiveCode(bill.prescriptionCode);
                        setPaymentType(bill.invoice?.paymentMethod === "CASH" ? "CASH" : "TRANSFER");
                        setCashGiven(String(bill.totalAmount));
                      }}
                      className={`w-full text-left p-3.5 rounded-[14px] border transition-colors ${
                        isSelected
                          ? "bg-[#e1f4df] border-[#efeeeb]"
                          : "bg-[#fffefc] border-[#efeeeb] hover:bg-[#efeeeb]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-[#0f3e17]">
                          {bill.invoice?.invoiceCode ?? bill.prescriptionCode}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            bill.isPaid
                              ? "bg-[#fffefc] text-[#0f3e17] border border-[#efeeeb]"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {bill.isPaid ? "Đã thu tiền" : bill.invoice ? "Chờ thanh toán" : "Chưa tạo hóa đơn"}
                        </span>
                      </div>

                      <div className="font-semibold text-[#0f3e17] text-sm">{bill.patientName}</div>
                      <div className="text-[11px] text-[#222222]/70 truncate mt-0.5">
                        {bill.services.length} dịch vụ • {bill.patientPhone ?? ""}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[#efeeeb] flex items-center justify-between text-xs">
                        <span className="text-[#222222]/60">Còn thu:</span>
                        <span className="font-display-serif text-sm text-[#0f3e17] tracking-[-0.01em]">
                          {bill.totalAmount.toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bảng kê & Thanh toán */}
        <div className="lg:col-span-7 space-y-6">
          {!activeBill ? (
            <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-12 text-center space-y-3">
              <h3 className="text-base font-display-serif text-[#0f3e17] tracking-[-0.01em]">Chưa có phiếu chỉ định nào được quét</h3>
              <p className="text-xs text-[#222222]/70 max-w-md mx-auto">
                Nhập mã phiếu chỉ định ở ô bên trái để xem bảng kê dịch vụ và tạo hóa đơn.
                Mã phiếu do bác sĩ tạo sau khi khám (ví dụ: RX-...).
              </p>
            </div>
          ) : (
            <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-7 sm:p-8 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#efeeeb] gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#e1f4df] text-[#0f3e17] border border-[#efeeeb]">
                      {activeInvoice?.invoiceCode ?? activeBill.prescriptionCode}
                    </span>
                    <span className="text-xs text-[#222222]/60">
                      BS: {activeBill.doctorName ?? ""}
                    </span>
                  </div>
                  <h3 className="text-lg font-display-serif text-[#0f3e17] mt-1.5 tracking-[-0.01em]">
                    Bệnh nhân: {activeBill.patientName}
                  </h3>
                  <p className="text-xs text-[#222222]/70">
                    Phiếu chỉ định: {activeBill.prescriptionCode} • SĐT: {activeBill.patientPhone ?? "—"}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#222222]/60">Số tiền cần thu:</span>
                  <div className="text-2xl font-display-serif text-[#0f3e17] tracking-[-0.01em]">
                    {activeBill.totalAmount.toLocaleString("vi-VN")} đ
                  </div>
                </div>
              </div>

              {/* Bảng kê chi tiết */}
              <div className="space-y-3">
                <span className="text-[#0f3e17] block eyebrow">
                  Bảng kê Dịch vụ Kỹ thuật PHCN:
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#efeeeb] text-[#222222]/60 bg-[#e1f4df]/20">
                        <th className="p-2.5">Khoản mục</th>
                        <th className="p-2.5 text-right">Đơn giá</th>
                        <th className="p-2.5 text-right">Giảm giá</th>
                        <th className="p-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#efeeeb]">
                      {activeBill.services.map((item) => (
                        <tr key={item.prescriptionServiceId} className="text-[#222222]">
                          <td className="p-2.5 pr-2">
                            <div className="font-semibold text-[#0f3e17]">{item.name}</div>
                            <span className="text-[10px] text-[#222222]/50 uppercase">
                              {item.serviceCode}
                            </span>
                          </td>
                          <td className="p-2.5 text-right text-[#222222]/70">
                            {item.originalPrice.toLocaleString("vi-VN")} đ
                          </td>
                          <td className="p-2.5 text-right text-[#222222]/70">
                            {item.discountAmount > 0
                              ? `- ${item.discountAmount.toLocaleString("vi-VN")} đ`
                              : "—"}
                          </td>
                          <td className="p-2.5 text-right font-semibold text-[#0f3e17]">
                            {item.price.toLocaleString("vi-VN")} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tổng kết tài chính */}
                <div className="p-4 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#222222]/70">
                    <span>Tổng tiền dịch vụ:</span>
                    <span className="text-[#222222]">
                      {activeBill.originalTotalAmount.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                  {activeBill.totalDiscountAmount > 0 && (
                    <div className="flex justify-between text-[#0f3e17] font-semibold">
                      <span>Giảm giá:</span>
                      <span className="">
                        - {activeBill.totalDiscountAmount.toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#efeeeb] flex justify-between items-baseline text-sm font-semibold text-[#0f3e17]">
                    <span>Số tiền thực thu:</span>
                    <span className="text-xl font-display-serif text-[#0f3e17] tracking-[-0.01em]">
                      {activeBill.totalAmount.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>
              </div>

              {/* Chưa tạo hóa đơn: chọn phương thức + tạo */}
              {!activeInvoice && (
                <div className="space-y-4 pt-2 border-t border-[#efeeeb]">
                  <span className="text-[#0f3e17] block eyebrow">
                    Phương thức thu tiền:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentType("TRANSFER")}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-[14px] text-xs font-semibold border transition-colors ${
                        paymentType === "TRANSFER"
                          ? "bg-[#0f3e17] border-transparent text-[#fffefc]"
                          : "bg-[#fffefc] border-[#efeeeb] text-[#222222]/70 hover:bg-[#efeeeb]/40"
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>1. Quét mã VietQR PayOS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType("CASH")}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-[14px] text-xs font-semibold border transition-colors ${
                        paymentType === "CASH"
                          ? "bg-[#0f3e17] border-transparent text-[#fffefc]"
                          : "bg-[#fffefc] border-[#efeeeb] text-[#222222]/70 hover:bg-[#efeeeb]/40"
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>2. Tiền mặt tại quầy</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateInvoice}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {isProcessing
                      ? "Đang tạo hóa đơn..."
                      : `Tạo hóa đơn ${activeBill.totalAmount.toLocaleString("vi-VN")} đ`}
                  </button>
                </div>
              )}

              {/* Đã tạo hóa đơn: chuyển khoản PayOS */}
              {activeInvoice && paymentType === "TRANSFER" && !activeBill.isPaid && (
                <div className="space-y-4 pt-2 border-t border-[#efeeeb]">
                  <div className="p-5 rounded-[14px] bg-[#e1f4df]/30 border border-[#efeeeb] flex flex-col sm:flex-row items-center gap-6">
                    {qrCode ? (
                      <div className="bg-[#fffefc] p-3.5 rounded-[14px] border border-[#efeeeb] flex-shrink-0 text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                          alt="Mã QR thanh toán PayOS"
                          className="w-44 h-44 object-contain mx-auto"
                        />
                        <span className="text-[10px] text-[#222222]/60 font-semibold block mt-1">
                          Quét bằng ứng dụng ngân hàng
                        </span>
                      </div>
                    ) : null}
                    <div className="space-y-3 text-xs flex-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fffefc] text-[#0f3e17] border border-[#efeeeb] text-[11px] font-semibold">
                        <span className="w-2 h-2 rounded-full bg-[#0f3e17]" />
                        Đang chờ bệnh nhân quét mã PayOS...
                      </div>
                      <div>
                        <span className="text-[#222222]/60">Mã đơn PayOS:</span>
                        <div className="font-semibold text-[#0f3e17] text-sm">
                          {activeInvoice.transaction?.orderCode ?? "—"}
                        </div>
                      </div>
                      {paymentUrl && (
                        <a
                          href={paymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[#0f3e17] font-semibold underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Mở trang thanh toán PayOS
                        </a>
                      )}
                      <p className="text-[11px] text-[#222222]/60">
                        * Hóa đơn chỉ chuyển sang "Đã thanh toán" sau khi PayOS xác nhận qua webhook
                        hoặc thu ngân bấm kiểm tra bên dưới.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshPayment}
                    disabled={isRefreshing}
                    className="w-full py-3 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span>{isRefreshing ? "Đang kiểm tra..." : "Kiểm tra đã thanh toán chưa"}</span>
                  </button>
                </div>
              )}

              {/* Đã tạo hóa đơn: tiền mặt */}
              {activeInvoice && paymentType === "CASH" && !activeBill.isPaid && (
                <div className="space-y-4 pt-2 border-t border-[#efeeeb]">
                  <div className="p-5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                          Số tiền khách đưa:
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cashGiven}
                            onChange={(e) => setCashGiven(e.target.value)}
                            className="w-full px-3.5 py-2 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-base font-display-serif text-[#0f3e17] focus:outline-none focus:border-[#0f3e17] tracking-[-0.01em]"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-[#222222]/50">VND</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {[500000, 700000, 1000000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCashGiven(String(amt))}
                              className="px-2.5 py-1 rounded-[14px] bg-[#e1f4df]/40 hover:bg-[#e1f4df] border border-[#efeeeb] text-[11px] text-[#0f3e17] font-semibold"
                            >
                              {(amt / 1000).toFixed(0)}k
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-[#222222]/60 mb-1">
                          Tiền thối lại cho khách:
                        </span>
                        <div className="p-2.5 rounded-[14px] bg-[#e1f4df]/40 border border-[#efeeeb] text-xl font-display-serif text-[#0f3e17] tracking-[-0.01em]">
                          {changeDue.toLocaleString("vi-VN")} đ
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isProcessing
                        ? "Đang lưu giao dịch..."
                        : `Xác nhận Đã thu ${activeBill.totalAmount.toLocaleString("vi-VN")} đ`}
                    </span>
                  </button>
                </div>
              )}

              {/* Đã thanh toán */}
              {activeBill.isPaid && (
                <div className="p-4 rounded-[14px] bg-[#e1f4df] border border-[#efeeeb] text-[#0f3e17] text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Hóa đơn này đã hoàn tất thu tiền.</span>
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(true)}
                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs font-semibold"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Xem phiếu in K80
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal In Hóa đơn / Biên lai Viện phí K80 */}
      {showReceiptModal && activeBill && (
        <div className="fixed inset-0 z-50 bg-[#0f3e17]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fffefc] text-[#222222] rounded-[14px] max-w-sm w-full p-6 border border-[#efeeeb]">
            <div className="text-center border-b pb-3 border-[#efeeeb]">
              <div className="text-xs font-semibold text-[#0f3e17] uppercase">
                PHÒNG KHÁM CHUYÊN KHOA PHỤC HỒI CHỨC NĂNG BÁC SĨ THANH SANG
              </div>
              <div className="text-[11px] text-[#222222]/60">
                193 Quang Trung, Đại Lộc, Đà Nẵng • Hotline: 0369.117.117
              </div>
              <h3 className="text-base font-display-serif text-[#0f3e17] uppercase mt-2 tracking-[-0.01em]">
                HÓA ĐƠN THU TIỀN VIỆN PHÍ
              </h3>
              <div className="text-xs text-[#0f3e17]/80">
                Số: {activeInvoice?.invoiceCode ?? activeBill.prescriptionCode}
              </div>
            </div>

            <div className="space-y-1 text-xs py-3 border-b border-[#efeeeb]">
              <div>
                Họ tên: <strong className="text-[#0f3e17]">{activeBill.patientName}</strong>
              </div>
              <div>
                Số điện thoại: <span>{activeBill.patientPhone ?? "—"}</span>
              </div>
              <div>
                Bác sĩ chỉ định: <span>{activeBill.doctorName ?? "—"}</span>
              </div>
              <div>
                Thời gian:{" "}
                <span>
                  {new Date().toLocaleTimeString("vi-VN")} -{" "}
                  {new Date().toLocaleDateString("vi-VN")}
                </span>
              </div>
            </div>

            <div className="py-3 border-b border-[#efeeeb] space-y-2 text-xs">
              {activeBill.services.map((item) => (
                <div key={item.prescriptionServiceId} className="flex justify-between">
                  <span className="max-w-[190px] truncate text-[#222222]">{item.name}</span>
                  <span className="font-medium text-[#0f3e17]">
                    {item.price.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              ))}
            </div>

            <div className="py-3 border-b border-[#efeeeb] space-y-1 text-xs">
              <div className="flex justify-between text-[#222222]/70">
                <span>Tổng chi phí:</span>
                <span className="">
                  {activeBill.originalTotalAmount.toLocaleString("vi-VN")} đ
                </span>
              </div>
              {activeBill.totalDiscountAmount > 0 && (
                <div className="flex justify-between text-[#0f3e17] font-semibold">
                  <span>Giảm giá:</span>
                  <span className="">
                    - {activeBill.totalDiscountAmount.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-[#0f3e17] text-sm pt-1">
                <span>THỰC THU:</span>
                <span className="text-[#0f3e17]">
                  {activeBill.totalAmount.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-[#222222]/60">
                <span>Hình thức:</span>
                <span>
                  {paymentType === "TRANSFER" ? "Chuyển khoản VietQR PayOS" : "Tiền mặt tại quầy"}
                </span>
              </div>
            </div>

            <div className="pt-3 text-center text-xs space-y-4">
              <div className="flex justify-between text-[11px] text-[#222222]/60">
                <div>Người nộp tiền</div>
                <div>
                  Thu ngân
                  <div className="mt-8 font-semibold text-[#0f3e17]">{user?.name || "Thu ngân"}</div>
                </div>
              </div>
              <div className="text-[11px] text-[#222222]/60 italic">
                Cảm ơn Quý khách đã tin tưởng phục hồi sức khỏe cùng Bác sĩ Thanh Sang!
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="py-2.5 px-3 rounded-[14px] border border-[#efeeeb] text-xs font-semibold hover:bg-[#efeeeb]/40 text-[#222222]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-3 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>In hóa đơn K80</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
