"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  assessmentService,
  CONDITION_OPTIONS,
  SPECIALTY_OPTIONS,
  TIMEPOINT_OPTIONS,
  vietnameseBadge,
  type AssessmentRecord,
  type GoalWithProgress,
  type MeasureInput,
  type ScaleDef,
  type TrendPoint,
} from "@/services/assessment.service";
import { getApiErrorMessage } from "@/services/room.service";

interface AssessmentTabProps {
  patientProfileId: string;
  appointmentId?: string;
  // GĐ5 — banner nhắc đánh giá lại ở màn hình phòng: mở sẵn ở thời điểm
  // REASSESSMENT và gắn lần chấm với buổi vừa xong.
  defaultTimepoint?: string;
  therapySessionId?: string;
  // GĐ3 §5.4 — id các Assessment tạo trong phiên khám, để handleSaveSession
  // ghi vào content.assessmentIds khi lưu bệnh án.
  onAssessmentCreated: (id: string) => void;
}

const GOAL_STATUS_LABEL: Record<string, { text: string; className: string }> = {
  ACTIVE: { text: "Đang thực hiện", className: "bg-[#e1f4df] text-[#0f3e17] border-[#cfe7d3]" },
  ACHIEVED: { text: "Đã đạt", className: "bg-[#0f3e17] text-[#fffefc] border-[#0f3e17]" },
  NOT_ACHIEVED: { text: "Không đạt", className: "bg-rose-100 text-rose-700 border-rose-300" },
  CANCELLED: { text: "Đã hủy", className: "bg-[#efeeeb] text-[#222222]/60 border-[#efeeeb]" },
};

export default function AssessmentTab({
  patientProfileId,
  appointmentId,
  defaultTimepoint,
  therapySessionId,
  onAssessmentCreated,
}: AssessmentTabProps) {
  const [scales, setScales] = useState<ScaleDef[]>([]);
  const [selectedCondition, setSelectedCondition] = useState("GENERAL");
  const [selectedSpecialty, setSelectedSpecialty] = useState("VLTL");
  const [selectedScaleCode, setSelectedScaleCode] = useState("");
  const [scaleDef, setScaleDef] = useState<ScaleDef | null>(null);
  const [selectedTimepoint, setSelectedTimepoint] = useState(
    defaultTimepoint ?? "BASELINE",
  );

  // Form nhập — mặc định TRỐNG (null), tất cả bắt buộc. GĐ3 sửa lỗi UI FIM cũ:
  // trước đây form điền sẵn 4–6 nên lưu không chạm vẫn ra điểm "đẹp" giả.
  const [itemValues, setItemValues] = useState<Record<string, number | null>>({});
  const [singleValue, setSingleValue] = useState<number | null>(null);
  const [measures, setMeasures] = useState<MeasureInput[]>([]);
  const [newMeasureKey, setNewMeasureKey] = useState("");
  const [newMeasureSide, setNewMeasureSide] = useState<"LEFT" | "RIGHT" | "BOTH">("RIGHT");
  const [newMeasureValue, setNewMeasureValue] = useState("");
  const [newMeasureActive, setNewMeasureActive] = useState("");
  const [newMeasurePassive, setNewMeasurePassive] = useState("");
  const [assessmentNote, setAssessmentNote] = useState("");
  const [isSavingAssessment, setIsSavingAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState("");
  const [savedAssessment, setSavedAssessment] = useState<AssessmentRecord | null>(null);

  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [goalScaleCode, setGoalScaleCode] = useState("");
  const [goalItemKey, setGoalItemKey] = useState("");
  const [goalBaseline, setGoalBaseline] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalError, setGoalError] = useState("");
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [achieveProofId, setAchieveProofId] = useState<Record<string, string>>({});
  const [notAchievedReason, setNotAchievedReason] = useState<Record<string, string>>({});

  // Danh sách thang theo bệnh lý/chuyên ngành.
  useEffect(() => {
    let cancelled = false;
    assessmentService
      .getScales({ condition: selectedCondition, specialty: selectedSpecialty })
      .then((list) => {
        if (cancelled) return;
        setScales(list);
        if (!list.some((s) => s.code === selectedScaleCode)) {
          setSelectedScaleCode(list[0]?.code ?? "");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCondition, selectedSpecialty]);

  // Định nghĩa thang + lịch sử + xu hướng + mục tiêu khi đổi thang/bệnh nhân.
  useEffect(() => {
    if (!selectedScaleCode) {
      setScaleDef(null);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    setSelectedHistoryId(null);
    setSavedAssessment(null);
    setAssessmentError("");
    assessmentService
      .getScale(selectedScaleCode)
      .then((def) => {
        if (cancelled) return;
        setScaleDef(def);
        setItemValues(Object.fromEntries(def.items.map((i) => [i.key, null])));
        setSingleValue(null);
        setMeasures([]);
        setNewMeasureKey(def.items[0]?.key ?? "");
      })
      .catch((err) => {
        if (!cancelled) setAssessmentError(getApiErrorMessage(err, "Không tải được định nghĩa thang."));
      });
    assessmentService
      .getPatientAssessments(patientProfileId, { scaleCode: selectedScaleCode, limit: 20 })
      .then((res) => {
        if (cancelled) return;
        setHistory(res.data);
        setSelectedTimepoint(res.data.length > 0 ? "REASSESSMENT" : "BASELINE");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    assessmentService
      .getTrend(patientProfileId, selectedScaleCode)
      .then((res) => {
        if (!cancelled) setTrend(res.points);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedScaleCode, patientProfileId]);

  // Mục tiêu của bệnh nhân (tải 1 lần theo bệnh nhân).
  useEffect(() => {
    let cancelled = false;
    assessmentService
      .getPatientGoals(patientProfileId)
      .then((res) => {
        if (!cancelled) setGoals(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [patientProfileId]);

  const refreshHistoryAndGoals = () => {
    if (!selectedScaleCode) return;
    assessmentService
      .getPatientAssessments(patientProfileId, { scaleCode: selectedScaleCode, limit: 20 })
      .then((res) => setHistory(res.data))
      .catch(() => {});
    assessmentService
      .getTrend(patientProfileId, selectedScaleCode)
      .then((res) => setTrend(res.points))
      .catch(() => {});
    assessmentService
      .getPatientGoals(patientProfileId)
      .then((res) => setGoals(res.data))
      .catch(() => {});
  };

  // --- Tính tổng preview ở client từ metadata catalog (số lưu DB là số server tính). ---
  const preview = useMemo(() => {
    if (!scaleDef) return null;
    if (scaleDef.kind === "MULTI_ITEM") {
      const filled = scaleDef.items.filter((i) => itemValues[i.key] !== null && itemValues[i.key] !== undefined);
      const total = filled.reduce((s, i) => s + (itemValues[i.key] as number), 0);
      const sub: Record<string, number> = {};
      for (const sb of scaleDef.subscales ?? []) {
        sub[sb.key] = sb.itemKeys.reduce((s, k) => s + (itemValues[k] ?? 0), 0);
      }
      const band = (scaleDef.scoring.bands ?? []).find((b) => total >= b.min && total <= b.max);
      let text = "";
      if (scaleDef.code === "FIM") {
        text = `Vận động ${sub["motor"] ?? 0}/91, nhận thức ${sub["cognitive"] ?? 0}/35`;
      } else if (band) {
        text = `${total}/${scaleDef.scoring.maxTotal} — ${band.text}`;
      } else {
        text = `${total}/${scaleDef.scoring.maxTotal ?? "?"}`;
      }
      return { total, sub, text, complete: filled.length === scaleDef.items.length };
    }
    if (scaleDef.kind === "SINGLE_VALUE") {
      if (singleValue === null) return { total: null, text: "", complete: false };
      const band = (scaleDef.scoring.bands ?? []).find((b) => singleValue >= b.min && singleValue <= b.max);
      return { total: singleValue, text: band ? `${singleValue}/10 — ${band.text}` : `${singleValue}/10`, complete: true };
    }
    return { total: null, text: "", complete: measures.length > 0 };
  }, [scaleDef, itemValues, singleValue, measures]);

  const missingItems = useMemo(() => {
    if (!scaleDef || scaleDef.kind !== "MULTI_ITEM") return [];
    return scaleDef.items.filter((i) => itemValues[i.key] === null || itemValues[i.key] === undefined);
  }, [scaleDef, itemValues]);

  const handleSaveAssessment = async () => {
    if (!scaleDef || !preview?.complete) return;
    setIsSavingAssessment(true);
    setAssessmentError("");
    try {
      const payload: any = {
        patientProfileId,
        scaleCode: scaleDef.code,
        condition: selectedCondition,
        specialty: selectedSpecialty,
        timepoint: selectedTimepoint,
        appointmentId,
        therapySessionId,
        notes: assessmentNote.trim() || undefined,
      };
      if (scaleDef.kind === "MULTI_ITEM") {
        payload.itemScores = Object.fromEntries(
          Object.entries(itemValues).map(([k, v]) => [k, v as number]),
        );
      } else if (scaleDef.kind === "SINGLE_VALUE") {
        payload.value = singleValue as number;
      } else if (scaleDef.kind === "PER_MEASURE") {
        payload.measures = measures;
      }
      const saved = await assessmentService.createAssessment(payload);
      setSavedAssessment(saved);
      onAssessmentCreated(saved.id);
      setAssessmentNote("");
      refreshHistoryAndGoals();
    } catch (err: any) {
      setAssessmentError(getApiErrorMessage(err, "Không lưu được lần đánh giá."));
    } finally {
      setIsSavingAssessment(false);
    }
  };

  const handleVoid = async (id: string) => {
    if (!voidReason.trim()) {
      setAssessmentError("Nhập lý do hủy trước khi hủy lần đánh giá.");
      return;
    }
    try {
      await assessmentService.voidAssessment(id, voidReason.trim());
      setSelectedHistoryId(null);
      setVoidReason("");
      refreshHistoryAndGoals();
    } catch (err: any) {
      setAssessmentError(getApiErrorMessage(err, "Không hủy được lần đánh giá."));
    }
  };

  const addMeasure = () => {
    if (!scaleDef || !newMeasureKey) return;
    const def = scaleDef.items.find((i) => i.key === newMeasureKey);
    if (!def) return;
    if (scaleDef.code === "MMT") {
      const v = Number(newMeasureValue);
      if (newMeasureValue === "" || Number.isNaN(v) || v < 0 || v > 5) {
        setAssessmentError("Nhập sức cơ 0–5 cho cơ đã chọn.");
        return;
      }
      setMeasures((prev) => [...prev, { key: newMeasureKey, side: newMeasureSide, value: v }]);
    } else {
      const a = newMeasureActive === "" ? undefined : Number(newMeasureActive);
      const p = newMeasurePassive === "" ? undefined : Number(newMeasurePassive);
      if (a === undefined && p === undefined) {
        setAssessmentError("Nhập góc chủ động hoặc thụ động cho khớp đã chọn.");
        return;
      }
      if ((a !== undefined && (a < 0 || a > def.max)) || (p !== undefined && (p < 0 || p > def.max))) {
        setAssessmentError(`Góc đo ngoài 0–${def.max}°.`);
        return;
      }
      setMeasures((prev) => [...prev, { key: newMeasureKey, side: newMeasureSide, active: a, passive: p }]);
    }
    setAssessmentError("");
    setNewMeasureValue("");
    setNewMeasureActive("");
    setNewMeasurePassive("");
  };

  const goalScaleDef = scales.find((s) => s.code === goalScaleCode) ?? null;

  const handleGoalScaleChange = async (code: string) => {
    setGoalScaleCode(code);
    setGoalItemKey("");
    setGoalBaseline("");
    setGoalTarget("");
    setGoalTitle("");
    if (!code) return;
    try {
      const res = await assessmentService.getPatientAssessments(patientProfileId, {
        scaleCode: code,
        limit: 1,
      });
      const latest = res.data[0];
      if (latest) {
        const v = latest.totalScore ?? latest.value;
        if (v !== null && v !== undefined) setGoalBaseline(String(v));
      }
    } catch {}
  };

  const handleSaveGoal = async () => {
    const target = Number(goalTarget);
    if (!goalTitle.trim()) {
      setGoalError("Nhập tiêu đề mục tiêu.");
      return;
    }
    if (goalTarget === "" || Number.isNaN(target)) {
      setGoalError("Nhập giá trị mục tiêu.");
      return;
    }
    const baseline = goalBaseline === "" ? undefined : Number(goalBaseline);
    if (baseline !== undefined && baseline === target) {
      setGoalError("Giá trị mục tiêu phải khác giá trị mốc.");
      return;
    }
    setIsSavingGoal(true);
    setGoalError("");
    try {
      const def = goalScaleDef;
      await assessmentService.createGoal({
        patientProfileId,
        scaleCode: goalScaleCode || undefined,
        itemKey: goalItemKey || undefined,
        title: goalTitle.trim(),
        baselineValue: baseline,
        targetValue: target,
        direction: def ? def.direction : "HIGHER_BETTER",
        unit: "point",
        targetDate: goalDate || undefined,
        notes: undefined,
      });
      setGoalScaleCode("");
      setGoalItemKey("");
      setGoalBaseline("");
      setGoalTarget("");
      setGoalDate("");
      setGoalTitle("");
      refreshHistoryAndGoals();
    } catch (err: any) {
      setGoalError(getApiErrorMessage(err, "Không tạo được mục tiêu."));
    } finally {
      setIsSavingGoal(false);
    }
  };

  const selectedHistory = history.find((h) => h.id === selectedHistoryId) ?? null;

  return (
    <div className="space-y-6">
      {/* Chọn bệnh lý + chuyên ngành + thang */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs">
          <span className="text-[#222222]/60">Bệnh lý</span>
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 text-xs font-semibold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
          >
            {CONDITION_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="text-[#222222]/60">Chuyên ngành</span>
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 text-xs font-semibold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
          >
            {SPECIALTY_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {scales.map((s) => {
          const badge = vietnameseBadge(s.vietnameseStatus);
          const active = s.code === selectedScaleCode;
          return (
            <button
              key={s.code}
              type="button"
              onClick={() => setSelectedScaleCode(s.code)}
              className={`px-3 py-2 rounded-[14px] border text-left transition-colors ${
                active ? "bg-[#0f3e17] text-[#fffefc] border-[#0f3e17]" : "bg-[#fffefc] border-[#efeeeb] hover:border-[#0f3e17]"
              }`}
            >
              <div className="text-xs font-bold">{s.code}</div>
              <div className={`text-[10px] mt-0.5 ${active ? "text-[#e1f4df]" : "text-[#222222]/60"}`}>
                {s.assessorType === "TB" ? "Tự báo cáo" : s.assessorType === "NT" ? "Đo số" : "Quan sát"}
              </div>
              <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-[6px] border font-semibold ${active ? "bg-[#fffefc]/15 text-[#fffefc] border-transparent" : badge.className}`}>
                {badge.text}
              </span>
            </button>
          );
        })}
        {scales.length === 0 && (
          <p className="text-xs text-[#222222]/70">Chưa có thang nào cho bệnh lý/chuyên ngành này.</p>
        )}
      </div>

      {scaleDef && (
        <div className="space-y-4">
          {/* Thời điểm */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#0f3e17]">Thời điểm:</span>
            {TIMEPOINT_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setSelectedTimepoint(t.value)}
                className={`px-3 py-1.5 rounded-[14px] text-xs font-semibold border transition-colors ${
                  selectedTimepoint === t.value
                    ? "bg-[#0f3e17] text-[#fffefc] border-[#0f3e17]"
                    : "bg-[#fffefc] border-[#efeeeb] text-[#222222]/70 hover:border-[#0f3e17]"
                }`}
              >
                {t.label}
              </button>
            ))}
            {scaleDef.vietnameseSource && (
              <span className="text-[11px] text-[#222222]/60">Nguồn bản dịch: {scaleDef.vietnameseSource}</span>
            )}
          </div>

          {/* Tổng preview */}
          {preview && preview.total !== null && (
            <div className="p-4 rounded-[14px] bg-[#e1f4df]/40 border border-[#cfe7d3] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs text-[#0f3e17] font-semibold uppercase tracking-wider">Tổng điểm (xem trước)</span>
                <div className="text-3xl font-black text-[#0f3e17] font-mono mt-0.5">
                  {preview.total}
                  <span className="text-sm font-normal text-[#222222]/60"> / {scaleDef.scoring.maxTotal ?? "—"} điểm</span>
                </div>
              </div>
              <div className="text-xs font-bold text-[#0f3e17]">{preview.text}</div>
            </div>
          )}

          {/* Form thang nhiều mục */}
          {scaleDef.kind === "MULTI_ITEM" && (
            <div className="space-y-4">
              {scaleDef.subscales && scaleDef.subscales.length > 0 && (
                <div className="text-xs font-bold text-[#0f3e17] uppercase tracking-wide">
                  {scaleDef.subscales.map((s) => s.labelVi).join(" & ")} (thang {scaleDef.items[0]?.min}–{scaleDef.items[0]?.max} / mục)
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {scaleDef.items.map((item, idx) => (
                  <div key={item.key} className="p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] flex items-center justify-between gap-2">
                    <span className="text-[#222222] font-medium">
                      {idx + 1}. {item.labelVi}
                      {item.labelEn && <span className="block text-[10px] text-[#222222]/50">{item.labelEn}</span>}
                    </span>
                    {item.options ? (
                      <select
                        value={itemValues[item.key] ?? ""}
                        onChange={(e) =>
                          setItemValues((prev) => ({ ...prev, [item.key]: e.target.value === "" ? null : Number(e.target.value) }))
                        }
                        className="bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-1 text-xs text-[#0f3e17] font-bold focus:outline-none focus:border-[#0f3e17] max-w-[180px]"
                      >
                        <option value="">— Chưa chấm —</option>
                        {item.options.map((o) => (
                          <option key={o.value} value={o.value}>{o.labelVi}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={itemValues[item.key] ?? ""}
                        onChange={(e) =>
                          setItemValues((prev) => ({ ...prev, [item.key]: e.target.value === "" ? null : Number(e.target.value) }))
                        }
                        className="bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-1 text-xs text-[#0f3e17] font-bold focus:outline-none focus:border-[#0f3e17]"
                      >
                        <option value="">—</option>
                        {Array.from({ length: item.max - item.min + 1 }, (_, k) => item.min + k).map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
              {missingItems.length > 0 && (
                <p className="text-xs text-amber-800">
                  Còn {missingItems.length} mục chưa chấm: {missingItems.map((i) => i.labelVi).join(", ")} — phải chấm đủ mới lưu được.
                </p>
              )}
            </div>
          )}

          {/* Form thang đơn trị (VAS) */}
          {scaleDef.kind === "SINGLE_VALUE" && (
            <div className="p-4 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0f3e17]">Mức đau (VAS)</span>
                <strong className="text-[#0f3e17] text-lg">{singleValue === null ? "—" : `${singleValue}/10`}</strong>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={singleValue ?? 0}
                onChange={(e) => setSingleValue(Number(e.target.value))}
                className="w-full accent-[#0f3e17]"
              />
              <p className="text-[11px] text-[#222222]/60">Kéo để chấm 0 (không đau) – 10 (đau nhất). Thay đổi ≥ 2 điểm được coi là có ý nghĩa lâm sàng.</p>
            </div>
          )}

          {/* Form thang đo theo từng bộ phận (MMT / ROM) */}
          {scaleDef.kind === "PER_MEASURE" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                <label>
                  <span className="text-[#222222]/60">{scaleDef.code === "MMT" ? "Cơ" : "Khớp / vận động"}</span>
                  <select
                    value={newMeasureKey}
                    onChange={(e) => setNewMeasureKey(e.target.value)}
                    className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 font-semibold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
                  >
                    {scaleDef.items.map((i) => (
                      <option key={i.key} value={i.key}>
                        {i.labelVi}{i.normalRange ? ` (chuẩn ${i.normalRange}°)` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="text-[#222222]/60">Bên</span>
                  <select
                    value={newMeasureSide}
                    onChange={(e) => setNewMeasureSide(e.target.value as "LEFT" | "RIGHT" | "BOTH")}
                    className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 font-semibold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
                  >
                    <option value="RIGHT">Phải</option>
                    <option value="LEFT">Trái</option>
                    <option value="BOTH">Cả hai</option>
                  </select>
                </label>
                {scaleDef.code === "MMT" ? (
                  <label>
                    <span className="text-[#222222]/60">Sức cơ (0–5)</span>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={newMeasureValue}
                      onChange={(e) => setNewMeasureValue(e.target.value)}
                      placeholder="0–5"
                      className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 font-bold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      <span className="text-[#222222]/60">Góc chủ động (°)</span>
                      <input
                        type="number"
                        min={0}
                        value={newMeasureActive}
                        onChange={(e) => setNewMeasureActive(e.target.value)}
                        placeholder="°"
                        className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 font-bold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
                      />
                    </label>
                    <label>
                      <span className="text-[#222222]/60">Góc thụ động (°)</span>
                      <input
                        type="number"
                        min={0}
                        value={newMeasurePassive}
                        onChange={(e) => setNewMeasurePassive(e.target.value)}
                        placeholder="°"
                        className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 font-bold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
                      />
                    </label>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={addMeasure}
                className="px-4 py-2 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#e1f4df]/40 text-[#0f3e17] text-xs font-semibold transition-colors"
              >
                + Thêm phép đo
              </button>
              {measures.length > 0 && (
                <div className="space-y-2">
                  {measures.map((m, idx) => {
                    const def = scaleDef.items.find((i) => i.key === m.key);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs">
                        <span>
                          <strong className="text-[#0f3e17]">{def?.labelVi}</strong>
                          {" • "}
                          {m.side === "LEFT" ? "Trái" : m.side === "RIGHT" ? "Phải" : "Cả hai"}
                          {" • "}
                          {scaleDef.code === "MMT"
                            ? `Sức cơ ${m.value}/5`
                            : `Chủ động ${m.active ?? "—"}° / Thụ động ${m.passive ?? "—"}°${def?.normalRange ? ` (chuẩn ${def.normalRange}°)` : ""}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setMeasures((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-700 font-semibold"
                        >
                          Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Ghi chú + nút lưu */}
          <div>
            <label className="text-xs">
              <span className="text-[#222222]/60">Ghi chú lần đánh giá (tùy chọn)</span>
              <input
                value={assessmentNote}
                onChange={(e) => setAssessmentNote(e.target.value)}
                placeholder="VD: bệnh nhân mệt, đo buổi chiều…"
                className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-3 py-2 text-xs focus:outline-none focus:border-[#0f3e17]"
              />
            </label>
          </div>
          {assessmentError && <p className="text-xs text-rose-700 font-semibold">{assessmentError}</p>}
          {savedAssessment && (
            <p className="text-xs text-[#0f3e17] font-semibold">
              Đã lưu {savedAssessment.scaleNameVi} — {savedAssessment.interpretation}
              {" • "}
              {new Date(savedAssessment.assessedAt).toLocaleString("vi-VN")}
            </p>
          )}
          <button
            type="button"
            onClick={handleSaveAssessment}
            disabled={isSavingAssessment || !preview?.complete}
            className="px-6 py-2.5 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isSavingAssessment ? "Đang lưu..." : `Lưu lần đánh giá ${scaleDef.code}`}
          </button>
        </div>
      )}

      {/* Lịch sử + xu hướng */}
      {scaleDef && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#0f3e17] uppercase tracking-wider">
            Lịch sử {scaleDef.nameVi} của bệnh nhân
          </h4>
          {historyLoading ? (
            <p className="text-xs text-[#222222]/70">Đang tải lịch sử...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-[#222222]/70">Chưa có lần đánh giá nào cho thang này.</p>
          ) : (
            <>
              {trend.length > 1 && <TrendSparkline points={trend} />}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[#222222]/60 border-b border-[#efeeeb]">
                      <th className="py-2 pr-2">Ngày</th>
                      <th className="py-2 pr-2">Thời điểm</th>
                      <th className="py-2 pr-2">Kết quả</th>
                      <th className="py-2 pr-2">Δ lần trước</th>
                      <th className="py-2 pr-2">Δ đầu vào</th>
                      <th className="py-2">MCID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((h) => {
                      const t = trend.find((p) => p.id === h.id);
                      const main = h.totalScore ?? h.value ?? h.level ?? "—";
                      return (
                        <tr
                          key={h.id}
                          onClick={() => setSelectedHistoryId(selectedHistoryId === h.id ? null : h.id)}
                          className="border-b border-[#efeeeb] cursor-pointer hover:bg-[#e1f4df]/30"
                        >
                          <td className="py-2 pr-2">{new Date(h.assessedAt).toLocaleDateString("vi-VN")}</td>
                          <td className="py-2 pr-2">
                            {h.timepoint === "BASELINE" ? "ĐV" : h.timepoint === "REASSESSMENT" ? "TĐG" : "RV"}
                          </td>
                          <td className="py-2 pr-2 font-bold text-[#0f3e17]">{main}</td>
                          <td className="py-2 pr-2">{t?.deltaVsPrevious ?? "—"}</td>
                          <td className="py-2 pr-2">{t?.deltaVsBaseline ?? "—"}</td>
                          <td className="py-2">{t?.mcidReached ? "✓ Đạt" : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {selectedHistory && (
                <div className="p-4 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#0f3e17]">
                      Chi tiết — {selectedHistory.scaleNameVi} • {new Date(selectedHistory.assessedAt).toLocaleString("vi-VN")}
                    </strong>
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryId(null)}
                      className="text-[#222222]/60 font-semibold"
                    >
                      Đóng
                    </button>
                  </div>
                  <div>{selectedHistory.interpretation}</div>
                  {selectedHistory.subscaleScores && (
                    <div className="text-[#222222]/70">
                      Thang con:{" "}
                      {Object.entries(selectedHistory.subscaleScores)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" • ")}
                    </div>
                  )}
                  {selectedHistory.itemScores && typeof selectedHistory.itemScores === "object" && !Array.isArray(selectedHistory.itemScores) && scaleDef && (
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(selectedHistory.itemScores as Record<string, number>).map(([k, v]) => {
                        const def = scaleDef.items.find((i) => i.key === k);
                        return (
                          <div key={k} className="flex justify-between">
                            <span>{def?.labelVi ?? k}</span>
                            <strong>{v}</strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {Array.isArray(selectedHistory.itemScores) && (
                    <div className="space-y-1">
                      {(selectedHistory.itemScores as any[]).map((m, i) => {
                        const def = scaleDef?.items.find((x) => x.key === m.key);
                        return (
                          <div key={i} className="flex justify-between">
                            <span>{def?.labelVi ?? m.key} ({m.side === "LEFT" ? "Trái" : m.side === "RIGHT" ? "Phải" : "Cả hai"})</span>
                            <strong>{m.value !== undefined ? `${m.value}/5` : `${m.active ?? "—"}° / ${m.passive ?? "—"}°`}</strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {selectedHistory.notes && <div className="text-[#222222]/70">Ghi chú: {selectedHistory.notes}</div>}
                  <div className="text-[#222222]/60">
                    Người chấm: {selectedHistory.assessedByName ?? "—"} ({selectedHistory.assessedByRole})
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="Lý do hủy (VD: nhập sai điểm)"
                      className="flex-1 bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-1.5 text-xs focus:outline-none focus:border-rose-700"
                    />
                    <button
                      type="button"
                      onClick={() => handleVoid(selectedHistory.id)}
                      className="px-3 py-1.5 rounded-[7px] bg-rose-700 text-white text-xs font-semibold"
                    >
                      Hủy lần này
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Mục tiêu điều trị */}
      <div className="space-y-3 border-t border-[#efeeeb] pt-4">
        <h4 className="text-xs font-bold text-[#0f3e17] uppercase tracking-wider">Mục tiêu điều trị</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <label className="min-w-0">
            <span className="text-[#222222]/60">Gắn thang (để trống = mục tiêu tự do)</span>
            <select
              value={goalScaleCode}
              onChange={(e) => handleGoalScaleChange(e.target.value)}
              className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 font-semibold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
            >
              <option value="">— Mục tiêu tự do —</option>
              {scales.map((s) => (
                <option key={s.code} value={s.code}>{s.nameVi}</option>
              ))}
            </select>
          </label>
          {goalScaleDef && goalScaleDef.kind === "MULTI_ITEM" && (
            <label className="min-w-0">
              <span className="text-[#222222]/60">Trên 1 mục của thang (tùy chọn)</span>
              <select
                value={goalItemKey}
                onChange={(e) => setGoalItemKey(e.target.value)}
                className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 font-semibold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
              >
                <option value="">— Cả thang —</option>
                {goalScaleDef.items.map((i) => (
                  <option key={i.key} value={i.key}>{i.labelVi}</option>
                ))}
              </select>
            </label>
          )}
          <label className="min-w-0">
            <span className="text-[#222222]/60">Tiêu đề mục tiêu</span>
            <input
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder={goalScaleDef ? `VD: ${goalScaleDef.nameVi}: ${goalBaseline || "?"} → ${goalTarget || "?"}` : "VD: Tự mặc áo thân trên"}
              className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 focus:outline-none focus:border-[#0f3e17]"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:col-span-2 min-w-0">
            <label className="min-w-0">
              <span className="text-[#222222]/60">Mốc (tự điền)</span>
              <input
                type="number"
                value={goalBaseline}
                onChange={(e) => setGoalBaseline(e.target.value)}
                className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 font-bold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
              />
            </label>
            <label className="min-w-0">
              <span className="text-[#222222]/60">Mục tiêu *</span>
              <input
                type="number"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                className="mt-1 w-full bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 font-bold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
              />
            </label>
            <label className="min-w-0">
              <span className="text-[#222222]/60">Ngày đích (mặc định +4 tuần)</span>
              <input
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
                className="mt-1 w-full min-w-0 bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-2 focus:outline-none focus:border-[#0f3e17]"
              />
            </label>
          </div>
        </div>
        {goalError && <p className="text-xs text-rose-700 font-semibold">{goalError}</p>}
        <button
          type="button"
          onClick={handleSaveGoal}
          disabled={isSavingGoal}
          className="px-6 py-2.5 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {isSavingGoal ? "Đang tạo..." : "Tạo mục tiêu"}
        </button>

        {goals.length === 0 ? (
          <p className="text-xs text-[#222222]/70">Chưa có mục tiêu nào cho bệnh nhân này.</p>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => {
              const st = GOAL_STATUS_LABEL[g.status];
              return (
                <div key={g.id} className="p-4 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-[#0f3e17]">{g.title}</strong>
                    <span className={`text-[10px] px-2 py-0.5 rounded-[6px] border font-semibold whitespace-nowrap ${st.className}`}>
                      {st.text}
                    </span>
                  </div>
                  <div className="text-[#222222]/70">
                    {g.scaleNameVi ? `${g.scaleNameVi} • ` : ""}
                    Mốc: <strong>{g.baselineValue ?? "—"}</strong> → Mục tiêu: <strong>{g.targetValue}</strong>
                    {g.currentValue !== null && g.currentValue !== undefined && (
                      <> • Hiện tại: <strong className="text-[#0f3e17]">{g.currentValue}</strong></>
                    )}
                    {g.daysLeft !== null && g.daysLeft !== undefined && g.status === "ACTIVE" && (
                      <> • Còn <strong>{g.daysLeft}</strong> ngày</>
                    )}
                  </div>
                  {g.progressPct !== null && g.progressPct !== undefined && (
                    <div>
                      <div className="flex justify-between text-[11px] text-[#222222]/60 mb-1">
                        <span>Tiến độ</span>
                        <strong className="text-[#0f3e17]">{g.progressPct}%</strong>
                      </div>
                      <div className="w-full bg-[#efeeeb] rounded-full h-2 overflow-hidden">
                        <div className="bg-[#0f3e17] h-2 rounded-full transition-all duration-500" style={{ width: `${g.progressPct}%` }} />
                      </div>
                    </div>
                  )}
                  {g.status === "ACTIVE" && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <select
                        value={achieveProofId[g.id] ?? ""}
                        onChange={(e) => setAchieveProofId((prev) => ({ ...prev, [g.id]: e.target.value }))}
                        className="bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-1.5 text-xs focus:outline-none focus:border-[#0f3e17]"
                      >
                        <option value="">— Chọn lần đánh giá làm chứng —</option>
                        {history
                          .filter((h) => !g.scaleCode || h.scaleCode === g.scaleCode)
                          .map((h) => (
                            <option key={h.id} value={h.id}>
                              {new Date(h.assessedAt).toLocaleDateString("vi-VN")} — {h.totalScore ?? h.value ?? h.level}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!achieveProofId[g.id]}
                        onClick={async () => {
                          try {
                            await assessmentService.markGoalAchieved(g.id, achieveProofId[g.id]);
                            refreshHistoryAndGoals();
                          } catch (err: any) {
                            setGoalError(getApiErrorMessage(err, "Không đánh dấu đạt được."));
                          }
                        }}
                        className="px-3 py-1.5 rounded-[7px] bg-[#0f3e17] text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Đánh dấu đạt
                      </button>
                      <input
                        value={notAchievedReason[g.id] ?? ""}
                        onChange={(e) => setNotAchievedReason((prev) => ({ ...prev, [g.id]: e.target.value }))}
                        placeholder="Lý do không đạt"
                        className="bg-[#fffefc] border border-[#efeeeb] rounded-[7px] px-2 py-1.5 text-xs focus:outline-none focus:border-[#0f3e17]"
                      />
                      <button
                        type="button"
                        disabled={!(notAchievedReason[g.id] ?? "").trim()}
                        onClick={async () => {
                          try {
                            await assessmentService.markGoalNotAchieved(g.id, (notAchievedReason[g.id] ?? "").trim());
                            refreshHistoryAndGoals();
                          } catch (err: any) {
                            setGoalError(getApiErrorMessage(err, "Không đánh dấu được."));
                          }
                        }}
                        className="px-3 py-1.5 rounded-[7px] bg-[#fffefc] border border-[#efeeeb] text-rose-700 text-xs font-semibold disabled:opacity-50"
                      >
                        Không đạt
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await assessmentService.cancelGoal(g.id);
                            refreshHistoryAndGoals();
                          } catch (err: any) {
                            setGoalError(getApiErrorMessage(err, "Không hủy được mục tiêu."));
                          }
                        }}
                        className="px-3 py-1.5 rounded-[7px] bg-[#fffefc] border border-[#efeeeb] text-[#222222]/70 text-xs font-semibold"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                  {g.status === "NOT_ACHIEVED" && g.notAchievedReason && (
                    <div className="text-rose-700">Lý do: {g.notAchievedReason}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Sparkline SVG inline — không thêm thư viện biểu đồ (package.json chưa có).
function TrendSparkline({ points }: { points: TrendPoint[] }) {
  const values = points
    .map((p) => p.totalScore ?? p.value)
    .filter((v): v is number => v !== null && v !== undefined);
  if (values.length < 2) return null;
  const w = 320;
  const h = 64;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(h - 8 - ((v - min) / range) * (h - 16)).toFixed(1)}`)
    .join(" ");
  return (
    <div className="p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb]">
      <div className="flex justify-between text-[11px] text-[#222222]/60 mb-1">
        <span>Xu hướng (trước – sau)</span>
        <strong className="text-[#0f3e17]">
          {values[0]} → {values[values.length - 1]}
        </strong>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
        <polyline points={pts} fill="none" stroke="#0f3e17" strokeWidth="2" strokeLinejoin="round" />
        {values.map((v, i) => (
          <circle
            key={i}
            cx={i * stepX}
            cy={h - 8 - ((v - min) / range) * (h - 16)}
            r="3"
            fill="#0f3e17"
          />
        ))}
      </svg>
    </div>
  );
}
