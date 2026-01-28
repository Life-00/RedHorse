// src/components/schedule/ScheduleRegisterModal.tsx
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CalendarDays, ImageUp, Wand2 } from "lucide-react";

export type ShiftType = "day" | "evening" | "night" | "off";

type Props = {
  open: boolean;
  onClose: () => void;

  // 직접 등록 적용
  onApplyRange: (payload: { start: string; end: string; shift: ShiftType }) => void;

  // 이미지 업로드(일단 파일만 전달)
  onUploadImage: (file: File) => void;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function todayISO() {
  const t = new Date();
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
}
function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

export default function ScheduleRegisterModal({
  open,
  onClose,
  onApplyRange,
  onUploadImage,
}: Props) {
  const tabs = useMemo(() => ["직접 등록", "이미지 업로드"] as const, []);
  const [tab, setTab] = useState<(typeof tabs)[number]>("직접 등록");

  // 직접 등록 폼
  const [start, setStart] = useState<string>(() => todayISO());
  const [end, setEnd] = useState<string>(() => addDaysISO(todayISO(), 6));
  const [shift, setShift] = useState<ShiftType>("day");

  // 업로드 폼
  const [file, setFile] = useState<File | null>(null);

  const canApply = start && end && new Date(start) <= new Date(end);

  const handleApply = () => {
    if (!canApply) return;
    onApplyRange({ start, end, shift });
    onClose();
  };

  const handleUpload = () => {
    if (!file) return;
    onUploadImage(file);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[999] flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* overlay */}
          <button
            onClick={onClose}
            className="absolute inset-0 bg-black/30"
            aria-label="close-overlay"
          />

          {/* sheet */}
          <motion.div
            className="relative w-full bg-white rounded-t-[28px] shadow-2xl border-t border-gray-100"
            initial={{ y: 24, opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0.9 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
          >
            {/* header */}
            <div className="px-6 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-[16px] font-black text-gray-900">근무표 등록</div>
                <div className="text-[12px] font-bold text-gray-400">
                  직접 입력하거나 이미지로 업로드하세요
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center"
                aria-label="close"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* tabs */}
            <div className="px-6 pt-4">
              <div className="bg-gray-50 rounded-2xl p-1 flex gap-1">
                {tabs.map((t) => {
                  const active = tab === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={[
                        "flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all",
                        active ? "bg-white shadow-sm text-[#5843E4]" : "text-gray-400",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* body */}
            <div className="px-6 py-5">
              {tab === "직접 등록" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F8F9FD] border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarDays className="w-5 h-5 text-gray-400" />
                      <div className="text-[13px] font-black text-gray-700">
                        기간 + 근무 타입
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <div className="text-[11px] font-black text-gray-400 mb-1">시작</div>
                        <input
                          type="date"
                          value={start}
                          onChange={(e) => setStart(e.target.value)}
                          className="w-full px-3 py-3 rounded-xl bg-white border border-gray-100 text-[13px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#5843E4]/20"
                        />
                      </label>

                      <label className="block">
                        <div className="text-[11px] font-black text-gray-400 mb-1">종료</div>
                        <input
                          type="date"
                          value={end}
                          onChange={(e) => setEnd(e.target.value)}
                          className="w-full px-3 py-3 rounded-xl bg-white border border-gray-100 text-[13px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#5843E4]/20"
                        />
                      </label>
                    </div>

                    <div className="mt-3">
                      <div className="text-[11px] font-black text-gray-400 mb-2">근무</div>
                      <div className="grid grid-cols-4 gap-2">
                        {([
                          { id: "day", label: "주간" },
                          { id: "evening", label: "중간" },
                          { id: "night", label: "야간" },
                          { id: "off", label: "휴무" },
                        ] as const).map((opt) => {
                          const active = shift === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => setShift(opt.id)}
                              className={[
                                "py-3 rounded-xl border text-[12px] font-black transition-all",
                                active
                                  ? "border-[#5843E4] bg-[#F8F7FF] text-[#5843E4]"
                                  : "border-gray-100 bg-white text-gray-500 hover:bg-gray-50",
                              ].join(" ")}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {!canApply && (
                      <div className="mt-3 text-[12px] font-bold text-rose-500">
                        종료일은 시작일보다 빠를 수 없습니다.
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleApply}
                    disabled={!canApply}
                    className="w-full py-4 rounded-[18px] bg-[#5843E4] text-white font-black text-[15px] shadow-lg shadow-[#5843E4]/20 disabled:opacity-40 active:scale-[0.99]"
                  >
                    기간에 적용하기
                  </button>
                </div>
              )}

              {tab === "이미지 업로드" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F8F9FD] border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageUp className="w-5 h-5 text-gray-400" />
                      <div className="text-[13px] font-black text-gray-700">근무표 이미지 업로드</div>
                    </div>
                    <div className="text-[12px] font-bold text-gray-400 mb-4">
                      캡처/사진을 올리면 자동 인식(OCR)으로 등록할 수 있어요
                    </div>

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                      <div className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 bg-white text-center cursor-pointer hover:bg-gray-50">
                        <div className="inline-flex items-center gap-2 text-[13px] font-black text-gray-700">
                          <Wand2 className="w-5 h-5 text-[#5843E4]" />
                          이미지 선택하기
                        </div>
                        {file && (
                          <div className="mt-2 text-[12px] font-bold text-gray-400">
                            선택됨: {file.name}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleUpload}
                    disabled={!file}
                    className="w-full py-4 rounded-[18px] bg-[#5843E4] text-white font-black text-[15px] shadow-lg shadow-[#5843E4]/20 disabled:opacity-40 active:scale-[0.99]"
                  >
                    업로드하고 등록하기
                  </button>

                  <div className="text-[11px] text-gray-300 font-black text-center">
                    ※ 지금은 UI만 연결되어 있고, OCR 연동은 API 붙이면 완료됩니다.
                  </div>
                </div>
              )}
            </div>

            {/* safe bottom padding for bottom nav */}
            <div className="h-6" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
