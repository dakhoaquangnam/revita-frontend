import React from "react";

interface TsLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textVariant?: "dark" | "light";
  iconVariant?: "forest" | "light" | "white" | "keylime";
  className?: string;
}

export function TsLogo({
  size = "md",
  showText = true,
  textVariant = "dark",
  iconVariant,
  className = "",
}: TsLogoProps) {
  // Khi dùng trên nền tối (như Footer, textVariant === 'light'), mặc định dùng icon nền sáng 'light' (trắng / keylime)
  // để logo tương phản rực rỡ và hiển thị rõ ràng 100%.
  const resolvedIconVariant = iconVariant || (textVariant === "light" ? "light" : "forest");

  // Kích thước icon
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const textSizes = {
    sm: { title: "text-sm", sub: "text-[10px]" },
    md: { title: "text-base", sub: "text-[11px]" },
    lg: { title: "text-lg", sub: "text-xs" },
    xl: { title: "text-2xl", sub: "text-sm" },
  };

  const isLightIcon = resolvedIconVariant === "light" || resolvedIconVariant === "white" || resolvedIconVariant === "keylime";

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Biểu tượng Monogram cách điệu chữ TS y học:
          - Chữ T với thanh ngang vững chãi che chở
          - Chữ S sinh học phục hồi vận động khớp và cơ mềm mại
          - Khi ở Footer (nền tối #0f3e17): icon chuyển sang nền trắng tinh khôi #ffffff viền #cfe7d3 với nét vẽ xanh rừng đậm #0f3e17 nổi bật sắc nét.
          - Khi ở Header / Dashboard (nền sáng): icon dùng nền xanh rừng #0f3e17 với nét vẽ xanh nhạt và trắng tinh tế.
      */}
      <div
        className={`${sizeMap[size]} shrink-0 rounded-[12px] flex items-center justify-center p-1.5 transition-transform hover:scale-105 ${
          isLightIcon
            ? "bg-[#ffffff] text-[#0f3e17] border-2 border-[#b1dbb8] shadow-md shadow-black/25"
            : "bg-[#0f3e17] text-[#fffefc] shadow-sm shadow-[#0f3e17]/20"
        }`}
        style={
          isLightIcon
            ? { boxShadow: "0 2px 10px rgba(0, 0, 0, 0.25)" }
            : { boxShadow: "0 2px 8px rgba(15, 62, 23, 0.2)" }
        }
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Vòng hào quang sinh học / Vận động khớp mềm mại */}
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke={isLightIcon ? "#0f3e17" : "#b1dbb8"}
            strokeWidth="2.5"
            strokeDasharray="3 3"
            strokeOpacity={isLightIcon ? "0.45" : "0.5"}
          />

          {/* Nét chữ T: Thanh ngang trên đỉnh vươn sang hai bên che chở */}
          <path
            d="M16 20C24 18.5 40 18.5 48 20"
            stroke={isLightIcon ? "#0f3e17" : "#e1f4df"}
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          {/* Nét thân chính chữ T chuyển hóa uốn lượn thành chữ S */}
          <path
            d="M32 20V30C32 34 38 35 40 38C42.5 41.5 41 46 36 47.5C30 49.3 23 46 22 40"
            stroke={isLightIcon ? "#0f3e17" : "#b1dbb8"}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Vòm ngược trên chữ S để khép góc đối xứng mềm mại */}
          <path
            d="M24 28C25 24 28.5 22 32 22"
            stroke={isLightIcon ? "#09230e" : "#e1f4df"}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Điểm nhấn sinh học: Nút phục hồi / Tâm vận động */}
          <circle cx="32" cy="20" r="3" fill={isLightIcon ? "#0f3e17" : "#e1f4df"} />
          <circle cx="22" cy="40" r="2.5" fill={isLightIcon ? "#0f3e17" : "#cfe7d3"} />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div
            className={`font-extrabold tracking-tight font-sans ${textSizes[size].title} ${
              textVariant === "light" ? "text-[#fffefc]" : "text-[#0f3e17]"
            }`}
          >
            THANH SANG
          </div>
          <div
            className={`font-semibold tracking-wider uppercase font-sans ${textSizes[size].sub} ${
              textVariant === "light" ? "text-[#b1dbb8]" : "text-[#0f3e17]/80"
            }`}
          >
            PHỤC HỒI CHỨC NĂNG
          </div>
        </div>
      )}
    </div>
  );
}
