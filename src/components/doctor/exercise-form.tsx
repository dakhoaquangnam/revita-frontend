"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { ExerciseRow } from "@/services/doctor.service";
import {
  exerciseService,
  type Exercise,
} from "@/services/exercise.service";
import { CONDITION_OPTIONS } from "@/services/assessment.service";
import { getApiErrorMessage } from "@/services/room.service";

interface ExerciseFormProps {
  rows: ExerciseRow[];
  onChange: (rows: ExerciseRow[]) => void;
  savedExpCode?: string;
}

export default function ExerciseForm({ rows, onChange, savedExpCode }: ExerciseFormProps) {
  const [condition, setCondition] = useState("GENERAL");
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    exerciseService
      .listExercises({ condition, limit: 50 })
      .then((res) => {
        if (!cancelled) setCatalog(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Không tải được danh mục bài tập."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [condition]);

  const selectedIds = new Set(rows.map((r) => r.exerciseId));

  const toggleExercise = (ex: Exercise) => {
    if (selectedIds.has(ex.id)) {
      onChange(rows.filter((r) => r.exerciseId !== ex.id));
    } else {
      onChange([
        ...rows,
        {
          exerciseId: ex.id,
          name: ex.name,
          category: ex.category,
          sets: ex.defaultSets ?? undefined,
          reps: ex.defaultReps ?? undefined,
          holdSec: ex.defaultHoldSec ?? undefined,
          frequency: ex.defaultFrequency ?? undefined,
          durationDays: ex.defaultDuration ?? undefined,
          precautions: ex.precautions ?? undefined,
        },
      ]);
    }
  };

  const updateRow = (exerciseId: string, patch: Partial<ExerciseRow>) => {
    onChange(rows.map((r) => (r.exerciseId === exerciseId ? { ...r, ...patch } : r)));
  };

  const inputCls =
    "px-2 py-1.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17] w-full";

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
          Bệnh lý — lọc bài tập theo bệnh lý của bệnh nhân:
        </label>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="w-full sm:w-80 px-3 py-2.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
        >
          {CONDITION_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-xs text-[#222222]/70">Đang tải danh mục bài tập...</p>}
      {error && <p className="text-xs text-rose-700">{error}</p>}
      {!loading && !error && catalog.length === 0 && (
        <p className="text-xs text-[#222222]/70">
          Chưa có bài tập nào cho bệnh lý này trong danh mục.
        </p>
      )}

      {/* Danh sách bài trong danh mục — tick để kê */}
      <div className="space-y-2">
        {catalog.map((ex) => {
          const checked = selectedIds.has(ex.id);
          return (
            <label
              key={ex.id}
              className={`flex items-start gap-3 p-3 rounded-[14px] border text-xs cursor-pointer transition-colors ${
                checked
                  ? "bg-[#e1f4df]/60"
                  : "bg-[#fffefc] border-[#efeeeb] hover:bg-[#efeeeb]/30"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleExercise(ex)}
                className="mt-0.5 w-4 h-4 accent-[#0f3e17]"
              />
              <span className="flex-1">
                <span className="block font-semibold text-[#0f3e17] text-sm">{ex.name}</span>
                <span className="block text-[11px] text-[#222222]/60 mt-0.5">
                  {ex.category} • {ex.level === "EASY" ? "Dễ" : ex.level === "MEDIUM" ? "Vừa" : "Khó"}
                  {ex.bodyPart ? ` • ${ex.bodyPart}` : ""}
                  {ex.defaultSets || ex.defaultReps || ex.defaultFrequency
                    ? ` • Mặc định: ${[ex.defaultSets ? `${ex.defaultSets} hiệp` : "", ex.defaultReps ? `${ex.defaultReps} lần` : "", ex.defaultFrequency ?? ""].filter(Boolean).join(" · ")}`
                    : ""}
                </span>
                {ex.instructions && (
                  <span className="block text-[11px] text-[#222222]/80 mt-1">{ex.instructions}</span>
                )}
                {ex.precautions && (
                  <span className="block text-[11px] text-amber-800 mt-0.5">
                    Lưu ý: {ex.precautions}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {/* Liều tập của các bài đã chọn */}
      {rows.length > 0 && (
        <div className="space-y-2 pt-2">
          <h5 className="eyebrow text-[#0f3e17]">
            Liều tập đã kê ({rows.length} bài)
          </h5>
          {rows.map((row, idx) => (
            <div
              key={row.exerciseId}
              className="p-3 rounded-[14px] bg-[#e1f4df]/30 text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <strong className="text-[#0f3e17] text-sm">
                  {idx + 1}. {row.name}
                </strong>
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((r) => r.exerciseId !== row.exerciseId))}
                  className="text-[#222222]/40 hover:text-rose-600 p-1"
                  title="Bỏ bài này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <label className="space-y-0.5">
                  <span className="text-[10px] text-[#222222]/60">Số hiệp</span>
                  <input
                    type="number"
                    min={1}
                    value={row.sets ?? ""}
                    onChange={(e) =>
                      updateRow(row.exerciseId, {
                        sets: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    className={inputCls}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[10px] text-[#222222]/60">Số lần/hiệp</span>
                  <input
                    type="number"
                    min={1}
                    value={row.reps ?? ""}
                    onChange={(e) =>
                      updateRow(row.exerciseId, {
                        reps: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    className={inputCls}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[10px] text-[#222222]/60">Giữ (giây)</span>
                  <input
                    type="number"
                    min={0}
                    value={row.holdSec ?? ""}
                    onChange={(e) =>
                      updateRow(row.exerciseId, {
                        holdSec: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    className={inputCls}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[10px] text-[#222222]/60">Tần suất</span>
                  <input
                    type="text"
                    value={row.frequency ?? ""}
                    onChange={(e) => updateRow(row.exerciseId, { frequency: e.target.value || undefined })}
                    placeholder="3 lần/ngày"
                    className={inputCls}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[10px] text-[#222222]/60">Số ngày</span>
                  <input
                    type="number"
                    min={1}
                    value={row.durationDays ?? ""}
                    onChange={(e) =>
                      updateRow(row.exerciseId, {
                        durationDays: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    className={inputCls}
                  />
                </label>
              </div>
              <input
                type="text"
                value={row.note ?? ""}
                onChange={(e) => updateRow(row.exerciseId, { note: e.target.value || undefined })}
                placeholder="Ghi chú riêng cho bài này"
                className={inputCls}
              />
            </div>
          ))}
        </div>
      )}

      {savedExpCode && (
        <div className="p-3.5 rounded-[14px] bg-[#e1f4df]/60 text-xs">
          <span className="font-semibold text-[#0f3e17]">Đơn bài tập đã lưu: </span>
          <span className="font-semibold text-[#0f3e17]">{savedExpCode}</span>
          <span className="text-[#222222]/70"> — in phiếu bài tập kèm mã QR ở khung in sau khi lưu.</span>
        </div>
      )}
    </div>
  );
}
