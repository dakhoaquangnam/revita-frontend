"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Search, AlertTriangle, PenLine, PackageCheck } from "lucide-react";
import {
  type DrugRow,
  type MedicationPrescription,
} from "@/services/doctor.service";
import { drugService, type DrugCatalogItem } from "@/services/drug.service";

const ROUTES = ["Uống", "Tiêm", "Bôi ngoài da", "Nhỏ mắt", "Nhỏ mũi", "Đặt", "Hít"];

// So khớp chuỗi đơn giản (GĐ4 §3.2.5): tách thành từ ≥4 ký tự, nếu tên thuốc
// và chuỗi dị ứng có từ chung thì cảnh báo đỏ. Không phải kiểm tra tương
// tác thật — bác sĩ vẫn là người quyết.
function allergyHits(allergies: string | null | undefined, drugName: string): string[] {
  if (!allergies || !drugName) return [];
  const words = (s: string) =>
    s
      .toLowerCase()
      .split(/[^a-z0-9à-ỹ]+/i)
      .filter((w) => w.length >= 4);
  const allergyWords = new Set(words(allergies));
  return words(drugName).filter((w) => allergyWords.has(w));
}

interface DrugFormProps {
  rows: DrugRow[];
  onChange: (rows: DrugRow[]) => void;
  allergies?: string | null;
  savedMp?: MedicationPrescription | null;
  onSign?: () => void;
  onDispense?: () => void;
  actionBusy?: boolean;
}

export default function DrugForm({
  rows,
  onChange,
  allergies,
  savedMp,
  onSign,
  onDispense,
  actionBusy,
}: DrugFormProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<DrugCatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await drugService.searchDrugs(q, 8);
        setSuggestions(res.data);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const updateRow = (id: string, patch: Partial<DrugRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addDrug = (drug: DrugCatalogItem) => {
    onChange([
      ...rows,
      {
        id: `drug-${Date.now()}`,
        drugId: drug.id,
        name: drug.name,
        strength: drug.strength ?? undefined,
        dosageForm: drug.dosageForm ?? undefined,
        route: drug.route ?? undefined,
      },
    ]);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  const addFreeDrug = () => {
    onChange([...rows, { id: `drug-${Date.now()}`, name: "" }]);
  };

  const allergyWarnings = useMemo(() => {
    const map = new Map<string, string[]>();
    rows.forEach((r) => {
      const hits = allergyHits(allergies, r.name);
      if (hits.length > 0) map.set(r.id, hits);
    });
    return map;
  }, [rows, allergies]);

  const inputCls =
    "px-2 py-1.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17] w-full";

  return (
    <div className="space-y-3">
      {allergies && (
        <div className="p-3 rounded-[14px] bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <strong>Dị ứng đã ghi nhận:</strong> {allergies}
          <span className="block text-[11px] text-amber-800/80 mt-0.5">
            Kiểm tra tên thuốc trước khi kê — hệ thống cảnh báo khi tên thuốc trùng từ khóa dị ứng.
          </span>
        </div>
      )}

      {allergyWarnings.size > 0 && (
        <div className="p-3 rounded-[14px] bg-rose-50 border border-rose-300 text-xs text-rose-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Cảnh báo dị ứng:</strong> thuốc{" "}
            {[...allergyWarnings.values()].flat().join(", ")} trùng từ khóa dị ứng
            của bệnh nhân. Kiểm tra lại trước khi kê.
          </span>
        </div>
      )}

      {/* Tìm thuốc trong danh mục */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#222222]/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              placeholder="Gõ tên thuốc để tìm trong danh mục Dược thư..."
              className="w-full pl-9 pr-3 py-2.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
            />
          </div>
              <button
                type="button"
                onClick={addFreeDrug}
                className="px-3 py-2 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#efeeeb]/40 text-xs font-semibold text-[#0f3e17] whitespace-nowrap inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thuốc tự do
              </button>
        </div>
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] overflow-hidden">
            {suggestions.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => addDrug(d)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-[#e1f4df]/50 text-xs"
              >
                <span className="font-semibold text-[#0f3e17]">{d.name}</span>
                {d.strength && <span className="text-[#222222]/60"> — {d.strength}</span>}
                {d.dosageForm && <span className="text-[#222222]/60"> ({d.dosageForm})</span>}
              </button>
            ))}
          </div>
        )}
        {showDropdown && query.trim().length >= 2 && !searching && suggestions.length === 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] px-3.5 py-2.5 text-xs text-[#222222]/70">
            Không có trong danh mục — bấm “+ Thuốc tự do” để nhập tên tay.
          </div>
        )}
      </div>

      {/* Danh sách thuốc đã kê */}
      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-xs text-[#222222]/60">
            Chưa kê thuốc nào. Tìm thuốc trong danh mục hoặc thêm thuốc tự do.
          </p>
        )}
        {rows.map((rx, idx) => (
          <div
            key={rx.id}
            className={`p-3 rounded-[14px] bg-[#fffefc] border text-xs space-y-2 ${
              allergyWarnings.has(rx.id) ? "border-rose-300 bg-rose-50/40" : "border-[#efeeeb]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#0f3e17]">{idx + 1}.</span>
              <input
                type="text"
                value={rx.name}
                onChange={(e) => updateRow(rx.id, { name: e.target.value })}
                placeholder="Tên thuốc *"
                className={`${inputCls} font-semibold`}
              />
              <button
                type="button"
                onClick={() => onChange(rows.filter((r) => r.id !== rx.id))}
                className="text-[#222222]/40 hover:text-rose-600 p-1 shrink-0"
                title="Xóa thuốc này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="space-y-0.5">
                <span className="text-[10px] text-[#222222]/60">Hàm lượng</span>
                <input
                  type="text"
                  value={rx.strength ?? ""}
                  onChange={(e) => updateRow(rx.id, { strength: e.target.value || undefined })}
                  placeholder="500mg"
                  className={inputCls}
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-[#222222]/60">Liều (số)</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={rx.dose ?? ""}
                  onChange={(e) =>
                    updateRow(rx.id, { dose: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                  placeholder="1"
                  className={inputCls}
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-[#222222]/60">Đơn vị liều</span>
                <input
                  type="text"
                  value={rx.doseUnit ?? ""}
                  onChange={(e) => updateRow(rx.id, { doseUnit: e.target.value || undefined })}
                  placeholder="viên"
                  className={inputCls}
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-[#222222]/60">Đường dùng</span>
                <select
                  value={rx.route ?? ""}
                  onChange={(e) => updateRow(rx.id, { route: e.target.value || undefined })}
                  className={inputCls}
                >
                  <option value="">— Chọn —</option>
                  {ROUTES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-[#222222]/60">Dạng bào chế</span>
                <input
                  type="text"
                  value={rx.dosageForm ?? ""}
                  onChange={(e) => updateRow(rx.id, { dosageForm: e.target.value || undefined })}
                  placeholder="Viên nén"
                  className={inputCls}
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-[#222222]/60">Tần suất</span>
                <input
                  type="text"
                  value={rx.frequency ?? ""}
                  onChange={(e) => updateRow(rx.id, { frequency: e.target.value || undefined })}
                  placeholder="3 lần/ngày"
                  className={inputCls}
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-[#222222]/60">Số ngày dùng</span>
                <input
                  type="number"
                  min={1}
                  value={rx.durationDays ?? ""}
                  onChange={(e) =>
                    updateRow(rx.id, { durationDays: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                  placeholder="5"
                  className={inputCls}
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-[#222222]/60">Số lượng</span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={rx.quantity ?? ""}
                    onChange={(e) =>
                      updateRow(rx.id, { quantity: e.target.value === "" ? undefined : Number(e.target.value) })
                    }
                    placeholder="15"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={rx.quantityUnit ?? ""}
                    onChange={(e) => updateRow(rx.id, { quantityUnit: e.target.value || undefined })}
                    placeholder="viên"
                    className={`${inputCls} w-16`}
                  />
                </div>
              </label>
            </div>
            <input
              type="text"
              value={rx.instructions ?? ""}
              onChange={(e) => updateRow(rx.id, { instructions: e.target.value || undefined })}
              placeholder="Cách dùng: VD: Uống sau ăn sáng, tối"
              className={inputCls}
            />
          </div>
        ))}
      </div>

      {/* Trạng thái đơn sau khi lưu + nút ký/phát */}
      {savedMp && (
        <div className="p-3.5 rounded-[14px] bg-[#e1f4df]/60 text-xs space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span>
              <span className="font-semibold text-[#0f3e17]">Đơn thuốc đã lưu: </span>
              <span className="font-semibold text-[#0f3e17]">{savedMp.code}</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[#fffefc] border border-[#efeeeb] font-semibold text-[#0f3e17]">
                {savedMp.status === "DRAFT"
                  ? "Bản nháp"
                  : savedMp.status === "SIGNED"
                    ? "Đã ký"
                    : savedMp.status === "DISPENSED"
                      ? "Đã phát thuốc"
                      : "Đã hủy"}
              </span>
            </span>
            <span className="flex gap-2">
              {savedMp.status === "DRAFT" && onSign && (
                <button
                  type="button"
                  onClick={onSign}
                  disabled={actionBusy}
                  className="px-3 py-1.5 rounded-[14px] bg-[#0f3e17] text-[#fffefc] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <PenLine className="w-3.5 h-3.5" /> Ký đơn
                </button>
              )}
              {savedMp.status === "SIGNED" && onDispense && (
                <button
                  type="button"
                  onClick={onDispense}
                  disabled={actionBusy}
                  className="px-3 py-1.5 rounded-[14px] bg-[#0f3e17] text-[#fffefc] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <PackageCheck className="w-3.5 h-3.5" /> Phát thuốc
                </button>
              )}
            </span>
          </div>
          <p className="text-[11px] text-[#222222]/70">
            Đơn ở trạng thái Bản nháp chưa có giá trị phát thuốc — ký đơn trước khi in cho bệnh nhân.
          </p>
        </div>
      )}
    </div>
  );
}
