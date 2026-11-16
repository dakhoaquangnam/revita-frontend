"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  doctorService,
  type DrugRow,
  type ExerciseRow,
  type MedicationPrescription,
} from "@/services/doctor.service";
import {
  exerciseService,
  EXERCISE_STATUS_LABELS,
  type ExercisePrescriptionRow,
} from "@/services/exercise.service";
import { getApiErrorMessage } from "@/services/room.service";

const MP_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  SIGNED: "Đã ký",
  DISPENSED: "Đã phát thuốc",
  CANCELLED: "Đã hủy",
};

interface PrescriptionHistoryProps {
  patientProfileId: string;
  onReprescribeDrugs: (rows: DrugRow[]) => void;
  onReprescribeExercises: (rows: ExerciseRow[]) => void;
}

export default function PrescriptionHistory({
  patientProfileId,
  onReprescribeDrugs,
  onReprescribeExercises,
}: PrescriptionHistoryProps) {
  const [mps, setMps] = useState<MedicationPrescription[]>([]);
  const [eps, setEps] = useState<ExercisePrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientProfileId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      doctorService.listMyMedicationPrescriptions(50),
      exerciseService.listPatientExercisePrescriptions(patientProfileId, {
        status: "ACTIVE",
        limit: 20,
      }),
    ])
      .then(([mpRes, epRes]) => {
        if (cancelled) return;
        setMps((mpRes.results ?? []).filter((m) => m.patientProfileId === patientProfileId));
        setEps(epRes.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Không tải được lịch sử đơn."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientProfileId]);

  if (!patientProfileId) return null;

  return (
    <div className="space-y-3 pt-4 border-t border-[#efeeeb]">
      <h4 className="eyebrow text-[#0f3e17]">
        Đơn cũ của bệnh nhân này
      </h4>
      {loading && <p className="text-xs text-[#222222]/70">Đang tải lịch sử đơn...</p>}
      {error && <p className="text-xs text-rose-700">{error}</p>}
      {!loading && !error && mps.length === 0 && eps.length === 0 && (
        <p className="text-xs text-[#222222]/70">Bệnh nhân chưa có đơn thuốc hay đơn bài tập nào.</p>
      )}

      {mps.map((mp) => (
        <div
          key={mp.id}
          className="p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs flex items-start justify-between gap-2"
        >
          <div>
            <div className="font-semibold text-[#0f3e17]">
              Đơn thuốc <span>{mp.code}</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[#e1f4df]/60 font-semibold">
                {MP_STATUS_LABELS[mp.status] ?? mp.status}
              </span>
            </div>
            <div className="text-[11px] text-[#222222]/70 mt-0.5">
              {new Date(mp.createdAt).toLocaleDateString("vi-VN")} • {mp.items.length} thuốc:{" "}
              {mp.items.map((i) => i.name).join(", ")}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onReprescribeDrugs(
                mp.items.map((i) => ({
                  id: `drug-${Date.now()}-${i.id}`,
                  drugId: i.drugId ?? undefined,
                  name: i.name,
                  strength: i.strength ?? undefined,
                  dosageForm: i.dosageForm ?? undefined,
                  route: i.route ?? undefined,
                  dose: i.dose ?? undefined,
                  doseUnit: i.doseUnit ?? undefined,
                  frequency: i.frequency ?? undefined,
                  durationDays: i.durationDays ?? undefined,
                  quantity: i.quantity ?? undefined,
                  quantityUnit: i.quantityUnit ?? undefined,
                  instructions: i.instructions ?? undefined,
                })),
              )
            }
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#e1f4df]/40 text-xs font-semibold text-[#0f3e17]"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Kê lại
          </button>
        </div>
      ))}

      {eps.map((ep) => (
        <div
          key={ep.id}
          className="p-3 rounded-[14px] bg-[#e1f4df]/30 text-xs flex items-start justify-between gap-2"
        >
          <div>
            <div className="font-semibold text-[#0f3e17]">
              Bài tập: {ep.exercise.name}
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[#fffefc] border border-[#efeeeb] font-semibold">
                {EXERCISE_STATUS_LABELS[ep.status] ?? ep.status}
              </span>
            </div>
            <div className="text-[11px] text-[#222222]/70 mt-0.5">
              {new Date(ep.createdAt).toLocaleDateString("vi-VN")} • Mã {ep.code} •{" "}
              {[ep.sets ? `${ep.sets} hiệp` : "", ep.reps ? `${ep.reps} lần` : "", ep.frequency ?? ""]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onReprescribeExercises([
                {
                  exerciseId: ep.exerciseId,
                  name: ep.exercise.name,
                  category: ep.exercise.category,
                  sets: ep.sets ?? undefined,
                  reps: ep.reps ?? undefined,
                  holdSec: ep.holdSec ?? undefined,
                  frequency: ep.frequency ?? undefined,
                  durationDays: ep.durationDays ?? undefined,
                  note: ep.note ?? undefined,
                  precautions: ep.exercise.precautions ?? undefined,
                },
              ])
            }
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#e1f4df]/40 text-xs font-semibold text-[#0f3e17]"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Kê lại
          </button>
        </div>
      ))}
    </div>
  );
}
