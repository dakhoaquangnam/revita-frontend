"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Stethoscope,
  Users,
  Volume2,
  Pill,
  ShieldCheck,
  AlertTriangle,
  Printer,
  Save,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ttsService } from "@/services/tts.service";
import {
  doctorService,
  DrugRow,
  ExerciseRow,
  MedicationPrescription,
} from "@/services/doctor.service";
import {
  assessmentService,
  type AssessmentRecord,
} from "@/services/assessment.service";
import { exerciseService } from "@/services/exercise.service";
import AssessmentTab from "@/components/doctor/assessment-tab";
import DrugForm from "@/components/doctor/drug-form";
import ExerciseForm from "@/components/doctor/exercise-form";
import PrescriptionHistory from "@/components/doctor/prescription-history";
import { CLINIC } from "@/lib/clinic";
import QRCode from "qrcode";
import {
  appointmentService,
  PatientProfileSummary,
  DoctorServiceItem,
} from "@/services/appointment.service";
import { receptionistService } from "@/services/receptionist.service";
import {
  roomService,
  getApiErrorMessage,
} from "@/services/room.service";
import {
  therapyService,
  CompletionCheck,
} from "@/services/therapy.service";
import { apiClient } from "@/lib/api";

interface DoctorQueueItem {
  id: string;
  patientProfileId: string;
  appointmentCode: string;
  // Id lịch hẹn thật (UUID) — dùng khi lưu bệnh án/đơn (backend tra cứu
  // theo code/id; KHÔNG được đưa id phiếu vào đây). Vãng lai không có
  // lịch hẹn nên để trống.
  appointmentId?: string;
  // Bệnh nhân vãng lai (không lịch hẹn) vào hàng đợi qua phiếu khám.
  isWalkIn?: boolean;
  queueNumber: string;
  name: string;
  birthYear: number;
  gender: string;
  phone: string;
  reason: string;
  symptoms: string;
  metalImplant: boolean;
  pacemaker: boolean;
  // GĐ4 — dị ứng ghi ở form đăng ký (kiosk/lễ tân/đặt lịch), dùng để cảnh
  // báo khi kê thuốc ở tab RX.
  allergies: string;
  status: "SERVING" | "WAITING" | "COMPLETED";
}

// 16/11: tab ROM nhập nhanh (ROM_TEMPLATE) đã bỏ — đo ROM nay chỉ làm ở
// tab Thang điểm (Assessment ROM có cấu trúc, 12 khớp).

// GĐ4: mẫu thuốc/bài tập ghi cứng đã bỏ — đơn thuốc kê từ danh mục Dược
// thư (724 thuốc), bài tập kê từ danh mục bài tập PHCN (38 bài). Không
// còn số liệu mẫu lọt vào đơn thật.

export default function DoctorWorkspacePage() {
  const { user } = useAuth();

  // Hàng đợi buồng khám — lịch hẹn thật của bác sĩ hôm nay.
  const [queue, setQueue] = useState<DoctorQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState("");
  const [queueRefreshing, setQueueRefreshing] = useState(false);
  const [activePatientIndex, setActivePatientIndex] = useState(0);
  const currentPatient = queue[activePatientIndex] || queue[0];
  // Ref soi gương queue + vị trí đang khám — loadQueue chạy trong
  // setInterval nên không được đọc state cũ trong closure.
  const queueRef = useRef<DoctorQueueItem[]>([]);
  const activeIdxRef = useRef(0);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    activeIdxRef.current = activePatientIndex;
  }, [activePatientIndex]);
  // Id dịch vụ Khám PHCN (REHAB_EXAM) — tra 1 lần từ danh sách dịch vụ
  // của bác sĩ, dùng để nhận diện phiếu khám vãng lai trong hàng đợi phòng.
  const examServiceIdRef = useRef<string>("");
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


  const [isCallingAudio, setIsCallingAudio] = useState(false);
  const [callToast, setCallToast] = useState("");
  // GĐ2 §4.4.3 — phòng trực của bác sĩ (giải quyết từ GET /routing/rooms:
  // buồng có doctorId trùng user) + trạng thái gọi thật qua API.
  const [myRoomId, setMyRoomId] = useState("");
  const [myRoomName, setMyRoomName] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [callError, setCallError] = useState("");

  useEffect(() => {
    // GỐC LỖI 19/11: response đăng nhập KHÔNG trả user.doctor (backend
    // chỉ gắn doctor vào JWT payload và /auth/me), nên user?.doctor?.id
    // luôn undefined và effect này chưa bao giờ chạy — trang bác sĩ mãi
    // không biết phòng trực. Dự phòng: doctorId từ lịch hẹn hôm nay
    // (state doctorId do loadQueue đặt từ appointments[0].doctorId).
    const myDoctorId = user?.doctor?.id ?? doctorId;
    if (!myDoctorId) return;
    let cancelled = false;
    receptionistService
      .getRooms()
      .then((list) => {
        if (cancelled) return;
        const mine = list.find((r) =>
          r.booths?.some((b) => b.doctorId === myDoctorId),
        );
        if (mine) {
          setMyRoomId(mine.id);
          setMyRoomName(mine.roomName);
          return;
        }
        // Ngoài giờ ca (19/11): GET /routing/rooms chỉ gắn bác sĩ vào
        // buồng khi ca ĐANG diễn ra, nên 11:30–13:30 không tìm được phòng
        // bằng đường trên. Dự phòng: phòng của ca hôm nay (ca đang diễn
        // ra, rồi ca sắp tới, rồi ca cuối ngày) — backend trả kèm trong
        // endpoint dịch vụ của bác sĩ.
        const today = new Date().toISOString().substring(0, 10);
        return appointmentService
          .getDoctorRoom(myDoctorId, today)
          .then((room) => {
            if (!cancelled && room) {
              setMyRoomId(room.roomId);
              setMyRoomName(room.roomName);
            }
          })
          .catch(() => {});
      })
      .catch(() => {
        // Không xác định được phòng trực: nút gọi sẽ báo rõ lỗi, không gọi giả.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.doctor?.id, doctorId]);

  // Hàng đợi buồng khám — lịch hẹn hôm nay + bệnh nhân vãng lai đã được
  // mời vào phòng khám (phiếu Khám PHCN, chưa có lịch hẹn). Trước đây chỉ
  // lấy lịch hẹn nên bệnh nhân vãng lai như Nguyễn Thanh Bình không bao
  // giờ hiện ở đây dù đã bấm "Mời vào" ở màn hình phòng.
  const loadQueue = useCallback(
    async (silent = false) => {
      if (!silent) {
        setQueueLoading(true);
        setQueueError("");
      } else {
        setQueueRefreshing(true);
      }
      try {
        const appointments = await appointmentService.getDoctorAppointments();
        const today = new Date().toISOString().substring(0, 10);
        const myDoctorId =
          user?.doctor?.id ?? appointments[0]?.doctorId ?? "";
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
              appointmentId: apt.appointmentId,
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
              allergies: profile.allergies ?? "",
              status:
                apt.status === "COMPLETED"
                  ? "COMPLETED"
                  : apt.status === "SERVING"
                    ? "SERVING"
                    : "WAITING",
            };
          });
        if (myDoctorId) setDoctorId(myDoctorId);

        // Gộp bệnh nhân vãng lai: phiếu dịch vụ Khám PHCN trong phòng trực,
        // do chính bác sĩ này phụ trách, chưa có lịch hẹn, chưa trùng với
        // lịch hẹn đã có trong hàng đợi.
        if (myDoctorId) {
          try {
            // Lấy phòng ngay trong lượt tải này (19/11): trước đây việc
            // biết phòng chờ effect myRoom chạy sau loadQueue nên lượt tải
            // đầu luôn thiếu vãng lai, phải bấm Tải lại mới hiện. Lấy
            // phòng ở đây thì lượt tải đầu đã gộp được Bình.
            let roomId = myRoomId;
            if (!roomId) {
              const room = await appointmentService.getDoctorRoom(
                myDoctorId,
                today,
              );
              if (room) {
                roomId = room.roomId;
                setMyRoomId(room.roomId);
                setMyRoomName(room.roomName);
              }
            }
            if (roomId) {
            if (!examServiceIdRef.current) {
              const services = await appointmentService.getServicesByDoctor(
                myDoctorId,
                today,
              );
              const exam =
                services.find((s) => s.serviceCode === "REHAB_EXAM") ??
                services.find(
                  (s) => s.serviceName === "Khám phục hồi chức năng",
                );
              if (exam) examServiceIdRef.current = exam.serviceId;
            }
            const examServiceId = examServiceIdRef.current;
            if (examServiceId) {
              const roomQueue = await roomService.getRoomQueue(roomId);
              const inQueue = new Set(items.map((i) => i.patientProfileId));
              const walkins = roomQueue.therapyQueue.filter(
                (t) =>
                  t.serviceId === examServiceId &&
                  !inQueue.has(t.patientProfileId) &&
                  (!t.doctorId || t.doctorId === myDoctorId) &&
                  [
                    "WAITING",
                    "PREPARING",
                    "RETURNING",
                    "SERVING",
                    "WAITING_RESULT",
                    "NOT_STARTED",
                    "PENDING",
                  ].includes(t.status),
              );
              const profiles = await Promise.all(
                walkins.map((t) =>
                  apiClient
                    .get(`/patient-profiles/${t.patientProfileId}`)
                    .then((r) => r.data)
                    .catch(() => null),
                ),
              );
              walkins.forEach((t, i) => {
                const p: any = profiles[i] ?? {};
                const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
                items.push({
                  id: `walkin:${t.id}`,
                  patientProfileId: t.patientProfileId,
                  appointmentCode: "",
                  isWalkIn: true,
                  queueNumber: t.prescriptionCode,
                  name: t.patientName,
                  birthYear: dob ? dob.getFullYear() : 0,
                  gender: p.gender ?? "",
                  phone: p.phone ?? "",
                  reason: t.serviceName,
                  symptoms: "",
                  metalImplant: false,
                  pacemaker: false,
                  allergies: p.allergies ?? "",
                  status:
                    t.status === "SERVING"
                      ? "SERVING"
                      : t.status === "COMPLETED"
                        ? "COMPLETED"
                        : "WAITING",
                });
              });
            }
            }
          } catch {
            // Không gộp được vãng lai thì hàng đợi lịch hẹn vẫn hiện —
            // không chặn khám vì 1 lỗi phụ.
          }
        }

        // Giữ nguyên bệnh nhân đang khám khi làm mới (poll/nút Tải lại):
        // tìm lại theo id, mất thì kẹp về cuối danh sách.
        const prevId = queueRef.current[activeIdxRef.current]?.id;
        const newIdx = prevId ? items.findIndex((x) => x.id === prevId) : -1;
        setQueue(items);
        if (items.length === 0) {
          setActivePatientIndex(0);
        } else if (newIdx >= 0) {
          if (newIdx !== activeIdxRef.current) setActivePatientIndex(newIdx);
        } else {
          setActivePatientIndex(
            Math.min(activeIdxRef.current, items.length - 1),
          );
        }
      } catch (err: any) {
        if (!silent) {
          setQueueError(
            err.response?.data?.message ||
              "Không tải được hàng đợi buồng khám. Vui lòng thử lại.",
          );
        }
      } finally {
        if (!silent) setQueueLoading(false);
        else setQueueRefreshing(false);
      }
    },
    [myRoomId, user?.doctor?.id],
  );

  // Tải hàng đợi khi vào trang + khi xác định được phòng trực, rồi tự làm
  // mới mỗi 30 giây để bệnh nhân mới (đặt web, lễ tân, vãng lai được mời
  // vào) tự hiện mà không cần F5.
  useEffect(() => {
    void loadQueue(queueRef.current.length === 0 ? false : true);
    const t = setInterval(() => {
      void loadQueue(true);
    }, 30000);
    return () => clearInterval(t);
  }, [loadQueue]);

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

  // Tab nghiệp vụ: 'FIM' | 'RX' (tab ROM nhập nhanh đã bỏ 16/11)
  const [activeTab, setActiveTab] = useState<"FIM" | "RX">("FIM");

  // Thông tin khám lâm sàng (mẫu khởi tạo; bác sĩ chỉnh theo từng bệnh nhân)
  const [diagnosis, setDiagnosis] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");

  // GĐ3 — id các Assessment tạo trong phiên khám (tab Thang điểm), để ghi
  // vào content.assessmentIds khi lưu bệnh án. Thang điểm cũ (fim/fimTotal)
  // đã bỏ: điểm FIM nay chỉ nằm ở bảng Assessment, không còn trong content.
  const [sessionAssessmentIds, setSessionAssessmentIds] = useState<string[]>([]);
  const [printAssessments, setPrintAssessments] = useState<AssessmentRecord[]>([]);

  // GĐ4 — đơn thuốc & bài tập kê từ danh mục thật (Dược thư 724 thuốc,
  // 38 bài tập PHCN), không còn mẫu ghi cứng. Bắt đầu rỗng cho mỗi bệnh nhân.
  const [drugRows, setDrugRows] = useState<DrugRow[]>([]);
  const [exerciseRows, setExerciseRows] = useState<ExerciseRow[]>([]);
  // Đơn vừa lưu trong phiên (để hiện mã + nút Ký/Phát và để in phiếu).
  const [savedMp, setSavedMp] = useState<MedicationPrescription | null>(null);
  const [savedExpCode, setSavedExpCode] = useState("");
  const [savedExpRows, setSavedExpRows] = useState<ExerciseRow[]>([]);
  const [mpActionBusy, setMpActionBusy] = useState(false);
  // Dị ứng của bệnh nhân đang khám (sửa được tại chỗ — lưu vào hồ sơ).
  const [allergyDraft, setAllergyDraft] = useState("");
  const [allergySaving, setAllergySaving] = useState(false);
  const [allergySavedAt, setAllergySavedAt] = useState(0);
  // Phiếu in được chọn trong khung in: phiếu lượng giá / đơn thuốc / bài tập.
  const [printTarget, setPrintTarget] = useState<"assessment" | "medication" | "exercise">("assessment");
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Đồng bộ ô dị ứng theo bệnh nhân đang khám.
  useEffect(() => {
    setAllergyDraft(currentPatient?.allergies ?? "");
  }, [currentPatient?.patientProfileId]);

  // Đặt lại phiếu khám về mẫu khi chuyển bệnh nhân.
  const resetExamForm = () => {
    setDiagnosis("");
    setDoctorNotes("");
    setSessionAssessmentIds([]);
    setPrintAssessments([]);
    setDrugRows([]);
    setExerciseRows([]);
    setSavedMp(null);
    setSavedExpCode("");
    setSavedExpRows([]);
    setSelectedServiceIds([]);
    setServiceNote("");
    setCreatedPrescriptionCode("");
  };

  // --- Nháp workspace bền qua F5 (19/11) ---
  // Chẩn đoán/ghi chú/đơn thuốc/đơn bài tập/dịch vụ chỉ định + id các lần
  // lượng giá trong phiên trước đây chỉ nằm trong state: làm mới trang là
  // mất hết, bấm lưu sau đó tạo bệnh án trống (chẩn đoán rỗng, không gắn
  // lượng giá) — đúng lỗi anh gặp với Mai Thị Đến. Nay lưu nháp theo từng
  // bệnh nhân vào localStorage, đổi bệnh nhân thì nạp nháp của người đó.
  const workspaceDraftKey = (patientProfileId: string) =>
    `doctor-workspace-draft:v1:${patientProfileId}`;
  const emptyWorkspaceDraft = () => ({
    diagnosis: "",
    doctorNotes: "",
    drugRows: [] as DrugRow[],
    exerciseRows: [] as ExerciseRow[],
    selectedServiceIds: [] as string[],
    serviceNote: "",
    sessionAssessmentIds: [] as string[],
  });
  type WorkspaceDraft = ReturnType<typeof emptyWorkspaceDraft>;
  const draftJSON = useMemo(
    () =>
      JSON.stringify({
        diagnosis,
        doctorNotes,
        drugRows,
        exerciseRows,
        selectedServiceIds,
        serviceNote,
        sessionAssessmentIds,
      }),
    [
      diagnosis,
      doctorNotes,
      drugRows,
      exerciseRows,
      selectedServiceIds,
      serviceNote,
      sessionAssessmentIds,
    ],
  );
  const draftJSONRef = useRef("");
  useEffect(() => {
    draftJSONRef.current = draftJSON;
  }, [draftJSON]);
  // Chặn lưu trùng bệnh án: sau khi lưu thành công, nút Lưu tắt cho tới
  // khi nội dung thay đổi (19/11: 1 buổi khám của Mai Thị Đến bị lưu
  // thành 3 bệnh án COMPLETED trong 6 phút vì bấm lưu lặp lại).
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionSaveSnapshot, setSessionSaveSnapshot] = useState<string | null>(null);
  // Cờ bỏ qua 1 lần ghi nháp ngay sau khi nạp nháp (tránh ghi đè nháp của
  // bệnh nhân mới bằng dữ liệu cũ của bệnh nhân trước trong cùng 1 commit).
  const skipDraftSaveRef = useRef(false);
  // Cờ bỏ qua 1 lần ghi nháp ngay sau khi lưu thành công (lưu xong đã xóa
  // nháp; setSessionAssessmentIds([]) sau đó sẽ kích hoạt effect ghi nháp
  // 1 lần — phải chặn để nháp đã lưu không sống lại).
  const draftClearedRef = useRef(false);
  const [savedToday, setSavedToday] = useState<null | {
    records: {
      id: string;
      appointmentId: string;
      createdAt: string;
      diagnosis: string;
      mpCodes: string[];
      expCodes: string[];
    }[];
  }>(null);

  // "Đã lưu hôm nay" cho bệnh nhân đang khám — để bác sĩ thấy bệnh án/đơn
  // đã lưu sau khi F5, thay vì tưởng chưa lưu rồi bấm lưu trùng.
  const loadSavedToday = useCallback(
    async (patientProfileId: string, appointmentId?: string) => {
      try {
        const today = new Date().toISOString().substring(0, 10);
        const res: any =
          await doctorService.listMedicalRecordsByPatient(patientProfileId);
        const all: any[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        const todays = all.filter(
          (r) => String(r.createdAt ?? "").substring(0, 10) === today,
        );
        const exps: any = await exerciseService
          .listPatientExercisePrescriptions(patientProfileId, { limit: 50 })
          .catch(() => ({ data: [] }));
        const expRows: any[] = Array.isArray(exps?.data) ? exps.data : [];
        const records = await Promise.all(
          todays.map(async (r) => {
            const mps: any = await doctorService
              .listMedicationPrescriptionsByMedicalRecord(r.id)
              .catch(() => ({ results: [] }));
            const mpCodes: string[] = (
              Array.isArray(mps?.results) ? mps.results : []
            ).map((m: any) => m.code);
            const expCodes: string[] = expRows
              .filter((e: any) => e.medicalRecordId === r.id)
              .map((e: any) => e.code);
            const content: any = r.content ?? {};
            return {
              id: r.id,
              appointmentId: r.appointmentId ?? "",
              createdAt: r.createdAt,
              diagnosis:
                typeof content.diagnosis === "string" ? content.diagnosis : "",
              mpCodes,
              expCodes,
            };
          }),
        );
        setSavedToday({ records });
        // Đã có bệnh án hôm nay cho lượt khám này thì khóa nút Lưu khi
        // form chưa thay đổi (tránh bấm lưu lặp tạo bệnh án trống).
        // Nhưng còn nháp chưa lưu thì phải cho lưu — nháp tồn tại nghĩa
        // là nội dung đó chưa từng được lưu.
        const hasRecordForThisVisit = records.some(
          (rec) =>
            !appointmentId ||
            !rec.appointmentId ||
            rec.appointmentId === appointmentId,
        );
        let hasUnsavedDraft = false;
        try {
          const raw = localStorage.getItem(
            `doctor-workspace-draft:v1:${patientProfileId}`,
          );
          if (raw) {
            const dd = JSON.parse(raw);
            hasUnsavedDraft = Boolean(
              dd.diagnosis?.trim() ||
                dd.doctorNotes?.trim() ||
                dd.drugRows?.length ||
                dd.exerciseRows?.length ||
                dd.selectedServiceIds?.length ||
                dd.serviceNote?.trim() ||
                dd.sessionAssessmentIds?.length,
            );
          }
        } catch {}
        if (hasRecordForThisVisit && !hasUnsavedDraft) {
          setSessionSaveSnapshot(draftJSONRef.current);
        } else if (!hasRecordForThisVisit) {
          setSessionSaveSnapshot(null);
        }
      } catch {
        setSavedToday({ records: [] });
      }
    },
    [],
  );

  // Nạp nháp + dữ liệu đã lưu hôm nay khi đổi bệnh nhân.
  useEffect(() => {
    const pid = currentPatient?.patientProfileId;
    if (!pid) return;
    skipDraftSaveRef.current = true;
    let hasDraftContent = false;
    try {
      const raw = localStorage.getItem(workspaceDraftKey(pid));
      const d: Partial<WorkspaceDraft> = raw ? JSON.parse(raw) : {};
      hasDraftContent = Boolean(
        d.diagnosis?.trim() ||
          d.doctorNotes?.trim() ||
          d.drugRows?.length ||
          d.exerciseRows?.length ||
          d.selectedServiceIds?.length ||
          d.serviceNote?.trim() ||
          d.sessionAssessmentIds?.length,
      );
      setDiagnosis(typeof d.diagnosis === "string" ? d.diagnosis : "");
      setDoctorNotes(typeof d.doctorNotes === "string" ? d.doctorNotes : "");
      setDrugRows(Array.isArray(d.drugRows) ? d.drugRows : []);
      setExerciseRows(Array.isArray(d.exerciseRows) ? d.exerciseRows : []);
      setSelectedServiceIds(
        Array.isArray(d.selectedServiceIds) ? d.selectedServiceIds : [],
      );
      setServiceNote(typeof d.serviceNote === "string" ? d.serviceNote : "");
      setSessionAssessmentIds(
        Array.isArray(d.sessionAssessmentIds) ? d.sessionAssessmentIds : [],
      );
    } catch {
      resetExamForm();
    }
    setSavedMp(null);
    setSavedExpCode("");
    setSavedExpRows([]);
    setCreatedPrescriptionCode("");
    setPrintAssessments([]);
    // Có nháp chưa lưu thì cho lưu ngay; chưa có gì thì khóa nút Lưu cho
    // tới khi tải xong "Đã lưu hôm nay" (tránh bấm lưu 1 form trống trong
    // lúc dữ liệu chưa về).
    setSessionSaveSnapshot(
      hasDraftContent ? null : JSON.stringify(emptyWorkspaceDraft()),
    );
    setSavedToday(null);
    void loadSavedToday(pid, currentPatient?.appointmentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatient?.patientProfileId]);

  // Ghi nháp mỗi khi nội dung thay đổi (localStorage — chỉ ở máy bác sĩ,
  // không gửi lên server).
  useEffect(() => {
    const pid = currentPatient?.patientProfileId;
    if (!pid) return;
    if (draftClearedRef.current) {
      draftClearedRef.current = false;
      return;
    }
    if (skipDraftSaveRef.current) {
      skipDraftSaveRef.current = false;
      return;
    }
    try {
      localStorage.setItem(workspaceDraftKey(pid), draftJSON);
    } catch {}
  }, [currentPatient?.patientProfileId, draftJSON]);

  // GĐ5 — hoàn thành can thiệp: checklist + khóa phiếu (khác hẳn nút
  // "Hoàn thành" cũ ở hàng đợi — nút cũ chỉ đổi state local, không gọi API
  // đổi trạng thái phiếu; mục này gọi POST /prescriptions/:id/complete-intervention).
  const [completeRxId, setCompleteRxId] = useState("");
  const [completeRxCode, setCompleteRxCode] = useState("");
  const [completeRxStatus, setCompleteRxStatus] = useState("");
  const [completeRxCompletedAt, setCompleteRxCompletedAt] = useState("");
  const [completionCheck, setCompletionCheck] = useState<CompletionCheck | null>(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const [completeBusy, setCompleteBusy] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [completeDoneMsg, setCompleteDoneMsg] = useState("");

  // Lấy phiếu chỉ định mới nhất của bệnh nhân đang khám + checklist hoàn
  // thành. Không lấy được (chưa có phiếu / không có quyền) thì ẩn mục.
  useEffect(() => {
    const profileId = currentPatient?.patientProfileId;
    if (!profileId) {
      setCompleteRxId("");
      setCompletionCheck(null);
      return;
    }
    let cancelled = false;
    setCompletionLoading(true);
    setCompletionError("");
    setCompleteDoneMsg("");
    setShowOverride(false);
    apiClient
      .get(`/prescriptions/my/profile/${profileId}`)
      .then((res) => {
        const d = res.data;
        const list: any[] = Array.isArray(d)
          ? d
          : Array.isArray(d?.data)
            ? d.data
            : [];
        if (list.length === 0) return null;
        const sorted = [...list].sort((a, b) =>
          String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
        );
        return sorted.find((p) => p.status !== "COMPLETED") ?? sorted[0];
      })
      .then(async (rx: any) => {
        if (cancelled || !rx) {
          if (!cancelled) {
            setCompleteRxId("");
            setCompletionCheck(null);
          }
          return;
        }
        setCompleteRxId(rx.id);
        setCompleteRxCode(rx.prescriptionCode ?? "");
        setCompleteRxStatus(rx.status ?? "");
        setCompleteRxCompletedAt(rx.completedAt ?? "");
        try {
          const check = await therapyService.getCompletionCheck(rx.id);
          if (!cancelled) setCompletionCheck(check);
        } catch {
          if (!cancelled) setCompletionCheck(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompleteRxId("");
          setCompletionCheck(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCompletionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPatient?.patientProfileId]);

  const handleCompleteIntervention = async (withReason: boolean) => {
    if (!completeRxId) return;
    if (withReason && !overrideReason.trim()) {
      setCompletionError("Hoàn thành dù chưa đủ điều kiện thì bắt buộc nhập lý do.");
      return;
    }
    setCompleteBusy(true);
    setCompletionError("");
    try {
      const res = await therapyService.completeIntervention(
        completeRxId,
        withReason ? overrideReason.trim() : undefined,
      );
      setCompleteRxStatus("COMPLETED");
      setCompleteRxCompletedAt(new Date().toISOString());
      setCompleteDoneMsg(
        withReason
          ? `Đã hoàn thành can thiệp (ngoại lệ có lý do: ${res.completionReason ?? overrideReason.trim()}).`
          : "Đã hoàn thành can thiệp — phiếu đã khóa, không mở thêm buổi được nữa.",
      );
      setShowOverride(false);
      const check = await therapyService.getCompletionCheck(completeRxId).catch(() => null);
      if (check) setCompletionCheck(check);
    } catch (err: unknown) {
      setCompletionError(getApiErrorMessage(err, "Hoàn thành can thiệp thất bại."));
    } finally {
      setCompleteBusy(false);
    }
  };

  const [isSaved, setIsSaved] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // GĐ3 — khi mở khung in, lấy các lần đánh giá trong phiên để in kết quả
  // thang điểm thật (thay cho fimTotal/romList cũ trong state form).
  useEffect(() => {
    if (!showPrintModal || !currentPatient) return;
    let cancelled = false;
    assessmentService
      .getPatientAssessments(currentPatient.patientProfileId, { limit: 10 })
      .then((res) => {
        if (!cancelled) setPrintAssessments(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showPrintModal, currentPatient]);

  // GĐ2 §4.4.3 — Gọi bệnh nhân tiếp theo bằng API thật (không còn "thành
  // công giả": chỉ đổi trạng thái local + phát loa SAU khi API thành công).
  // Nếu bệnh nhân có dịch vụ trị liệu đang chờ trong phòng → gọi đúng dịch
  // vụ đó (POST /prescriptions/call-patient); nếu không, gọi lịch khám vào
  // phòng (POST /routing/rooms/:roomId/call-appointment).
  const handleCallNext = async () => {
    if (queue.length === 0 || isCalling) return;
    // Chuyển tới bệnh nhân tiếp theo trong danh sách hàng đợi
    const nextIdx = (activePatientIndex + 1) % queue.length;
    const nextPatient = queue[nextIdx];
    setCallError("");
    if (!myRoomId) {
      setCallError(
        "Chưa xác định được phòng trực của bạn. Kiểm tra ca trực rồi thử lại.",
      );
      return;
    }
    setIsCalling(true);
    try {
      const roomQueue = await roomService.getRoomQueue(myRoomId);
      const therapy = roomQueue.therapyQueue.find(
        (t) =>
          t.patientProfileId === nextPatient.patientProfileId &&
          (t.status === "WAITING" ||
            t.status === "PREPARING" ||
            t.status === "RETURNING"),
      );
      if (nextPatient.isWalkIn) {
        // Vãng lai không có lịch hẹn nên không gọi được bằng mã hẹn:
        // gọi qua phiếu dịch vụ; đã SERVING (được mời từ màn hình
        // phòng) thì khỏi gọi lại, chỉ chuyển sang khám.
        if (therapy) {
          const res = await roomService.callPatient(therapy.id);
          if (!res.success) {
            throw new Error(res.message || "Không gọi được bệnh nhân.");
          }
        } else {
          const serving = roomQueue.therapyQueue.find(
            (t) =>
              t.patientProfileId === nextPatient.patientProfileId &&
              t.status === "SERVING",
          );
          if (!serving) {
            throw new Error(
              "Không tìm thấy phiếu khám của bệnh nhân trong phòng.",
            );
          }
        }
      } else if (therapy) {
        const res = await roomService.callPatient(therapy.id);
        if (!res.success) {
          throw new Error(res.message || "Không gọi được bệnh nhân.");
        }
      } else {
        await roomService.callAppointment(myRoomId, nextPatient.appointmentCode);
      }

      // Gọi thành công mới chuyển bệnh nhân + đổi trạng thái local.
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

      const roomTitle = roomQueue.roomName || myRoomName || "Phòng khám";
      const roomLocation = "Khu B - Tầng 1";

      const callPayload = {
        queueNumber: nextPatient.queueNumber,
        patientName: nextPatient.name.toUpperCase(),
        counterCode: myRoomId,
        counterName: roomTitle,
        roomName: roomLocation,
        calledAt: new Date().toLocaleTimeString("vi-VN"),
        isPriority: false,
      };

      // 1. Đồng bộ thời gian thực sang Màn hình TV sảnh chờ (tv-display) qua BroadcastChannel & localStorage
      // (TV còn nhận thêm broadcast PATIENT_CALLED_TO_ROOM từ backend qua WebSocket.)
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
      setCallToast(`Đã gọi: ${nextPatient.name} (${nextPatient.queueNumber}) vào ${roomTitle}`);
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
    } catch (err: unknown) {
      // Gọi thất bại: KHÔNG chuyển bệnh nhân, KHÔNG phát loa — báo đúng lỗi backend.
      setCallError(getApiErrorMessage(err, "Không gọi được bệnh nhân."));
    } finally {
      setIsCalling(false);
    }
  };

  // GĐ4 — lưu dị ứng của bệnh nhân đang khám vào hồ sơ (PATCH profile).
  const handleSaveAllergies = async () => {
    if (!currentPatient?.patientProfileId) return;
    setAllergySaving(true);
    try {
      await doctorService.updatePatientProfile(currentPatient.patientProfileId, {
        allergies: allergyDraft.trim(),
      });
      setQueue((prev) =>
        prev.map((p) =>
          p.patientProfileId === currentPatient.patientProfileId
            ? { ...p, allergies: allergyDraft.trim() }
            : p,
        ),
      );
      setAllergySavedAt(Date.now());
      setTimeout(() => setAllergySavedAt(0), 3000);
    } catch (err: unknown) {
      alert("Lưu dị ứng thất bại: " + getApiErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setAllergySaving(false);
    }
  };

  // GĐ4 — ký đơn thuốc vừa lưu (DRAFT → SIGNED).
  const handleSignMp = async () => {
    if (!savedMp) return;
    setMpActionBusy(true);
    try {
      const updated = await doctorService.signMedicationPrescription(savedMp.id);
      setSavedMp(updated);
    } catch (err: unknown) {
      alert("Ký đơn thất bại: " + getApiErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setMpActionBusy(false);
    }
  };

  // GĐ4 — phát thuốc (SIGNED → DISPENSED, bác sĩ bấm theo Q3).
  const handleDispenseMp = async () => {
    if (!savedMp) return;
    setMpActionBusy(true);
    try {
      const updated = await doctorService.dispenseMedicationPrescription(savedMp.id);
      setSavedMp(updated);
    } catch (err: unknown) {
      alert("Phát thuốc thất bại: " + getApiErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setMpActionBusy(false);
    }
  };

  // GĐ4 — tạo mã QR cho phiếu bài tập (trỏ trang tài khoản bệnh nhân; video
  // xem bài tập sẽ gắn khi có mediaUrl — đợt sau).
  useEffect(() => {
    if (!showPrintModal || printTarget !== "exercise" || !savedExpCode) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(`${window.location.origin}/tai-khoan`, { width: 160, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showPrintModal, printTarget, savedExpCode]);

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
    setIsSavingSession(true);
    try {
      // 16/11: thước VAS nhanh ở thẻ bệnh nhân đã bỏ theo yêu cầu — điểm
      // đau nay chỉ nhập ở tab Thang điểm (Assessment VAS có cấu trúc).
      // assessmentIds chỉ còn các Assessment tạo ở tab Thang điểm.
      const assessmentIds = [...sessionAssessmentIds];

      // 1. Lưu bệnh án thật. Lỗi phải nổi lên — không được báo đã lưu
      // trong khi backend chưa ghi gì.
      // GĐ3: content chỉ còn assessmentIds (thang điểm thật ở bảng
      // Assessment) — ngừng ghi fim/fimTotal/romList (đọc bệnh án cũ vẫn
      // tương thích vì content là JSON tự do).
      // GĐ4: content không còn ghi prescriptions/exercises — đơn thuốc và
      // đơn bài tập nay là bảng riêng có mã MP/EXP, không nằm trong JSON
      // bệnh án mã hóa.
      const record = await doctorService.createMedicalRecord({
        patientProfileId: currentPatient.patientProfileId,
        // Vãng lai không có lịch hẹn: không gửi appointmentCode (backend
        // tra code không thấy sẽ báo lỗi "Không tìm thấy cuộc hẹn").
        appointmentCode: currentPatient.appointmentId
          ? currentPatient.appointmentCode
          : undefined,
        templateId: phcnTemplateId || undefined,
        content: {
          diagnosis,
          assessmentIds,
          doctorNotes,
        },
        status: "COMPLETED",
      });

      // 2. Tạo đơn thuốc thật từ danh sách thuốc đã kê (đủ trường liều —
      // GĐ4 §3.1: trước đây chỉ map 3 trường nên mất số lượng/số ngày/
      // đường dùng). Đơn mới luôn ở trạng thái DRAFT; ký/phát bằng nút
      // ở tab RX (bác sĩ bấm theo Q3).
      const drugItems = drugRows
        .filter((d) => d.name.trim())
        .map((d) => ({
          drugId: d.drugId,
          name: d.name.trim(),
          strength: d.strength || undefined,
          dosageForm: d.dosageForm || undefined,
          route: d.route || undefined,
          dose: d.dose,
          doseUnit: d.doseUnit || undefined,
          frequency: d.frequency || undefined,
          durationDays: d.durationDays,
          quantity: d.quantity,
          quantityUnit: d.quantityUnit || undefined,
          instructions: d.instructions || undefined,
        }));
      if (drugItems.length > 0) {
        const mp = await doctorService.createMedicationPrescription({
          patientProfileId: currentPatient.patientProfileId,
          medicalRecordId: record?.id,
          items: drugItems,
        });
        setSavedMp(mp);
      }

      // 2b. Tạo đơn bài tập thật từ danh sách bài đã kê (GĐ4 — trước đây
      // chỉ lưu vào JSON bệnh án, không có đơn). KTV cũng kê được (Q2).
      const exerciseItems = exerciseRows.filter((e) => e.exerciseId);
      if (exerciseItems.length > 0) {
        const exp = await exerciseService.createExercisePrescription({
          patientProfileId: currentPatient.patientProfileId,
          medicalRecordId: record?.id,
          appointmentId: currentPatient.appointmentId,
          items: exerciseItems.map((e) => ({
            exerciseId: e.exerciseId,
            sets: e.sets,
            reps: e.reps,
            holdSec: e.holdSec,
            frequency: e.frequency,
            durationDays: e.durationDays,
            note: e.note,
          })),
        });
        setSavedExpCode(exp.code);
        setSavedExpRows([...exerciseItems]);
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

      // Đánh dấu đã lưu + xóa nháp: nội dung này đã vào bệnh án, làm mới
      // trang không còn hiện lại form cũ; lưu lần nữa khi chưa sửa gì sẽ
      // bị khóa nút (chặn trùng bệnh án). Lượng giá đã gắn vào bệnh án
      // thì xóa khỏi danh sách chờ gắn để lần lưu sau không gắn lại.
      setSessionSaveSnapshot(draftJSONRef.current);
      draftClearedRef.current = true;
      try {
        localStorage.removeItem(
          workspaceDraftKey(currentPatient.patientProfileId),
        );
      } catch {}
      setSessionAssessmentIds([]);
      setIsSavingSession(false);
      void loadSavedToday(
        currentPatient.patientProfileId,
        currentPatient.appointmentId,
      );

      setTimeout(() => {
        setIsSaved(false);
        setShowPrintModal(true);
      }, 600);
    } catch (err: any) {
      setIsSaved(false);
      setIsSavingSession(false);
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
        <div className="fixed top-20 right-6 z-50 bg-[#0f3e17] text-[#fffefc] px-4 py-2.5 rounded-[14px] text-xs font-semibold animate-in fade-in duration-200 flex items-center gap-2 border border-[#efeeeb]">
          <Volume2 className="w-4 h-4 text-[#e1f4df] animate-pulse" />
          <span>{callToast}</span>
        </div>
      )}

      {/* Top Banner: Bác sĩ & Buồng khám */}
      <div className="bg-[#e1f4df] rounded-[14px] p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fffefc] border border-[#efeeeb] text-[#0f3e17] text-xs font-semibold mb-2">
            <Stethoscope className="w-4 h-4 text-[#0f3e17]" />
            <span>Phân hệ Bác sĩ & Kỹ thuật viên PHCN</span>
          </div>
          <h1 className="font-display-serif text-2xl sm:text-3xl text-[#0f3e17] tracking-[-0.01em]">
            Bàn Khám & Lượng giá: {user?.name || "Bác sĩ Thanh Sang"}
          </h1>
          <p className="text-xs text-[#222222]/80 mt-1 font-normal">
            Buồng trực: <strong className="text-[#0f3e17] font-semibold">{myRoomName || "Chưa xác định ca trực"}</strong> • 193 Quang Trung, Đại Lộc, Đà Nẵng
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCallNext}
            disabled={isCalling || isCallingAudio || queue.length === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold transition-colors disabled:opacity-75 cursor-pointer"
          >
            <Volume2 className={`w-4 h-4 ${isCallingAudio ? "animate-pulse text-[#e1f4df]" : ""}`} />
            <span>
              {isCalling
                ? "Đang gọi bệnh nhân..."
                : isCallingAudio
                  ? "Đang phát loa gọi bệnh nhân..."
                  : "Mời bệnh nhân tiếp theo"}
            </span>
          </button>
        </div>
      </div>

      {callError && (
        <div className="rounded-[14px] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {callError}
        </div>
      )}

      {/* Main Grid: Left = Queue & Admin Info, Right = Clinical Tabs */}
      {queueLoading ? (
        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-12 text-center text-sm text-[#222222]/70">
          Đang tải hàng đợi buồng khám...
        </div>
      ) : queueError ? (
        <div className="bg-[#fffefc] border border-rose-200 rounded-[14px] p-7 text-center text-sm text-rose-700 space-y-3">
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
          <h3 className="text-base font-semibold text-[#0f3e17]">Không có bệnh nhân khám hôm nay</h3>
          <p className="text-xs text-[#222222]/70 max-w-md mx-auto">
            Buồng khám chưa có lịch hẹn nào cho ngày hôm nay. Lịch hẹn mới đặt qua web hoặc lễ tân,
            và bệnh nhân vãng lai được mời vào phòng, sẽ tự hiện ở đây (tự làm mới mỗi 30 giây).
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hàng đợi buồng khám & Hồ sơ hành chính */}
        <div className="lg:col-span-4 space-y-6">
          {/* Patient Card */}
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#efeeeb]">
              <span className="eyebrow text-[#0f3e17] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0f3e17]" />
                Đang khám tại buồng
              </span>
              <span className="badge-pill bg-[#e1f4df] text-[#0f3e17]">
                {currentPatient.queueNumber}
              </span>
            </div>

            <div>
              <h3 className="font-display-serif text-lg text-[#0f3e17]">{currentPatient.name}</h3>
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
            <div className="p-3.5 rounded-[14px] bg-[#e1f4df]/40 text-xs space-y-1.5">
              <div className="font-semibold text-[#0f3e17] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#0f3e17]" />
                Sàng lọc An toàn Trị liệu:
              </div>
              <div className="text-[#222222]/80 flex items-center justify-between">
                <span>Dị vật kim loại / Nẹp vít:</span>
                <strong className={currentPatient.metalImplant ? "text-amber-800" : "text-[#0f3e17]"}>
                  {currentPatient.metalImplant ? "Có" : "Không có"}
                </strong>
              </div>
              <div className="text-[#222222]/80 flex items-center justify-between">
                <span>Máy tạo nhịp tim:</span>
                <strong className={currentPatient.pacemaker ? "text-rose-700" : "text-[#0f3e17]"}>
                  {currentPatient.pacemaker ? "Có" : "Không có"}
                </strong>
              </div>
            </div>

          </div>

          {/* Đã lưu hôm nay (19/11) — để bác sĩ thấy bệnh án/đơn đã lưu
              sau khi làm mới trang, thay vì tưởng chưa lưu rồi bấm lưu trùng. */}
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-4 space-y-2">
            <h4 className="eyebrow text-[#0f3e17] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0f3e17]" />
              <span>Đã lưu hôm nay</span>
            </h4>
            {!savedToday ? (
              <p className="text-xs text-[#222222]/60">Đang tải...</p>
            ) : savedToday.records.length === 0 ? (
              <p className="text-xs text-[#222222]/60">
                Chưa có bệnh án nào lưu hôm nay cho bệnh nhân này.
              </p>
            ) : (
              <ul className="space-y-2">
                {savedToday.records.map((rec) => (
                  <li key={rec.id} className="text-xs bg-[#e1f4df]/40 rounded-[14px] p-2.5 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0f3e17]">Bệnh án</span>
                      <span className="text-[#222222]/60">
                        {new Date(rec.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-[#222222]/80">
                      {rec.diagnosis ? `Chẩn đoán: ${rec.diagnosis}` : "Chưa ghi chẩn đoán"}
                    </div>
                    {rec.mpCodes.length > 0 && (
                      <div className="text-[#222222]/80">
                        Đơn thuốc: {rec.mpCodes.join(", ")}
                      </div>
                    )}
                    {rec.expCodes.length > 0 && (
                      <div className="text-[#222222]/80">
                        Đơn bài tập: {rec.expCodes.join(", ")}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* GĐ5 — Hoàn thành can thiệp (khóa phiếu). Khác hẳn nút "Hoàn
              thành" ở hàng đợi — nút đó chỉ đổi state local, không khóa
              phiếu. Cần đủ 2 điều kiện: hết dịch vụ + có đánh giá kết thúc
              đợt (DISCHARGE); chưa đủ thì phải nhập lý do mới được qua. */}
          {completeRxId && (
            <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-7 space-y-3">
              <h4 className="eyebrow text-[#0f3e17] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0f3e17]" />
                <span>Hoàn thành can thiệp</span>
              </h4>
              <p className="text-xs text-[#222222]/70">
                Phiếu chỉ định: <span className="font-semibold text-[#0f3e17]">{completeRxCode || completeRxId}</span>
              </p>
              {completionLoading ? (
                <p className="text-xs text-[#222222]/70">Đang kiểm tra điều kiện hoàn thành...</p>
              ) : completeRxStatus === "COMPLETED" ? (
                <div className="p-3 rounded-[14px] bg-[#e1f4df]/60 text-xs text-[#0f3e17]">
                  <strong>Đã hoàn thành can thiệp</strong>
                  {completeRxCompletedAt && (
                    <span> — {new Date(completeRxCompletedAt).toLocaleDateString("vi-VN")}</span>
                  )}
                  <span className="block text-[#222222]/70 mt-0.5">
                    Phiếu đã khóa: không mở thêm buổi trị liệu cho phiếu này nữa.
                  </span>
                  {completeDoneMsg && <span className="block mt-1">{completeDoneMsg}</span>}
                </div>
              ) : completionCheck ? (
                <div className="space-y-2 text-xs">
                  <p className="text-[#222222]/80">
                    {completionCheck.finishedServices}/{completionCheck.totalServices} dịch vụ xong
                    {" · "}
                    {completionCheck.hasDischargeAssessment
                      ? "✓ Đã có đánh giá kết thúc đợt"
                      : "✗ Chưa có đánh giá kết thúc đợt"}
                  </p>
                  {completionCheck.unfinishedServices.length > 0 && (
                    <ul className="text-[#222222]/70 space-y-0.5">
                      {completionCheck.unfinishedServices.map((s, i) => (
                        <li key={s.id ?? i}>• {s.serviceName ?? "Dịch vụ"} — {s.status ?? "chưa xong"}</li>
                      ))}
                    </ul>
                  )}
                  {completionCheck.missing.map((m, i) => (
                    <p key={i} className="text-amber-800">• {m}</p>
                  ))}
                  {completionError && <p className="text-rose-700">{completionError}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={completeBusy || !completionCheck.canComplete}
                      onClick={() => void handleCompleteIntervention(false)}
                      className="px-4 py-2 rounded-[14px] bg-[#0f3e17] text-[#fffefc] font-semibold disabled:opacity-40"
                      title={completionCheck.canComplete ? "" : "Chưa đủ điều kiện — xem checklist phía trên"}
                    >
                      {completeBusy ? "Đang lưu..." : "Hoàn thành can thiệp"}
                    </button>
                    <button
                      type="button"
                      disabled={completeBusy}
                      onClick={() => setShowOverride((v) => !v)}
                      className="px-4 py-2 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-[#0f3e17] font-semibold hover:bg-[#efeeeb]/40"
                    >
                      Hoàn thành dù chưa đủ điều kiện
                    </button>
                  </div>
                  {showOverride && (
                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-semibold text-[#0f3e17]">
                        Lý do hoàn thành sớm (bắt buộc):
                      </label>
                      <textarea
                        rows={2}
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="VD: bệnh nhân xin dừng điều trị, chuyển viện..."
                        className="w-full p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                      />
                      <button
                        type="button"
                        disabled={completeBusy || !overrideReason.trim()}
                        onClick={() => void handleCompleteIntervention(true)}
                        className="px-4 py-2 rounded-[14px] bg-amber-600 text-[#fffefc] font-semibold disabled:opacity-40"
                      >
                        {completeBusy ? "Đang lưu..." : "Xác nhận hoàn thành"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#222222]/70">
                  Không kiểm tra được điều kiện hoàn thành — thử tải lại trang.
                </p>
              )}
            </div>
          )}

          {/* Queue List of this Room */}
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-4 space-y-3">
            <h4 className="eyebrow text-[#0f3e17] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0f3e17]" />
              <span>Hàng đợi buồng này ({queue.length})</span>
              <button
                type="button"
                onClick={() => void loadQueue(true)}
                disabled={queueRefreshing}
                title="Tải lại hàng đợi"
                aria-label="Tải lại hàng đợi"
                className="ml-auto p-1.5 rounded-full text-[#0f3e17] hover:bg-[#e1f4df] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${queueRefreshing ? "animate-spin" : ""}`} />
              </button>
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
                      ? "bg-[#e1f4df] text-[#0f3e17]"
                      : "bg-[#fffefc] border-[#efeeeb] text-[#222222]/70 hover:bg-[#efeeeb]/30"
                  }`}
                >
                  <div>
                    <div className="font-semibold flex items-center gap-1.5">
                      <span className="font-semibold text-[#0f3e17]">{item.queueNumber}</span>
                      <span>•</span>
                      <span>{item.name}</span>
                    </div>
                    <div className="text-[11px] truncate max-w-[190px] text-[#222222]/60">{item.reason}</div>
                  </div>
                  <span
                    className={`badge-pill ${
                      item.status === "SERVING"
                        ? "bg-[#0f3e17] text-[#fffefc]"
                        : item.status === "COMPLETED"
                        ? "bg-[#e1f4df] text-[#0f3e17]"
                        : "bg-white text-[#222222]/60 border border-[#efeeeb]"
                    }`}
                  >
                    {item.status === "SERVING" ? "Đang khám" : item.status === "COMPLETED" ? "Đã khám" : "Chờ"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Tabs Thang điểm & Kê đơn */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-7">
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
                <span>1. Thang điểm PHCN</span>
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
                <span>2. Kê đơn & Chỉ định Bài tập</span>
              </button>
            </div>

            {/* TAB 1: THANG ĐIỂM PHCN (GĐ3) — form động từ catalog backend:
                đủ 18 mục FIM, mặc định trống, tổng do server tính. */}
            {activeTab === "FIM" && currentPatient && (
              <AssessmentTab
                patientProfileId={currentPatient.patientProfileId}
                appointmentId={currentPatient.appointmentId}
                onAssessmentCreated={(id) =>
                  setSessionAssessmentIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
                }
              />
            )}
            {activeTab === "FIM" && !currentPatient && (
              <p className="text-xs text-[#222222]/70">
                Chưa có bệnh nhân đang khám — gọi bệnh nhân vào phòng trước rồi mới chấm thang điểm.
              </p>
            )}


            {/* TAB 2: KÊ ĐƠN THUỐC & BÀI TẬP PHCN TẠI NHÀ */}
            {activeTab === "RX" && (
              <div className="space-y-6">
                {/* Phần 0: Chẩn đoán (19/11) — trước đây state chẩn đoán
                    không có ô nhập nào trong giao diện nên bác sĩ không
                    thể ghi chẩn đoán, mọi bệnh án đều lưu chẩn đoán rỗng.
                    Ô này nằm trong nháp workspace nên làm mới trang vẫn giữ. */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#0f3e17]">
                    Chẩn đoán:
                  </label>
                  <textarea
                    rows={2}
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Ví dụ: Di chứng liệt nửa người trái sau đột quỵ não, 3 tháng"
                    className="w-full p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                  />
                </div>

                {/* Phần 1: Đơn thuốc — kê từ danh mục Dược thư (GĐ4) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="eyebrow text-[#0f3e17] flex items-center gap-2">
                      <Pill className="w-4 h-4 text-[#0f3e17]" />
                      <span>Đơn thuốc Hỗ trợ Điều trị ({drugRows.length})</span>
                    </h4>
                  </div>

                  {/* Dị ứng — thu ở form đăng ký, sửa được tại chỗ (GĐ4 Q7) */}
                  <div className="p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs">
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Dị ứng thuốc/thức ăn của bệnh nhân:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={allergyDraft}
                        onChange={(e) => setAllergyDraft(e.target.value)}
                        placeholder="Ví dụ: Penicillin — nổi mề đay 2023"
                        className="flex-1 px-3 py-2 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                      />
                      <button
                        type="button"
                        onClick={handleSaveAllergies}
                        disabled={allergySaving || allergyDraft.trim() === (currentPatient?.allergies ?? "")}
                        className="px-3 py-2 rounded-[14px] bg-[#0f3e17] text-[#fffefc] font-semibold disabled:opacity-40 shrink-0"
                      >
                        {allergySaving ? "Đang lưu..." : allergySavedAt ? "Đã lưu ✓" : "Lưu dị ứng"}
                      </button>
                    </div>
                  </div>

                  <DrugForm
                    rows={drugRows}
                    onChange={setDrugRows}
                    allergies={currentPatient?.allergies}
                    savedMp={savedMp}
                    onSign={handleSignMp}
                    onDispense={handleDispenseMp}
                    actionBusy={mpActionBusy}
                  />
                </div>

                {/* Phần 2: Chỉ định Dịch vụ điều trị (tạo phiếu thật cho thu ngân) */}
                <div className="space-y-3 pt-4 border-t border-[#efeeeb]">
                  <div className="flex items-center justify-between">
                    <h4 className="eyebrow text-[#0f3e17] flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-[#0f3e17]" />
                      <span>Chỉ định Dịch vụ điều trị ({selectedServiceIds.length} đã chọn)</span>
                    </h4>
                    {selectedServicesTotal > 0 && (
                      <span className="text-xs font-semibold text-[#0f3e17]">
                        Tạm tính: {selectedServicesTotal.toLocaleString("vi-VN")} đ
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#222222]/60 leading-relaxed">
                    Tick chọn dịch vụ cần làm cho bệnh nhân này. Khi bấm nút Lưu,
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
                                ? "bg-[#e1f4df]/60"
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
                              <span className="block font-semibold text-[#0f3e17] text-sm">{srv.serviceName}</span>
                              {srv.description && (
                                <span className="block text-[11px] text-[#222222]/60 mt-0.5">{srv.description}</span>
                              )}
                              {srv.timePerPatient && (
                                <span className="block text-[11px] text-[#222222]/60 mt-0.5">
                                  Thời lượng: {srv.timePerPatient} phút
                                </span>
                              )}
                            </span>
                            <span className="font-semibold text-[#0f3e17] whitespace-nowrap">
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
                    <div className="p-3.5 rounded-[14px] bg-[#e1f4df]/60 text-xs">
                      <span className="font-semibold text-[#0f3e17]">Đã tạo phiếu chỉ định: </span>
                      <span className="font-semibold text-[#0f3e17]">{createdPrescriptionCode}</span>
                      <span className="text-[#222222]/70"> — đưa mã này cho bệnh nhân ra quầy thu ngân.</span>
                    </div>
                  )}
                </div>

                {/* Phần 3: Chỉ định Bài tập PHCN tại nhà — kê từ danh mục (GĐ4) */}
                <div className="space-y-3 pt-4 border-t border-[#efeeeb]">
                  <div className="flex items-center justify-between">
                    <h4 className="eyebrow text-[#0f3e17] flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-[#0f3e17]" />
                      <span>Chỉ định Gói Bài tập PHCN tại nhà ({exerciseRows.length})</span>
                    </h4>
                  </div>

                  <ExerciseForm rows={exerciseRows} onChange={setExerciseRows} savedExpCode={savedExpCode} />
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

                {/* Phần 5: Đơn cũ của bệnh nhân (GĐ4) */}
                {currentPatient?.patientProfileId && (
                  <PrescriptionHistory
                    patientProfileId={currentPatient.patientProfileId}
                    onReprescribeDrugs={(rows) => setDrugRows([...drugRows, ...rows])}
                    onReprescribeExercises={(rows) => setExerciseRows([...exerciseRows, ...rows])}
                  />
                )}
              </div>
            )}

            {/* Bottom Actions: Save & Print */}
            <div className="mt-8 pt-4 border-t border-[#efeeeb] flex items-center justify-between">
              <span className="text-xs text-[#222222]/60">
                Buồng: <strong>{myRoomName || "Chưa xác định ca trực"}</strong> • Bác sĩ: {user?.name || "BS. Lâm Thanh Tú"}
              </span>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  title="Xem & In Phiếu Kết quả"
                  aria-label="Xem & In Phiếu Kết quả"
                  className="p-2.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#efeeeb]/40 text-[#0f3e17] flex items-center justify-center transition-colors"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSaveSession}
                  disabled={
                    isSaved ||
                    isSavingSession ||
                    (sessionSaveSnapshot !== null &&
                      draftJSON === sessionSaveSnapshot)
                  }
                  title={
                    sessionSaveSnapshot !== null &&
                    draftJSON === sessionSaveSnapshot
                      ? "Đã lưu nội dung này rồi — sửa gì đó rồi mới lưu lại"
                      : "Hoàn tất Ca khám & Lưu Bệnh án"
                  }
                  aria-label="Hoàn tất Ca khám & Lưu Bệnh án"
                  className="p-2.5 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Modal In — 3 phiếu riêng (GĐ4): phiếu lượng giá / đơn thuốc /
          phiếu bài tập. Chỉ phiếu đang chọn được in (CSS @media print). */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-[#0f3e17]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <style>{`@media print { body * { visibility: hidden !important; } .print-area, .print-area * { visibility: visible !important; } .print-area { position: absolute !important; left: 0; top: 0; width: 100%; background: #fff; } }`}</style>
          <div className="bg-[#fffefc] text-[#222222] rounded-[14px] max-w-2xl w-full p-8 border border-[#efeeeb] max-h-[90vh] overflow-y-auto">
            {/* Chọn phiếu in */}
            <div className="flex gap-2 mb-4">
              {(
                [
                  ["assessment", "Phiếu lượng giá"],
                  ["medication", "Đơn thuốc"],
                  ["exercise", "Phiếu bài tập"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPrintTarget(key)}
                  className={`flex-1 px-3 py-2 rounded-[14px] text-xs font-semibold ${
                    printTarget === key
                      ? "bg-[#0f3e17] text-[#fffefc]"
                      : "bg-[#fffefc] border border-[#efeeeb] text-[#222222] hover:bg-[#efeeeb]/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ===== PHIẾU LƯỢNG GIÁ ===== */}
            {printTarget === "assessment" && (
              <div className="print-area">
                <div className="border-b pb-4 border-[#efeeeb] flex justify-between items-start">
                  <div>
                    <div className="text-xs font-semibold text-[#0f3e17] uppercase">
                      {CLINIC.name.toUpperCase()}
                    </div>
                    <div className="text-[11px] text-[#222222]/60">
                      Địa chỉ: {CLINIC.address} • Hotline: {CLINIC.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="badge-pill bg-[#e1f4df] text-[#0f3e17]">
                      Mã BA: TS-2026-{currentPatient.queueNumber}
                    </span>
                    <div className="text-[11px] text-[#222222]/50 mt-1">
                      Ngày khám: {new Date().toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                </div>

                <div className="my-4 text-center">
                  <h2 className="font-display-serif text-lg text-[#0f3e17] uppercase">
                    PHIẾU LƯỢNG GIÁ CHỨC NĂNG &amp; CHỈ ĐỊNH ĐIỀU TRỊ
                  </h2>
                </div>

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

                <div className="my-4 space-y-3 text-xs">
                  <div className="p-3.5 bg-[#e1f4df]/40 rounded-[14px]">
                    <div className="flex justify-between font-semibold text-[#0f3e17]">
                      <span>1. Kết quả thang điểm PHCN:</span>
                      <span>{printAssessments.length > 0 ? `${printAssessments.length} lần đánh giá` : "Chưa có lần đánh giá nào trong phiên này"}</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {printAssessments.map((a) => (
                        <div key={a.id} className="flex justify-between text-[11px] text-[#222222]/80">
                          <span>
                            • {a.scaleNameVi} ({new Date(a.assessedAt).toLocaleDateString("vi-VN")}
                            {a.timepoint === "BASELINE" ? " — Đầu vào" : a.timepoint === "REASSESSMENT" ? " — Tái đánh giá" : " — Ra viện"}):
                          </span>
                          <strong>
                            {a.totalScore ?? a.value ?? a.level ?? "—"}
                            {a.interpretation ? ` — ${a.interpretation}` : ""}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bài tập — đọc từ đơn bài tập đã lưu (GĐ4), không còn
                      đọc mẫu ghi cứng; đơn thuốc in ở phiếu riêng. */}
                  {(savedExpRows.length > 0 || exerciseRows.length > 0) && (
                    <div className="p-3.5 bg-[#e1f4df]/30 rounded-[14px] text-[#0f3e17]">
                      <div className="font-semibold mb-1">
                        3. Bài tập Phục hồi Chức năng Hướng dẫn tại nhà
                        {savedExpCode && (
                          <span className="font-normal"> — Mã đơn: {savedExpCode}</span>
                        )}
                        :
                      </div>
                      <div className="space-y-1 text-[11px] text-[#222222]/80">
                        {(savedExpRows.length > 0 ? savedExpRows : exerciseRows).map((ex, i) => (
                          <div key={i}>
                            • <strong>{ex.name}:</strong>{" "}
                            {[ex.sets ? `${ex.sets} hiệp` : "", ex.reps ? `${ex.reps} lần` : "", ex.frequency ?? ""]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {createdPrescriptionCode && (
                    <div className="p-3.5 bg-[#e1f4df]/40 rounded-[14px]">
                      <div className="font-semibold text-[#0f3e17] mb-1">5. Phiếu chỉ định Dịch vụ điều trị:</div>
                      <div className="text-[11px] text-[#222222]/80 space-y-1">
                        <div>
                          Mã phiếu (thu ngân quét mã này):{" "}
                          <strong className="font-semibold text-[#0f3e17]">{createdPrescriptionCode}</strong>
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

                <div className="pt-4 flex justify-between items-end text-xs text-center">
                  <div>
                    <div className="text-[#222222]/60">Người bệnh / Thân nhân</div>
                    <div className="mt-12 font-medium">(Ký và ghi rõ họ tên)</div>
                  </div>
                  <div>
                    <div className="text-[#222222]/60">Bác sĩ Chuyên khoa PHCN</div>
                    <div className="mt-12 font-semibold text-[#0f3e17]">{user?.name || "BS.CKII Lâm Thanh Tú"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== ĐƠN THUỐC RIÊNG ===== */}
            {printTarget === "medication" && (
              <div className="print-area relative">
                {savedMp?.status === "DRAFT" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="font-display-serif text-5xl text-rose-500/20 -rotate-[20deg] uppercase tracking-[-0.03em]">
                      Bản nháp
                    </span>
                  </div>
                )}
                <div className="border-b pb-4 border-[#efeeeb] flex justify-between items-start">
                  <div>
                    <div className="text-xs font-semibold text-[#0f3e17] uppercase">
                      {CLINIC.name.toUpperCase()}
                    </div>
                    <div className="text-[11px] text-[#222222]/60">
                      Địa chỉ: {CLINIC.address} • Hotline: {CLINIC.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="badge-pill bg-[#e1f4df] text-[#0f3e17]">
                      Mã đơn: {savedMp?.code ?? "—"}
                    </span>
                    <div className="text-[11px] text-[#222222]/50 mt-1">
                      Ngày kê: {new Date().toLocaleDateString("vi-VN")} •{" "}
                      {savedMp?.status === "DRAFT"
                        ? "Bản nháp"
                        : savedMp?.status === "SIGNED"
                          ? "Đã ký"
                          : savedMp?.status === "DISPENSED"
                            ? "Đã phát thuốc"
                            : savedMp?.status ?? ""}
                    </div>
                  </div>
                </div>

                <div className="my-4 text-center">
                  <h2 className="font-display-serif text-lg text-[#0f3e17] uppercase">ĐƠN THUỐC</h2>
                </div>

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
                    Chẩn đoán: <strong>{diagnosis}</strong>
                  </div>
                  <div className="col-span-2">
                    Dị ứng:{" "}
                    <strong className="text-rose-700">{currentPatient.allergies || "Không ghi nhận"}</strong>
                  </div>
                </div>

                <div className="my-4">
                  {savedMp && savedMp.items.length > 0 ? (
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-[#e1f4df]/60 text-[#0f3e17]">
                          <th className="border border-[#efeeeb] px-2 py-1.5 text-left">#</th>
                          <th className="border border-[#efeeeb] px-2 py-1.5 text-left">Tên thuốc</th>
                          <th className="border border-[#efeeeb] px-2 py-1.5 text-left">Hàm lượng</th>
                          <th className="border border-[#efeeeb] px-2 py-1.5 text-left">Liều dùng</th>
                          <th className="border border-[#efeeeb] px-2 py-1.5 text-left">Tần suất</th>
                          <th className="border border-[#efeeeb] px-2 py-1.5 text-left">Số ngày</th>
                          <th className="border border-[#efeeeb] px-2 py-1.5 text-left">Số lượng</th>
                          <th className="border border-[#efeeeb] px-2 py-1.5 text-left">Cách dùng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedMp.items.map((item, i) => (
                          <tr key={item.id}>
                            <td className="border border-[#efeeeb] px-2 py-1.5">{i + 1}</td>
                            <td className="border border-[#efeeeb] px-2 py-1.5 font-semibold">{item.name}</td>
                            <td className="border border-[#efeeeb] px-2 py-1.5">{item.strength ?? "—"}</td>
                            <td className="border border-[#efeeeb] px-2 py-1.5">
                              {item.dose != null ? `${item.dose} ${item.doseUnit ?? ""}` : "—"}
                              {item.route ? ` (${item.route})` : ""}
                            </td>
                            <td className="border border-[#efeeeb] px-2 py-1.5">{item.frequency ?? "—"}</td>
                            <td className="border border-[#efeeeb] px-2 py-1.5">{item.durationDays ?? "—"}</td>
                            <td className="border border-[#efeeeb] px-2 py-1.5">
                              {item.quantity != null ? `${item.quantity} ${item.quantityUnit ?? ""}` : "—"}
                            </td>
                            <td className="border border-[#efeeeb] px-2 py-1.5">{item.instructions ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-[#222222]/70">
                      Phiên này chưa kê thuốc nào. Kê thuốc ở tab “Kê đơn” rồi bấm nút Lưu.
                    </p>
                  )}
                </div>

                <div className="pt-4 flex justify-between items-end text-xs text-center">
                  <div>
                    <div className="text-[#222222]/60">Người bệnh / Thân nhân</div>
                    <div className="mt-12 font-medium">(Ký và ghi rõ họ tên)</div>
                  </div>
                  <div>
                    <div className="text-[#222222]/60">Bác sĩ kê đơn</div>
                    <div className="mt-12 font-semibold text-[#0f3e17]">{user?.name || "BS.CKII Lâm Thanh Tú"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== PHIẾU BÀI TẬP (kèm QR) ===== */}
            {printTarget === "exercise" && (
              <div className="print-area">
                <div className="border-b pb-4 border-[#efeeeb] flex justify-between items-start">
                  <div>
                    <div className="text-xs font-semibold text-[#0f3e17] uppercase">
                      {CLINIC.name.toUpperCase()}
                    </div>
                    <div className="text-[11px] text-[#222222]/60">
                      Địa chỉ: {CLINIC.address} • Hotline: {CLINIC.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="badge-pill bg-[#e1f4df] text-[#0f3e17]">
                      Mã đơn: {savedExpCode || "—"}
                    </span>
                    <div className="text-[11px] text-[#222222]/50 mt-1">
                      Ngày kê: {new Date().toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                </div>

                <div className="my-4 text-center">
                  <h2 className="font-display-serif text-lg text-[#0f3e17] uppercase">
                    PHIẾU HƯỚNG DẪN BÀI TẬP TẠI NHÀ
                  </h2>
                </div>

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
                    Chẩn đoán: <strong>{diagnosis}</strong>
                  </div>
                </div>

                <div className="my-4 space-y-2 text-xs">
                  {(savedExpRows.length > 0 ? savedExpRows : exerciseRows).length === 0 && (
                    <p className="text-[#222222]/70">
                      Phiên này chưa kê bài tập nào. Chọn bài ở tab “Kê đơn” rồi bấm nút Lưu.
                    </p>
                  )}
                  {(savedExpRows.length > 0 ? savedExpRows : exerciseRows).map((ex, i) => (
                    <div key={i} className="p-3.5 bg-[#e1f4df]/30 rounded-[14px]">
                      <div className="font-semibold text-[#0f3e17] text-sm">
                        {i + 1}. {ex.name}
                      </div>
                      <div className="text-[11px] text-[#222222]/80 mt-0.5">
                        • Liều tập:{" "}
                        <strong>
                          {[ex.sets ? `${ex.sets} hiệp` : "", ex.reps ? `${ex.reps} lần` : "", ex.holdSec ? `giữ ${ex.holdSec} giây` : "", ex.frequency ?? ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </strong>
                        {ex.durationDays ? ` • Trong ${ex.durationDays} ngày` : ""}
                      </div>
                      {ex.precautions && (
                        <div className="text-[11px] text-amber-800 mt-0.5">• Lưu ý: {ex.precautions}</div>
                      )}
                      {ex.note && (
                        <div className="text-[11px] text-[#222222]/80 mt-0.5">• Ghi chú: {ex.note}</div>
                      )}
                    </div>
                  ))}
                </div>

                {qrDataUrl && (
                  <div className="my-4 flex flex-col items-center gap-1">
                    <img src={qrDataUrl} alt="Mã QR xem bài tập" className="w-40 h-40" />
                    <div className="text-[11px] text-[#222222]/70">
                      Quét mã để xem bài tập của bạn trên trang tài khoản
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-between items-end text-xs text-center">
                  <div>
                    <div className="text-[#222222]/60">Người bệnh / Thân nhân</div>
                    <div className="mt-12 font-medium">(Ký và ghi rõ họ tên)</div>
                  </div>
                  <div>
                    <div className="text-[#222222]/60">Bác sĩ / KTV kê đơn</div>
                    <div className="mt-12 font-semibold text-[#0f3e17]">{user?.name || "BS.CKII Lâm Thanh Tú"}</div>
                  </div>
                </div>
              </div>
            )}

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
                <span>
                  In{" "}
                  {printTarget === "assessment"
                    ? "Phiếu Lượng giá"
                    : printTarget === "medication"
                      ? "Đơn thuốc"
                      : "Phiếu bài tập"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
