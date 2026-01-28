// src/pages/schedule/SchedulePage.tsx
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, Edit3 } from "lucide-react";
import type { ScreenType } from "../../types/app";
import BottomNav from "../../components/layout/BottomNav";
import TopBar from "../../components/layout/TopBar";
import ScheduleRegisterModal, { type ShiftType } from "../../components/schedule/ScheduleRegisterModal";
import { scheduleApi, apiUtils } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useApi";
import type { Schedule } from "../../types/api";

const SHIFT_CONFIG: Record<
  ShiftType,
  {
    label: string;
    bar: string; // 월간 달력 하단 바 색
    cardBg: string;
    border: string;
    text: string;
    time: string;
  }
> = {
  day: {
    label: "주간 근무",
    bar: "bg-amber-400",
    cardBg: "bg-amber-50",
    border: "border-amber-600",
    text: "text-amber-900",
    time: "08:00 - 17:00",
  },
  evening: {
    label: "초저녁 근무",
    bar: "bg-purple-500",
    cardBg: "bg-purple-50",
    border: "border-purple-600",
    text: "text-purple-900",
    time: "17:00 - 01:00",
  },
  night: {
    label: "야간 근무",
    bar: "bg-indigo-500",
    cardBg: "bg-indigo-50",
    border: "border-indigo-600",
    text: "text-indigo-900",
    time: "22:00 - 07:00",
  },
  off: {
    label: "휴무",
    bar: "bg-gray-200",
    cardBg: "bg-gray-50",
    border: "border-gray-300",
    text: "text-gray-600",
    time: "-",
  },
};

type Props = {
  onNavigate: (screen: ScreenType) => void;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function startOfWeekMonday(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // 월요일 시작
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** ✅ 참고 UI처럼: 해당 월만 그리되 앞/뒤는 null로 빈칸 처리 + 요일은 일~토 */
function buildMonthCellsSundayStart(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  first.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const firstDow = first.getDay(); // 0=Sun..6=Sat

  const cells: Array<Date | null> = [];
  // leading blanks
  for (let i = 0; i < firstDow; i++) cells.push(null);

  // dates
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month0, day);
    d.setHours(0, 0, 0, 0);
    cells.push(d);
  }

  // trailing blanks to complete week row
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export default function SchedulePage({ onNavigate }: Props) {
  const { userId, loading: userLoading } = useCurrentUser();
  
  // ✅ 달력 요일: 일~토 (참고 코드)
  const monthDayLabels = useMemo(() => ["일", "월", "화", "수", "목", "금", "토"], []);
  // ✅ 주간 카드 요일: 월~일 (기존 로직 유지)
  const weekDayLabels = useMemo(() => ["월", "화", "수", "목", "금", "토", "일"], []);

  const [cursor, setCursor] = useState(() => new Date(2026, 0, 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date(2026, 0, 27));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // 스케줄 데이터 로드
  useEffect(() => {
    if (!userId || userLoading) return;

    const loadSchedules = async () => {
      try {
        setLoading(true);
        
        // 데이터베이스에서 스케줄 로드
        try {
          const year = cursor.getFullYear();
          const month = cursor.getMonth();
          const startDate = new Date(year, month, 1);
          const endDate = new Date(year, month + 1, 0);
          
          const response = await scheduleApi.getSchedules(
            userId,
            apiUtils.formatDate(startDate),
            apiUtils.formatDate(endDate)
          );
          
          console.log('✅ 데이터베이스 스케줄 로드 성공:', response.schedules);
          setSchedules(response.schedules || []);
          
        } catch (apiError) {
          console.warn('⚠️ 백엔드 스케줄 로드 실패:', apiError);
          setSchedules([]);
        }
        
      } catch (error) {
        console.error('❌ 스케줄 로드 실패:', error);
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [userId, userLoading, cursor]);

  // 스케줄 맵 생성 (날짜 키로 스케줄 매핑)
  const shiftMap = useMemo(() => {
    const map: Record<string, ShiftType> = {};
    schedules.forEach(schedule => {
      const key = schedule.work_date;
      map[key] = schedule.shift_type as ShiftType;
    });
    return map;
  }, [schedules]);

  const year = cursor.getFullYear();
  const month0 = cursor.getMonth();
  const monthTitle = `${year}년 ${month0 + 1}월`;

  const monthCells = useMemo(() => buildMonthCellsSundayStart(year, month0), [year, month0]);

  // ✅ 오늘(시간 제거)
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // ✅ 주간 범위 (월요일 시작)
  const selectedWeekStart = useMemo(() => startOfWeekMonday(selectedDate), [selectedDate]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i)),
    [selectedWeekStart]
  );

  // 등록 모달
  const [registerOpen, setRegisterOpen] = useState(false);

  const applyRange = async (payload: { start: string; end: string; shift: ShiftType }) => {
    if (!userId) return;

    try {
      const startD = new Date(payload.start);
      const endD = new Date(payload.end);
      startD.setHours(0, 0, 0, 0);
      endD.setHours(0, 0, 0, 0);
      
      if (Number.isNaN(startD.getTime()) || Number.isNaN(endD.getTime())) return;

      console.log('🔍 스케줄 등록 시작:', { userId, payload });

      // 데이터베이스에 스케줄 저장
      try {
        const promises = [];
        const cur = new Date(startD);
        
        while (cur <= endD) {
          const dateStr = apiUtils.formatDate(cur);
          
          // 기존 스케줄이 있는지 확인
          const existingSchedule = schedules.find(s => s.work_date === dateStr);
          
          if (existingSchedule) {
            // 업데이트
            promises.push(
              scheduleApi.updateSchedule(userId, existingSchedule.id, {
                shift_type: payload.shift,
                work_date: dateStr
              })
            );
          } else {
            // 새로 생성
            promises.push(
              scheduleApi.createSchedule(userId, {
                work_date: dateStr,
                shift_type: payload.shift
              })
            );
          }
          
          cur.setDate(cur.getDate() + 1);
        }

        await Promise.all(promises);
        console.log('✅ 데이터베이스에 스케줄 저장 성공');
        
        // 저장 후 다시 로드
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        const response = await scheduleApi.getSchedules(
          userId,
          apiUtils.formatDate(monthStart),
          apiUtils.formatDate(monthEnd)
        );
        
        setSchedules(response.schedules || []);
        setSelectedDate(startD);
        setCursor(new Date(startD.getFullYear(), startD.getMonth(), 1));
        
      } catch (apiError) {
        console.error('❌ 데이터베이스 저장 실패:', apiError);
        alert('스케줄 등록에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('❌ 스케줄 등록 실패:', error);
      alert('스케줄 등록에 실패했습니다.');
    }
  };

  const uploadImage = async (file: File) => {
    if (!userId) return;
    
    try {
      console.log("schedule image selected:", file);
      // TODO: 실제 이미지 업로드 구현
      const response = await scheduleApi.uploadScheduleImage(userId);
      console.log('이미지 업로드 응답:', response);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
    }
  };

  // (간단) 수정 버튼 누르면 근무 타입 순환
  const cycleShift = (current: ShiftType): ShiftType =>
    current === "day" ? "evening" : current === "evening" ? "night" : current === "night" ? "off" : "day";

  const toggleShiftForDate = async (d: Date) => {
    if (!userId) return;
    
    try {
      const dateStr = apiUtils.formatDate(d);
      const current = shiftMap[dateStr] ?? "off";
      const next = cycleShift(current);
      
      console.log('🔍 스케줄 수정:', { dateStr, current, next });
      
      // 데이터베이스에 스케줄 업데이트
      try {
        const existingSchedule = schedules.find(s => s.work_date === dateStr);
        
        if (existingSchedule) {
          // 업데이트
          await scheduleApi.updateSchedule(userId, existingSchedule.id, {
            shift_type: next,
            work_date: dateStr
          });
        } else {
          // 새로 생성
          await scheduleApi.createSchedule(userId, {
            work_date: dateStr,
            shift_type: next
          });
        }
        
        console.log('✅ 데이터베이스 스케줄 수정 성공');
        
        // 수정 후 다시 로드
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        const response = await scheduleApi.getSchedules(
          userId,
          apiUtils.formatDate(monthStart),
          apiUtils.formatDate(monthEnd)
        );
        
        setSchedules(response.schedules || []);
        
      } catch (apiError) {
        console.error('❌ 데이터베이스 수정 실패:', apiError);
      }
      
    } catch (error) {
      console.error('❌ 스케줄 수정 실패:', error);
    }
  };

  const weekRangeText = useMemo(() => {
    const end = addDays(selectedWeekStart, 6);
    return `${selectedWeekStart.getFullYear()}-${pad2(selectedWeekStart.getMonth() + 1)}-${pad2(
      selectedWeekStart.getDate()
    )} ~ ${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`;
  }, [selectedWeekStart]);

  // 로딩 상태
  if (userLoading || loading) {
    return (
      <div className="h-full w-full bg-[#F8F9FD] flex flex-col overflow-hidden relative">
        <TopBar title="근무표" onNavigate={onNavigate} backTo="home" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-600 font-bold">스케줄을 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#F8F9FD] flex flex-col overflow-hidden relative">
      <TopBar
        title="근무표"
        onNavigate={onNavigate}
        backTo="home"
        rightSlot={
          <button
            onClick={() => setRegisterOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-[13px] font-black shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            등록
          </button>
        }
      />

      {/* ✅ 참고 코드 느낌의 상단 월 안내 */}
      <div className="shrink-0 px-7 pt-2 pb-4">
        <div>
          <div className="text-[12px] font-black text-gray-400">이번 달</div>
          <div className="text-[18px] font-black text-gray-900">{monthTitle}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-7 pb-28">
        {/* ✅ Monthly Calendar (그라데이션 + 카드) */}
        <div className="py-2 bg-gradient-to-br from-gray-50 to-white rounded-3xl">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {monthDayLabels.map((d, idx) => (
                <div
                  key={d}
                  className={[
                    "text-center text-xs font-black",
                    idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : "text-gray-600",
                  ].join(" ")}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((cell, idx) => {
                if (!cell) return <div key={`blank-${idx}`} className="aspect-square" />;

                const key = dateKey(cell);
                const shift = shiftMap[key] ?? "off";
                const cfg = SHIFT_CONFIG[shift];

                const isToday = key === dateKey(today);
                const isSelected = key === dateKey(selectedDate);

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(cell)}
                    className={[
                      "aspect-square rounded-xl flex flex-col items-center justify-center text-xs relative transition-all",
                      isSelected ? "ring-2 ring-indigo-600 ring-offset-1" : "hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {/* 오늘 표시 점 */}
                    {isToday && <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full" />}

                    <div className={`font-black ${isToday ? "text-indigo-600" : "text-gray-900"}`}>
                      {cell.getDate()}
                    </div>

                    {/* 하단 컬러 바 */}
                    {shift !== "off" && <div className={`w-6 h-1 ${cfg.bar} rounded-full mt-1`} />}
                    {shift === "off" && <div className="w-6 h-1 bg-gray-200 rounded-full mt-1" />}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-400 rounded-full" />
                <span className="text-xs text-gray-600">주간</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                <span className="text-xs text-gray-600">야간</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <span className="text-xs text-gray-600">초저녁</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-gray-200 rounded-full" />
                <span className="text-xs text-gray-600">휴무</span>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Weekly Schedule */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-gray-900">이번 주 상세</h3>
            <span className="text-xs font-black text-gray-400">{weekRangeText}</span>
          </div>

          <div className="space-y-3">
            {weekDates.map((d, idx) => {
              const key = dateKey(d);
              const shift = shiftMap[key] ?? "off";
              const cfg = SHIFT_CONFIG[shift];

              const isToday = key === dateKey(today);

              return (
                <motion.div
                  key={key}
                  whileTap={{ scale: 0.99 }}
                  className={`${cfg.cardBg} border-2 ${cfg.border} rounded-2xl p-4`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center ${cfg.text}`}>
                        <div className="text-xs opacity-70">{weekDayLabels[idx]}</div>
                        <div className="text-sm font-black">{d.getDate()}</div>
                      </div>

                      <div>
                        <div className={`font-black ${cfg.text}`}>
                          {cfg.label}
                          {isToday && <span className="ml-2 text-[11px] opacity-70">(오늘)</span>}
                        </div>
                        <div className={`text-sm ${cfg.text} opacity-70`}>{cfg.time}</div>
                      </div>
                    </div>

                    {/* 참고 코드처럼 우측 수정 버튼 */}
                    <button
                      onClick={() => toggleShiftForDate(d)}
                      className={`w-8 h-8 bg-white rounded-lg flex items-center justify-center ${cfg.text} active:scale-95`}
                      aria-label="edit-shift"
                      title="근무 유형 변경"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ✅ Tips */}
          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div>
                <div className="text-sm font-black text-indigo-900 mb-1">근무표 관리 팁</div>
                <div className="text-xs font-black text-indigo-700 leading-5">
                  • 정확한 시간 입력이 수면 플랜 정확도를 높입니다<br />
                  • 근무표는 언제든 수정할 수 있습니다<br />
                  • OCR로 사진 촬영만으로 등록 가능합니다
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0">
        <BottomNav active="schedule" onNavigate={onNavigate} />
      </div>

      <ScheduleRegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onApplyRange={applyRange}
        onUploadImage={uploadImage}
      />
    </div>
  );
}
