"use client";

import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  Users,
  Volume2,
  FileSpreadsheet,
  Pill,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  Printer,
  Save,
  CheckCircle2,
} from "lucide-react";
import { useAuth, REHAB_ROOMS } from "@/hooks/use-auth";
import { ttsService } from "@/services/tts.service";
import {
  doctorService,
  FimAssessment,
  RomMeasurement,
  PrescriptionItem,
  HomeExercisePrescription,
} from "@/services/doctor.service";
import {
  appointmentService,
  PatientProfileSummary,
  DoctorServiceItem,
} from "@/services/appointment.service";

interface DoctorQueueItem {
  id: string;
  patientProfileId: string;
  appointmentCode: string;
  queueNumber: string;
  name: string;
  birthYear: number;
  gender: string;
  phone: string;
  reason: string;
  symptoms: string;
  metalImplant: boolean;
  pacemaker: boolean;
  status: "SERVING" | "WAITING" | "COMPLETED";
}

// Mẫu khởi tạo phiếu khám — bác sĩ chỉnh theo từng bệnh nhân.
// Khi chuyển sang bệnh nhân khác, phiếu được đặt lại mẫu này để số liệu
// của bệnh nhân trước không lọt sang bệnh án bệnh nhân sau.
const FIM_TEMPLATE: FimAssessment = {
  eating: 6,
  grooming: 5,
  bathing: 4,
  dressingUpper: 5,
  dressingLower: 4,
  toileting: 5,
  bladder: 6,
  bowel: 6,
  bedChairTransfer: 5,
  toiletTransfer: 5,
  tubTransfer: 4,
  locomotion: 4,
  stairs: 4,
  comprehension: 6,
  expression: 5,
  socialInteraction: 6,
  problemSolving: 5,
  memory: 6,
};

const ROM_TEMPLATE: RomMeasurement[] = [
  {
    joint: "Khớp Gối Phải",
    movement: "Gập gối (Flexion)",
    leftAngle: 135,
    rightAngle: 85,
    normalRange: "0° - 135°",
    targetAngle: 110,
  },
  {
    joint: "Khớp Vai Phải",
    movement: "Gập vai (Forward Flexion)",
    leftAngle: 175,
    rightAngle: 110,
    normalRange: "0° - 180°",
    targetAngle: 140,
  },
  {
    joint: "Cổ Chân Phải",
    movement: "Gập mu bàn chân (Dorsiflexion)",
    leftAngle: 20,
    rightAngle: 5,
    normalRange: "0° - 20°",
    targetAngle: 15,
  },
];

const DRUGS_TEMPLATE: PrescriptionItem[] = [
  {
    id: "med-1",
    name: "Tolperisone 150mg (Mydocalm)",
    dosage: "150mg",
    quantity: "20 viên",
    usage: "Uống 1 viên x 2 lần/ngày sau ăn sáng, tối (Giãn cơ giảm co cứng)",
  },
  {
    id: "med-2",
    name: "Mecobalamin 500mcg (Methycobal)",
    dosage: "500mcg",
    quantity: "30 viên",
    usage: "Uống 1 viên x 3 lần/ngày sau bữa ăn (Bổ thần kinh)",
  },
];

const EXERCISES_TEMPLATE: HomeExercisePrescription[] = [
  {
    id: "ex-1",
    name: "Tập đứng chịu trọng lượng & Dồn trọng lượng chân liệt",
    category: "Dáng đi & Thăng bằng",
    sets: "3 lần/ngày, mỗi lần 15 phút",
    frequency: "Mỗi ngày",
    precautions: "Người nhà đứng bên cạnh hỗ trợ, có thanh vịn vững chắc.",
  },
  {
    id: "ex-2",
    name: "Bài tập mở rộng tầm vận động cổ tay & ngón tay",
    category: "Hoạt động trị liệu",
    sets: "10 nhịp gập duỗi, giữ 5 giây",
    frequency: "2 lần/ngày (Sáng - Tối)",
    precautions: "Tránh kéo giật ngón tay quá mạnh gây đau khớp bàn ngón.",
  },
];

export default function DoctorWorkspacePage() {
  const { user, selectedRoom } = useAuth();
  const currentRoom = REHAB_ROOMS.find((r) => r.id === selectedRoom) || REHAB_ROOMS[0];

  // Hàng đợi buồng khám — lịch hẹn thật của bác sĩ hôm nay.
  const [queue, setQueue] = useState<DoctorQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState("");
  const [activePatientIndex, setActivePatientIndex] = useState(0);
  const currentPatient = queue[activePatientIndex] || queue[0];
  // Id bác sĩ đang đăng nhập — lấy từ lịch hẹn đầu trong hàng đợi.
  const [doctorId, setDoctorId] = useState("");
  // Id template bệnh án PHCN — backend bắt buộc templateId khi tạo bệnh án.
  const [phcnTemplateId, setPhcnTemplateId] = useState("");

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const templates = await doctorService.getTemplates();
        const phcn = templates.find(
          (t) => t.templateCode === "PHUC_HOI_CHUC_NANG",
        );
        if (phcn) setPhcnTemplateId(phcn.id);
      } catch {
        // Không tải được template thì backend tự mặc định template PHCN;
        // nút Lưu vẫn hoạt động, không chặn khám.
      }
    };
    loadTemplate();
  }, []);

  useEffect(() => {
    const loadQueue = async () => {
      setQueueLoading(true);
      setQueueError("");
      try {
        const appointments = await appointmentService.getDoctorAppointments();
        const today = new Date().toISOString().substring(0, 10);
        const items: DoctorQueueItem[] = appointments
          .filter((apt) => String(apt.date ?? "").substring(0, 10) === today)
          .map((apt) => {
            const profile: PatientProfileSummary = apt.patientProfile ?? {
              id: "",
              profileCode: "",
              name: "",
            };
            const dob = profile.dateOfBirth
              ? new Date(profile.dateOfBirth)
              : null;
            return {
              id: apt.appointmentId,
              patientProfileId: profile.id ?? "",
              appointmentCode: apt.appointmentCode,
              queueNumber: apt.appointmentCode,
              name: profile.name ?? "",
              birthYear: dob ? dob.getFullYear() : 0,
              gender: profile.gender ?? "",
              phone: profile.phone ?? "",
              reason: apt.services?.[0]?.serviceName ?? "Khám PHCN",
              // Backend chưa có trường triệu chứng trên lịch hẹn;
              // bác sĩ ghi nhận triệu chứng lúc khám, không tự bịa.
              symptoms: "",
              metalImplant: false,
              pacemaker: false,
              status:
                apt.status === "COMPLETED"
                  ? "COMPLETED"
                  : apt.status === "SERVING"
                    ? "SERVING"
                    : "WAITING",
            };
          });
        setQueue(items);
        // Tất cả lịch hẹn trong hàng đợi đều của bác sĩ đang đăng nhập.
        setDoctorId(appointments[0]?.doctorId ?? "");
      } catch (err: any) {
        setQueueError(
          err.response?.data?.message ||
            "Không tải được hàng đợi buồng khám. Vui lòng thử lại.",
        );
      } finally {
        setQueueLoading(false);
      }
    };
    loadQueue();
  }, []);
  const [isCallingAudio, setIsCallingAudio] = useState(false);
  const [callToast, setCallToast] = useState("");

  // Dịch vụ bác sĩ được chỉ định trong ca hôm nay (lấy theo ca làm việc).
  const [doctorServices, setDoctorServices] = useState<DoctorServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState("");
  // Dịch vụ bác sĩ tick chọn để chỉ định cho bệnh nhân đang khám.
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [serviceNote, setServiceNote] = useState("");
  // Mã phiếu chỉ định vừa tạo — thu ngân quét mã này để lập hóa đơn.
  const [createdPrescriptionCode, setCreatedPrescriptionCode] = useState("");

  useEffect(() => {
    if (!doctorId) return;
    const loadServices = async () => {
      setServicesLoading(true);
      setServicesError("");
      try {
        const today = new Date().toISOString().substring(0, 10);
        const list = await appointmentService.getServicesByDoctor(doctorId, today);
        setDoctorServices(list);
      } catch (err: any) {
        setServicesError(
          err.response?.data?.message ||
            "Không tải được danh sách dịch vụ của bác sĩ.",
        );
      } finally {
        setServicesLoading(false);
      }
    };
    loadServices();
  }, [doctorId]);

  // Tab nghiệp vụ: 'FIM' | 'ROM' | 'RX'
  const [activeTab, setActiveTab] = useState<"FIM" | "ROM" | "RX">("FIM");

  // Thông tin khám lâm sàng (mẫu khởi tạo; bác sĩ chỉnh theo từng bệnh nhân)
  const [diagnosis, setDiagnosis] = useState("");
  const [painScale, setPainScale] = useState(0);
  const [doctorNotes, setDoctorNotes] = useState("");

  // Thang điểm FIM (18 chỉ số, mỗi chỉ số 1-7 điểm, max = 126)
  const [fim, setFim] = useState<FimAssessment>({ ...FIM_TEMPLATE });

  // Đo góc vận động khớp (ROM)
  const [romList, setRomList] = useState<RomMeasurement[]>([...ROM_TEMPLATE]);

  // Đơn thuốc & Bài tập PHCN tại nhà
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([...DRUGS_TEMPLATE]);

  const [exercises, setExercises] = useState<HomeExercisePrescription[]>([...EXERCISES_TEMPLATE]);

  // Đặt lại phiếu khám về mẫu khi chuyển bệnh nhân.
  const resetExamForm = () => {
    setDiagnosis("");
    setPainScale(0);
    setDoctorNotes("");
    setFim({ ...FIM_TEMPLATE });
    setRomList([...ROM_TEMPLATE]);
    setPrescriptions([...DRUGS_TEMPLATE]);
    setExercises([...EXERCISES_TEMPLATE]);
    setSelectedServiceIds([]);
    setServiceNote("");
    setCreatedPrescriptionCode("");
  };

  const [isSaved, setIsSaved] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Tính tổng FIM
  const fimTotal = Object.values(fim).reduce((sum, val) => sum + (val || 0), 0);

  const getFimLevel = (total: number) => {
    if (total >= 108) return { text: "Độc lập hoàn toàn hoặc có dụng cụ", color: "text-[#0f3e17]" };
    if (total >= 90) return { text: "Độc lập có sửa đổi / Trợ giúp tối thiểu", color: "text-[#0f3e17]" };
    if (total >= 72) return { text: "Phụ thuộc mức độ vừa (cần hỗ trợ 25-50%)", color: "text-amber-800" };
    if (total >= 36) return { text: "Phụ thuộc tối đa (cần hỗ trợ 50-75%)", color: "text-amber-800" };
    return { text: "Phụ thuộc hoàn toàn (cần trợ giúp 100%)", color: "text-rose-700" };
  };

  const handleFimChange = (key: keyof FimAssessment, val: number) => {
    setFim((prev) => ({ ...prev, [key]: val }));
  };

  const handleCallNext = async () => {
    if (queue.length === 0) return;
    // Chuyển tới bệnh nhân tiếp theo trong danh sách hàng đợi
    const nextIdx = (activePatientIndex + 1) % queue.length;
    const nextPatient = queue[nextIdx];

    setActivePatientIndex(nextIdx);
    // Đặt lại phiếu khám về mẫu — số liệu bệnh nhân trước không được
    // lọt sang bệnh án bệnh nhân sau.
    resetExamForm();
    setQueue((prev) =>
      prev.map((p, idx) => {
        if (idx === nextIdx) return { ...p, status: "SERVING" };
        if (idx === activePatientIndex && p.status === "SERVING") return { ...p, status: "COMPLETED" };
        return p;
      })
    );

    const roomTitle = currentRoom.name || "Phòng 101: Khám Lượng giá PHCN";
    const roomLocation = "Khu B - Tầng 1";

    const callPayload = {
      queueNumber: nextPatient.queueNumber,
      patientName: nextPatient.name.toUpperCase(),
      counterCode: currentRoom.id || "ROOM-101",
      counterName: roomTitle,
      roomName: roomLocation,
      calledAt: new Date().toLocaleTimeString("vi-VN"),
      isPriority: false,
    };

    // 1. Đồng bộ thời gian thực sang Màn hình TV sảnh chờ (tv-display) qua BroadcastChannel & localStorage
    if (typeof window !== "undefined") {
      try {
        const channel = new BroadcastChannel("revita_tv_channel");
        channel.postMessage({ type: "CALL_PATIENT", data: callPayload });
        channel.close();
      } catch {}
      try {
        localStorage.setItem("revita_tv_latest_call", JSON.stringify(callPayload));
      } catch {}
    }

    // 2. Hiển thị thông báo trên màn hình Bác sĩ
    setCallToast(`Đã phát loa gọi: ${nextPatient.name} (${nextPatient.queueNumber}) vào buồng khám`);
    setTimeout(() => setCallToast(""), 4000);

    // 3. Phát âm thanh giọng đọc tiếng Việt bằng VieNeu Cloud TTS.
    // Không dùng giọng trình duyệt làm fallback (quyết định 13/11/2026):
    // lỗi TTS phải hiện ra, không được đọc bằng giọng khác rồi tưởng là xong.
    setIsCallingAudio(true);
    const callText = `Xin mời bệnh nhân ${nextPatient.name}, số thứ tự ${nextPatient.queueNumber}, vào ${roomTitle}!`;
    try {
      await ttsService.speak(callText, {
        onEnd: () => setIsCallingAudio(false),
        onError: () => setIsCallingAudio(false),
      });
    } catch {
      setIsCallingAudio(false);
    }
  };

  const handleAddSampleDrug = () => {
    const newDrug: PrescriptionItem = {
      id: "med-" + Date.now(),
      name: "Celecoxib 200mg",
      dosage: "200mg",
      quantity: "14 viên",
      usage: "Uống 1 viên/ngày sau bữa ăn sáng (Kháng viêm giảm đau khớp)",
    };
    setPrescriptions([...prescriptions, newDrug]);
  };

  const handleAddSampleExercise = () => {
    const newEx: HomeExercisePrescription = {
      id: "ex-" + Date.now(),
      name: "Bài tập ưỡn cột sống McKenzie",
      category: "Cột sống thắt lưng",
      sets: "10 lần duỗi (giữ 3 giây)",
      frequency: "Mỗi 2 giờ khi làm việc ngồi nhiều",
      precautions: "Dừng lại ngay nếu đau lan xuống bàn chân.",
    };
    setExercises([...exercises, newEx]);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const selectedServices = doctorServices.filter((s) =>
    selectedServiceIds.includes(s.serviceId),
  );
  const selectedServicesTotal = selectedServices.reduce(
    (sum, s) => sum + (s.price ?? 0),
    0,
  );

  const handleSaveSession = async () => {
    if (!currentPatient) return;
    setIsSaved(true);
    try {
      // 1. Lưu bệnh án thật. Lỗi phải nổi lên — không được báo đã lưu
      // trong khi backend chưa ghi gì.
      const record = await doctorService.createMedicalRecord({
        patientProfileId: currentPatient.patientProfileId,
        appointmentCode: currentPatient.appointmentCode,
        templateId: phcnTemplateId || undefined,
        content: {
          diagnosis,
          painScale,
          fim,
          fimTotal,
          romList,
          prescriptions,
          exercises,
          doctorNotes,
        },
        status: "COMPLETED",
      });

      // 2. Tạo đơn thuốc thật từ danh sách thuốc đã kê.
      const drugItems = prescriptions
        .filter((d) => d.name.trim())
        .map((d) => ({
          name: d.name.trim(),
          strength: d.dosage || undefined,
          frequency: d.usage || undefined,
        }));
      if (drugItems.length > 0) {
        await doctorService.createMedicationPrescription({
          patientProfileId: currentPatient.patientProfileId,
          medicalRecordId: record?.id,
          items: drugItems,
        });
      }

      // 3. Tạo phiếu chỉ định dịch vụ thật từ các dịch vụ bác sĩ đã tick
      // chọn ở tab Kê đơn. Không chọn dịch vụ nào thì không tạo phiếu.
      // Thu ngân quét mã phiếu này để lập hóa đơn.
      if (selectedServiceIds.length > 0) {
        const prescription = await doctorService.createPrescription({
          patientProfileId: currentPatient.patientProfileId,
          medicalRecordId: record?.id,
          note: serviceNote.trim() || undefined,
          services: selectedServiceIds.map((serviceId, i) => ({
            serviceId,
            order: i + 1,
          })),
        });
        setCreatedPrescriptionCode(
          (prescription as any)?.prescriptionCode ?? "",
        );
      }

      setQueue((prev) =>
        prev.map((p, idx) => (idx === activePatientIndex ? { ...p, status: "COMPLETED" } : p))
      );

      setTimeout(() => {
        setIsSaved(false);
        setShowPrintModal(true);
      }, 600);
    } catch (err: any) {
      setIsSaved(false);
      alert(
        "Lưu bệnh án thất bại: " +
          (err.response?.data?.message || err.message || "Vui lòng thử lại."),
      );
    }
  };

  return (
    <div className="space-y-6 text-[#222222]">
      {/* Toast Notification khi gọi số */}
      {callToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#0f3e17] text-[#fffefc] px-4 py-2.5 rounded-[14px] text-xs font-semibold animate-in fade-in duration-200 flex items-center gap-2 border border-[#b1dbb8]">
          <Volume2 className="w-4 h-4 text-[#e1f4df] animate-pulse" />
          <span>{callToast}</span>
        </div>
      )}

      {/* Top Banner: Bác sĩ & Buồng khám */}
      <div className="bg-[#e1f4df] border border-[#cfe7d3] rounded-[14px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fffefc] border border-[#cfe7d3] text-[#0f3e17] text-xs font-semibold mb-2">
            <Stethoscope className="w-4 h-4 text-[#0f3e17]" />
            <span>Phân hệ Bác sĩ & Kỹ thuật viên PHCN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f3e17] tracking-tight">
            Bàn Khám & Lượng giá: {user?.name || "Bác sĩ Thanh Sang"}
          </h1>
          <p className="text-xs text-[#222222]/80 mt-1 font-light">
            Buồng trực: <strong className="text-[#0f3e17] font-semibold">{currentRoom.name}</strong> • 193 Quang Trung, Đại Lộc, Đà Nẵng
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCallNext}
            disabled={isCallingAudio || queue.length === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold transition-colors disabled:opacity-75 cursor-pointer"
          >
            <Volume2 className={`w-4 h-4 ${isCallingAudio ? "animate-pulse text-[#b1dbb8]" : ""}`} />
            <span>{isCallingAudio ? "Đang phát loa gọi bệnh nhân..." : "Mời bệnh nhân tiếp theo (Loa TV)"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Queue & Admin Info, Right = Clinical Tabs */}
      {queueLoading ? (
        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-12 text-center text-sm text-[#222222]/70">
          Đang tải hàng đợi buồng khám...
        </div>
      ) : queueError ? (
        <div className="bg-[#fffefc] border border-rose-200 rounded-[14px] p-6 text-center text-sm text-rose-700 space-y-3">
          <p>{queueError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#0f3e17] text-[#fffefc] rounded-[14px] text-xs font-semibold"
          >
            Tải lại
          </button>
        </div>
      ) : !currentPatient ? (
        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-12 text-center space-y-3">
          <h3 className="text-base font-bold text-[#0f3e17]">Không có lịch hẹn khám hôm nay</h3>
          <p className="text-xs text-[#222222]/70 max-w-md mx-auto">
            Buồng khám chưa có lịch hẹn nào cho ngày hôm nay. Lịch hẹn mới đặt qua web hoặc lễ tân
            sẽ tự hiện ở đây.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hàng đợi buồng khám & Hồ sơ hành chính */}
        <div className="lg:col-span-4 space-y-6">
          {/* Patient Card */}
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#efeeeb]">
              <span className="text-xs font-bold text-[#0f3e17] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0f3e17]" />
                Đang khám tại buồng
              </span>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-[7px] bg-[#e1f4df] text-[#0f3e17] border border-[#cfe7d3]">
                {currentPatient.queueNumber}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#0f3e17]">{currentPatient.name}</h3>
              <p className="text-xs text-[#222222]/70 mt-0.5">
                {currentPatient.gender} • Sinh năm: {currentPatient.birthYear} (
                {new Date().getFullYear() - currentPatient.birthYear} tuổi) • SĐT: {currentPatient.phone}
              </p>
            </div>

            <div className="p-3.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] space-y-2 text-xs">
              <div>
                <span className="text-[#222222]/60 font-medium">Lý do vào khám:</span>
                <div className="font-semibold text-[#0f3e17] mt-0.5">{currentPatient.reason}</div>
              </div>
              <div>
                <span className="text-[#222222]/60 font-medium">Triệu chứng & Khiếm khuyết:</span>
                <div className="text-[#222222]/80 mt-0.5 leading-relaxed">{currentPatient.symptoms}</div>
              </div>
            </div>

            {/* Sàng lọc an toàn PHCN */}
            <div className="p-3.5 rounded-[14px] bg-[#e1f4df]/40 border border-[#cfe7d3] text-xs space-y-1.5">
              <div className="font-semibold text-[#0f3e17] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#0f3e17]" />
                Sàng lọc An toàn Trị liệu:
              </div>
              <div className="text-[#222222]/80 flex items-center justify-between">
                <span>Dị vật kim loại / Nẹp vít:</span>
                <strong className={currentPatient.metalImplant ? "text-amber-800" : "text-[#0f3e17]"}>
                  {currentPatient.metalImplant ? "Có (Chống chỉ định Sóng ngắn)" : "Không có"}
                </strong>
              </div>
              <div className="text-[#222222]/80 flex items-center justify-between">
                <span>Máy tạo nhịp tim (Pacemaker):</span>
                <strong className={currentPatient.pacemaker ? "text-rose-700" : "text-[#0f3e17]"}>
                  {currentPatient.pacemaker ? "Có (Cấm điện xung TENS)" : "Không có"}
                </strong>
              </div>
            </div>

            {/* Thước đo mức độ đau VAS */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#222222]/80">Thang đo mức độ đau (VAS 0 - 10):</span>
                <strong className="text-[#0f3e17] font-bold">{painScale}/10</strong>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={painScale}
                onChange={(e) => setPainScale(Number(e.target.value))}
                className="w-full accent-[#0f3e17] bg-[#efeeeb] h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#222222]/50">
                <span>0: Không đau</span>
                <span>5: Đau vừa</span>
                <span>10: Rất dữ dội</span>
              </div>
            </div>
          </div>

          {/* Queue List of this Room */}
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0f3e17] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0f3e17]" />
              <span>Hàng đợi buồng này ({queue.length})</span>
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {queue.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActivePatientIndex(idx);
                    resetExamForm();
                  }}
                  className={`w-full text-left p-2.5 rounded-[14px] border text-xs transition-colors flex items-center justify-between ${
                    idx === activePatientIndex
                      ? "bg-[#e1f4df] border-[#cfe7d3] text-[#0f3e17]"
                      : "bg-[#fffefc] border-[#efeeeb] text-[#222222]/70 hover:bg-[#efeeeb]/30"
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="font-mono text-[#0f3e17]">{item.queueNumber}</span>
                      <span>•</span>
                      <span>{item.name}</span>
                    </div>
                    <div className="text-[11px] truncate max-w-[190px] text-[#222222]/60">{item.reason}</div>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-[6px] font-semibold ${
                      item.status === "SERVING"
                        ? "bg-[#0f3e17] text-[#fffefc]"
                        : item.status === "COMPLETED"
                        ? "bg-[#e1f4df] text-[#0f3e17] border border-[#cfe7d3]"
                        : "bg-[#efeeeb] text-[#222222]/60"
                    }`}
                  >
                    {item.status === "SERVING" ? "Đang khám" : item.status === "COMPLETED" ? "Đã khám" : "Chờ"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Tabs Lượng giá FIM & Đo ROM & Kê đơn */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-6">
            {/* Mode Tabs */}
            <div className="flex border-b border-[#efeeeb] pb-3 mb-6 gap-2 sm:gap-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("FIM")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === "FIM"
                    ? "bg-[#0f3e17] text-[#fffefc]"
                    : "text-[#222222]/70 hover:text-[#0f3e17] hover:bg-[#e1f4df]/40"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>1. Lượng giá Độc lập FIM ({fimTotal}/126)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ROM")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === "ROM"
                    ? "bg-[#0f3e17] text-[#fffefc]"
                    : "text-[#222222]/70 hover:text-[#0f3e17] hover:bg-[#e1f4df]/40"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>2. Đo Góc Vận động Khớp (ROM)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("RX")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === "RX"
                    ? "bg-[#0f3e17] text-[#fffefc]"
                    : "text-[#222222]/70 hover:text-[#0f3e17] hover:bg-[#e1f4df]/40"
                }`}
              >
                <Pill className="w-4 h-4" />
                <span>3. Kê đơn & Chỉ định Bài tập</span>
              </button>
            </div>

            {/* TAB 1: THANG ĐIỂM FIM */}
            {activeTab === "FIM" && (
              <div className="space-y-6">
                <div className="p-4 rounded-[14px] bg-[#e1f4df]/40 border border-[#cfe7d3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-[#0f3e17] font-semibold uppercase tracking-wider">
                      Tổng điểm Độc lập Chức năng (FIM Score)
                    </span>
                    <div className="text-3xl font-black text-[#0f3e17] font-mono mt-0.5">
                      {fimTotal} <span className="text-sm font-normal text-[#222222]/60">/ 126 điểm</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#222222]/60">Phân loại mức độ độc lập:</span>
                    <div className={`text-xs font-bold ${getFimLevel(fimTotal).color} mt-0.5`}>
                      {getFimLevel(fimTotal).text}
                    </div>
                  </div>
                </div>

                {/* FIM Questions Grid */}
                <div className="space-y-4">
                  <div className="text-xs font-bold text-[#0f3e17] uppercase tracking-wide">
                    I. Vận động & Tự Chăm sóc (Thang 1: Phụ thuộc ➔ 7: Độc lập hoàn toàn)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      { key: "eating", label: "1. Ăn uống" },
                      { key: "grooming", label: "2. Chải chuốt / Vệ sinh cá nhân" },
                      { key: "bathing", label: "3. Tắm rửa" },
                      { key: "dressingUpper", label: "4. Mặc áo thân trên" },
                      { key: "dressingLower", label: "5. Mặc quần thân dưới" },
                      { key: "toileting", label: "6. Đi vệ sinh" },
                      { key: "bladder", label: "7. Kiểm soát tiểu tiện" },
                      { key: "bowel", label: "8. Kiểm soát đại tiện" },
                      { key: "bedChairTransfer", label: "9. Chuyển vị trí giường/ghế" },
                      { key: "locomotion", label: "10. Di chuyển / Đi bộ" },
                      { key: "stairs", label: "11. Lên xuống cầu thang" },
                      { key: "comprehension", label: "12. Hiểu ngôn ngữ" },
                      { key: "expression", label: "13. Diễn đạt / Nói" },
                      { key: "socialInteraction", label: "14. Tương tác xã hội" },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] flex items-center justify-between"
                      >
                        <span className="text-[#222222] font-medium">{item.label}</span>
                        <select
                          value={(fim as any)[item.key]}
                          onChange={(e) =>
                            handleFimChange(item.key as keyof FimAssessment, Number(e.target.value))
                          }
                          className="bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-1 text-xs text-[#0f3e17] font-bold focus:outline-none focus:border-[#0f3e17]"
                        >
                          <option value={1}>1 - Phụ thuộc 100%</option>
                          <option value={2}>2 - Trợ giúp tối đa (75%)</option>
                          <option value={3}>3 - Trợ giúp vừa (50%)</option>
                          <option value={4}>4 - Trợ giúp tối thiểu (25%)</option>
                          <option value={5}>5 - Cần giám sát / nhắc</option>
                          <option value={6}>6 - Độc lập có dụng cụ</option>
                          <option value={7}>7 - Độc lập hoàn toàn</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ĐO GÓC VẬN ĐỘNG KHỚP (ROM) */}
            {activeTab === "ROM" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#0f3e17] font-semibold">
                    Bảng Đo Góc Vận động Khớp (Goniometer Range of Motion)
                  </span>
                  <span className="text-[11px] text-[#0f3e17]/80 font-medium">So sánh bên lành vs bên bệnh</span>
                </div>

                <div className="space-y-4">
                  {romList.map((rom, index) => {
                    const percent = Math.min(100, Math.round((rom.rightAngle / rom.targetAngle) * 100));
                    return (
                      <div
                        key={index}
                        className="p-4 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-[#0f3e17] text-sm">{rom.joint}</span>
                            <span className="text-[#222222]/60 ml-2">({rom.movement})</span>
                          </div>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-[6px] bg-[#e1f4df] text-[#0f3e17] border border-[#cfe7d3]">
                            Chuẩn: {rom.normalRange}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-[#222222]/60">Bên lành (Trái):</span>
                            <div className="font-bold text-[#222222] mt-0.5">{rom.leftAngle}°</div>
                          </div>
                          <div>
                            <span className="text-[#222222]/60">Bên tổn thương (Phải):</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <input
                                type="number"
                                value={rom.rightAngle}
                                onChange={(e) => {
                                  const updated = [...romList];
                                  updated[index].rightAngle = Number(e.target.value);
                                  setRomList(updated);
                                }}
                                className="w-16 px-2 py-0.5 rounded-[7px] bg-[#fffefc] border border-[#efeeeb] text-[#0f3e17] font-bold focus:outline-none focus:border-[#0f3e17]"
                              />
                              <span className="text-[#222222]/60">°</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[#222222]/60">Mục tiêu giai đoạn:</span>
                            <div className="font-bold text-[#0f3e17] mt-0.5">{rom.targetAngle}°</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-[11px] text-[#222222]/60 mb-1">
                            <span>Mức độ phục hồi góc độ:</span>
                            <strong className="text-[#0f3e17]">{percent}%</strong>
                          </div>
                          <div className="w-full bg-[#efeeeb] rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#0f3e17] h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: KÊ ĐƠN THUỐC & BÀI TẬP PHCN TẠI NHÀ */}
            {activeTab === "RX" && (
              <div className="space-y-6">
                {/* Phần 1: Đơn thuốc điện tử */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#0f3e17] uppercase tracking-wider flex items-center gap-2">
                      <Pill className="w-4 h-4 text-[#0f3e17]" />
                      <span>Đơn thuốc Hỗ trợ Điều trị ({prescriptions.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddSampleDrug}
                      className="text-xs text-[#0f3e17] hover:text-[#0c2f10] font-semibold inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm thuốc
                    </button>
                  </div>

                  <div className="space-y-2">
                    {prescriptions.map((rx, idx) => (
                      <div
                        key={rx.id}
                        className="p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[#0f3e17]">
                            {idx + 1}. {rx.name} - <span className="text-[#222222]/60">{rx.quantity}</span>
                          </div>
                          <div className="text-[#222222]/70 text-[11px] mt-0.5">{rx.usage}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPrescriptions(prescriptions.filter((p) => p.id !== rx.id))}
                          className="text-[#222222]/40 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Phần 2: Chỉ định Dịch vụ điều trị (tạo phiếu thật cho thu ngân) */}
                <div className="space-y-3 pt-4 border-t border-[#efeeeb]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#0f3e17] uppercase tracking-wider flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-[#0f3e17]" />
                      <span>Chỉ định Dịch vụ điều trị ({selectedServiceIds.length} đã chọn)</span>
                    </h4>
                    {selectedServicesTotal > 0 && (
                      <span className="text-xs font-bold text-[#0f3e17]">
                        Tạm tính: {selectedServicesTotal.toLocaleString("vi-VN")} đ
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#222222]/60 leading-relaxed">
                    Tick chọn dịch vụ cần làm cho bệnh nhân này. Khi bấm “Hoàn tất Ca khám &amp; Lưu Bệnh án”,
                    hệ thống tạo phiếu chỉ định thật — thu ngân quét mã phiếu để lập hóa đơn. Không chọn
                    dịch vụ nào thì không tạo phiếu.
                  </p>

                  {servicesLoading ? (
                    <p className="text-xs text-[#222222]/70">Đang tải dịch vụ trong ca hôm nay...</p>
                  ) : servicesError ? (
                    <p className="text-xs text-rose-700">{servicesError}</p>
                  ) : doctorServices.length === 0 ? (
                    <p className="text-xs text-[#222222]/70">
                      Bác sĩ chưa có dịch vụ nào trong ca làm việc hôm nay. Kiểm tra ca làm việc
                      đã được duyệt chưa.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {doctorServices.map((srv) => {
                        const checked = selectedServiceIds.includes(srv.serviceId);
                        return (
                          <label
                            key={srv.serviceId}
                            className={`flex items-start gap-3 p-3.5 rounded-[14px] border text-xs cursor-pointer transition-colors ${
                              checked
                                ? "bg-[#e1f4df]/60 border-[#cfe7d3]"
                                : "bg-[#fffefc] border-[#efeeeb] hover:bg-[#efeeeb]/30"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService(srv.serviceId)}
                              className="mt-0.5 w-4 h-4 accent-[#0f3e17]"
                            />
                            <span className="flex-1">
                              <span className="block font-bold text-[#0f3e17] text-sm">{srv.serviceName}</span>
                              {srv.description && (
                                <span className="block text-[11px] text-[#222222]/60 mt-0.5">{srv.description}</span>
                              )}
                              {srv.timePerPatient && (
                                <span className="block text-[11px] text-[#222222]/60 mt-0.5">
                                  Thời lượng: {srv.timePerPatient} phút
                                </span>
                              )}
                            </span>
                            <span className="font-bold text-[#0f3e17] whitespace-nowrap">
                              {srv.price != null ? `${srv.price.toLocaleString("vi-VN")} đ` : "Liên hệ"}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {selectedServiceIds.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Ghi chú chỉ định (ghi vào phiếu):
                      </label>
                      <textarea
                        rows={2}
                        value={serviceNote}
                        onChange={(e) => setServiceNote(e.target.value)}
                        placeholder="Ví dụ: làm 10 buổi, mỗi buổi cách nhau 1 ngày..."
                        className="w-full p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                      />
                    </div>
                  )}

                  {createdPrescriptionCode && (
                    <div className="p-3.5 rounded-[14px] bg-[#e1f4df]/60 border border-[#cfe7d3] text-xs">
                      <span className="font-bold text-[#0f3e17]">Đã tạo phiếu chỉ định: </span>
                      <span className="font-mono font-bold text-[#0f3e17]">{createdPrescriptionCode}</span>
                      <span className="text-[#222222]/70"> — đưa mã này cho bệnh nhân ra quầy thu ngân.</span>
                    </div>
                  )}
                </div>

                {/* Phần 3: Chỉ định Bài tập PHCN tại nhà */}
                <div className="space-y-3 pt-4 border-t border-[#efeeeb]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#0f3e17] uppercase tracking-wider flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-[#0f3e17]" />
                      <span>Chỉ định Gói Bài tập PHCN tại nhà ({exercises.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddSampleExercise}
                      className="text-xs text-[#0f3e17] hover:text-[#0c2f10] font-semibold inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm bài tập
                    </button>
                  </div>

                  <div className="space-y-2">
                    {exercises.map((ex, idx) => (
                      <div
                        key={ex.id}
                        className="p-3.5 rounded-[14px] bg-[#e1f4df]/30 border border-[#cfe7d3] text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-[#0f3e17] text-sm">
                            {idx + 1}. {ex.name}
                          </strong>
                          <span className="text-[10px] px-2 py-0.5 rounded-[6px] bg-[#fffefc] text-[#0f3e17] border border-[#cfe7d3]">
                            {ex.category}
                          </span>
                        </div>
                        <div className="text-[#222222]/80">
                          • Liều lượng tập: <strong>{ex.sets}</strong> • Tần suất: {ex.frequency}
                        </div>
                        <div className="text-[#0f3e17] text-[11px] font-medium">
                          • Lưu ý kỹ thuật: {ex.precautions}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Phần 4: Lời dặn Bác sĩ */}
                <div className="space-y-2 pt-4 border-t border-[#efeeeb]">
                  <label className="block text-xs font-semibold text-[#0f3e17]">
                    Lời dặn Bác sĩ & Kế hoạch Tái khám:
                  </label>
                  <textarea
                    rows={3}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    className="w-full p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                  />
                </div>
              </div>
            )}

            {/* Bottom Actions: Save & Print */}
            <div className="mt-8 pt-4 border-t border-[#efeeeb] flex items-center justify-between">
              <span className="text-xs text-[#222222]/60">
                Buồng: <strong>{currentRoom.name}</strong> • Bác sĩ: {user?.name || "BS. Lâm Thanh Tú"}
              </span>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="px-4 py-2.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#efeeeb]/40 text-[#0f3e17] text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Xem & In Phiếu Kết quả</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSession}
                  disabled={isSaved}
                  className="px-6 py-2.5 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaved ? "Đang đồng bộ..." : "Hoàn tất Ca khám & Lưu Bệnh án"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Modal In Bệnh án & Phiếu Lượng giá PHCN */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-[#0f3e17]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fffefc] text-[#222222] rounded-[14px] max-w-2xl w-full p-8 border border-[#efeeeb] max-h-[90vh] overflow-y-auto">
            <div className="border-b pb-4 border-[#efeeeb] flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-[#0f3e17] uppercase">
                  PHÒNG KHÁM CHUYÊN KHOA PHỤC HỒI CHỨC NĂNG BÁC SĨ THANH SANG
                </div>
                <div className="text-[11px] text-[#222222]/60">
                  Địa chỉ: 193 Quang Trung, Đại Lộc, Đà Nẵng • Hotline: 0369.117.117
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-[7px] bg-[#e1f4df] border border-[#cfe7d3] text-[#0f3e17]">
                  Mã BA: TS-2026-{currentPatient.queueNumber}
                </span>
                <div className="text-[11px] text-[#222222]/50 mt-1">
                  Ngày khám: {new Date().toLocaleDateString("vi-VN")}
                </div>
              </div>
            </div>

            <div className="my-4 text-center">
              <h2 className="text-lg font-black text-[#0f3e17] uppercase">
                PHIẾU LƯỢNG GIÁ CHỨC NĂNG & CHỈ ĐỊNH ĐIỀU TRỊ
              </h2>
            </div>

            {/* Thông tin bệnh nhân */}
            <div className="grid grid-cols-2 gap-2 text-xs py-3 border-y border-[#efeeeb]">
              <div>
                Họ và tên: <strong className="text-[#0f3e17]">{currentPatient.name}</strong>
              </div>
              <div>
                Năm sinh: <strong>{currentPatient.birthYear}</strong> • Giới tính: {currentPatient.gender}
              </div>
              <div>
                Số điện thoại: <strong>{currentPatient.phone}</strong>
              </div>
              <div>
                Chẩn đoán lâm sàng: <strong>{diagnosis}</strong>
              </div>
            </div>

            {/* Kết quả lượng giá FIM & ROM */}
            <div className="my-4 space-y-3 text-xs">
              <div className="p-3.5 bg-[#e1f4df]/40 rounded-[14px] border border-[#cfe7d3]">
                <div className="flex justify-between font-bold text-[#0f3e17]">
                  <span>1. Thang điểm Độc lập Chức năng (FIM):</span>
                  <span>{fimTotal} / 126 điểm</span>
                </div>
                <div className="text-[11px] text-[#222222]/70 mt-1">
                  Đánh giá: <strong>{getFimLevel(fimTotal).text}</strong>. Thang đo mức độ đau VAS: {painScale}/10.
                </div>
              </div>

              <div className="p-3.5 bg-[#fffefc] rounded-[14px] border border-[#efeeeb]">
                <div className="font-bold text-[#0f3e17] mb-1">2. Kết quả Đo Góc Khớp (ROM):</div>
                <div className="space-y-1 text-[11px] text-[#222222]/80">
                  {romList.map((r, i) => (
                    <div key={i} className="flex justify-between">
                      <span>• {r.joint} ({r.movement}):</span>
                      <strong>
                        Bên tổn thương: {r.rightAngle}° (Bên lành: {r.leftAngle}° • Mục tiêu: {r.targetAngle}°)
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bài tập về nhà */}
              <div className="p-3.5 bg-[#e1f4df]/30 rounded-[14px] border border-[#cfe7d3] text-[#0f3e17]">
                <div className="font-bold mb-1">3. Bài tập Phục hồi Chức năng Hướng dẫn tại nhà:</div>
                <div className="space-y-1 text-[11px] text-[#222222]/80">
                  {exercises.map((ex, i) => (
                    <div key={i}>
                      • <strong>{ex.name}:</strong> {ex.sets} ({ex.frequency})
                    </div>
                  ))}
                </div>
              </div>

              {/* Đơn thuốc */}
              <div className="p-3.5 bg-[#fffefc] rounded-[14px] border border-[#efeeeb]">
                <div className="font-bold text-[#0f3e17] mb-1">4. Đơn thuốc Hỗ trợ:</div>
                <div className="space-y-1 text-[11px] text-[#222222]/80">
                  {prescriptions.map((rx, i) => (
                    <div key={i}>
                      {i + 1}. <strong>{rx.name}</strong> - SL: {rx.quantity} ({rx.usage})
                    </div>
                  ))}
                </div>
              </div>

              {/* Phiếu chỉ định dịch vụ */}
              {createdPrescriptionCode && (
                <div className="p-3.5 bg-[#e1f4df]/40 rounded-[14px] border border-[#cfe7d3]">
                  <div className="font-bold text-[#0f3e17] mb-1">5. Phiếu chỉ định Dịch vụ điều trị:</div>
                  <div className="text-[11px] text-[#222222]/80 space-y-1">
                    <div>
                      Mã phiếu (thu ngân quét mã này):{" "}
                      <strong className="font-mono text-[#0f3e17]">{createdPrescriptionCode}</strong>
                    </div>
                    {selectedServices.map((srv, i) => (
                      <div key={srv.serviceId}>
                        {i + 1}. <strong>{srv.serviceName}</strong>
                        {srv.price != null && (
                          <span> — {srv.price.toLocaleString("vi-VN")} đ</span>
                        )}
                      </div>
                    ))}
                    {selectedServicesTotal > 0 && (
                      <div>
                        Tạm tính: <strong className="text-[#0f3e17]">{selectedServicesTotal.toLocaleString("vi-VN")} đ</strong>
                      </div>
                    )}
                    {serviceNote.trim() && (
                      <div>Ghi chú chỉ định: {serviceNote.trim()}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-[11px] text-[#222222]/80">
                <strong>Lời dặn Bác sĩ:</strong> {doctorNotes}
              </div>
            </div>

            {/* Chữ ký Bác sĩ */}
            <div className="pt-4 flex justify-between items-end text-xs text-center">
              <div>
                <div className="text-[#222222]/60">Người bệnh / Thân nhân</div>
                <div className="mt-12 font-medium">(Ký và ghi rõ họ tên)</div>
              </div>
              <div>
                <div className="text-[#222222]/60">Bác sĩ Chuyên khoa PHCN</div>
                <div className="mt-12 font-bold text-[#0f3e17]">{user?.name || "BS.CKII Lâm Thanh Tú"}</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-[#efeeeb] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-[#efeeeb] rounded-[14px] text-xs font-semibold hover:bg-[#efeeeb]/40 text-[#222222]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] rounded-[14px] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Lượng giá</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
